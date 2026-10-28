# Module 10 — Repair: Changing Code Without Lying About It

Primitives: Change, Evidence, Authority. Sources: Blind Witness Wave 3; Hermes contribution rubric; Intro Ch.12.

Contract first: adjudicated contract names exact window, invariants, destination, golden hash, blocked alternatives, required probes. Implementer receives contract without witness reasoning (blindness prevents inherited framing from narrowing the fix search — but never hides requirements; contract carries obligations, reasoning stays out).

Repair rules derived: minimal diff inside contract window; preserve public seam unless contract changes it; fix whole bug class (sibling census stated); preserve capability (legitimate controls green); add identity + behavioral tests with sensitivity proven (red on parent symptom); compare failures vs pristine pin (pre-existing failures attributed, never hidden or inherited silently); commit hygiene: sign-off, no push by implementer lane (push/merge are separate authority edges). Salvage: external work cherry-picked preserving authorship; build on top, never reimplement for credit (accounting, Module 12).

Rejection loop: any fresh reviewer REQUEST_CHANGES -> fix lane addresses contract deviation or evidence gap (distinguish: code wrong vs proof insufficient — different repairs) -> both reviewers re-inspect new head. Approval never carries across commits.

Exercises: write contract for one finding (invariants testable?); sibling census for one historical fix; capability-control list for one security fix.

## Studio: contract writing drill
Given finding "auth check can be bypassed by renamed header," write contract: window (middleware + tests), invariants (principal derivation only from verified token; header names never mint), capability to preserve (legitimate service accounts list), probes (rename, case-variant, duplicate headers), blocked alternatives (wider gateway rewrite — collision/entanglement reasons). Peer adjudicates contract testability line by line; untestable line rewritten or dropped to QUESTION.
