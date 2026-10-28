# Reference: Anatomy of a Rev Review (worked end-to-end form)

Canonical output skeleton (composer enforces; missing section = incomplete):

1. Header: repo, PR/projection, head/base pins, graph generation, policy hash, geometry declared (compressed/full + lane roster kinds, no chain-of-thought), selected hats + absences justified.
2. Promise: one sentence (object + lifetime) + source refs + ambiguities resolved/open.
3. Map: promise subgraph description + diagram (Mermaid export + live GraphQL query ref), seams crossed, radius summary (entities/owners/tests), overlapping work.
4. Findings: per finding — label/decorations (Conventional Comments), File:Line at pin, tuple (claim/kind/scope/proof-scope vs claimed-scope), severity + confidence separately, evidence receipts (red/green, probes, traces), repair obligation (property + capability to preserve, not prescribed implementation unless contract requires), credited discoverer lane/participant.
5. Sound behavior credited: relations verified, controls that held, with receipts.
6. Remaining boundaries: gaps (unexecuted platforms, unobserved sinks, sole-distinguisher risks), open QUESTIONs with owners.
7. Verdict + settlement: APPROVE/REQUEST_CHANGES/COMMENT, state, cost receipt summary, next actions per role (author, maintainer, watcher). Merge authority line explicit: who may authorize, what generation must still hold.

Worked miniature (demo fixture): Promise — capped discount before tax on all buyer kinds. Finding 1: issue (blocking): member path drops $15 cap (fixtures/demo/discount.mjs at pin) — executed totals at cap boundary prove; obligation: restore cap relation on member path, preserve non-member behavior; siblings checked: guest path honors cap. Finding 2: issue (blocking, bad-test): bad.test cannot go red (supplier: laterSetup) — sensitivity probe (delete write, still green) receipt; obligation: isolate supplier, assert durable state before setup. Sound: non-member totals verified at three boundary values. Verdict REQUEST_CHANGES; fix lane contract derived from obligations 1-2.

Anti-anatomy (reject in adjudication): verdict without pins, findings without tuples, praise without relation, "LGTM" without scope, summary wider than lanes' proven scope, diagram without query ref.

## Receipt examples (illustrative shapes; digests truncated)
Review settlement: {state: COMPLETED, reasonCode: REVIEW_POSTED, pin:{head,base,gen}, outcomeDigest, cost:{laneSeconds, tokens, ciMinutes, humanMinutesEst}} — human minutes labeled estimate kind.
Fix settlement: {state: SHIPPED, prProjection:{host,number,head}, reviewers:[correctness APPROVE@head, adversarial APPROVE@head]} — SHIPPED satisfies fix ask; MERGED pending maintainer.
Merged: {state: MERGED, mergeSha, mainVerified:true (CI receipt at merge SHA), disclosureToMergedSeconds (crisis only)}.
Refusal: {refusal:{reasonCode: PROOF_STALE_GENERATION, retryable:true, next:"revalidate owners at gen-8"}} rendered as issue (blocking) comment with Conventional label + tuple, never as silent absence.
Indeterminate: {state: INDETERMINATE, reasonCode: TIMEOUT_AFTER_POSSIBLE_EXECUTION, reconcile:"check result store for event … before continuation"} surfaced in registry filter, aged shortest SLA.
