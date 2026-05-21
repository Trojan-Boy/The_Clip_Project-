# System Audit and Remediation

Date: 2026-05-19

## Summary

Paperclip is currently healthiest when understood as four synchronized layers:

1. `packages/shared`: contract, type, and validator layer
2. `server`: REST API, orchestration, approvals, hierarchy, scheduler, and activity logging
3. `packages/adapters` + `packages/plugins`: execution/runtime extension layer
4. `ui`: board surfaces such as Task Flow, Org Chart, inbox, approvals, and plugins

This audit keeps three canonical surfaces intact:

- org hierarchy: `GET /api/companies/:companyId/org`
- task graph: existing issue APIs already consumed by `ui/src/pages/TaskFlow.tsx`
- plugin discovery: `GET /api/plugins/examples`

## Current breakpoints

### 1. Validation noise was obscuring product work

The repo was type-clean/build-clean in the main product paths, but several test failures were environment-sensitive and made it harder to trust new work:

- Windows `pnpm` spawning in CLI/worktree tests
- stale dummy test/import drift in server tests
- Pi local environment diagnostics tests assuming Unix-only fake executables
- worktree tests assuming Unix path and file-mode behavior

### 2. Graph surfaces needed regression coverage

Task Flow and Org Chart already had resilience logic in code, but they lacked targeted tests for:

- detached parent chains
- cyclic parent/reporting edges
- bundled plugin discovery contract

### 3. Agent guidance had drifted from the current product direction

Leader parallelism, hierarchy-based pruning approvals, and the new local/plugin extension path were only partially reflected in agent docs and skills.

## Remediation applied

- Added new regression tests for:
  - Task Flow DAG detached/cyclic handling
  - Org Chart fallback hierarchy handling
  - bundled plugin example route contents
- Fixed cross-platform execution/test issues so the targeted suites run on Windows.
- Synced root contributor guidance plus CEO/default onboarding docs with:
  - canonical hierarchy/task/plugin surfaces
  - leader queue-management expectations
  - RAG memory / graph search / swarm coordination direction

## Verification

Completed follow-up verification:

- `corepack pnpm -r typecheck`
- `corepack pnpm test:run`
- `corepack pnpm build`
- live local server smoke:
  - `GET /api/health`
  - `GET /api/plugins/examples`
  - `GET /api/companies/POL/org?includeTools=true`
  - `GET /api/companies/POL/issues`
  - `GET /companies/POL/task-flow`
  - `GET /companies/POL/org`

The stale dev-service registry entry was stopped and a fresh dev watcher was started at `http://127.0.0.1:3100`.
