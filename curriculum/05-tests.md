# Module 05 — Tests as Evidence Machines

Full treatment: references/bad-tests.md + Module 01 §2. First principle: test = apparatus that must distinguish promised behavior from its absence under stated conditions. Design/review tests by distinguisher: what wrong world still passes? (Supplier swap, patch-target drift, lifetime truncation, mock substitution, snapshot freezing, ambient fixtures.)

Test design derivation: start from promise failure modes (Module 04 relations negated), build smallest apparatus per mode with real path where class demands (resolution/config/security/IO), assert relations not frozen values, prove sensitivity by mutation (delete/weaken behavior -> red on symptom). Flakiness is apparatus noise: characterize (timing/order/ambient), manifest as debt, never retry-to-green.

Exercises: sensitivity-audit one suite slice (report % with red-probe evidence); rewrite one snapshot test as contract test; build one wrong-world-passes demonstration and close it.

## Apparatus design studio
Given promise failures (negated relations from Module 04), design per failure: fixture (minimal world), action (single operation under test), distinguisher (observation separating success/failure worlds), sensitivity proof (mutate behavior, observe red), cost (runtime/flakiness budget). Reject apparatuses where fixture setup can supply asserted state (isolate supplier), where mocks replace class-demanded real paths, where assertion reads implementation details that move with refactors (patch-target drift) without identity guard.

Suite review studio: draw distinguisher coverage matrix (failure modes x tests, mark sole distinguishers in red). Sole insensitive distinguisher under merge-critical promise = highest priority test debt. Property-based generation: state generator invariants explicitly; shrinking output becomes regression fixture (pinned seed + case).

Historical studio: re-derive #126167 apparatus flaw from timeline (write order), propose repaired apparatus (isolate synthetic write, assert before any human turn, durable read), prove sensitivity by deleting synthetic write (must go red).
