# Reference: Frontend + Backend Craft (2026 full-stack lenses)

Frontend: state lifetimes (server cache vs client state vs URL vs form), revalidation seams, optimistic updates with rollback receipts (settlement thinking in UI), component contracts (props as API — api-contracts applies), design-system parity (tokens measured on rendered output), bundle/code-split radius, hydration mismatches (representation seam). Backend: request lifecycle (authn/z scope per operation, validation at boundary, service invariants, transaction scope equality), background jobs (reliability file), caching seams (invalidation, stampede, stale scope promises), search/index lag as lifetime promise, file handling (control-plane paths, .git lesson generalized: user content vs system content separation).

Joint full-stack changes: contract + UI + migration reviewed as one promise with three pins (api, web, data generations); partial deployment skew windows named. Monorepo radius: shared package change triggers consumer census across apps (graph).

Review pairing rule: full-stack PR reviewed as one WorkEvent with sub-pins per surface generation; frontend-only approval while backend contract unreviewed capped at COMMENT. SSR/SEO surfaces, edge rendering generations, auth token handling in browser (storage choice as security decision with XSS/CSRF traces) covered jointly with security/auth files.

Backend craft lenses: validation layers (boundary vs domain duplication drift), transaction boundaries (external calls inside DB transactions = reliability finding pattern), background extraction (sync work moved async changes promise — settlement visibility required, review-ops in product terms).
