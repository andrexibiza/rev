# Reference: Public Benchmark (Developer-Action Evaluation)

Why: vendor benchmarks disagree >2x (82% self-reported vs 36% rival bench on same tool class); no consensus baseline; evaluation protocol is competitive + federation infrastructure.

Design (Martian-style, hardened): corpus = real public PRs where review bots/humans participated, timelines reconstructed (suggestion -> developer response -> landed change). Hit = developer acted on suggestion (merged change addresses it / explicit acceptance), not model-judged correctness. Report precision/recall/F1 per tool/hat/geometry + acceptance, discussion, rejection rates (wild acceptance ~36% accepted / 56% rejected in CodeRabbit mining is the fatigue baseline to beat). Seeded-bug benches (50-PR style) reported separately, never mixed with wild corpus (different claims).

Integrity: harness + corpus manifest open (MIT), dataset cards with selection effects (repos, languages, bot-present bias), contamination controls (PRs after model cutoffs, dedup), human adjudication sample for hit-label agreement (inter-rater stats published — AGMD related work §4.1 blinding/agreement). Rev self-results published with same harness including failures; geometry + model pins declared (benchmark claim without pin = coordinate).

Metrics beyond F1: time-to-first-verified-finding, cost per acted finding, wrong-green rate (approved with later revert/incident linkage), maintainer burden (comments per acted finding). Leaderboard presentation bans single-number ranking without CIs + corpus version.

## Execution plan (post-demo, federation track)
Phase 1 corpus: 500 PRs across 10 repos/4 languages with bot + human reviews, timeline reconstruction pipeline + adjudicated hit labels (double-label 20% for agreement stats). Phase 2 harness: tool adapters (Rev geometries, 2 external reviewers where licensable, human baseline sample), cost/latency capture. Phase 3 publication: dataset card, harness repo, Rev self-report incl. failure gallery, leaderboard with CIs. Maintenance: quarterly corpus refresh (post-cutoff PRs), contamination audit. Governance via federation RFC (federation-conformance).
Risks: selection bias (bot-present repos), hit-label gaming (merged != correct — pair with revert/incident linkage for wrong-green rate), privacy (public PRs only v1).
