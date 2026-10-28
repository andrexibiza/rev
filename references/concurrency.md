# Reference: Concurrency + State (Systems deepening)

Failure relations: race (order assumption), lost update (read-modify-write without fence), coarse-timestamp collision (same tick overwrite), deadlock/livelock, stale read across generations, duplicate execution under retry. Probes force interleavings deterministically (barriers, controlled schedulers, real processes/threads — sleeps as synchronization = flaky apparatus, bad-tests joint).

Review method: shared-state census (writers/readers, lock/ownership, generation fences), happens-before claims per promise, lock scope equality (proof of holding vs mutation window — #90144 topology form), ownership transfer points (queue handoff = authority edge). Single-threaded reasoning about multithreaded code capped at QUESTION.

Patterns: optimistic concurrency (version check at commit), single-writer, actor/queue serialization, idempotent handlers, monotonic watermarks. Each pattern's failure mode named (ABA on version reuse, head-of-line blocking, poison messages) with distinguisher.

Language lenses: shared-memory threads (data races, lock ordering), async/await (cancellation points, unawaited tasks as orphan authority), event loops (blocking calls), distributed (clocks, partitions — split-brain settlement). Each lens lists race windows in review: check-then-act, read-modify-write, publish-then-init, close-during-use.

Deliverable in review: concurrency map (shared objects, guards, generations) for touched radius when shared state present; absence claim ("single-threaded path") evidenced by call graph, not assumption. Load/stress probes scoped: correctness under concurrency proven by forced interleavings first; throughput second (performance file).
