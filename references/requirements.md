# Reference: Requirements Keeping (Requirements Keeper hat)

Sources: Intro Ch.4, Ch.10 (unresolved requirement is outcome, not failure).

Promise archaeology: sources ranked (owner statement in issue > accepted RFC/proposal > docs promise > tests encoding behavior > habit). Conflicts surfaced, never resolved by lane preference. Ambiguity taxonomy: object ambiguity (which context/workspace/tenant), lifetime ambiguity, actor ambiguity (who may), success ambiguity (what observable outcome), scope ambiguity (included boundaries). Each maps to one owner question with options + consequences (decision-ready: "If A, repair is X; if B, current code correct — which promise holds?").

Silent scope expansion patterns: PR title promises narrow fix, body/discussion expands; reviewer expanding author duty to nearby debt (separate filing); implementer "while I'm here" changes (split PRs; interlock links). Acceptance criteria as contract surface: criteria testable? Each criterion maps to distinguisher (bad-tests) or GAP. Changing criteria mid-review restarts adjudication (generation bump for requirements — authority discipline applied to intent).

Product-capability advocacy: keeper argues for preserving user capability against overbroad safety fixes (Intro Ch.12) and against under-scoped fixes that declare victory on sub-promise. Verdict language separates code defect / requirement defect / requirement missing — three different owners, three different next actions.

## Deep patterns
Acceptance-criteria workshop (lane-assisted): Given/When/Then per promise with distinguisher mapping; criteria without observable Then returned to owner. Non-functional promises quantified (latency, availability, cost ceilings) or labeled aspirational (non-gating). Regulatory/market promises sourced (document + owner), never lane-invented.
Change-of-mind protocol: requirement change mid-PR bumps requirement generation; prior reviews scoped to old generation, re-review deltas only where promise changed (range-diff for intent). Changelog of intent in PR (what promise changed and why) becomes Promise node history.
Traceability: Promise -> entities -> tests -> findings -> merge -> incident (graph path query is audit answer; missing link = accounting gap finding).
