# Reference: Reliability (Reliability Engineer hat)

Sources: curriculum Module 08; #93943 crash/settlement matrix generalized.

Design review from failure enumeration: for each async/remote operation list crash points (before claim, after claim before effect, after effect before settlement, during settlement) and required outcome per point (queued, reclaimable, safe-continuation under same identity, indeterminate+reconcile). Timeouts: budget per edge, total deadline propagation, timeout-after-start semantics. Retries: idempotency proof or fencing required; retry policy (attempts, backoff, jitter, retryable reason codes from policy not prose) versioned; retry storm / thundering herd controls. Partial failure: multi-destination operations state per-destination settlement (one success never settles all). Cancellation: propagation to children/descendants per descendant policy; cancelled work cannot settle later as completed (generation fence).

Chaos/fault probes: kill, delay, duplicate, reorder, revoke mid-flight — executed in test env with receipts. SLO language: availability/error budgets as promises; change risk charged against budget (release joint). Findings: RELIABILITY/BLOCKING for retry without idempotency/fence, settlement inferred from exit code, cancellation that orphans authority-bearing children.

## Worked patterns
At-least-once delivery + idempotent consumer beats mythical exactly-once (declare semantics; #93943 non-goal: never claim exactly-once distributed delivery). Lease pattern: claim with owner/token/generation, heartbeat renew, reclaim on expiry, settlement fences stale owner (implemented in Rev queue Day 2 — this file is its design source). Circuit breakers: half-open probes receipted; breaker state visible (observability). Bulkheads: per-principal/per-target limits prevent one tenant consuming swarm (multi-repo Rev: per-repo lane budgets).
SLI/SLO review: new dependency changes composite availability math — state it (99.9% service on 99.5% dependency cannot promise 99.9% without fallback evidence). Graceful degradation matrix: per dependency down/degraded/slow, user-visible behavior named (Module 09 flows joint).
Checklist (executed): fault-injection receipts per crash point; retry policy file diff; idempotency replay test (duplicate returns cached result, side-effect count = 1); cancellation propagation test.

## Deep patterns
Dependency failure matrix per integration (down/slow/lying — lying = invalid responses, hardest; validation + circuit patterns). Timeouts stack budget: end-to-end deadline partitioned per hop, propagated (headers/context with generation). Bulkhead + load shedding with honest user states (review-ops in product). Disaster recovery: backup restore drills timed (RTO/RPO as promises with receipts, data joint), region failover tabletop. Error budgets govern release pace (release joint: budget exhausted = feature freeze recommendation to owners, lane states math, owners decide).
