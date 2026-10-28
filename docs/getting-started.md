# Getting Started

State at writing (2026-10-28, v0.3.0): full core integrated — queue, graph/GraphQL at `/graphql`, watcher, blind factory, worker, projector (dry-run default), plugin UI. Live smoke passed 2026-10-28 (webhook queued + replay, drain COMPLETED, GraphQL 200, demo REQUEST_CHANGES). Live GitHub posting + Muse narrative require your credentials (see DEMO.md).

## Run locally

```bash
npm run check        # 2K Law gate
npm run check:refs   # reference library gate (index + anti-stub)
npm test             # full suite (60 at last verification)
PORT=8787 WEBHOOK_SECRET=devsecret npm start  # webhook on POST /webhooks/github, GET /healthz
```

Verified 2026-10-28: check OK, refs OK, tests 60/60. Live smoke (escalated shell): POST pull_request -> 200 queued, replay same eventId, drainOnce -> COMPLETED/REQUEST_CHANGES, POST /graphql registry -> 200, node src/demo.mjs -> REQUEST_CHANGES. LANES_NOT_READY now only when no queue configured.

## First `@Rev`

Install the GitHub App on a repo (Review-only tier first, see `references/maintainer-guide.md`), ensure `CODEOWNERS` exists (Rev fails closed without declared authority), open a PR, comment `@Rev review`. Expect: pinned review with promise, map, findings, receipts in the Hermes plugin registry (Day 6) projected to GitHub.

## Reading a receipt in 60 seconds

Header pin (head/base/generation) → verdict → blocking findings (obligation per finding) → Remaining Boundaries (guaranteed gap list) → settlement + cost. Full form: `references/anatomy-of-a-rev-review.md`.
