# Architecture (as built + as planned — labeled per section)

Doctrine: `references/invariants.md` (10) over nine primitives (`references/primitives.md`). Canonical narrative: `plan.md` Approach; contract: `schema.md`.

## Built (v0.3.0, verified 40 tests + live smoke 2026-10-28)

Webhook + queue admission (`src/app.mjs`, `webhook.mjs`, `queue.mjs`), proof/authority (`types.mjs`, `authority-map.mjs` fnmatch CODEOWNERS), knowledge graph + GraphQL (`graph.mjs`, `graphql.mjs`, `/graphql` endpoint, SDL Appendix A emitted), watcher (`watcher.mjs`), blind factory + worker + projector (`factory.mjs`, `worker.mjs`, `projector.mjs` dry-run default), model provider (`model.mjs`, deterministic labeled fallback), plugin registry (`plugin/`). Gates: 2K + refs + check-refs.

## Still external / planned (do not cite as existing)

Live GitHub posting exercised only with user token+repo; Muse narrative only with user endpoint/key; Hermes Desktop native packaging; federation conformance suite + public benchmark (roadmap, references/federation-conformance.md, benchmark.md); demo video file.

## Data flow (target)

Trigger (webhook/tag/advisory) → proof object → WorkEvent (queue) → lanes (traces) → findings/repairs (graph) → settlement receipt → GitHub projection + plugin views (same GraphQL). GitHub is source material; Rev objects are truth.
