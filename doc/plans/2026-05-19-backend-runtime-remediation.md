# Backend and Runtime Remediation

Date: 2026-05-19

## Scope

This document captures the runtime/test debt that was actively interfering with validation of Task Flow, Org Chart, plugin examples, and local adapter work.

## Fixed classes

### CLI and worktree process launching

- Replaced raw `pnpm` spawning assumptions in test coverage with a repo-local CLI runner path.
- Added a package-manager invocation helper for Windows-safe worktree dependency bootstrap.

### Server test drift

- Fixed `server/src/index.test.js` to use Vitest imports explicitly.
- Moved forbidden-token reusable logic into `scripts/check-forbidden-tokens-lib.js` so the CLI wrapper and Vitest both read a stable module.

### Local adapter diagnostics drift

- Updated Pi local environment tests to create cross-platform fake commands.
- Kept the existing diagnostics contract intact while removing Unix-only assumptions.

### Worktree test portability

- Relaxed assertions that depended on Unix-only path literals or executable-bit behavior.
- Preserved behavioral checks for env persistence, rebinding, and hook mirroring.

## Canonical interfaces preserved

- `GET /api/companies/:companyId/org`
- issue APIs already used by Task Flow
- `GET /api/plugins/examples`

No alternate runtime APIs were added in this pass.

## Verification targets

- `pnpm --filter @paperclipai/ui typecheck`
- `pnpm --filter @paperclipai/server typecheck`
- targeted Vitest suites for:
  - worktree
  - company import/export e2e
  - forbidden tokens
  - Pi local environment diagnostics
  - plugin example routes
  - Task Flow and Org Chart graph helpers

## Follow-up verification completed

The dev service registry had a stale watcher entry at `http://127.0.0.1:3100`. That runner was stopped, a fresh dev watcher was started, and live HTTP smoke now passes for health, plugin examples, POL org, POL issues, and the POL Task Flow / Org Chart SPA routes.

Full workspace verification also passes:

- `corepack pnpm -r typecheck`
- `corepack pnpm test:run`
- `corepack pnpm build`

During full test verification, two embedded PostgreSQL suites exposed a Windows temp-directory cleanup race after server stop. The shared test helper now retries retryable cleanup errors and tolerates a still-locked Windows temp folder after exhausting retries, so product tests are not failed by delayed file-handle release.
