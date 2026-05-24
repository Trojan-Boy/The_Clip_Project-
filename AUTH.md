# Auth

Paperclip supports three authentication contexts: board operators, agent API keys, and Personal AI daemon tokens. Each context has distinct scoping, permissions, and secret handling rules.

## Auth Flow Overview

```mermaid
flowchart TD
  subgraph Board["Board Access"]
    LocalTrust["Local trusted mode\n(implicit operator)"]
    AuthSession["Authenticated session\n(auth provider)"]
  end

  subgraph Agent["Agent Access"]
    AgentKey["Bearer API key\n(hashed, company-scoped)"]
  end

  subgraph PersonalAI["Personal AI Access"]
    POProfile["Profile enabled?"]
    POAllowlist["Company allowlisted?"]
    POFlags["Permission flags?"]
    DaemonToken["Daemon token\n(short-lived, hashed)"]
  end

  LocalTrust --> Server["Express API Server"]
  AuthSession --> Server
  AgentKey --> Server
  Server --> Routes["Route Handlers"]

  Routes -->|"assertBoard()"| BoardRoutes["Board-protected routes"]
  Routes -->|"agent JWT verify"| AgentRoutes["Agent-scoped routes"]
  Routes -->|"assertBoard() +\nassertCompanyAllowed()"| PORoutes["Personal AI routes"]
  PORoutes --> POProfile --> POAllowlist --> POFlags
  PORoutes -->|"daemon calls"| DaemonToken
```

## Board Access

Board users operate the Paperclip control plane. In local trusted mode, the local board is treated as an implicit trusted operator. In authenticated mode, board sessions come from the configured auth provider and instance/company access checks apply.

- Protected by `assertBoard(req)` middleware.
- In local mode, `req.actor.userId` defaults to `"local-board"`.
- In authenticated mode, sessions provide `userId`, instance roles, and company memberships.

## Agent API Keys

Agents use bearer API keys issued per-company.

- Keys are **hashed at rest** (SHA-256) in `agent_api_keys`.
- Keys are **company-scoped** — an agent key must not access other companies.
- Auth header: `Authorization: Bearer <agent_api_key>`.
- The server verifies by hashing the presented key and matching against stored hashes.

## Personal AI Permissions

Personal AI is user-scoped and disabled by default. Access requires a multi-gate permission check:

### Permission Matrix

```mermaid
flowchart TD
  Start["Request arrives"] --> ProfileCheck{"Profile enabled?"}
  ProfileCheck -->|No| Deny403a["403: Personal AI\nis disabled"]
  ProfileCheck -->|Yes| CompanyCheck{"Company\nallowlisted?"}
  CompanyCheck -->|No| Deny403b["403: Not allowed\nfor this company"]
  CompanyCheck -->|Yes| ModeCheck{"Action mode?"}

  ModeCheck -->|read| ReadCheck{"readEnabled?"}
  ReadCheck -->|No| Deny403c["403: Read access\nnot allowed"]
  ReadCheck -->|Yes| Allow["✅ Allowed"]

  ModeCheck -->|write| WriteCheck{"writeEnabled?"}
  WriteCheck -->|No| Deny403d["403: Write access\nnot allowed"]
  WriteCheck -->|Yes| Allow

  ModeCheck -->|browser| BrowserCheck{"Profile browser\nAND company browser?"}
  BrowserCheck -->|No| Deny403e["403: Browser control\nnot allowed"]
  BrowserCheck -->|Yes| Allow

  ModeCheck -->|desktop| DesktopCheck{"Profile desktop\nAND company desktop?"}
  DesktopCheck -->|No| Deny403f["403: Desktop control\nnot allowed"]
  DesktopCheck -->|Yes| Allow
```

### Level Details

| Level | Scope | Flags | Enforcement |
|---|---|---|---|
| **Profile** | User-global | `enabled`, `daemonEnabled`, `browserControlEnabled`, `desktopControlEnabled`, `screenshotVisionEnabled` | Checked on every Personal AI operation |
| **Company** | Per-user, per-company | `readEnabled`, `writeEnabled`, `browserControlEnabled`, `desktopControlEnabled`, `approvalRequired` | Checked on company-scoped operations |

Key rules:
- Board access (`assertBoard`) is required for all Personal AI management routes.
- Company access (`assertCompanyAccess`) is required for company permission changes and company-scoped runs.
- Browser and desktop control require **both** profile-level **and** company-level enablement.
- Approval-required companies gate mutating actions through approval workflows.

## Daemon Auth

The local operator daemon binds to `127.0.0.1` by default. The server enforces loopback-only daemon URLs.

### Token Lifecycle

```mermaid
sequenceDiagram
  participant UI as Board UI
  participant API as API Server
  participant DB as Database
  participant Daemon as Daemon<br/>127.0.0.1:3177

  Note over UI,API: 1. Create session
  UI->>API: POST /personal-operator/sessions
  API->>API: assertLoopbackDaemonUrl(baseUrl)
  API->>DB: INSERT personal_operator_sessions
  DB-->>API: session {id}
  API-->>UI: session

  Note over UI,API: 2. Mint token
  UI->>API: POST /sessions/:id/daemon-token
  API->>API: Generate pco_<random 32 bytes>
  API->>API: SHA-256 hash token
  API->>DB: UPDATE session SET<br/>daemon_token_hash, daemon_token_expires_at
  API-->>UI: {token: "pco_...", expiresAt: "..."}

  Note over UI,Daemon: 3. Use token (within TTL)
  UI->>Daemon: POST /mouse/click<br/>Authorization: Bearer pco_...
  Daemon->>Daemon: Verify token matches env
  Daemon-->>UI: {ok: true}

  Note over API,DB: 4. Verify (server-side)
  API->>DB: SELECT daemon_token_hash, expires_at
  API->>API: Hash presented token
  API->>API: Compare hashes + check expiry
  API-->>API: valid / invalid
```

Key properties:
- Tokens are prefixed with `pco_` for identification.
- Default TTL is 300 seconds (5 minutes).
- Raw token is returned **only at issuance time** — it is never stored or logged.
- Token hash is stored in `personal_operator_sessions.daemon_token_hash`.
- Expired tokens are rejected; the client must request a new token.

## Secret Handling

User API keys must be created as company secrets and used through `secret_ref` objects. The system enforces this at multiple layers:

### Enforcement Points

```mermaid
flowchart TD
  Input["Config with sensitive keys"] --> Validator["Zod schema validation\n(personalOperatorAdapterConfigSchema)"]
  Validator --> AssertFn["assertNoRawPersonalOperatorSecrets()"]
  AssertFn -->|raw string found| Reject400["400: Raw sensitive value\nnot allowed"]
  AssertFn -->|clean or secret_ref| Service["Service layer"]
  Service --> Redact["redactPersonalOperatorSecrets()"]
  Redact --> DB["Persist to DB\n(redacted payload/result)"]
  Redact --> ActivityLog["Activity log\n(redacted details)"]
```

### Sensitive Key Patterns

The following key patterns trigger raw value rejection:

| Pattern | Examples |
|---|---|
| `apiKey`, `apikey` | Direct key names |
| `*_API_KEY`, `*-api-key` | `OPENROUTER_API_KEY`, `hermes-api-key` |
| `token`, `*_token` | `access_token`, `auth_token` |
| `secret`, `*_secret` | `client_secret` |
| `password`, `passwd` | Password fields |
| `authorization` | Auth headers |
| `cookie` | Session cookies |

### Redaction Layers

Secret values are redacted from all external-facing surfaces:

| Surface | Redaction Method |
|---|---|
| Action payload/result (DB) | `redactPersonalOperatorSecrets()` before INSERT |
| Activity log details | Redacted payload/result passed to `logActivity()` |
| Run events | Adapter config validated, no raw keys stored |
| Websocket payloads | `redactEventPayload()` on realtime events |
| Screenshot metadata | `objectKey` stored as `[redacted]` |
| Company exports | Secret names only, no values or IDs |
| Log output | `redactCurrentUserText()` strips usernames/paths |
| GitHub-bound files | `check:tokens` script validates no forbidden tokens |

### Valid Secret Reference

```json
{
  "apiKey": {
    "type": "secret_ref",
    "secretId": "00000000-0000-4000-8000-000000000000",
    "version": "latest"
  }
}
```

### Invalid (Rejected)

```json
{
  "apiKey": "sk-abc123..."
}
```

This returns `400: Raw sensitive value is not allowed at apiKey; use a secret_ref.`
