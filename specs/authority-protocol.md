# Authority Protocol v0.1 (Federated)

Normative. Theory: specs/theory.md (Saltzer & Schroeder; Miller capabilities; Lamport ordering; Hermes #93943/#95028).

1. Roles: Principal, Installation, Courier, Lane, Maintainer-Authorizer. Identities composite (id, generation, installation) — bare names are coordinates (Invariant 8).
2. ProofObject fields (schema.md §5.1) + signatures: issuer signs (authorityId, operation, policyHash, generation, grants, expiry, payloadDigest). Verification offline from public keys registry (federation trust root, §federation).
3. Derivation: child proof grants ⊆ parent, expiry ≤ parent, generation pinned; widening refuses AUTHORITY_WIDENING (Invariant 3). Revalidation: new proof carries `revalidates` prior authorityId (implemented src/types.mjs).
4. Execution edges: typed ChildProcessSpec-equivalent per host (intent, principal, profile, grants, stdin, descendants, policyHash, receipt). Ambient inheritance non-conformant at any level ≥ L2.
5. Settlement: typed states (registries.md); INDETERMINATE + reconcile; duplicate replay; stale generation cannot settle successor. Receipts value-free, hash-chained into Transparency Log (specs/federation §4).
6. Threshold acceptance (crypto lesson): consequential receipts (MERGED, crisis NO_ACTION) require countersignatures: producer + correctness + adversarial (2-of-3 fresh + adjudicator attestation = 3 signatures). Single-signature consequential receipts are L1-only.
7. Revocation: policy/CODEOWNER/grant changes bump generation; revocation list signed + timestamped; verifiers reject receipts settled under revoked generations after revocation time (Time primitive).
Conformance: W-A/W-S witnesses (conformance/run.mjs). Levels L1 read, L2 review, L3 mutation (federation-conformance.md).
