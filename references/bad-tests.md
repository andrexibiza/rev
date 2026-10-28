# Reference: Bad Tests (Bad-Test Finder hat)

Normative. Sources: Intro Ch.8-9 + PR #126167; AGMD moved-collector case (§8.3) + Wave-2 failure classes; #90144 snapshot law.

## 1. First principle

Implemented assertion decides what a test accepts/rejects. Name, docstring, author description locate intent only. Green proves observation under actual artifact/env/inputs/substitutions/assertions. Review question for every cited test: does this result establish the particular operation the surrounding sentence claims?

## 2. Defect classes (each with detection + witness)

1. **Insensitive / cannot-go-red.** Test passes when protected behavior removed. Detection: mutation probe — revert source to parent (C^), keep test, must go red on symptom (not ImportError). Hermes maintainer protocol (PR #139222): per commit, source to parent + own test red, restored green, plus real-process probes, no mocks. Rev automates this as EXECUTION spans.
2. **Wrong supplier.** Check sees desired state supplied by other operation. Case #126167: later human turn wrote state before durable assertion; pass did not establish earlier synthetic-turn write. Detection: order/lineage trace — who wrote asserted value, when, under which generation; isolate producer (disable later writers, re-run).
3. **Disconnected patch target.** Code moved; test patches old location; green while running code unpatched. Case: moved collector, test patched former dependency path. Detection: assert patch target resolves to object actually imported/executed at pin (identity assertion); graph edge test->exercised entity must be proven, not assumed by path string.
4. **Seam-blind.** Test covers function, promise lives across seam (persistence cycle, reload, provider prep). Case #130909: first reload correct, later cycle lost distinction. Detection: required-lifetime statement; test must span full lifetime incl. intermediate representations.
5. **Snapshot/window overclaim.** Focused pass advertised as suite/system green. Detection: receipt names exact selection+artifact; verdict scope equals executed scope (#90144).
6. **Mock-substituted real path.** Resolution chains, config propagation, security boundaries, remote backends, file/network IO tested only via mocks (Hermes contribution rubric forbids as sole evidence). Require real-path E2E with real imports + temp home (HERMES_HOME analog) for these classes.
7. **Behavior-contract violation.** Test freezes current value/snapshot instead of asserting relation between data (Hermes rubric: contracts over snapshots). Brittle-green hides regressions, blocks legitimate change.
8. **Flaky/order-dependent.** Pass depends on timing, ordering, ambient env/profile (ambient fixtures violate authority reference: test env must be explicit spec). Detection: repeat + shuffle + isolated env runs; quarantine is debt-manifested, never silent retry-to-green.

## 3. Review sequence

List tests cited as evidence -> for each: pin, assertion text, exercised entities (proven), supplier lineage, sensitivity (red-probe result or GAP), lifetime covered, mock boundary. Findings: BAD_TEST + BLOCKING when PR's safety claim rests on insensitive/disconnected test; WARNING when coverage lifetime shorter than promise; VERIFIED_SOUND requires red/green pair at exact head. Fixture credit separate from implementation credit (z1gon/ehz0ah lesson, #126167).

## 4. Demo anchor

Planted fixture (fixtures/demo): later-setup-supplied assertion (class 2). Lane must flag BAD_TEST before judging implementation, then prove replacement test red-on-parent/green-on-head. Refuse wrong green (Blind Witness Ch.20) even when suite is fully green.

## 5. Test architecture review (suite level, beyond single tests)

Single-test sensitivity is necessary, suite architecture decides economics: pyramid by distinguisher cost (unit relations cheap, real-path E2E expensive and reserved for classes demanding it: resolution chains, config propagation, security boundaries, remote backends, IO — Hermes rubric). Suite findings: coverage theater (line % without assertion mapping to promises), duplicate distinguishers (same wrong world passes ten tests), missing seam coverage (each Module 03 seam needs at least one crossing test or declared gap), fixture ambience (shared mutable fixtures leaking authority/state — tests inherit explicit env spec like child processes), time bombs (date/order/network dependence). Flaky policy: quarantine enters debt manifest with owner + expiry; retry budgets visible in CI receipts; flaky rate is cost-accounting input.

Mutation testing as calibration: periodic mutant sampling (invert condition, drop write, swap order) measures suite sensitivity distribution. Lanes cite mutant-kill stats for touched area when available; absence stated as confidence limit. Property tests preferred where relations generalize (round-trip, idempotency, monotonicity, parity invariants) — generated cases still need supplier/sensitivity reasoning.

Review sequence addition: map PR's safety claim -> tests cited -> suite context (is this the only distinguisher for that failure mode?) -> if sole distinguisher is insensitive, PR safety claim collapses regardless of other greens. That collapse is stated plainly: "Merge safety currently rests on T, which cannot go red (probe R). Blocking until T repaired or real-path probe added."

## 6. Executable sensitivity checklist (seed for .agents/checks/tests.md)
- [ ] For each test cited in PR body: assertion quoted, exercised entity identity proven (import/patch target at pin).
- [ ] Sole distinguishers for blocking claims: red-probe executed (source reverted, symptom red, not ImportError) + green restored; receipts linked.
- [ ] Supplier trace for state assertions: writer identified; later-setup masking excluded.
- [ ] Lifetime: test spans promise lifetime (cycles/restarts/kinds) or gap declared.
- [ ] Real-path requirement classes (resolution/config/security/IO): E2E with real imports + temp home present; mocks supplementary only.
- [ ] New tests added by PR themselves sensitivity-checked (test-the-test) before counting as evidence.
