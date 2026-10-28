# Module 11 — Release, Observability, Incidents, Costs

Primitives: Authority (release != merge), Evidence over time. Executes references/vuln-response.md + disciplines.md.

Release derivation: MERGED proves main contains change green at merge SHA. Release adds: artifact built from that SHA (built artifact + real protocol peers as system under test, #90150 — source-green never proves artifact behavior), staged rollout with flags, migration order, observed SLOs, rollback edge rehearsed. Each step receipted; release authority separate grant.

Observability derivation: unobservable promise is unverifiable in production. Logs/metrics/traces/alerts designed with feature (trace kinds: authority/lane/execution per schema §8). Alert must name promise broken + runbook edge in graph. Missing observability on new failure mode = finding at review, not post-incident surprise.

Incident method (backwards factory): ingest incident as graph event -> implicated merges via deploy window + blast radius -> broken promise/seam/test-insensitivity identified with pins -> outputs: graph diff, red-capable regression test, new check file, ledger credit. Radius model errors themselves get regression checks. Blameless language, exact evidence.

Costs: every WorkEvent carries cost receipt (compute, tokens, CI minutes, wall-clock, human minutes). Unit economics queried: cost per verified finding, per merged fix, per closed disclosure, per incident prevented (last one estimated, labeled estimate). Swarm optimization target is cost per verified outcome, never raw throughput. Disclosure-to-merged p50/p90 per ecosystem reported from ledger only.

Exercises: release receipt chain for one change; incident tabletop with radius reconstruction; cost audit of one review (what did each verified finding cost?).

## Studio: incident tabletop (90 min)
Fixture: bad deploy + stale dashboard. Teams reconstruct timeline only from receipts/graph (no chat logs). Score: implicated set precision/recall vs ground truth, time to distinguishing test, check-file quality. Second run with observability gaps removed quantifies Module value. Cost studio: price one real review end-to-end; identify most expensive verified finding and cheapest; propose geometry routing change with expected savings + quality guard (seeded-defect rate must not drop).
