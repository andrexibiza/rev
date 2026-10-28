# Rev Engineering Curriculum — From First Principles

This curriculum is the knowledge Rev executes. References in `../references/` are the compressed, loadable form. This directory is the full derivation: primitives first, disciplines derived, hats as applications. An agent (or human) who completes it can reconstruct any Rev check without memorizing it.

## How to read

In order. Each module states: primitives, derivations, failure gallery (real cases), exercises with verifiable answers, and the Rev lane that executes it. Nothing is asserted without a derivation or a cited case. Cases are drawn from public practice: Hermes reviews (#130909, #124787, #126167, #132365, #139222), architecture laws (#93943, #95028, #90142, #90144, #90145), All Gods Must Die campaigns, and the free Introduction to Code Review.

## Map

**Part I — Primitives (why review exists at all)**
- `00-foundations.md` — Software as promises over state across boundaries. Change, evidence, authority. The six primitives every discipline shares.
- `01-evidence.md` — What establishes what. Source, execution, report, experience. Sensitivity. Scope equality.
- `02-authority.md` — Coordinates vs grants. Monotonicity. Generation. Settlement. (Executes: `references/authority.md`)
- `03-systems.md` — Lifetimes, representations, seams, consumers. Blast radius. (Executes: `references/systems-mapping.md`)

**Part II — Finding disciplines (what can be wrong)**
- `04-correctness.md` — Promise vs implementation. Bug finding as relation checking. (Disciplined bug finder)
- `05-tests.md` — Assertions, suppliers, patch targets, sensitivity. (Executes: `references/bad-tests.md`)
- `06-regression.md` — Comparison, attribution, interleaving, capability preservation. (Executes: `references/regression.md`)
- `07-security.md` — Adversaries, secret flow, platform truth. (Executes: `references/security-architecture.md`)
- `08-data-performance-reliability.md` — State at scale: migrations, budgets, partial failure.
- `09-interfaces.md` — API contracts, UX/accessibility, ML systems, documentation parity.

**Part III — Acting disciplines (what to do about it)**
- `10-repair.md` — Contracts, blind implementation, capability-preserving fixes, credit/salvage.
- `11-release-incident.md` — Rollout, observability, incidents, costs. Disclosure-to-merged as timed system. (Executes: `references/vuln-response.md`, `references/disciplines.md`)
- `12-accounting.md` — Ledgers, interlock, diagrams as views, curriculum maintenance. (Findings accountant; this curriculum updates itself from ledgers.)

## Completion standard

A module is complete only when its exercises can be executed against a pinned repo and produce receipts. Reading without execution is exposure, not competence — for humans and lanes alike. Rev lanes load the reference form; this curriculum is how those references are audited, taught, and extended.

## Reading schedule (for human learners; lanes load compiled references)

Week pace: Day A Modules 00-01 (primitives + evidence) with exercises on own repo. Day B Modules 02-03 (authority + systems) + spawn-census studio. Day C Modules 04-07 (finders) with gallery drills 1-9. Day D Modules 08-09 (scale + interfaces). Day E Modules 10-12 (repair, release/incident, accounting) + capstone wrong-green exam (gallery 10-15 blind). Graduation scoped per Module 12 (kinds/radius/ecosystems witnessed), recorded in ledger.

Maintenance: curriculum owner reviews dismissal/incident deltas weekly; changes via PR with exercise updates; references recompiled in same PR (diff of both reviewed). Stale module (no delta in 90 days while incidents touched its domain) flagged in registry as curriculum debt.

## Reference compilation rule (standing)
Curriculum is depth source. references/ compiled per hat with: principle (1-3 lines), method steps, failure gallery refs, executable checklist seed, worked pattern. Compilation reviewed in same PR as curriculum delta; word count is not quality — decision-change test applies (blind-witness §12: each section names lane + decision changed).
