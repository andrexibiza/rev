# Federation Governance v0.1

Specs: authority-protocol.md, review-protocol.md, graph-protocol.md. Theory: specs/theory.md. Crypto lessons adopted: threshold countersignatures, transparency log, content addressing, reproducible verdicts, witness reputation (staking analogue without tokens — signed history weight, slashing = weight reduction on proven wrong-green). Rejected: token speculation, consensus theater, immutable-first-draft (corrections via SUPERSEDES).

1. Trust root: federation key registry (maintainer keys per implementation, signed rotations). Receipt verification offline against registry snapshot at receipt generation.
2. Levels: L1 read/verify, L2 review, L3 mutation (references/federation-conformance.md). Claims carry level + conformance report link (report = Transparency-Log-anchored digest, not badge image).
3. Transparency Log: append-only hash-chained receipt log (src/transparency.mjs reference impl: each entry hash(prevHash + receiptDigest + generation), threshold countersignatures counted). Implementations publish heads; mirrors cross-check heads (gossip) — rewritten history detectable. Corrections append SUPERSEDES entries, never edit.
4. RFC process: proposal (problem, witnesses added/changed, migration) → two implementations prove breaking changes before standardization → version bump + reason-code registry update (additive only). Lightweight maintainer council (one seat per conforming implementation, public minutes as interlock issues).
5. Benchmark: developer-action harness (references/benchmark.md) governed as federation infrastructure; corpus + harness open, results anchored in log.
6. Privacy: private-code conformance via hash commitments + sampled disclosure (review-protocol §6); embargoed advisories via scoped grants (vuln-response §7).
7. Revocation/slashing: proven wrong-green consequential receipts (post-merge revert/incident linkage) reduce signer weight; repeated → level suspension vote recorded in log. Self-reported metrics never affect weight (developer-action outcomes only).
