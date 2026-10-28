# Module 08 — Data, Performance, Reliability: State at Scale

Primitives: State/Lifetime, Boundary. Hats: data guardian, performance, reliability.

## Data first principle
Persisted state outlives code versions. Every migration is a transformation whose invariants are rows users own. Derive checks: schema change -> backfill correctness (relation assertions, not row counts alone) -> dual-read/write window generation-fenced -> cutover proof on exact snapshot -> rollback or explicit owner-waived irreversibility with backup receipt. Snapshot/window widening (Module 01) is the classic data-loss shape: surviving row never proves consumed window. Privacy: retention/deletion promises are lifetimes; deletion must span representations (backups, caches, logs, exports) or state remaining scope honestly.

Exercises: migration rehearsal on copy with row-relation assertions; deletion-lifetime map for one PII field.

## Performance first principle
Performance is a promise (budget) plus measurement under stated workload. No budget = QUESTION, never PASS/FAIL by feel. Base-vs-head same-workload deltas; complexity reasoning (N+1, quadratic joins, hot-path allocation) locates risk, repeated measurement decides. Single noisy run distinguishes nothing (Module 01 sensitivity applied to time).

Exercises: budget declaration for one endpoint; N+1 hunt with query-count assertion that can go red.

## Reliability first principle
Failures are normal inputs: timeouts, partial completion, duplicate delivery, crash between steps. Design from settlement states (authority.md): every operation idempotent or fenced, retryable vs terminal decided by policy not prose, indeterminate reconciled against durable truth. Backpressure and timeouts are behavior promises; test by fault injection (kill between claim and spawn, delay past lease, duplicate webhook) — the #93943 crash matrix as general method.

Exercises: crash-point table for one async flow; duplicate-delivery replay test.

## Studios
Data studio: rehearse expand-contract on fixture table (1M synthetic rows): receipts required — backfill watermark progression, discrepancy query zero, cutover generation fence proof, restore-from-backup timing. Fail any step, redesign before real review claims.
Performance studio: take endpoint over budget; profile, hypothesize relation (queries per request as function of N), add counting distinguisher, fix, delta report with variance. Lesson: fix without distinguisher regresses silently next quarter.
Reliability studio: implement lease-claim flow; fault script kills worker at each crash point in CI; settlement table must match Module predictions exactly. Mismatch = design or code defect, argued from receipts.
