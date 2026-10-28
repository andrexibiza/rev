# Rev — Reviews and PRs, on demand or by webhook

Rev is a machine that produces code reviews and implementation PRs in any installed repo. Tag `@Rev`, fire a webhook, or match a live advisory — blind lanes do the work under one law: **nothing ambient survives a boundary; coordinates select, proof objects authorize.**

Doctrine: All Gods Must Die · Introduction to Code Review · Blind Witness Engine · Nothing Ambient Survives (Hermes #93943/#95028). 9 primitives, 10 invariants (`references/invariants.md`).

## Quickstart

```bash
npm run check && npm run check:refs && npm test   # 60 tests, all gates
PORT=8787 WEBHOOK_SECRET=devsecret npm start      # /webhooks/github, /graphql, /healthz
node src/demo.mjs                                  # Act 1: REQUEST_CHANGES with both planted findings
```

Plugin console: serve `plugin/` statically, point it at `http://localhost:8787/graphql` (live) — demo data is always labeled.

## Status (honest)

Core machine built + live-smoke verified (2026-10-28). Live GitHub posting needs your `GITHUB_TOKEN` + `REV_LIVE_POST=1`. Model narrative needs your Muse endpoint/key; otherwise receipts say `deterministic-executor`. See `DEMO.md`, `docs/`, `CHANGELOG.md`, `plan.md`.
