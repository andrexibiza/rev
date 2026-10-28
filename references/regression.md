# Reference: Regression Detection (Regression Detector hat)

Normative. Sources: Intro Ch.5, Ch.13; #90145 generation fencing; Hermes PR #139222 protocol (27 race/coarse-timestamp/lost-update bugs mined from 30 days merged fixes).

## 1. Comparison discipline

Regression = behavior at head worse than at base for a promised property, attributed to this change. Requires: pinned base+head, same check both sides, attribution (change introduced vs pre-existing touched vs unrelated moved base). Diff is between two selected versions — wrong base misattributes. Pre-existing defect found during review keeps origin label; author does not inherit it; proposal dependence stated (blocks / leaves open / separate issue owns repair).

## 2. Classes and probes

- **Direct break:** red on head, green on base, same test/env. Strongest form; still confirm failure reaches promised behavior (not setup).
- **Race / lost-update / coarse-timestamp:** mined class from Hermes history. Probe with real processes/threads forcing interleaving on parent and head (temporary home, no mocks, no provider calls). Timestamp-resolution assumptions (same-tick overwrite) need forced same-tick cases.
- **Generation ABA:** stale actor settles successor work (see authority.md §4). Probe: revoke/rotate between queue and execution; stale receipt must not settle.
- **Force-push drift:** review at H1, head moves to H2. Range-diff revalidation mandatory; prior approvals void on changed commits (Blind Witness Wave 3).
- **Capability regression:** fix passes narrow assertion while disabling legitimate behavior (Intro Ch.12). Probe legitimate controls (aliases, synthetic vs fresh input distinctions, owed messages) alongside failure path. Repair obligation states property + behavior to retain; author chooses mechanism.
- **Performance regression:** same-workload timing/memory at base vs head with stated budget (Performance hat in disciplines.md); single noisy run is QUESTION, repeated delta is FINDING.

## 3. Sequence and output

Pin -> promise properties list -> base receipts -> head receipts (identical selections) -> interleaving/ABA probes where stateful -> attribution per failure -> verdict scope equals compared scope. Re-review after fix is new bounded assessment (base = previously reviewed head) with sequence preserved: observation, correction, changed artifact, updated assessment. Historical findings never silently edited; conclusions updated with new pin.

## 4. Mining history like Hermes (pattern discovery)

Regression detection improves by mining merged history: Hermes maintainer mined 27 race/coarse-timestamp/lost-update bugs from 30 days of merged fixes on PR #139222 and turned class into probes. Rev procedure per repo (campaign mode, monthly): cluster merged fix PRs by mechanism (not title keywords — by broken relation), promote clusters with >=3 instances to named classes with forced-interleaving or state-transition probes, add classes to repo check files. Each class entry: broken relation, probe recipe, credited mining source. Classes decay: if probe finds zero in 2 cycles, keep (absence scoped) but lower lane priority — never delete history.

Change-risk scoring from graph + history: files/seams with prior defect density, authorship concentration (bus-factor), recent churn, radius. Score routes lane depth (compressed vs full geometry) and human reviewer suggestions. Score never gates alone; it allocates attention (Microsoft lesson: prior defects + size + authorship predict post-release defects better than review activity — use them for triage, not blame).

## 5. Compatibility regressions (contract surfaces)

API/data/docs regressions are regressions: consumer census at old pin vs new pin, contract relation tests both sides, deprecation windows honored. Electron/desktop: persisted profile/config forward+backward compat (new code reading old state, old code surviving new state during rollback). Provider-facing representations: field meaning drift without name change is silent breaking change — diff semantics, not just schema shape.

Output addition: regression report table (property | base receipt | head receipt | attribution | probe). Empty table with "no regressions found" must still list properties compared — uncompared properties listed as gaps.

## 6. Bisection and minimization (when delta unknown)

Automated bisect over merge queue with distinguisher as oracle (test must be deterministic — flaky oracle poisons bisect; sensitivity first). Minimization: delta-debugging on inputs/diffs to smallest reproducing case becomes regression fixture. Merge-queue regressions: attribute to batch members via bisect, not batch blame. Results receipted (range tested, first-bad pin, oracle identity).

## 7. Review latency vs thoroughness (operating data)
Industry envelope (knowledge-mapping §13) sets human sitting design; lane design mirrors: parallel blind lanes buy latency without buying scope inflation (each lane bounded). Track per repo: latency by radius class vs escaped-defect linkage (post-merge incidents/reverts joined in ledger). Faster with more escapes = process regression, investigated like code regression (ops finding, geometry/cost changes via adjudicated policy, not heroics).
