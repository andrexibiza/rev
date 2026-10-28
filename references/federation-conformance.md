# Reference: Federation Conformance (Protocol levels + witness suite)

Purpose: any implementation (forge adapter, agent host, independent reviewer) claims Rev-protocol conformance by passing executable witnesses, not by adopting vocabulary. Levels (authority.md §11): L1 read/verify, L2 review, L3 mutation.

## Witness suite (each: setup, action, required settlement)

Authority: W-A1 widening grants refused (AUTHORITY_WIDENING); W-A2 stale generation at use refused; W-A3 policy-hash mismatch refuses (no best-effort); W-A4 ambiguous owners fail closed; W-A5 receipt with secret-shaped value rejected at write.
Settlement: W-S1 duplicate delivery replays (side-effect count 1); W-S2 crash-after-claim lease reclaimable; W-S3 timeout-after-start -> INDETERMINATE, retry blocked until reconcile; W-S4 stale receipt cannot settle successor; W-S5 SHIPPED receipt never satisfies MERGED query.
Evidence: W-E1 insensitive test cited as sole distinguisher collapses safety claim; W-E2 force-push voids prior approval (range-diff revalidation); W-E3 summary scope wider than lane scope rejected by composer.
Process: W-P1 ambient spawn (no env/stdin) fails gate; W-P2 direct spawn outside broker fails gate; W-P3 removing broker/lease/scope check fails mutation witness (gate sensitivity itself tested).
Graph: W-G1 AFFECTS without reachability proof never renders as REACHES; W-G2 diagram regeneration diff (hand-edit divergence flagged); W-G3 generation diff lists SUPERSEDES explicitly.

Conformance run: suite executes against candidate at pinned version; report (witness, version, pin, result, receipts) published; badge = report link, not image alone. Rev reference implementation must publish its own report per release (self-hosting: Rev reviews Rev under same gates — no self-certification exception for authors).

Governance: RFC for protocol changes (problem, witness additions, two implementations proving before breaking change standardized — Rust RFC + IETF running-code hybrid). Reason-code registry additive-only. Security disclosures for protocol itself via vuln-response with embargo grants.

## Invariant-to-witness map (normative)
Inv1: digest-disjointness + seeded self-review attempt refused. Inv2: W-A ambient set. Inv3: widening unit + chain drills. Inv4: scope-table presence + widening variants. Inv5: unpinned artifact rejection. Inv6: W-E sensitivity set + gallery catch thresholds (declared per level). Inv7: W-S settlement set. Inv8: composite-ID rendering + cross-install drills. Inv9: capability inventory presence on stateful fixes (composer check). Inv10: check-refs/2K gates + W-P3 gate-removal mutation. Conformance report lists invariant coverage explicitly; partial coverage = partial level, never rounded up.
