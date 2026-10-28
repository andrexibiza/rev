# Reference: Testing Strategies (designing suites, companion to bad-tests)

Levels by distinguisher economics: unit (relations, fast), contract (boundaries: API, provider, filesystem, time), integration (seams crossed with real participants), E2E (promise-level, few, stable), property (relations over generated inputs), mutation (suite calibration), chaos/fault (reliability), eval (ML/search quality). Each level owns failure classes; gaps mapped explicitly (which promise failure has no distinguisher at any level = top test debt).

Test data: builders with defaults + explicit overrides, no shared mutable fixtures, time/ID determinism (injected clocks/IDs — ambient time in tests = flaky seed), PII-free. Parallel safety: isolated state per test (temp homes/dirs/ports) — suite as child-process authority problem (explicit env).

CI design: fast lane (unit+contract, PR gate), full lane (integration/E2E nightly + pre-release), flaky quarantine workflow, test selection by radius (graph: run distinguishers for touched radius fully, broader on schedule — selection logic itself tested; selection never skips sole distinguishers for blocking claims).

## Deep patterns
Risk-based allocation: suite budget (CI minutes) allocated by radius x defect history; slow tests justify or split (fast/full lanes). Test review in PRs: new tests reviewed with same tuple discipline (what distinguisher added, sensitivity). Snapshot governance: approved snapshots manifested; bulk-accept changes = BLOCKING pattern (review blindness at scale). Visual tests: pin rendering env, diff thresholds declared, stale baselines watermarked. Chaos/game days quarterly per critical promise; results feed gallery.

Anti-patterns gallery: ice-cream cone (E2E-heavy), hourglass missing contract layer, duplicate distinguishers, tests mirroring implementation (change both together always green — patch-target cousin), time-dependent without clock injection.

## Ecosystem test notes
Python: pytest fixtures scope leakage (ambient state), monkeypatch target identity (patch where looked up, not where defined — canonical patch-target lesson). Node: fake timers masking real interleavings (concurrency probes need real timers segment). Rust: doctests executed (docs parity free), property via proptest relations. Go: table tests with subtest identity, race detector as EXECUTION probe (not proof of absence — scope stated). All: golden files manifested like snapshots (bulk accept blocked).
