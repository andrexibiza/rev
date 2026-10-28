# Rev Documentation (living — built as we go)

Docs are operational promises (see `references/docs-parity.md`): every command here is executed at the pinned revision before merge, every claim links a receipt. Update docs in the same PR as behavior; add a `CHANGELOG.md` entry in the same PR. Stale docs are findings, not chores.

## Contents

- `getting-started.md` — install, first `@Rev` run, reading a receipt (60-second maintainer path).
- `architecture.md` — machine shape: ingress, proof object, queue, blind factory, graph, GraphQL, surfaces.
- `operations.md` — running Rev: queues, costs, incidents, demo runbook, troubleshooting refusals.

## Sources of truth (do not duplicate, link)

- Product plan and milestones: `../plan.md`
- Graph + GraphQL contract: `../schema.md`
- Loadable method (agents): `../SKILL.md` + `../references/INDEX.md`
- Teachable depth: `../curriculum/README.md`
- Build rules for this repo: `../agents.md`
- History: `../CHANGELOG.md`; adversarial self-review: `../REV-REVIEW.md` (once created)
