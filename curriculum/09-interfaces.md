# Module 09 — Interfaces: Contracts Humans and Machines Rely On

Primitives: Promise, Boundary. Hats: API guardian, UX/accessibility, ML systems, documentation keeper.

## API principle
API = promise with strangers. Versioning, error semantics, idempotency, pagination stability are the contract surface; implementation behind it may change freely only while contract relations hold. Contract tests assert relations (error shape, ordering, replay safety), not frozen payloads. Breaking change detection is graph work: consumers census incl. external/unknown consumers assumed when API is public.

## UX principle
Surface behavior is the promise users experience. Correct backend + misleading empty state, silent failure, keyboard trap, or contrast failure breaks it. Review exercises actual flows incl. error/loading/empty, with accessibility semantics (names, roles, focus order) as assertions that can go red — not checklist vibes.

## ML principle
Model behavior is nondeterministic state across versions. Prompts are code (versioned, reviewed, parity-checked). Ships require evals: golden sets with relation assertions, drift monitoring across model-version pins, cost/latency budgets per call. No eval = no ship. Offline eval pass never proves online behavior beyond its scope — state scope.

## Documentation principle
Docs are operational promise graphs (AGMD germination). Parity gates (fence, code-span, link, anchor, heading, backlink, discoverability) + semantic witness for meaning. Commands in docs are executable claims: run them at pin during review.

Exercises: contract-break drill on one endpoint; docs-command execution audit on one page; eval-sensitivity probe (mutate prompt, eval must move).

## Studios
API studio: break a contract four ways (shape, semantics, error, ordering) against compat harness; only harness-caught breaks count as understood. UX studio: complete checkout keyboard-only with screen reader; log every relation failure (name/role/value/focus) as findings with flow scope. ML studio: mutate prompt to flip behavior; eval must move (sensitivity), then restore and add regression case. Docs studio: execute quickstart verbatim in clean container, timed; every friction is DOCS_PARITY or REQUIREMENT finding.
