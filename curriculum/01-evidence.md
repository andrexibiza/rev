# Module 01 — Evidence: What Establishes What

Primitives: Promise, Change, Evidence (Module 00). Executes as verdict discipline in every lane. Sources: Introduction Ch.8–10; AGMD §§2,6,8; Hermes #139222 maintainer protocol as reference implementation.

## 1. The claim tuple

Every review sentence that matters is a tuple: (claim, artifact pin, evidence kind, scope). Drop any element and the sentence is rhetoric. "This drops the distinction" (claim) "at d4e0cdd" (pin) "by source trace + red probe" (kind) "on the member path" (scope) is engineering. The same words without pin/scope/kind are weather.

Kinds and what they can carry:
- **Source inspection** — code facts at inspected revision: field retained, guard applied, caller exists. Cannot alone carry user-experience claims requiring reachability + later participants.
- **Execution** — behavior under actual artifact/env/inputs/substitutions/assertions. Decisive for observed property; silent on unobserved properties. Conditions are part of the result.
- **Mechanical comparison** — bytes/hashes/graph properties. Unpersuadable within its window; blind outside it (right bytes, wrong window proves nothing).
- **Report** (contributor/user) — attributed experience or result. User report carries consequence (what hurt); investigation must still find cause. Contributor broader selection + reviewer focused execution answer different questions; keep attribution separate.
- **Design explanation** — intended distinction/rationale. Settles requirement questions only when from requirement owner; otherwise it is a proposal.

## 2. Sensitivity: can this evidence say no?

Evidence earns weight by being able to fail. A test that passes when the protected write is deleted decides nothing about that write. A hash that matches because the wrong window was hashed decides nothing about the move. A screenshot of a setting decides nothing about provider receipt.

Canonical probes Rev runs mechanically:
- **Red/green pair (mutation probe):** source to parent (C^), keep test, must go red on symptom not ImportError; restored, must go green. Per-commit in #139222, plus real-process interleaving probes against temp home, no mocks, no provider calls. Verdict pinned to head; force-push triggers range-diff revalidation.
- **Supplier isolation:** asserted state traced to its writer; disable competing writers (later human turn in #126167) and re-run. If pass survives removal of claimed producer, evidence is disconnected.
- **Target identity:** patch/mock target resolved to object actually executed at pin (moved-collector failure). Path-string similarity is not identity.
- **Lifetime span:** preservation evidence must execute across full required lifetime including intermediate representations and later cycles (#130909), restarts, and continuation kinds the promise distinguishes (synthetic vs fresh authoritative input).

## 3. Scope equality (Hermes #90144 as evidence law)

Proof scope must equal conclusion/mutation scope across four dimensions: object set, qualified identity, generation, snapshot window. Widening gallery (memorize):
- One idle model proves router restart safe. (Object)
- Hostname validated once proves later re-resolution dial safe. (Generation — SSRF shape)
- One PID alive proves whole inferred tree killable. (Topology)
- One surviving row proves cleanup window consumed safely. (Snapshot)
Rev findings quote proof scope and claimed scope side by side. Inequality without revalidation = BLOCKING when it authorizes action, WARNING when it only inflates prose, QUESTION when scope unknown.

## 4. Negative evidence

No-match search proves searched surface only. Green selection proves exercised scenarios only. Absence of finding after bounded investigation is a scoped result ("no defect found in X at pin P by methods M") — valuable, credited, never upgraded to "system correct." Conversely, unexecuted platform path is a gap: neither defect nor harmlessness. Mark GAP, route to owner or execute; never let plausible source concern impersonate reproduced defect, nor lack of execution impersonate safety.

## 5. Severity, confidence, soundness

Severity = consequence if true under established conditions. Confidence = support strength. Detailed prose raises neither. Every finding carries both. Sound behavior is evidence too: guards that limit suspicious patterns, admission rules excluding reachability, existing components owning responsibility. Establishing soundness (including verified no-bypass / no-patch audits, AGMD §3) is a first-class contribution that prevents capability-destroying repairs (Module 06).

## 6. Exercises (receipt-producing)

1. Take a green CI badge. Reconstruct (claim, pin, kind, scope) per check. Publish gaps list.
2. Pick one regression test. Run red/green probe. Record whether red is symptom or ImportError. Explain difference.
3. Find a log/screenshot used as proof. State exact claim it supports and boundary it cannot cross. Add missing observation.
4. Rewrite one vague review comment ("needs more tests") into tuple form with named object, lifetime, and distinguishing observation.

Lane mapping: witnesses own sensitivity probes; adjudicators own scope equality; accountants ensure tuples survive summarization (summary never widens scope — summarization is engineering with same obligations, Ch.7).

## Extended: evidence in adversarial settings
When producer benefits from acceptance (vendor benchmark, PR author, agent completing task), discount self-reported evidence structurally: require independent reproduction or downgrade kind to Report. Benchmark literacy: corpus selection, default-settings scope, vendor authorship, window variance (report ranges + dates, never single timeless numbers). Rev internal dashboards follow same rule (benchmark.md).

## Extended: updating on evidence (Bayesian bookkeeping without math theater)
Finding lifecycle: SUSPECTED (question) -> SUPPORTED (tuple complete) -> CONFIRMED (independent witness or executed probe) -> SETTLED (repair verified or owner-accepted risk with grant+expiry). Downgrades happen too (new caller narrows). Ledger preserves transitions with reasons (Module 12). Confidence words map to lifecycle states, never adjectives alone.
