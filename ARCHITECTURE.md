# Architecture

Paperclip has four synchronized layers plus extension layers for adapters, plugins, and local desktop control.

## System Overview

```mermaid
flowchart TB
  subgraph Board["Board UI — React / Vite"]
    direction LR
    Dashboard["Dashboard"]
    TaskFlow["Task Flow"]
    OrgChart["Org Chart"]
    Inbox["Inbox"]
    PersonalAI["Personal AI"]
    Plugins_UI["Plugin Pages"]
  end

  subgraph API["Express REST API — /api/*"]
    direction LR
    CompanyRoutes["Companies · Agents · Issues"]
    WorkRoutes["Projects · Routines · Goals"]
    GovRoutes["Approvals · Costs · Activity"]
    SecretRoutes["Secrets · Access"]
    PORoutes["Personal Operator"]
    PluginRoutes["Plugins"]
  end

  subgraph Services["Service Layer"]
    direction LR
    CoreSvc["Core: companies, agents, issues"]
    WorkSvc["Work: projects, routines, heartbeat"]
    GovSvc["Gov: approvals, budgets, activity"]
    POSvc["Personal Operator Service"]
    PluginSvc["Plugin Lifecycle · Jobs · Events"]
  end

  subgraph Data["Data Layer"]
    DB["PostgreSQL / PGlite"]
    SecretStore["Encrypted Secret Store"]
  end

  subgraph Extensions["Extension Layer"]
    Adapters["Adapter Registry\nClaude · Codex · Cursor · Gemini\nOpenClaw · Hermes · OpenRouter · Ollama"]
    PluginRuntime["Plugin Runtime\nSandbox · Workers · State Store"]
    Daemon["Local Operator Daemon\n127.0.0.1:3177"]
  end

  subgraph Desktop["Windows Desktop"]
    Browser["Browser / DOM"]
    Screenshot["Screenshot PNG"]
    MouseKB["Mouse / Keyboard (User32)"]
  end

  Board --> API
  API --> Services
  Services --> Data
  Services --> Adapters
  Services --> PluginRuntime
  POSvc --> Daemon
  Daemon --> Browser
  Daemon --> Screenshot
  Daemon --> MouseKB
```

## Core Layers

### 1. `packages/shared` — Contract Layer

API contracts, validators (Zod schemas), constants, and shared TypeScript types. Every route and API client imports from this package to keep contracts synchronized.

### 2. `packages/db` — Data Layer

Drizzle ORM schema definitions, migration generation, and database client setup. Tables are organized by domain in `packages/db/src/schema/`. Supports embedded PGlite (dev) and external PostgreSQL (production).

### 3. `server` — API & Orchestration Layer

Express REST API mounted under `/api`. Contains route handlers, service logic, middleware (auth, validation, error handling), realtime event bus, and adapter orchestration.

### 4. `ui` — Board UI Layer

React/Vite single-page application. Uses React Query for server state, shared UI primitives, and company-scoped routing. Board surfaces include Task Flow, Org Chart, Inbox, Dashboard, and Personal AI.

## Extension Layers

### `packages/adapters` — Agent Runtime Adapters

Adapter implementations for connecting different AI agent runtimes. Each adapter implements a standard interface for starting, stopping, and communicating with agents.

### `packages/plugins` — Plugin System

Extensible plugin surfaces for custom integrations including jobs, webhooks, entity management, UI pages, and state storage. Plugins run in sandboxed workers.

### `packages/local-operator-daemon` — Desktop Control

Loopback HTTP daemon bound to `127.0.0.1:3177` for Windows desktop control. Exposes mouse movement, click, and screenshot capture via PowerShell/User32. Accepts bearer token authentication.

## Folder Structure

```
paperclip/
├── server/src/
│   ├── routes/              29 route modules
│   ├── services/            68 service modules
│   ├── middleware/           Auth, validation, error handling
│   ├── auth/                Board auth, agent JWT
│   ├── secrets/             Secret provider implementations
│   ├── realtime/            WebSocket event bus
│   └── __tests__/           98+ unit tests
├── ui/src/
│   ├── pages/               45 page components
│   ├── components/          Sidebar, UI primitives, design system
│   ├── api/                 25 API client modules
│   ├── lib/                 Hooks, query keys, router utilities
│   └── context/             React context providers
├── packages/
│   ├── db/src/schema/       60 schema definition files
│   ├── shared/src/          Types, validators, constants
│   ├── adapters/            Per-adapter packages
│   ├── adapter-utils/       Shared adapter utilities
│   ├── plugins/             Plugin system packages
│   └── local-operator-daemon/  Desktop control daemon
├── doc/                     Deep operational docs
├── cli/                     Paperclip CLI
└── tests/                   E2E and release smoke tests
```

## Personal AI Operator

### Data Flow

```mermaid
sequenceDiagram
  participant U as Board UI
  participant A as /api/personal-operator/*
  participant S as Personal Operator Service
  participant D as DB (personal_operator_*)
  participant Sec as Secret Store
  participant Dm as Daemon (127.0.0.1:3177)
  participant Act as Activity Log

  U->>A: PATCH /profile {enabled: true}
  A->>S: updateProfile(userId, patch)
  S->>S: assertNoRawSecrets(adapterConfig)
  S->>D: UPSERT personal_operator_profiles
  D-->>S: profile row
  S-->>A: profile
  A-->>U: 200 profile

  U->>A: PUT /permissions/:companyId
  A->>S: upsertPermission(userId, companyId, flags)
  S->>D: UPSERT personal_operator_company_permissions
  D-->>S: permission row
  S->>Act: log "permission_updated"
  S-->>A: permission
  A-->>U: 200 permission

  U->>A: POST /runs {prompt, companyId}
  A->>S: createRun(userId, input)
  S->>S: assertNoRawSecrets(adapterConfig)
  S->>S: assertCompanyAllowed(userId, companyId, "read")
  S->>D: INSERT personal_operator_runs
  D-->>S: run row
  S->>Act: log "run_created"
  S-->>A: 201 run
  A-->>U: run

  U->>A: POST /runs/:runId/actions
  A->>S: recordAction(userId, runId, action)
  S->>S: assertNoRawSecrets(payload, result)
  S->>S: assertCompanyAllowed(userId, companyId, mode)
  S->>S: redactSecrets(payload, result)
  S->>D: INSERT personal_operator_actions
  S->>Act: log "action_recorded"
  S-->>A: 201 action

  U->>A: GET /daemon/health?baseUrl=...
  A->>S: assertLoopbackDaemonUrl(baseUrl)
  S->>Dm: GET /health
  Dm-->>S: {ok, platform, desktopControl}
  S-->>A: {ok, daemon}
  A-->>U: daemon status
```

### Action Priority

Personal AI uses the least invasive control path that can complete the task:

1. **Paperclip API** — company work through existing endpoints.
2. **Browser DOM** — direct DOM manipulation.
3. **Browser accessibility / semantic tree** — accessible element interaction.
4. **Screenshot vision** — visual state capture and analysis.
5. **Desktop mouse/keyboard fallback** — Windows User32 via daemon.

## Trust Boundaries

```mermaid
flowchart LR
  subgraph Trusted["Trusted Zone"]
    Board["Board UI\n(full-control operator)"]
    Server["API Server"]
    DB["Database"]
    SecretStore["Secret Store\n(encrypted at rest)"]
  end

  subgraph Scoped["Company-Scoped"]
    AgentKeys["Agent API Keys\n(hashed, company-bound)"]
    CompanyData["Company Data"]
  end

  subgraph UserScoped["User-Scoped"]
    POProfile["Personal AI Profile"]
    Allowlist["Company Allowlist"]
  end

  subgraph Loopback["Loopback Only"]
    Daemon["Daemon\n127.0.0.1:3177\n(short-lived tokens)"]
  end

  Board -->|"full access"| Server
  AgentKeys -->|"bearer auth"| Server
  Server --> DB
  Server --> SecretStore
  Server -->|"loopback only"| Daemon
  POProfile -->|"user owns"| Allowlist
```

Key invariants:
- Board access is full-control operator context.
- Agent API keys are hashed and company-scoped; they must not access other companies.
- Personal AI profile and allowlist state are user-scoped.
- Daemon URLs must be loopback addresses.
- Daemon tokens are short-lived (default 300s) and stored hashed server-side.
- API keys for reasoning providers must be company secrets referenced by `secret_ref`.

## Secret Flow

```mermaid
flowchart LR
  User["User creates\ncompany secret"] --> SecretStore["company_secrets +\ncompany_secret_versions\n(encrypted at rest)"]
  SecretStore --> SecretRef["secret_ref object\n{type, secretId, version}"]
  SecretRef --> AdapterConfig["Personal AI\nadapter config"]
  AdapterConfig --> Validation["assertNoRawSecrets()\nrejects raw values"]
  Validation -->|pass| Persist["Stored in\npersonal_operator_profiles\nor personal_operator_runs"]
  Validation -->|fail| Reject["400 error:\nraw sensitive value"]
```

## Audit Logs

Personal AI records runs and actions in dedicated tables and logs company-scoped mutations into activity logs. Screenshot rows store metadata only by default and must not expose raw image paths or secret-bearing metadata.

All action payloads and results pass through `redactPersonalOperatorSecrets()` before persistence, stripping sensitive keys and replacing `secret_ref` details with `[redacted]`.
