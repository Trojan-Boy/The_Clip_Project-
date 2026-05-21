# Changes Applied (Global / Company-Agnostic)

## 7) System audit, graph hardening, and agent-doc sync (2026-05-19)

This pass focused on three things:

1. documenting the current architecture and remediation plan in repo-native docs
2. hardening the Task Flow / Org Chart / plugin example surfaces with regression coverage
3. fixing the Windows-heavy test failures that were masking real product work

### New docs

- `doc/plans/2026-05-19-system-audit-remediation.md`
- `doc/plans/2026-05-19-product-remediation-prd.md`
- `doc/plans/2026-05-19-backend-runtime-remediation.md`

### Instruction surfaces updated

- `AGENTS.md`
- `skills/paperclip/SKILL.md`
- `server/src/onboarding-assets/default/AGENTS.md`
- `server/src/onboarding-assets/ceo/AGENTS.md`

### Graph and plugin coverage added

- Added Task Flow DAG regression tests for detached-parent and cyclic-parent inputs.
- Added Org Chart fallback-tree regression tests for orphaned managers and reporting cycles.
- Added plugin example route coverage to lock in the bundled RAG memory, graph search, and swarm coordinator examples.

### Runtime and test fixes

- Fixed Windows package-manager invocation for worktree bootstrap and CLI e2e coverage.
- Fixed Windows embedded PostgreSQL test cleanup retries so delayed temp-directory handle release no longer fails otherwise passing suites.
- Fixed stale test drift in:
  - `server/src/index.test.js`
  - `server/src/__tests__/forbidden-tokens.test.ts`
  - `server/src/__tests__/pi-local-adapter-environment.test.ts`
  - `cli/src/__tests__/company-import-export-e2e.test.ts`
  - `cli/src/__tests__/worktree.test.ts`

### Scope note

- This update preserves the existing canonical API surfaces (`/companies/:companyId/org`, issue APIs for Task Flow, and `/plugins/examples`) rather than adding parallel endpoints.
- The audit/remediation detail now lives in the dated docs above; this file remains the short running change log.

### Verification

- Full workspace typecheck passed: `corepack pnpm -r typecheck`
- Full workspace tests passed: `corepack pnpm test:run`
- Full workspace build passed: `corepack pnpm build`
- Live local smoke passed after restarting a stale dev watcher:
  - `GET /api/health`
  - `GET /api/plugins/examples`
  - `GET /api/companies/POL/org?includeTools=true`
  - `GET /api/companies/POL/issues`
  - `GET /companies/POL/task-flow`
  - `GET /companies/POL/org`

---

Date: 2026-04-28

This document records the backend logic changes implemented to generalize parallel leadership behavior and stabilize org-chart hierarchy handling across the entire project.

## 1) Generalized leader hiring capability (global default)

### What changed
- Updated default agent permission policy so leadership roles are parallel-capable by default.

### File changed
- `C:\Users\acer\Codeing\The_Clip_Project-\server\src\services\agent-permissions.ts`

### Exact logic
- Added `roleDefaultsToAgentCreation(role)` with leadership roles:
  - `ceo`
  - `cto`
  - `cmo`
  - `cfo`
  - `pm`
- `defaultPermissionsForRole(role)` now uses this function.
- Result: these leader roles default to `canCreateAgents: true`.

### Why this generalizes for whole project
- This default is used centrally by agent permission normalization, so **any newly created company** and its new leadership agents inherit this behavior automatically.

---

## 2) Auto-enable manager parallel permission when team hierarchy is formed

### What changed
- Added manager-permission escalation when reporting lines are created or changed.

### File changed
- `C:\Users\acer\Codeing\The_Clip_Project-\server\src\services\agents.ts`

### Exact logic
- Added helper: `ensureManagerParallelPermissions(companyId, managerId)`.
- If manager exists and `permissions.canCreateAgents !== true`, it updates manager permissions to set:
  - `canCreateAgents: true`
- This helper is called in:
  - `create(...)` when `reportsTo` is provided
  - `updateAgent(...)` when `reportsTo` is updated

### Why this generalizes for whole project
- The rule is now inside shared service-layer create/update flows, so it applies consistently for all companies and all future org changes.
- This also reduces collisions in leader workflow by ensuring subgroup/group managers can independently hire/assign downstream without manual toggles.

---

## 3) Org chart hierarchy resilience fix (orphan handling)

### What changed
- Fixed dropped nodes in org tree when an agent references a missing manager.

### File changed
- `C:\Users\acer\Codeing\The_Clip_Project-\server\src\services\agents.ts`

### Exact logic
- In `orgForCompany(companyId)`:
  - Build `byId` map of current agents.
  - Detect orphan nodes where `reportsTo` is set but manager ID does not exist.
  - Merge explicit roots (`reportsTo === null`) + orphan roots.
  - Build output tree from this unified root set.

### Why this generalizes for whole project
- Org tree output is generated centrally from service layer, so all companies (existing and new) get the same robust rendering behavior.

---

## Verification run

- Workspace typecheck passed:
  - `corepack pnpm -r typecheck`
- Server typecheck passed:
  - `corepack pnpm --filter @paperclipai/server typecheck`

---

## Scope note

- These changes are implemented at shared backend service level (not hardcoded to one company), so they are project-wide defaults.
- For pre-existing data, any new/updated reporting-line operations will enforce manager parallel permission automatically.

---

## 4) Org chart rendering outage fix (2026-04-29)

### User-visible symptom
- Org chart page rendered a blank canvas.

### Root cause
- UI requests `GET /api/companies/:companyId/org?includeTools=true`.
- Tool-enrichment query path could throw an internal error, causing a `500`.
- UI did not surface query errors clearly, resulting in a blank view.

### Fixes applied

1. **Server-side resilient org response**
- File: `C:\Users\acer\Codeing\The_Clip_Project-\server\src\routes\agents.ts`
- `org` route now catches tool-summary failures and still returns the base org tree with empty `toolsUsed` fallback.

2. **Prefix-safe company resolution for org endpoints**
- File: `C:\Users\acer\Codeing\The_Clip_Project-\server\src\routes\agents.ts`
- Added company reference resolution so org endpoints accept either:
  - UUID company id
  - issue prefix (e.g. `POL`)
- Applied to:
  - `/companies/:companyId/org`
  - `/companies/:companyId/org.svg`
  - `/companies/:companyId/org.png`

3. **Safer activity tool-summary query**
- File: `C:\Users\acer\Codeing\The_Clip_Project-\server\src\services\activity.ts`
- Replaced brittle timestamp SQL fragment with typed `gte(...)`.
- Removed aggregate SQL ordering dependency and performs stable sorting in application logic.

4. **Client fallback path**
- File: `C:\Users\acer\Codeing\The_Clip_Project-\ui\src\api\agents.ts`
- If `includeTools=true` call returns 5xx, client retries automatically with plain `/org`.

5. **UI error visibility**
- File: `C:\Users\acer\Codeing\The_Clip_Project-\ui\src\pages\OrgChart.tsx`
- Added explicit query error state via `EmptyState` message instead of rendering blank.

### Verification
- `GET /api/companies/<UUID>/org?includeTools=true` returns 200.
- `GET /api/companies/POL/org?includeTools=true` returns 200.
- Typecheck passed:
  - `corepack pnpm --filter @paperclipai/server typecheck`
  - `corepack pnpm --filter @paperclipai/ui typecheck`

---

## 5) Pending-task auto-work + hierarchy approvals (global) (2026-04-29)

### What changed
- Added project-wide automation so pending unassigned tasks are auto-assigned.
- Added hierarchy-governed planning-task cancellation/deletion controls.
- Added company-wide pending-task rebalance endpoint for leaders.
- Added org-chart fallback hierarchy builder so chart still renders even when backend roots are incomplete.

### Files changed
- `C:\Users\acer\Codeing\The_Clip_Project-\server\src\routes\issues.ts`
- `C:\Users\acer\Codeing\The_Clip_Project-\ui\src\pages\OrgChart.tsx`

### Exact logic

1. **Auto-assign pending unassigned tasks**
- Introduced `maybeAutoAssignPendingIssue(...)`.
- Applies to statuses: `todo`, `in_progress`, `in_review`, `blocked`.
- Assignment selection strategy:
  - Prefer workers under the creator/manager branch when possible.
  - Prefer non-root workers over top leaders.
  - Pick the least-loaded eligible agent (open-task count).
  - Tie-break by role priority then id.
- Runs automatically in:
  - `POST /companies/:companyId/issues` (after creation)
  - `PATCH /issues/:id` (after updates)
  - `POST /issues/:id/comments` when reopening closed tasks

2. **Planning-task governance for prune actions**
- Added `assertPlanningPruneGovernance(...)`:
  - Detects planning-like tasks by keyword in title/description.
  - Allows board users.
  - For agent actors, requires either:
    - CEO/creator capability, or
    - higher-up relation in chain of command over assignee/creator.
- Enforced on:
  - `PATCH /issues/:id` when changing status to `cancelled` (requires reason comment)
  - `DELETE /issues/:id` for planning issues

3. **Bulk rebalance endpoint**
- Added:
  - `POST /companies/:companyId/issues/rebalance-pending`
- Requires assign permission.
- Scans pending + unassigned + non-hidden issues and auto-assigns in loop.
- Logs activity `issue.rebalanced_pending`.
- Supports both UUID and company prefix refs (e.g. `POL`) via `companyId` route-param normalization.

4. **Org chart hierarchy fallback and visibility**
- UI now builds a fallback org tree from `agents` data when `/org` roots are empty.
- Cycle-safe relationship linking in fallback tree.
- Hierarchy sorting by leadership rank for stable rendering.
- Cards now show direct manager line (`Reports to ...`) using reporting relationship.

### Why this is generalized for whole project
- All rules run in shared route/service paths and are scoped by `companyId`, so behavior applies to any company (existing or newly created) without company-specific hardcoding.

### Verification
- Typecheck passed:
  - `corepack pnpm --filter @paperclipai/server typecheck`
  - `corepack pnpm --filter @paperclipai/ui typecheck`

---

## 6) Pending assigned task wakeups + research-key checks (global) (2026-04-29)

### What changed
- Fixed the remaining pending-task gap where assigned tasks were not picked up by `rebalance-pending`.
- Added a shared company reference resolver so company-scoped APIs accept either UUIDs or issue prefixes like `POL`.
- Fixed the agent issue-update tool so leaders can add the required governance comment when cancelling obsolete planning tasks.
- Documented leader no-collision triage rules in default onboarding instructions so future companies inherit the behavior.

### Files changed
- `C:\Users\acer\Codeing\The_Clip_Project-\server\src\routes\company-ref.ts`
- `C:\Users\acer\Codeing\The_Clip_Project-\server\src\routes\issues.ts`
- `C:\Users\acer\Codeing\The_Clip_Project-\server\src\routes\activity.ts`
- `C:\Users\acer\Codeing\The_Clip_Project-\server\src\routes\agents.ts`
- `C:\Users\acer\Codeing\The_Clip_Project-\server\src\routes\secrets.ts`
- `C:\Users\acer\Codeing\The_Clip_Project-\server\src\routes\approvals.ts`
- `C:\Users\acer\Codeing\The_Clip_Project-\server\src\routes\assets.ts`
- `C:\Users\acer\Codeing\The_Clip_Project-\server\src\routes\companies.ts`
- `C:\Users\acer\Codeing\The_Clip_Project-\server\src\routes\company-skills.ts`
- `C:\Users\acer\Codeing\The_Clip_Project-\server\src\routes\costs.ts`
- `C:\Users\acer\Codeing\The_Clip_Project-\server\src\routes\dashboard.ts`
- `C:\Users\acer\Codeing\The_Clip_Project-\server\src\routes\execution-workspaces.ts`
- `C:\Users\acer\Codeing\The_Clip_Project-\server\src\routes\goals.ts`
- `C:\Users\acer\Codeing\The_Clip_Project-\server\src\routes\projects.ts`
- `C:\Users\acer\Codeing\The_Clip_Project-\server\src\routes\routines.ts`
- `C:\Users\acer\Codeing\The_Clip_Project-\server\src\routes\sidebar-badges.ts`
- `C:\Users\acer\Codeing\The_Clip_Project-\packages\adapter-utils\src\paperclip-tools.ts`
- `C:\Users\acer\Codeing\The_Clip_Project-\packages\adapter-utils\src\tool-executor.ts`
- `C:\Users\acer\Codeing\The_Clip_Project-\server\src\onboarding-assets\default\AGENTS.md`
- `C:\Users\acer\Codeing\The_Clip_Project-\server\src\onboarding-assets\ceo\AGENTS.md`

### Exact logic

1. **Assigned pending task wakeups**
- `POST /companies/:companyId/issues/rebalance-pending` now scans all actionable non-hidden statuses:
  - `todo`
  - `in_progress`
  - `in_review`
  - `blocked`
- It still auto-assigns unassigned tasks.
- For tasks already assigned to an agent, it wakes at most one task per idle agent.
- If an assignee already has a running heartbeat, the endpoint skips that agent and reports `busyAssignees`.
- This prevents parallel collisions while still moving stuck assigned work.

2. **Prefix-safe company APIs**
- Added `company-ref.ts` with:
  - `resolveCompanyIdReference(...)`
  - `normalizeCompanyReference(...)`
  - `installCompanyIdParamNormalizer(...)`
- Installed the normalizer in company-scoped routes so APIs like `/companies/POL/agents`, `/companies/POL/activity`, and `/companies/POL/secrets` can resolve to the company UUID before access checks and DB queries.

3. **Planning cancellation tool support**
- `paperclip_update_issue` now accepts `comment`.
- Agents can now cancel planning/strategy tasks with the required reason comment instead of getting blocked by governance validation.
- Tool status enums now use real issue statuses. `paperclip_list_issues` maps `open` to `todo,in_progress,in_review,blocked` for compatibility.

4. **Research API key availability**
- Confirmed the research tools already support:
  - `TAVILY_API_KEY`
  - `BROWSERLESS_API_KEY`
- Tool runtime reports explicit missing-key errors when those env bindings are absent.
- Agent config UI already supports secret-backed environment variables through company secrets.

### Why this is generalized for whole project
- Company prefix normalization is shared route infrastructure.
- Pending assigned wakeups are in the central issue rebalance endpoint and remain company-scoped.
- Leader no-collision rules are in default onboarding assets, so new companies and new agents inherit them.
- Research-key wiring uses existing global secret/env binding infrastructure, not POL-specific hardcoding.

### Verification
- Full workspace typecheck passed:
  - `corepack pnpm -r typecheck`
- Full workspace build passed:
  - `corepack pnpm build`
- Live POL checks after restarting the dev server:
  - `/api/companies/POL/org?includeTools=true` returns the CEO -> CTO hierarchy.
  - CEO and CTO are configured on local Ollama with `gemma4:latest`.
  - Recent CEO/CTO wakeups succeeded after Ollama was started.
  - `/api/companies/POL/secrets` currently has no stored secrets, so Tavily/Browserless can be used only after real keys are added and bound into agent env.
- Focused route tests were not run because the tool approval for the test command was declined.
