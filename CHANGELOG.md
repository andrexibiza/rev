# Changelog

All notable changes to Rev are documented here. Format follows Keep a Changelog. Versions are library/product versions (see `references/VERSION.md`). Every entry links its receipts (tests, gates, pins) — changelog claims without receipts are marketing, not record.

## [Unreleased]

### Added
- Adversarial self-review (`REV-REVIEW.md`) — Rev reviewing its own Day-1 build; findings tracked to fixes or accepted gaps.
- Living documentation set (`docs/`) — built as we go, parity-gated like all Rev docs.

### Fixed
- (tracked in REV-REVIEW.md; entries move here as fixes land with test receipts)

## [0.1.0] — 2026-10-27 (Day 1 build-out, unreleased to any registry)

### Added
- Doctrine + plan artifacts: `plan.md` (7-day hackathon plan, 2026-10-28–11-03 + buffer 11-04), `schema.md` (knowledge graph + real GraphQL contract, 462 lines), `agents.md`, `SKILL.md` (progressive-disclosure core).
- Reference library: 49 files, ~24k words (`references/`, index + anti-stub gate `scripts/check-refs.mjs`), derived from Introduction to Code Review, Blind Witness Engine, All Gods Must Die, Hermes #93943/#95028 (+ #90142/#90144/#90145), Conventional Comments, OSV schema, CISA KEV, OWASP Top 10, GitHub CODEOWNERS/Apps/protected-branch docs.
- Curriculum: 14 files, ~6k words (`curriculum/00–12` + README) from first principles; nine primitives adopted in-build (Promise, State, Boundary, Change, Evidence, Authority, + Time, Identity, Cost); ten core invariants encoded (`references/invariants.md`).
- Day-1 machine skeleton: `src/types.mjs` (ProofObject/WorkEvent/Receipt with widening + secret guards), `src/authority-map.mjs` (CODEOWNERS resolver, fail-closed), `src/webhook.mjs` + `src/app.mjs` (signed GitHub webhook, typed refusals), `scripts/check.mjs` (2K Law ratchet + manifest).
- Fixtures + checks: planted demo fixtures (cap bug, wrong-supplier bad test, reachable/unreachable advisory spec), `checks/` seeds (security, tests, advisories, api), `tests/day1.test.mjs` (6 tests after B1 fix).

### Verified (receipts, 2026-10-27)
- `npm run check` — 2K OK. `npm run check:refs` — REFS OK (indexed, no stubs). `npm test` — 5 pass / 0 fail.
- Live HTTP smoke: BLOCKED by sandbox listen EPERM (not code failure); handler-level coverage exists in unit tests. Re-run outside sandbox before Day-2 claim. See REV-REVIEW.md.

### Known gaps (honest, tracked)
- GraphQL SDL references generated Connection types without defining them in-file (schema.md §5.5 note) — Day-2 must emit real types or trim.
- Authority glob is simplified (no `**`, no mid-path `*` segments) — see REV-REVIEW.md finding.
- Hermes Desktop plugin API + Muse access unverified (plan Risks).
<!-- appended 2026-10-27 review fixes -->
### Review fixes (2026-10-27, REV-REVIEW)
- Fixed CODEOWNERS glob (B1): fnmatch-style matching incl. mid-path *, **, basename-at-depth; +1 test (6/6 green). Fixed gate root paths to fileURLToPath (N2). Emitted full Relay Connection/PageInfo/GraphNode SDL in schema.md Appendix A (B2, document level).

## [0.2.0] — 2026-10-27 (Days 2-6 core build, integrated)
### Added
- Durable queue (src/queue.mjs, 10 tests): idempotent admission, fenced leases, replay, indeterminate handling.
- Knowledge graph + GraphQL (src/graph.mjs, src/graphql.mjs, 7 tests): SHA/generation pinning, AFFECTS vs REACHES, blast radius, zero-dep executor (queries subset, honestly headed).
- Advisory watcher (src/watcher.mjs, 7 tests): OSV normalization, package/lock/Docker/Actions matchers, triage CRISIS/STANDARD/MONITOR/NO_ACTION.
- Blind factory + composer + demo (src/factory.mjs, review.mjs, demo.mjs): witness execution probe finds cap bug, sensitivity probe flags bad test, adjudication, fresh-review loop. Demo markdown verified.
- Hermes plugin registry UI (plugin/): severe monospace console, registry/interlock/lanes/ledger, demo-data fallback labeled. GraphQL handler available for live wiring.
- E2E tests (tests/e2e.test.mjs): queue+demo, watcher, GraphQL. Full suite 36/36, 2K + refs gates green.
### Known gaps
- GitHub App webhook now enqueues PR work idempotently (queue wired in src/app.mjs); lane execution from queue + GitHub posting is next (factory verified offline + queued admission verified by test).
- Live HTTP smoke still needs unrestricted shell (sandbox EPERM).
- Muse lane intelligence not wired (factory probes are deterministic executors; model lanes plug into same brief contracts).

## [0.3.0] — 2026-10-28 (worker/projector/model wiring)
### Added
- Queue worker (src/worker.mjs): claim->run->ACK/NACK; projector (src/projector.mjs): GitHub review posting, dry-run unless REV_LIVE_POST=1 + GITHUB_TOKEN.
- Model provider (src/model.mjs): Muse endpoint when REV_MODEL_ENDPOINT/REV_MODEL/key set; otherwise labeled deterministic-executor (never fabricated).
- GraphQL HTTP endpoint wired in app (/graphql) for plugin live mode; webhook enqueues to durable queue. Tests 40/40.
- DEMO.md 3-minute runbook. Remaining externals (your credentials, not code): GitHub token+repo for live post, Muse endpoint/key for model narrative, Hermes Desktop native packaging API, recorded video file.

## [0.4.0] — 2026-10-28 (Entire project — Days 4-7 completion)
### Added
- Blind fix lane (src/fixlane.mjs): contract-only implementation, repaired fixture proven at cap boundaries, dual fresh-review gate. Original fixture untouched.
- Crisis lane (src/crisis.mjs): advisory->REACHES proof->upgrade->simulated merge->MERGED receipt with disclosure/triage/merge timestamps; unreachable -> NO_ACTION.
- Traces + costs (src/traces.mjs): AUTHORITY/LANE/EXECUTION spans with allowlists (secret + chain-of-thought rejected), cost receipts + per-outcome aggregation.
- Submission package: README.md, DEMO.md, plugin/manifest.json. Full suite 60/60, gates green.
### Remaining externals (credentials/hardware, not code)
- Live GitHub posting + Muse narrative need user token/endpoint. Hermes Desktop native packaging needs Desktop API. Demo video needs recording. Federation suite + public benchmark are roadmap (references).

## [0.5.0] — 2026-10-28 (Real Hermes plugin)
### Added
- hermes-plugin/rev/: native Hermes plugin (plugin.yaml + register(ctx), 3 tools, bundled skill) + Desktop plugin (desktop/plugin.js, pane+status). Register harness verified (tools match manifest). Doctor attempted — blocked by Hermes dep sync network (PyPI), not plugin code; see hermes-plugin/rev/README.md.
