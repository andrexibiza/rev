# Reference: Caches, Search, Jobs (State accelerators and their seams)

Caches: every cache declares (source of truth, invalidation carrier, stale scope promise, stampede control, key identity incl. tenant/generation — unscoped key = cross-tenant leak pattern). Negative caching, CDN edges as generations. Search: index lag promise, ranking changes as behavior changes (evals for search quality: relation assertions on result sets), reindex generations (query pins index gen or declares float), deleted content tombstones across index/cache (deletion lifetime, data.md). Jobs/queues: see reliability (leases, idempotency) + scheduling (cron drift, missed-run settlement, timezone/DST as time relations). Webhooks outbound: signing, retry with idempotency keys for consumers, event versioning, delivery receipts (our projector follows own medicine).

Review triggers: cache key/TTL changes, index mapping changes, job schedule/retry changes automatically select this file + systems.

## Deep patterns
Cache correctness drills: stale-after-write window measured; cache-aside race (two miss fillers); invalidation on generation change (deploy must bump or prove compat). Search quality: golden query sets with relation assertions (must-contain, must-not-contain, ordering constraints), zero-result analysis, synonym/stemming changes as behavior changes with evals (ml joint). Jobs: cron as promise (schedule, missed-run policy, overlap policy — concurrent runs fenced or idempotent), poison-pill handling (DLQ settlement, alert), backfill jobs follow data.md gates.
Checklist: key-scope proof (tenant+generation in key), index generation on results API, job crash-matrix row per new job.
