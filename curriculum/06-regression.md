# Module 06 — Regression and Capability Preservation

Executes references/regression.md. First principle: change is judged against base behavior users already rely on, including successful behavior. New failure attribution needs same-check both-sides comparison; capability loss counts as regression even when target assertion greens.

Includes: interleaving/ABA probes, force-push range-diff, legitimate-control suites (aliases, input-kind distinctions, owed async work), performance deltas with budgets, update discipline (observation->correction->changed artifact->updated assessment; history never silently rewritten, Intro Ch.13).

Exercises: legitimate-control inventory for one repair; base/head delta report with attribution column (introduced / pre-existing / base-moved).

## Studio: capability inventory
Before approving fix in stateful area, list legitimate behaviors at risk: input kinds (synthetic vs authoritative), aliases, owed async work, platform variants, accessibility flows, API compat windows. Each gets keep-green probe or explicit owner-accepted removal (design change labeled, Intro Ch.12). Fix PR lacking capability inventory on stateful change = incomplete submission (REQUEST_CHANGES with inventory request, not defect claim).

Studio: update-ownership (#132365 shape) — producer fixed, reader diverges. Regression question set: which participants interpret shared state, which tested at new pin, which remain gaps. Verdict credits producer, blocks protocol claim until reader parity evidenced or scope narrowed in title/docs.
