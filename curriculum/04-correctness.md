# Module 04 — Correctness: Promise vs Implementation

Bug = established conflict between promised behavior and actual behavior with supported consequence (Intro Ch.10). Pattern alone is suspicion; suspicion becomes Question until reachability + meaning established.

Method: promise sentence (object+lifetime) -> participants/seams (Module 03) -> trace value/decision through representations -> identify relation that must hold (preserves, passes, checks, owns) -> evidence at relation (source + execution where behavior claimed) -> scope verdict to exercised paths. Off-by-one, null, ordering, units/currency/tax order, cap/threshold, timezone/timestamp resolution (coarse-tick lost update class, #139222 mining), error-path state corruption are instances; relation-first method finds them without checklist luck.

Fix-whole-class rule (Hermes rubric): locate exact manifesting line, then siblings sharing mechanism (all call paths, adapters, languages). Single-instance fix with live siblings = incomplete repair. Preserve-capability check on every fix (Module 06).

Exercises: convert three pattern-comments into relation findings or honest questions; sibling hunt on one real fix (list searched surfaces as scope).

## Relation catalogue (derive findings, don't memorize bug lists)
Preservation (value survives lifetime), Transformation (representation changes, meaning invariant), Routing (right participant receives it), Ordering (happens-before where promise requires), Exclusion (mutual where promised), Accounting (nothing created/destroyed silently: money, messages, rows, credits), Freshness (value current at generation of use). For each relation: state invariant, find mechanism claiming it, probe violation (adversarial input/order/timing), scope verdict.

Numeric relations drill: order of operations with caps/thresholds/tax/rounding — linear-looking code hides non-linear caps (demo fixture discount cap). Time relations: coarse timestamps collide; wall-clock across machines skews; monotonic clocks for durations only. Identity relations: equality by value vs by incarnation (Module 02 pairing) — wrong equality is correctness bug before it is security bug.

Worked teardown (generic): PR "fix: totals wrong for members." Promise: discounted (capped) subtotal taxed. Trace member vs non-member paths; non-member honors cap relation, member path drops cap (relation: Accounting + Preservation of cap invariant). Evidence: executed totals at boundary values (cap-1, cap, cap+1) base/head. Fix scope: relation restored on member path; siblings: guest, promo, refund paths checked for same cap drop (census stated).
