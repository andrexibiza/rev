# Reference: Architecture + Style (taste under law)

Style findings capped: preference never BLOCKING; style gates only where mechanically enforced (formatter/linter in scripts/check — no rule counts until executes). Architecture review via graph: coupling (consumer counts, change co-occurrence), cohesion (cluster vs responsibilities), layering violations (imports against declared direction — graph query, not vibes), godfile/headroom (blind-witness §10), abstraction cost (interface with one implementation needs justification by seam/platform/testability, not fashion).

Design proposals: options with radius/cost/reversibility, decision record as Promise. Refactors: transformation discipline (behavior invariants + golden characterization tests first — tests before move must distinguish current behavior worth preserving; characterization of bugs marked as known-bug snapshots with expiry, never enshrined silently).

Naming/comments: names as identity claims (misleading name = correctness-adjacent WARNING when behavior contradicts name); comments explain why/invariants, never restate code; stale comments are docs-parity internal.

## Deep patterns
Architecture decision evaluation: state problem in promise terms, list options (including do-nothing), radius/reversibility/cost per option, decision + revisit trigger. Layering: declared direction in manifest, graph query in CI (imports violating direction fail — executed rule). Abstraction audit: indirection must pay (seam, testability distinguisher, platform variance) else inline. God-object signals beyond LOC: change frequency, defect density, ownership contention (graph metrics) trigger headroom review even under 2K.
Style automation hierarchy: formatter (no review comments — machine fixes), linter rules (manifested), human judgment reserved for naming/intent/architecture. Reviewers citing style without executed rule downgraded to suggestion (non-blocking) by composer.
