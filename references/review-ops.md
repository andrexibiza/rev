# Reference: Review Operations (queue, SLAs, staffing the machine)

Queues by settlement risk: interactive (human waiting, @Rev in PR), batch (campaigns, routine updates), crisis (KEV/reachable). Per-repo concurrency + cost ceilings (policy). Aging: QUESTION aging, INDETERMINATE aging (reconcile SLA shortest — ambiguity is risk), awaiting-maintainer aging (digest, never nag spam: batched maintainer digest with radius sort).

Declared SLAs per repo (policy data, measured from receipts): first-verified-finding latency, review completion by radius class, disclosure triage/merge p50/p90. SLA breach = ops finding (capacity/geometry), not lane blame. Human reviewer ops: sitting assignment respecting load/Busy (ownership-routing), review buddy for high radius, maintainer digest design (decisions needed first, FYI collapsed).

Metrics dashboard (GraphQL): outcome rates (acted/dismissed by reason), wrong-green, cost per outcome, geometry escalation rate, witness disagreement (health indicator — zero sustained = contamination audit). Weekly ops review updates references/curriculum (learning loop, Module 12).

## Deep patterns
Triage rotations for machine output: daily INDETERMINATE + refusal review (protocol health), weekly dismissal-reason coding, monthly geometry/cost review. Capacity planning from radius distribution (not PR counts). Judge/demo ops (hackathon): frozen demo repo, seeded fixtures pinned, fallback recording hash-verified, live-run checklist (network, tokens, App install, plugin build) rehearsed twice (Day 7 plan binding).
Escalation language: ops findings cite receipts (queue age distributions, cost curves) — no vibes escalation. Backpressure to requesters: queue position + ETA from measured lane durations, honest INDETERMINATE over fake progress.

## Merge queue operations (modern GitHub flow)
Queue as generation machine: entries tested against speculative main (queue generation), failures dequeue with receipts. Rev lanes must not double-test identically (cost: dedupe by head+base-generation), verdicts bind queue position generation; maintainer bypass of queue is authority act logged (bypass list state from ownership file). Demo alternative without queue: sequential maintainer merges with revalidation per merge (slower, clearer for 3-min demo — chosen default; queue support post-demo).
