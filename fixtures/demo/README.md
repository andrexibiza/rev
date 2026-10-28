# Demo fixtures (Day 1 selection)

Demo repo (to be stood up Day 3): single small Node service with three planted, labeled fixtures. Fixtures live here as spec + seed code; demo branch pins them.

1. Real bug (Act 1 blocking): `discount.mjs` applies percentage discount to tax-inclusive total in wrong order for one path. Test exists and can go red.
2. Bad test (Act 1 bad-test finding): `test/bad.test.mjs` asserts final state supplied by a later setup step, so it passes even when the protected write is removed. Cannot go red by construction.
3. Reachable advisory target (Act 3): `package.json` pins a dependency version with a known OSV record; vulnerable function is actually called from request path (reachability true). A second pinned dep is version-matched but never called (reachability false -> NO_ACTION receipt, no PR).

Acceptance per fixture is in `tests/day1.test.mjs` (seed sanity) and Day 3/5 lane tests.
