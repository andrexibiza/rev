# Module 00 — Foundations: Software From First Principles

## The starting observation

Software is not text. Text is how software is written down. Software is behavior that people rely on: given these inputs, in this state, on this platform, this happens — every time, including the bad days. Code review exists because changing the text can change the behavior in ways the author did not intend and cannot see from the edited lines alone.

Everything in this curriculum derives from six primitives. If a Rev check cannot be traced to a primitive, it is taste, and it does not ship as a finding.

## Primitive 1: Promise

A promise is intended behavior someone relies on: a user ("my resumed task keeps its context"), a caller ("this function never returns null"), an operator ("this migration loses no rows"), a regulator ("secrets never reach logs"). Promises live in PR descriptions, issues, docs, APIs, tests, and habit. Code implements promises; it does not define them by existing.

Derivation: before judging any change, state its promise in one sentence with an object and a lifetime. "Preserves context" fails — which context, for whom, across what (turn? restart? provider switch?). A promise without object and lifetime cannot be verified, only opined about. (Introduction, Ch.4.)

Exercise 0.1: Take any merged PR. Write its promise with object + lifetime. List three audiences relying on it. If the PR text does not support your sentence, you have found your first review question.

## Primitive 2: State and Lifetime

Programs hold state that outlives single operations: files, rows, sessions, caches, queues, tokens, conversations. State passes through representations — written, stored, loaded, transformed, displayed, sent onward. Each representation can preserve, drop, or corrupt meaning while staying syntactically valid.

Derivation: correctness is a property of state across its whole required lifetime, not at the moment of writing. The #130909 lesson: a distinction surviving first reload but dying in a later persistence cycle is a broken promise with a passing first check. Therefore every preservation claim must name its lifetime, and evidence must span it. (Ch.4, Ch.6.)

Exercise 0.2: Pick a persisted field. Trace write -> store -> load -> use. At each hop, what could drop it silently? That list is your seam inventory seed.

## Primitive 3: Boundary

A boundary is where control, data, trust, or lifetime changes hands: function calls, processes, machines, providers, platforms, teams, time (queue now, execute later). Inside a boundary, assumptions hold cheaply. Across it, they must be carried explicitly or they evaporate.

Derivation: most production defects live at boundaries, because each side was locally correct. The durable rule of this curriculum: nothing ambient survives a boundary — context that is not explicitly carried, checked, and receipted does not exist on the far side. Authority is the sharpest case (Module 02), but the shape is general: identity, config, ordering, and error meaning all degrade at boundaries unless engineered not to. (Hermes #93943.)

Exercise 0.3: List every boundary a login request crosses in a system you know. For each, write what is explicitly carried vs assumed. Assumed items are your risk register.

## Primitive 4: Change

A change is a transformation: old artifact -> new artifact, preserving some things, altering others (Blind Witness Engine, Ch.1). Decomposition preserves bytes and changes location. A bugfix preserves capability and changes one behavior. A translation preserves meaning and changes language. Confusing what must stay invariant is the root of both breakage and false review findings.

Derivation: every review first classifies the transformation and its invariants. Judging a move as if it were a rewrite (or vice versa) produces findings about the wrong contract. Invariants become acceptance checks; allowed changes become scope. (All Gods Must Die, §1.)

Exercise 0.4: Classify five recent changes (move, fix, feature, upgrade, translation). For each, write invariants in one line. Notice how different the correct review is per class.

## Primitive 5: Evidence

Evidence is anything that helps decide a claim about an identified artifact — and different kinds decide different claims. Reading code proves what the code says at that revision. Running code proves what happened under those conditions. A person's report proves they reported it. None substitutes for another; each is strong exactly where the claim matches its kind.

Derivation: attach every conclusion to (claim, artifact pin, evidence kind). If the pin moved, the evidence is historical. If the kind mismatches (using a log that shows scheduling to claim execution), the conclusion is unsupported no matter how confident it sounds. Module 01 builds the full calculus, including sensitivity: evidence that cannot distinguish success from failure (a test that cannot go red) decides nothing. (Ch.8–9.)

Exercise 0.5: Find a green test suite claim in any PR. Write which specific operation each passing test actually distinguishes. Keep the gaps. Those gaps are the review.

## Primitive 6: Authority and Decision

Someone must be allowed to decide: accept, revise, merge, release, roll back. Authority is granted, scoped, revocable, and generation-bound — never inferred from proximity, seniority of comments, or possession of ambient state. Decisions separate cleanly: technical assessment (what the evidence supports), formal action (what the repo does), capability judgment (what the product should do). Blurring them corrupts all three.

Derivation: credit, review quality, and merge rights are independent variables. A diligent reviewer earns trust in assessments, not merge authority. A maintainer's merge does not retroactively make a review thorough. Rev therefore tracks investigator, implementer, reviewer, and authorizer as distinct roles with distinct receipts — and refuses to let any role certify itself. (AGMD acceptance contract; Ch.10, Ch.14.)

Exercise 0.6: For one PR, name who investigated, implemented, reviewed, and merged. Where two roles coincide, write what independent check still protected the decision.

## Failure gallery (primitives violated)

- Promise without lifetime: #130909 first-reload pass, later-cycle loss. (P1+P2)
- Representation trusted across boundary: workspace bytes vs recorded identity diverging at capture time, #124787. (P2+P3)
- Change misclassified: test "repair" that actually redefined what was asserted, #126167 sensitivity split. (P4+P5)
- Evidence kind mismatch: moved collector, test patching old location, green suite, broken connection (AGMD §8.3). (P5)
- Authority inferred from ambience: gateway environment inherited by relay-spawned child, #93943 seam at c89dd2b9. (P3+P6)

## Lane mapping

Analysts establish P1–P3 (promise, lifetimes, boundaries) as graph. Witnesses attack P5 (evidence sensitivity). Adjudicators fix P4 invariants as contract. Implementers perform P4. Fresh reviewers re-derive P5+P6 independently. Accountants preserve all six across time. Every later module is these primitives wearing domain clothes.

## Extended exercises (second sitting)
0.7 Translation audit: take one README section + locale version. List invariants (commands, links, negations) and check each — germination in miniature; note which checks are mechanical vs semantic.
0.8 Ambient hunt: in any running system you use, find one place where current/default/foreground state silently decides behavior. Write coordinate-vs-proof analysis + fix sketch (explicit carry + receipt).
0.9 Two-agent illusion: have one model summarize a change, second "review" the summary. Compare findings vs direct source review. Catalog what summary inherited/invented. This is why witness allowlists are tool-enforced.
0.10 Cost of knowledge: estimate human-hours to rebuild one subsystem map from scratch vs graph-assisted. Where estimate uncertain, say so — calibration is part of foundations.

## Adopted extension (2026-10-27): nine primitives

Promoted from derived status after failure analysis:
- **Primitive 7: Time.** Ordering, expiry, generation, freshness. Derives deadlines on grants, freshness on pins, ordering proofs on concurrency, SLA clocks on settlements. Gallery: lease expiry races, stale review pins, coarse-timestamp collisions, cert/token rotation windows.
- **Primitive 8: Identity.** Logical vs incarnation identity across rename/move/recreate. Derives composite IDs ((id, generation), (pid, start-marker)), SUPERSEDES maps, no bare-name reasoning. Gallery: workspace bytes vs identity (#124787), profile name collisions across installs (#93943 matrix), model-name vs pinned version drift.
- **Primitive 9: Cost.** Compute, money, CI, human attention as finite budgets. Derives brief ceilings, cost receipts, cost-per-verified-outcome, attention protection (chunking, digests, refusal to waste sittings). Gallery: retry-loop burn, wall-of-text findings, swarm throughput without outcomes.

Failure and Composition remain derived (Change×Time without Evidence; Promise over Boundaries measured as radius). Any future promotion requires failure gallery showing existing nine cannot express the defect without distortion — recorded as curriculum RFC.

## Invariants pointer
The nine primitives compress into ten enforceable invariants — see references/invariants.md (normative list with witnesses). Module exercises map: Invariants 1-4 (authority/evidence modules), 5-7 (evidence/settlement), 8 (identity studios), 9 (repair studio), 10 (accounting studio). Graduation requires refusing seeded violations of each invariant at least once (gallery + federation witness drills).

## Capstone integration (Module 00 exit)
Given unfamiliar PR (any ecosystem): produce promise sentence, lifetime map, boundary list, transformation+invariants, evidence plan (distinguishers per relation), authority chain, time risks, identity risks, cost budget — one page, before reading diff body. Compare with actual Rev analyst output on same PR (pinned fixture). Differences adjudicated in writing. Passing = no missing primitive dimension on material risks.
