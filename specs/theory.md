# Federated Protocol — Theory References (normative bibliography)

Every protocol clause traces to theory here or to canon (All Gods Must Die; Introduction to Code Review; Blind Witness Engine; Hermes #93943/#95028). Implementations need not read all — adjudicators must be able to.

## Distributed systems + authority
- Lamport, Shostak, Pease (1982), The Byzantine Generals Problem — why isolated verifiers + signed artifacts, agreement ≠ truth.
- Castro & Liskov (1999), Practical Byzantine Fault Tolerance — quorum intuition for multi-witness acceptance.
- Lamport (1978), Time, Clocks, and Ordering — generations/leases as logical clocks; recency never authorizes.
- Saltzer & Schroeder (1975), Protection of Information in Computer Systems — least privilege, complete mediation (broker), fail-safe defaults (fail-closed).
- Miller (2006), Robust Composition (object capabilities) — grants as unforgeable, narrowable-only capabilities; ambient authority critique (Nothing Ambient Survives lineage).
- Hardy (1988), Confused Deputy — coordinate-driven authority confusion class.

## Evidence, testing, review science
- Bacchelli & Bird (ICSE 2013), Expectations/Outcomes/Challenges of Modern Code Review — knowledge transfer, understanding bottleneck.
- Bosu et al. (Microsoft), Characteristics of Useful Code Reviews — familiarity routing, size dilution.
- Cisco/SmartBear, Best Practices for Peer Code Review — 200–400 LOC, <500 LOC/h, 60–90 min envelope.
- Krutauz et al., Do Code Review Measures Explain Post-Release Defects (replication) — activity ≠ outcome; benchmark design constraint.
- Fagan (1976), Design and Code Inspections — inspection discipline ancestry.
- Dijkstra / Hoare traditions on assertions — distinguishers as executable assertions (curriculum Module 01).

## Verification + transformation
- Meyer, Design by Contract — promise/invariant language.
- Parnas, On the Criteria for Decomposing Systems — boundaries by responsibility/state (2K decomposition).
- Beck, Test-Driven Development; Feathers, Working Effectively with Legacy Code — characterization + sensitivity.
- Fowler, Refactoring — behavior-preserving transformation discipline (golden/byte proofs kin).

## Security + supply chain
- OWASP Top 10 (2021; 2025 current) — category lens, never proof.
- OSV Schema v1.9.2 (OpenSSF) — advisory interchange.
- CISA Known Exploited Vulnerabilities Catalog — exploited-in-wild prior.
- SLSA / Sigstore traditions — provenance, signed receipts portability (federation L1).

## Documentation + knowledge
- AGMD Germination (§§11–18) — docs as promise graphs, parity gates, verifier-parser honesty.
- Conventional Comments — machine-parseable review speech acts.

## Canon (first-party, governs conflicts)
All Gods Must Die (adversarially verified transformation); Introduction to Code Review (knowledge mapping); Blind Witness Engine + 2K Law; Hermes #93943 (Nothing Ambient Survives), #95028 (Authority Execution Layer), #90142/#90144/#90145/#90866/#91911 sibling laws. On conflict: invariants (references/invariants.md) > specs > references > curriculum.
