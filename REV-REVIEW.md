# REV-REVIEW — Adversarial Self-Review of the Day-1 Build (2026-10-27)

Reviewer stance: fresh adversarial witness. Scope: src/, scripts/, tests/, schema.md, plan.md, SKILL.md, references/ (49 files), curriculum/ (14 files), docs/, CHANGELOG.md at working-tree state 2026-10-27 22:35 CDT. Method: source inspection + executed probes (/tmp/rev-probe.mjs, npm gates). Verdict at end. Findings use Rev form (label, tuple, obligation).

## Blocking

### B1. issue (blocking, defect): CODEOWNERS glob silently wrong for common patterns
Claim: ownersForPath honors GitHub CODEOWNERS semantics. Evidence (executed): pattern `/docs/*.md` (stored as `docs/*.md`) for `docs/a.md` returned `@docs` from earlier `*.md` rule, expected last-match `@docs2`. `matchPattern` (src/authority-map.mjs:64) handles only `*`, `/*` suffix, leading `*`, trailing `/`. Mid-path `*`, `**`, `?`, character classes, escaped `\#`, and leading-`/` anchoring all unhandled; failures are silent (wrong owner, no error). Scope: routing + required-reviewer suggestions; merge revalidation inherits wrong map. Obligation: implement GitHub pattern semantics (fnmatch-style with `**`) + property tests vs documented examples, or narrow claim to "simplified subset" in code + schema + docs and refuse (AUTHORITY_AMBIGUOUS) on unsupported pattern shapes. Current docs say "simplified glob — known limit" in one place while plan Day-1 subtask implies resolver done. Confidence: executed, high.

### B2. issue (blocking, contract): GraphQL SDL is not executable as written
Claim (schema.md): "only platform contract." Evidence: `*Connection` types and `GraphNode` union and `PageInfo` are referenced (schema.md:153+) but never defined; §5.5 prose says implementations "must generate" them. A contract requiring generation without emitted types fails its own "real GraphQL" test — no validator can check it, Day-2 implementer must invent shapes (Relay edge/pageInfo details, GraphNode members). Obligation: emit full SDL (all Connections, PageInfo, GraphNode union, RepositoryConnection used in Query) in schema.md and add SDL parse check to scripts (even regex/brace + referenced-type closure check) before Day-2 server work. Confidence: source-inspected, high.

### B3. issue (blocking, evidence): Live webhook behavior still unverified end-to-end
Claim (plan Day-1 milestone): "empty machine accepts a webhook and refuses correctly." Evidence: unit tests cover handleWebhook/verifySignature functions; HTTP layer (src/app.mjs) never executed successfully — sandbox listen EPERM blocked /tmp/rev-smoke.mjs (2026-10-27). Header casing, body parsing, 401 path over real HTTP unproven. Docs now state this honestly (getting-started), but milestone cannot be called verified. Obligation: run smoke on unrestricted shell (health, signed ping 200, bad sig 401, signed PR typed refusal), paste receipts into Day-2 PR + CHANGELOG; until then Day-1 status = code-complete, verification-incomplete. Confidence: executed (failure observed), high.

## Non-blocking (should fix in Day-2 scope)

### N1. suggestion (non-blocking, defect-risk): validateProof rejects all generation changes, including legitimate revalidation
src/types.mjs:24 refuses any child generation != parent. Revalidation flow (new proof at new generation chained to old) has no representation; callers must drop parent to proceed, losing chain audit. Add explicit `revalidates: authorityId` path with generation-pair record instead of blanket refusal-or-unlink. Test exists for widening only; add generation-transition tests.

### N2. issue (non-blocking, robustness): URL pathname breaks on spaces/encoded paths
scripts/check.mjs:8 + check-refs.mjs:6 use `new URL(...).pathname` — workspace path with spaces (%20) or non-ASCII will mis-root gates (ironic: gates fail where developers actually live, e.g. "Meta-Code-Review" parents). Use `fileURLToPath`. Add test with space-named temp copy? At minimum fix + note.

### N3. issue (non-blocking, honesty): Anti-stub gate (100 words) is gameable and already gamed by structure
Long-line files pass word floors while remaining thin (experimentation.md 114w, code-review-for-agents.md 129w are outlines, not massive references). User's original complaint ("reference files are shit") was depth, not count; gate measures count. Strengthen: per-file required sections (principle/method/checklist/worked pattern) lint + spot human/witness review per release; raise floor for core files (authority/knowledge/blind already 1-3k words — keep, enforce for finders too). Until then VERSION.md "no stubs" claim should read "no <100w files."

### N4. suggestion: Plan/schema/code settlement vocabularies drift in casing and subsets
Plan lists lowercase subset (completed|failed|cancelled|expired|indeterminate|merged); schema enum adds QUEUED/CLAIMED/RUNNING/SHIPPED/NO_ACTION; types.mjs matches schema (good). Harmonize plan text at Day-2 kickoff (plan is governing doc; stale subsets confuse implementers). Also plan Day-1 "Define types: ProofObject, WorkEvent, SettlementReceipt, AuthorityMap" — delivered as JS validators + schema SDL, no TypeScript types despite TypeScript stack assumption. Declare JS-with-validators as Day-1 stack decision in plan/CHANGELOG or schedule TS migration explicitly.

### N5. issue (non-blocking, duplication): Doctrine restated ~5x (authority, invariants, primitives, glossary, blind-witness)
Necessary layering (normative vs compiled) is claimed (blind-witness §12) but drift risk is real: e.g., refusal code lists appear in authority §6, schema §9, invariants, federation — no single registry file. Create `references/registries.md` (reason codes, settlement states, lane kinds, finding kinds) as single source; other files link. Add check-refs registry-consistency check.

### N6. question (non-blocking): Curriculum unevenness
Modules 00/01/03 are studio-grade; 04-07 remain compact (189-332w) despite "entire curriculum" claim. Either deepen to parity in Day-5/6 reference expansion or scope README claim to "foundations deep, finders compiled in references." Current README map overpromises symmetry.

### N7. suggestion: Webhook robustness gaps (Day-2, note now)
No payload size limit, no delivery-id dedupe at HTTP layer (queue Day-2 owns idempotency, but unauthenticated-size DoS precedes it), installation events recorded without persistence (in-memory response only). Note in operations.md backlog; size cap is one-liner — do it with B3 smoke fix.

## Sound (credited, with receipts)
2K gate + refs gate + 5 tests green at review time (re-executed). Proof anti-widening + value-free receipt guard work as specified (probes). Fail-closed CODEOWNERS absence works. Planted bug fixture genuinely observable (cap non-linearity) after first commutative non-bug was caught by own test — sensitivity discipline worked on ourselves. Docs/CHANGELOG now exist with state labels distinguishing built vs planned (architecture.md) — honest scoping rare and kept.

## Verdict
REQUEST_CHANGES (narrow): fix B1 (or narrow claim + refuse), B2 (emit SDL), B3 (live smoke receipts) before declaring Day 1 complete. Everything else schedules into Day-2 without blocking demo path. Review cost: 2 probes, 3 gate runs, full-tree inspection — receipts in session log 2026-10-27.

## Fix status (updated same session, 2026-10-27)
- B1 FIXED: matchPattern now fnmatch-style (*, **, ?, anchoring, basename-at-depth). Probe docs/*.md -> @docs2 correct; regression caught by own test 3 during fix (basename `*` initially broke) and repaired — sensitivity working. New test 6 covers mid-path/**. Tests 6/6 green.
- B2 FIXED (document level): schema.md Appendix A emits PageInfo, GraphNode union, all Connections. Remaining: automated SDL closure check (scheduled Day-2, N3/N5 family).
- B3 OPEN (environment): live HTTP smoke still requires unrestricted shell; docs + changelog carry honest status. Day-1 claim remains code-complete / verification-incomplete until receipts attached.
- N1, N3-N7: scheduled (Day-2 kickoff list in CHANGELOG Unreleased). N2 FIXED: gates use fileURLToPath (verified green after patch).

## Addendum (docs parity, found during fix verification)
- N8. docs/getting-started.md claimed 5 tests after B1 fix made 6 — fixed same session (docs + CHANGELOG counts updated). Root cause: counts hand-typed in three places (docs, changelog, VERSION). Obligation Day-2: generate counts from test runner output in docs build or drop counts for "see npm test" — hand-synced numbers always rot (docs-parity internal instance).

## Verification addendum (2026-10-27 22:47)
SDL referenced-type closure checked mechanically (79 types defined; all 11 Connections resolve; Query root types present) — B2 document fix holds. SKILL.md load path inspected: triggers, 7-step workflow, hard refusals, verdict/merge separation present and consistent with invariants.md. Remaining scheduled work (N1 revalidation chain, N3 gate strength, N4 vocab harmonization, N5 registries file, N6 curriculum parity, N7 webhook size cap, B3 live smoke) is Day-2 scope, listed in CHANGELOG [Unreleased] via this review. No new blockers found in this pass.
