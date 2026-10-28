# Reference: Failure Gallery (seeded drills + historical cases; lanes calibrate here)

Each entry: shape, case, distinguisher that catches, hat. Seeded fixtures rotate values; historical pins immutable.

1. Ambient spawn escalation — relay launches child with inherited gateway env (#93943 at c89dd2b9). Distinguisher: spawn receipt env key-names vs grants; sentinel secret in gateway env must be absent in child. Security.
2. First-reload preservation — distinction dies second persistence cycle (#130909). Distinguisher: multi-cycle lifetime probe. Regression/Systems.
3. Valid values, wrong relation — workspace bytes vs recorded identity (#124787). Distinguisher: capture-time identity assertion under alias/symlink variants. Systems.
4. Wrong supplier green — later setup supplies asserted state (#126167). Distinguisher: supplier isolation (disable claimed writer). Bad-tests.
5. Patch-target drift — moved collector, test patches old path (AGMD §8.3). Distinguisher: executed-object identity assertion. Bad-tests.
6. Producer-only protocol claim — lock fixed, reader diverges (#132365). Distinguisher: participant census + reader probes. Systems.
7. Scope-widened restart — one idle model, whole router restarted (#90144 gallery). Distinguisher: proof-scope vs mutation-scope table. Authority.
8. ABA teardown — PID reused, stale actor kills successor (#90145). Distinguisher: (pid, start-marker) generation check under forced reuse. Reliability.
9. Split authority surprise — metadata write OK, contents 403 (#90200). Distinguisher: per-resource permission probes pre-flight. API/Security.
10. Fluent negation flip — "must not" -> "may" with perfect code blocks (BWE French). Distinguisher: semantic witness; structural gates blind by design. Docs-parity.
11. SHIPPED-as-merged — linked PRs counted as landed (AGMD §9.6 + audit limits). Distinguisher: MERGED requires merge SHA ancestor of main + green. Accountant.
12. Partial-audit PASS — caps/pagination blind spots certifying interlock (Exhibit A audit). Distinguisher: audit-the-audit (coverage census of checker itself). Accountant/Witness.
13. Discount-cap drop (demo seeded) — member path ignores cap (fixtures/demo). Distinguisher: boundary-value totals. Correctness.
14. Install-script ambush (seeded) — new postinstall spawns unbrokered child with full env. Distinguisher: spawn census diff. Supply-chain/Security.
15. Exactly-once claim (language drill) — docs/code claiming exactly-once delivery. Distinguisher: duplicate-delivery replay test or claim correction. Reliability.

Drill protocol: fixtures injected without lane knowledge of which gallery entry (blind), catch + correct classification scored; misses file reference defects (curriculum delta), not lane blame alone.
16. Stale-pin approval (Time) — review at H1, force-push H2, approval carried silently. Distinguisher: approval binds head SHA; H2 requires range-diff revalidation. Owner: Regression.
17. Same-name different-thing (Identity) — profile "prod" on two installs, findings routed cross-install. Distinguisher: composite IDs in every receipt; bare-name UI flagged. Owner: Systems.
18. Attention burn (Cost) — lane posts 40 low-value comments, maintainer dismisses en masse, real finding buried. Distinguisher: acted-rate per lane + comment-per-acted-finding budget in composer. Owner: Accountant.
19. Expiry mid-flight (Time) — token expires between claim and spawn, child launches on stale grant. Distinguisher: spawn-time revalidation probe with short-lived grants. Owner: Security.
20. Rename amnesia (Identity) — file renamed, defect history orphaned, "new file" reviewed without priors. Distinguisher: SUPERSEDES map + history query in analyst brief. Owner: Systems/Accountant.
