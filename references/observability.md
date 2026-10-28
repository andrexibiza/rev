# Reference: Observability (Observability Engineer hat)

Sources: curriculum Module 11; schema.md §8 traces.

Design rule: every promise gets failure visibility designed with it. Logs structured (identities, generations, reason codes; value-free secrets discipline), metrics named by promise (success ratio, latency, settlement distribution incl. INDETERMINATE rate, cost per outcome), traces three kinds (AUTHORITY admission->settlement, LANE spans with digests, EXECUTION probes/spawns) sharing TraceId with WorkEvent. Alerts: promise + threshold + runbook graph link + owner; alert without runbook is noise debt (manifested). Dashboards are graph views (pin-aware for deploys: compare windows by generation).

Review checks: new failure mode without metric/alert = OBSERVABILITY/WARNING (BLOCKING for money/auth/messaging paths); log line containing potential secret values = SECURITY joint BLOCKING; trace span missing pin/policyHash = authority GAP. Retention: receipts outlive spans; span sampling never samples out refusals/indeterminate (rare + decisive events retained 100%).

Incident feed: observability gaps discovered in incidents become check-file entries (Module 11 backwards factory).

## Worked patterns
Golden signals per service (latency, traffic, errors, saturation) + promise-specific SLIs (settlement success, disclosure->merged duration, review turnaround by radius). Structured log schema versioned (fields: traceId, workEventId, pin, generation, reasonCode); free-text-only logs for consequential transitions = finding. Cardinality discipline: identities as exemplars/traces, not metric labels (cost joint).
Tracing in agent systems: span per lane/tool/child with digests (schema §8); sampling: head-based for volume, tail-based retention for errors/refusals; provider latency/cost attributes on EXECUTION spans. Alert tuning: precision/recall tracked from incident ledger (noisy alert manifested as debt with owner — alert fatigue is reliability risk, cf. AI review acceptance data: ignored signals = absent signals).
Checklist: dashboard query results at pin; alert test fire receipt; log sample redaction proof (sentinel secret absent); trace completeness (every WorkEvent has AUTHORITY span chain unbroken or refusal span).

## Deep patterns
SLO engineering: SLI selection from user promises (not convenient metrics), window/burn alerts (multi-window), error-budget policy linked to release. Logging levels governed (debug in prod cost/privacy), sampling with refusal/indeterminate carve-outs. Synthetic monitoring: promise probes from real locations (executed evidence continuously; synthetic green scope stated like test scope). Trace exemplars linking metrics spikes to spans. On-call ergonomics: alert precision tracked, runbook drills, dashboard generation-pinned during incidents (compare before/after deploy generations).
