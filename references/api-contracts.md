# Reference: API Contracts (API Guardian hat)

Promise surface for strangers. Sources: curriculum Module 09; authority scope law applied to versioning.

Contract elements (each separately versioned in reasoning): transport shape (fields, types, nullability), semantics (meaning per field — silent meaning drift is breaking without shape change), errors (codes, shape, retryability semantics), ordering/pagination stability, idempotency (replay safety, key scope/expiry), auth scope per operation (metadata vs contents split, #90200), rate/timeout behavior, deprecation policy.

Review method: consumer census at base (incl. unknown external consumers if public — assume they exist), contract relation tests (golden relations, not frozen bytes; error-shape assertions), compatibility matrix (old client/new server, new client/old server during rollout), changelog as promise document (parity-gated like docs). Breaking detection: field removal/rename, type narrowing, error-code repurposing, ordering change, auth widening (security), auth narrowing (availability breaking). Findings: CONTRACT/BLOCKING for unversioned breaking; REQUIREMENT question when version policy undeclared (expose owner decision, never invent).

Versioning strategies compared (state repo's, don't impose): URL major, header/media-type, additive-only with expand-contract migrations. Expand-contract for data-backed APIs: add new, dual-serve, migrate consumers, contract old — each step separately shippable/receipted. GraphQL-specific: field deprecation lifecycle, persisted-query compatibility (schema.md §10 additive rule), N+1 resolver cost as contract (perf hat joint finding).

## Worked patterns
Expand-contract (DB-backed field rename): 1 add new field (both written), 2 backfill + dual-read with relation assertion, 3 consumer census confirms new-field adoption, 4 contract old field (deprecation receipt, removal generation named). Each step independently mergeable; skipping to step 4 in one PR = BLOCKING (radius = all consumers at once).
Error repurposing: reusing code 409 for new meaning breaks client retry logic silently — treat as breaking even though shape identical (semantics dimension). Idempotency: key scope (per-principal? per-resource?), expiry, payload-mismatch behavior (same key + different payload must refuse, never replay first result blindly — settlement discipline).
Pagination: cursor stability under concurrent inserts; offset pagination on mutable lists is ordering bug waiting for scale. Webhooks as API: signature, replay window, idempotent consumer guidance, versioned event schemas (Rev's own GitHub projector follows this).
Review checklist (verifiable): contract tests exist and can go red (mutate field meaning in test double, suite must fail); compat matrix executed (old/new x client/server); deprecation dates in changelog + code (parity); unknown-consumer assumption stated for public surfaces.
