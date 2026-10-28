# Reference: Full Discipline Hats (2026 developer surface)

Normative index. Core eight (systems, security, bug-finder, bad-tests, regression, subsystems, diagrammer, accountant) have dedicated files or sections. This file governs the remaining hats; each loads progressively by touched paths. Every hat outputs Finding/Question/Suggestion/Assessment with evidence basis; no hat widens another hat's proof scope.

- Requirements keeper: promise fidelity, silent scope expansion = BLOCKING REQUIREMENT. Source Intro Ch.4, Ch.10.
- API contract guardian: versioning, compat, error/idempotency/pagination semantics. Breaking change without major bump + migration = BLOCKING API.
- UX/accessibility: flows, empty/error states, keyboard/contrast/screen-reader. Correct backend + unusable surface = WARNING (BLOCKING if promise is the surface).
- Performance engineer: complexity, N+1, hot path, startup/memory budgets measured base vs head (regression.md probing). Unbudgeted claim = QUESTION.
- Reliability engineer: timeouts/retries/backpressure/partial failure/idempotent recovery; crash-between-steps analysis (authority settlement states).
- Data guardian: migrations/backfills/loss/retention; rollback possible or explicitly waived by owner; dual-write windows generation-fenced.
- ML systems reviewer: prompts as code (versioned), eval coverage, model-version drift, nondeterminism handling, cost/call. No eval = no ship (REQUEST_CHANGES).
- Supply-chain steward: dependency hygiene, licenses, SBOM, provenance, pin freshness (distinct from threat architecture). Feeds vuln-response matcher.
- Release engineer: flags, staged rollout, migration order, rollback edge. Merge != release; release receipt separate from MERGED.
- Observability engineer: logs/metrics/traces/alerts bound to promise; unobservable failure mode = WARNING minimum. Traces per schema.md §8 (authority/lane/execution spans).
- Documentation keeper: docs as promise graph; seven parity gates (blind-witness.md §7) on every representation change.
- PR costs (accountant extension): per-WorkEvent cost receipt (compute, tokens, CI, latency, human minutes); cost per outcome queried in registry; swarm spend without outcome linkage = process FINDING.

Hat selection: touched-path + promise mapping selects hats; adjudicator resolves cross-hat conflicts by scope equality (narrower proven scope wins over broader asserted scope). Adding hats never dilutes core-eight gates.

## Hat selection matrix (adjudicator applies; declare selected hats in trace)

Touched paths / promise signals -> mandatory hats (in addition to core bug-finder + accountant on every run):
- Auth/session/token/env/process code -> security + reliability.
- Tests/fixtures/CI config -> bad-tests (+ hat owning behavior under test).
- Migrations/schema/backfills -> data (+ api if contract, + release).
- Public API/GraphQL/events/webhooks -> api (+ docs-parity, + security on auth scopes).
- UI components/flows -> ux (+ performance on shared components, + docs on user-facing text).
- Prompts/models/tools/RAG -> ml (+ security on context/tools, + costs).
- Lockfiles/deps/Docker/Actions -> supply-chain (security) + vuln-response on advisory match.
- Async/jobs/queues/retries -> reliability (+ observability).
- Hot paths/queries/render loops -> performance.
- Flags/deploy/infra/installers -> release (+ data on migration order).
- Logging/metrics/alerts changes -> observability.
- Docs/i18n/generated refs -> docs-parity (+ owning behavior hat for semantic witness routing).

Cross-hat conflicts resolved by scope equality: proven narrow scope beats asserted broad scope; adjudicator records losing claim as QUESTION with missing evidence named, never deletes it. Hat absence must be justified in receipt when signals present ("no data hat: no persisted state touched at pin" — auditable claim).

Hat registry additions (load by INDEX): concurrency (shared state), frontend-backend (full-stack), infra-devops (platform), mobile-desktop, ownership-routing, requirements, supply-chain, benchmark, human-review, error-config-i18n, failure-gallery (calibration), federation-conformance, glossary, anatomy (output form). Adjudicator hat list in trace must resolve every selected hat to file + section — dangling hat names rejected by composer.
Ecosystem lens loaded additionally whenever touched paths match language (ecosystems.md sections). Federation adapters declare reachability fidelity per ecosystem (vuln-response §9).
