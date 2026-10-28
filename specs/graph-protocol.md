# Graph Protocol v0.1 (Federated)

Normative. Contract source: schema.md (GraphQL SDL + Appendix A). Theory: Parnas decomposition; content addressing (crypto lesson).

1. Graph model: node/edge kinds (schema §4) with evidence-bearing edges; AFFECTS (dashed, version match) never renders/propagates as REACHES (solid, proven path) — federation W-G.
2. Pinning: every query/response carries (sha, generation, policyHash); generation snapshots exportable as signed content-addressed bundles (node/edge digests); SUPERSEDES explicit across generations and hosts.
3. GraphQL contract: schema.md SDL is normative; additive evolution only within 0.x; persisted queries by hash for production clients; subscriptions stream spans/settlements (states + digests, never chain-of-thought).
4. Exchange: foreign graph data imports as Report-kind evidence until locally probed; export grants scoped (redacted projections declare blind spots); reachability fidelity declared per ecosystem (package vs symbol).
5. Visualization grammar: systems-mapping §6 (evidence line styles, pin watermarks, text adjacency equivalents for accessibility).
Conformance: SDL closure (scripts/check-sdl.mjs), W-G witnesses, query round-trip tests against reference implementation fixtures.
