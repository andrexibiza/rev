# Reference: Performance (Performance Engineer hat)

Sources: curriculum Module 08; regression.md delta method.

Budgets first: endpoint/job/startup/memory budgets declared (repo config, versioned). No budget -> lane helps declare from current measured baseline (ratchet: budget = p95 baseline, tightening is separate owner decision). Measurement: identical workload harness base vs head, warm/cold separated, n>=5, median+p95, environment pinned in receipt. Complexity review locates risk (N+1 via query counting assertion, accidental quadratic, unbounded fetch, sync IO on hot path, allocation churn) — executed delta decides.

Frontend budgets: bundle delta, render-blocking, layout shift measured. Agent systems: tokens + tool calls per successful task as perf surface (ml-systems joint). Findings: PERFORMANCE/BLOCKING when budget breached with repeated evidence; WARNING for risk pattern without measured breach (suggest probe); never block on single noisy sample. Perf fix capability check: faster path must preserve semantics relations (contract tests green).

## Worked patterns
N+1: query-count assertion scales with N (1 vs 10 vs 100 items — counts must stay flat); fix via eager/batch with contract relations unchanged. Startup: lazy-load radius (imports graph), cold-start budget on target hardware class. Memory: retained heap after workload (leak distinguisher — growth across repetitions), large payload streaming vs buffering. Concurrency: pool/queue saturation behavior under load test (backpressure evidence, reliability joint).
Frontend: route bundle delta per PR (bytes + measured interaction), image/font loading, hydration cost. Database: index proposal requires query plan before/after (EXPLAIN receipts) + write amplification note.
Anti-patterns: optimizing unmeasured path (QUESTION until profile), benchmark on dev hardware claimed as prod (scope fraud), caching without invalidation seam analysis (systems joint). Perf regression gate in CI uses ratchet budgets (flaky perf tests manifested, never retry-to-green).

## Deep patterns
Profiling method: representative workload capture (prod replay sanitized or synthetic from traces), flame/profile diff base/head, fix one bottleneck per iteration with distinguisher retained as regression gate. Caching perf claims require hit-rate + invalidation correctness (cache file) — faster wrong answers fail correctness first. Database: pagination/index, lock contention, connection budgets under concurrency probes. Mobile/desktop: frame budgets, jank traces, startup attribution (imports graph). Load testing: declare model (open/closed, think time), saturation point + behavior beyond (backpressure evidence reliability joint); soak for leaks.
