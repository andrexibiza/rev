# Reference: The 10 Core Invariants (framework cannot exist without these)

Composer + adjudicator + federation gate. Violation of any one voids a Rev verdict's claim to protocol conformance. Each invariant: statement, derivation, witness that proves enforcement (federation-conformance IDs).

1. **No self-certification.** Producer never accepts own work; independent information-isolated verifier required. From AGMD acceptance contract. Witness: lane input-digest disjointness (W-E series) + producer/verifier field separation in receipts.
2. **Nothing ambient survives a boundary.** Coordinates select; proof objects authorize. From #93943 law. Witness: W-A series (ambient spawn, env inheritance, cached-route reuse all refuse).
3. **Authority only narrows.** Derived grants subset of parent, scope-checked at use. Witness: AUTHORITY_WIDENING refusal drills (unit: types validateProof).
4. **Proof scope equals mutation scope.** Object/identity/generation/snapshot equality (#90144). Witness: scope table in every blocking finding; widening variants refuse/revalidate.
5. **Everything is pinned.** (SHA, generation, policyHash) on claims/verdicts/receipts/diagrams. Witness: unpinned artifact rejected by composer; stale-pin watermarking.
6. **Evidence must be able to fail.** Sensitivity proven by distinguisher probes (red/green, supplier isolation, identity). Witness: W-E1 sole-distinguisher collapse; seeded gallery catch rates.
7. **Settlement is typed and honest.** States distinct incl. INDETERMINATE, SHIPPED != MERGED, NO_ACTION scoped. Witness: W-S series (duplicate replay, stale settle, timeout reconcile).
8. **Identity is composite.** (Logical ID, generation) always; bare names identify/authorize nothing (Primitive 8, #90145). Witness: same-name cross-install drills (#93943 matrix).
9. **Capability is preserved.** Fix disabling promised behavior fails contract; legitimate controls in every repair obligation (Intro Ch.12). Witness: capability inventory + keep-green probes on stateful fixes.
10. **No rule counts until it executes; no debt hides.** Gates in CI, debt manifested with owner/allowance/expiry (Laws 4-5, 2K ratchet). Witness: check scripts green + mutation witnesses (removing gate fails suite, W-P3).

Non-invariants (deliberately excluded, derived or policy): specific LOC ceilings (2K is enforcement choice), lane counts (geometry declared, invariants preserved under compression), model choices, forge choice. Changing these never requires invariant RFC; changing any of the 10 does (federation governance).

## Invariant failure postmortems (how each dies in the wild if dropped)
Without 1: agent grades own homework; persuasive summaries compound (AGMD opening failure). Without 2: relay child inherits gateway secrets (gallery 1). Without 3: message-send grant becomes repo-admin by derivation chain. Without 4: hostname check authorizes different dial (SSRF). Without 5: force-push launders stale approval. Without 6: green suite with disconnected tests merges breakage (gallery 5). Without 7: retry duplicates side effects; shipped counted as merged (gallery 11). Without 8: same-named profile cross-talk (gallery 17). Without 9: security fix disables feature; users route around control. Without 10: gates become documentation; debt invisible until crisis. Postmortem rule: incident analysis must name invariant(s) broken — if none fit, propose invariant RFC (rare; see primitives promotion rule).
