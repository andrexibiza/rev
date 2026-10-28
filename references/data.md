# Reference: Data (Data Guardian hat)

Sources: curriculum Module 08; #90144 snapshot law; #90145 generation fencing for migrations.

Lifecycle review: schema evolution (expand-contract), backfill (idempotent, resumable, relation-asserted, throttled with backpressure evidence), read/write cutovers (fencing token/generation per writer epoch), validation (row-relation queries on exact snapshot — surviving-row fallacy banned), rollback (tested restore or owner-signed irreversibility + backup receipt with restore drill date), retention/deletion across representations (primary, replicas, backups expiry, caches, logs, exports, analytics — deletion scope statement mandatory).

Data contracts between producers/consumers treated as API contracts (api-contracts.md) with schema registry parity. PII classification drives security joint review (encryption state transitions incl. legacy plaintext migration, AGMD pattern). Test data: fixtures must not carry production secrets (receipt value-free rule); synthetic suppliers labeled.

Findings: DATA/BLOCKING for unrehearsed irreversible migration, backup without restore evidence, deletion promise exceeding proven representations. Migration PRs require runbook + observed rehearsal receipts, not prose plans.

## Worked patterns
Online migration (large table): rehearsal on production-like copy with timing receipt; batched backfill with progress watermark (generation-fenced resume); dual-write discrepancy monitor; cutover during declared window; post-cutover relation audit on exact snapshot; rollback drill before cutover (restore from backup timed). Event schemas: versioned, consumers handle unknown fields (forward compat), replay from offset idempotent.
Analytics vs operational stores: pipeline lag as lifetime promise; late/duplicate events handled by idempotency keys; PII minimization in analytics (classification parity). Cache as representation: invalidation is seam; stale-read scope stated (acceptable staleness is promise, not accident).
Checklist: migration rehearsal receipt; backup restore date; discrepancy query results; deletion representation inventory signed by owner for privacy promises.

## Deep patterns
Eventual consistency promises per read path (read-your-writes where promised, fences via versions/watermarks shown to users when relevant — "processing" states honest). Multi-tenant data: tenant scoping in every query (auth pairing), noisy-neighbor, per-tenant export/delete. Data quality: invariants monitored as production tests (observability: row-relation alerts), quarantine for bad writes with settlement. ML data: training/serving skew, dataset generations + lineage (benchmark integrity cousin), PII in training corpora governed by privacy.
Warehouse/lake: schema evolution, late data, reprocessing idempotency, cost per query budgets for analytics jobs.
