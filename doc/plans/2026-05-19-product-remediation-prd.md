# Product Remediation PRD

Date: 2026-05-19

## Goal

Stabilize the company-operator experience around hierarchy, pending work, and graph visibility so a board user can trust what Paperclip shows and what leaders do next.

## Product requirements

### Task Flow

- Must render company issue hierarchy without blanking when parentage is partial or cyclic.
- Must keep detached work visible rather than silently dropping it.
- Must continue using the existing issue APIs; no alternate Task Flow backend is introduced.

### Org Chart

- Must render even when reporting lines are incomplete or partially invalid.
- Must reflect the real reporting hierarchy rather than a second, UI-only model.
- Must stay aligned with company-prefixed board routing.

### Pending work and hierarchy behavior

- Pending work should not sit unowned when the hierarchy can act on it.
- Leaders are expected to review subordinate queues and split work into non-overlapping lanes.
- Destructive planning changes such as cancelling stale planning work require assignee/creator/higher-up authority and an audit comment.

### Local-first extensions

- Product messaging and agent docs should make the extension direction clear:
  - local adapters where appropriate
  - bundled RAG memory example
  - bundled graph search example
  - bundled swarm coordination example

## Success criteria

- Targeted regression tests exist for Task Flow, Org Chart fallback, and plugin example discovery.
- Contributor and onboarding docs describe the same hierarchy/approval model the product enforces.
- Windows-heavy validation failures no longer block confidence in the product changes.
