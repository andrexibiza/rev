# Module 03 — Systems: Lifetimes, Seams, Radius

Primitives: State/Lifetime, Boundary, Change. Executes: `references/systems-mapping.md` + GraphQL graph (schema.md §4). Sources: Introduction Ch.2, Ch.6, Ch.11; AGMD §2 (Hermes system model), §6.2 six artifacts.

## 1. System model

Model any repo as: state stores, transformations between representations, participants (code, processes, people, providers) acting across boundaries over time. Hermes is the teaching extreme (memory, profiles, sessions, skills, tools, routing, scheduling, delegation, surfaces) but every CRUD app has the same skeleton at smaller scale: request -> validate -> persist -> read-model -> render -> notify, with jobs and webhooks as time boundaries.

Review question generator: for the promise under review, list (a) state involved, (b) representations it assumes, (c) boundaries crossed, (d) participants that must agree on shared rules. The #132365 lesson: ownership promise failed as single-function question; it lived across update, recovery, child lifetimes, Desktop reader. Newly correct producer never establishes protocol alone.

## 2. Seams

Seam = place where unchanged code changes behavior: representation change (stored vs provider-facing), persistence cycle, reload/restart, adapter swap, language/process hop, time gap (accepted now, processed later), config source switch, filesystem identity (symlink/alias/case) change. Seam work:
- Inventory seams in scope before moving code (Blind Witness Ch.8). Imports, globals, patch targets, init order are seams too.
- At each seam ask: what is explicitly carried, what is assumed, what generation fences it, what receipt proves crossing.
- Identity vs referent: path (referent spelling), snapshot (bytes captured), stored identity (claim about source) are three objects. #124787 credited repaired alias cases while keeping capture-time ownership questions open — valid values, wrong relation, real defect class.

## 3. Census method (six artifacts, PR scale)

Analyst lane must produce, sized to change: AST inventory; dependency/cluster map; consumer census (including tests that patch names, separate-language readers, background jobs); seam list with carriers; change window + golden hash; overlapping-work census (open PRs/issues touching window). Census completeness is itself evidenced: state surfaces searched and known blind spots. Large inventory without established relationships is not analysis (Ch.11).

Adjudication tiebreaks when windows contend (AGMD §6.4): live overlap blocks until landing; prefer zero hidden-state entanglement; prefer leafness. These generalize: schedule stateful, entangled work serially; leaf work parallelizes.

## 4. Blast radius

Radius(entity) = downstream consumers transitively + seams crossed + authority domains entered + data stores written. Compute from graph at pin; render as view with pin/generation. Radius drives: required reviewers (owners of radius, not just touched files), required probes (each crossed seam needs crossing evidence), disposition escalation (radius touching auth, money, deletion, or messaging at scale starts at BLOCKING scrutiny). Radius underestimated is a named incident cause (Module 11): post-incident, radius model itself gets a regression check.

Small diff, large radius is normal (shared util, schema, auth middleware). Large diff, small radius is also normal (vendored import, generated code). Review effort follows radius × promise criticality, never LOC alone — LOC only navigates (Ch.11) and caps sitting size for humans (industry baseline: ~200–400 LOC, <500 LOC/hr, <60 min sittings; Rev lanes chunk work the same way for auditability).

## 5. Platform and surface truth

Shared promise, deliberate difference: CLI/desktop/messaging surfaces may implement same capability through different lifecycles. Feature name parity proves nothing about restart/cancellation/external-boundary behavior. Review states intended common behavior vs platform-specific contract, verified on actual platform mechanisms (Windows ACL vs mode bits; real subprocess token acceptance). Alignment is engineering on real surfaces, not pretending platforms identical (AGMD §3.4, Ch.16 germination practice).

## 6. Exercises

1. For a familiar endpoint, draw representation chain and mark seams. Add carrier/generation/receipt per seam. Missing receipt = finding seed.
2. Compute manual blast radius for a shared-util change. Compare with graph query. Reconcile every delta — deltas are census defects.
3. Find two valid-looking values describing "same" workspace/user/tenant. Prove or break their relation at use time.
4. Re-scope a 5-line PR by radius. Write review effort justification in radius terms, no LOC argument.

Lane mapping: analysts build census/graph deltas; systems engineer owns lifetime+seam reasoning; diagrammer renders graph/trace views (pin-carrying, staleness-watermarked); accountant tracks radius-model corrections as curriculum updates.
