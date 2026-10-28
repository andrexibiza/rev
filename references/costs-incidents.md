# Reference: PR Costs + Incident Analysis (Accountant extensions)

Sources: curriculum Modules 11-12; plan success metrics.

## Cost model
Per WorkEvent cost receipt fields: lane compute seconds by LaneKind, tokens by model pin, CI minutes, wall-clock queue+run, human minutes (review/merge/clarification, self-reported or approximated — labeled), tool/API spend. Aggregations (GraphQL registry): cost per verified finding (by kind/severity), per merged repair, per closed advisory (disclosure->merged duration + cost), per repo per week. Optimization rule: reduce cost per verified outcome; raw review count and token burn are never success metrics (Krutauz lesson: activity != outcome). Expensive lanes justified by radius/severity; adjudicator may downgrade geometry with cost reason recorded (declared compression, blind-witness §5).

Budget guards: per-event cost ceiling in repo policy; ceiling breach settles RUNNING->FAILED(reason COST_CEILING) with partial receipts preserved (work done remains inspectable, never discarded silently).

## Incident analysis protocol
Trigger: incident event (manual link or observability alert correlation). Steps: freeze pins (deploy SHAs, graph generation) -> implicated change set (deploy window intersect blast radius) -> broken promise + seam + evidence-gap reconstruction -> distinguishing test that now goes red on implicated head and green on fix -> check-file/curriculum delta -> ledger closure with credit (reporter, responders, fix authors). Outputs linked bidirectionally (incident<->PRs<->findings<->receipts). Repeat-incident same class = process BLOCKING on accounting (system failed to learn; escalate to maintainers as architecture issue, Hermes-style single-defect-many-symptoms synthesis like #95028 when pattern spans subsystems).

Metrics: MTTR split (detect, triage-to-contract, fix, merge, release-verify) — optimize widest segment; disclosure response reuses same split.

## Dashboards that change behavior
Cost anomalies: lane retry loops (cost spike + zero verdict change) auto-pause with INDETERMINATE-cost settlement for human review — swarm must not burn budget proving same point repeatedly. Model routing by radius/severity (cheap lanes for leaf windows, strong lanes for adjudication/security) declared in policy; routing by "always strongest" is cost negligence, routing by "always cheapest" is quality fraud — policy states mapping + eval basis (ml-systems).
Incident timeline template (from receipts, no reconstruction from memory): detection (alert/human + timestamp), triage contract, implicated pins, fix PR, merge SHA, release verify, user-impact window, cost (human hours + infra). Timeline generated from ledger; human edits add, never replace, receipt facts (accounting integrity).
Post-incident action classes: code fix, test distinguisher, check-file rule, graph/radius model correction, observability gap closure, curriculum delta. Each with owner + due generation; overdue actions escalate in registry filter (incident debt view).

## Cost primitive operations
Budgets cascade: repo monthly -> per-WorkEvent ceiling -> per-brief ceiling (orchestrator enforces; breach = FAILED/COST_CEILING with partial receipts). Attention budget: human sittings counted (requests, pages, est. minutes from radius class) — maintainer attention is scarcest cost, protected first (digests, chunking, no duplicate asks). Cost reviews monthly: top cost per outcome by hat/geometry/model; routing changes via policy PR with eval guard (seeded catch rate must hold).
