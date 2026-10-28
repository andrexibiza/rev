# Reference: Systems + Subsystems Mapping (Systems Engineer / Subsystems Analyst / Diagrammer hats)

Normative. Sources: Intro Ch.6, Ch.11; AGMD §6 (six artifacts), §2.5 graph-gated perception; schema.md §4.

## 1. Graph before verdict

Rev maintains per-repo knowledge graph (schema.md): Promise, CodeEntity, Seam, TestAssertion, AuthorityHolder, Advisory, Finding, Repair, Receipt, LaneRun. Built automatically from AST, lockfiles/SBOM/Dockerfiles/workflows, PR/issue text, review history, settlements. Pinned by SHA+generation; rebuild = new generation; prior generations queryable. Graph queries replace fresh investigation for reachability, blast radius, ownership — but graph edge without evidence supports nothing above QUESTION.

## 2. Analyst deliverables (six artifacts, adapted per PR)

AST inventory (structure-derived definitions+spans); cluster/dependency map; consumer census (importers, callers, patch-target tests, cross-language/process participants); seam list (representation, persistence, provider, process, platform boundaries — where unchanged code changes behavior); exact change window with golden hash; live overlapping-PR census (collision windows blocked per adjudication tiebreaks). Subsystems analyst owns census completeness; systems engineer owns lifetime reasoning (stored->loaded->prepared->provider-facing; what survives restart/continuation/retry; synthetic vs authoritative inputs; owed work across events).

Blast radius (gating): entities touched + downstream consumers + seams crossed + owners affected + tests covering radius (proven assertions only). Radius over repo threshold escalates disposition + required approvals. Report is GraphQL blastRadius(depth) output rendered, never hand-drawn estimate.

## 3. Diagrams that are views, not art (Diagrammer)

Process diagrammer renders graph/trace views: promise flow (participants, transformations, decision points), authority path (admission->projection->mutation->settlement with proof hashes), lane trace (spans, states, digests — never chain-of-thought). Mermaid allowed as export; source of truth is graph query result at pin. Every diagram carries pin + generation + query identity. Stale diagram (pin moved) must watermark STALE. Real visualizations in plugin are interactive GraphQL views (plan Day 6); static images in PRs link to live query.

## 4. Accounting (Findings Accountant)

Ledger per repo: findings by kind/severity/disposition, repairs, credit per participant (investigator/implementer/witness/reviewer/maintainer kept distinct), interlock issue<->PR bidirectional, debt manifest (2K, flaky, legacy severity tiers), cost receipt per WorkEvent (lane compute, tokens, CI minutes, wall-clock, human minutes; cost per finding/merged fix/closed disclosure). SHIPPED vs MERGED tracked separately. Gaps listed honestly (unbound PRs, uncensused shards) — never smoothed (AGMD interlock lesson). Incident analysis extends ledger backwards: incident -> implicated merges -> broken promise/seam -> new red-capable regression test + check file (see disciplines.md).

## 5. Graph build pipeline (how the map earns trust)

Stages (each receipted, failures degrade graph with declared blind spots — never silently partial-as-complete): ingest (host adapter: commits, PRs, issues, advisories, CI) -> parse (AST per language, lockfile/SBOM/Dockerfile/workflow parsers with property tests — verifier only as honest as its parser, Blind Witness Ch.13: fence/code-span/slug pitfalls generalize to every parser) -> link (consumers, owners via CODEOWNERS at pin, tests->entities via import+patch-target resolution) -> prove (reachability artifacts, executed-path overlays from traces) -> publish generation (atomic; queries pin to generation). Parser changes require golden-file diffs reviewed as behavior changes.

Identity across generations: SUPERSEDES edges explicit (renames/moves detected by content hash + AST path, adjudicated when ambiguous). Node identity never reused for different entity (generation discipline from authority §4 applied to graph itself).

## 6. Visualization grammar (real GraphQL views)

Plugin views are queries, not pictures: Promise view (promise->entities->tests->findings), Radius view (entity closure with seam/owner overlays), Authority view (holders per path at generation), Crisis view (advisory->AFFECTS (dashed, unproven) vs REACHES (solid, evidenced) — line style encodes evidence status, legend mandatory), Trace waterfall (authority/lane/execution spans, refusal reasons on span). Every view exports Mermaid/PNG as secondary artifact with pin watermark. Interaction contract: click node -> receipts; click edge -> evidence; time slider -> generation diff (added/removed/changed highlighted, never mutated in place). Accessibility: graph views ship text equivalent (adjacency list) — severe platform, not inaccessible platform.

## 7. Diagramming in PRs (portable form)

PR-embedded diagrams use Mermaid generated from same query (not hand-edited; regeneration diff checked in CI — hand-edited diagram that diverges from graph is DOCS_PARITY finding). Keep PR diagrams small (promise subgraph only); full graph lives in plugin. Diagram PR comment carries query + pin so any reader reproduces identical view via GraphQL.

## 8. Federation graph exchange

Graph exports for federation: generation snapshots signed (node/edge digests), SUPERSEDES maps for cross-host identity, evidence refs resolvable (content-addressed artifacts). Importing foreign graph data: treated as reported evidence (attributed, scoped) until local probes promote relations — foreign REACHES never auto-promotes to local REACHES. Privacy: graph may contain sensitive paths; export grants scoped per consumer (authority proof), redaction as projection with declared blind spots.

## 9. Tracing design (spans that prove)

Span naming: authority.<stage>, lane.<kind>, exec.<probe>. Attributes allowlisted (digests, pins, reason codes, key-names) — free-form attributes banned (secret leakage + cardinality). Parentage: EXECUTION spans parent to LANE that requested, LANE to AUTHORITY admission; orphan spans indicate unbrokered work (investigate). Trace completeness check in CI for demo paths: every WorkEvent trace has unbroken AUTHORITY chain or refusal span.

## 10. Stacked change mapping (GitHub stacks + Graphite model)
Stack = ordered layers, each independently reviewable, merged atomically or partially with auto-rebase/retarget (GitHub stacked PRs public preview 2026-07-30; Graphite stacked diffs). Graph representation: layer nodes with parent edges + per-layer pins; review verdicts bind layers, stack verdict aggregates without widening (approve layer 1 never approves layer 3). Restack events are generation changes for upper layers — approvals revalidated per layer head movement (range-diff). Rev prefers stacks for radius-large work; virtual windows emulate when host lacks stacks.

## 11. Identity operations in graph
Entity resolution: candidate matches (path, content hash, AST signature) scored; auto-SUPERSEDES only above declared threshold with evidence, else adjudicator queue. Renames without content change preserve Finding history via SUPERSEDES; content+name change = new entity + linked predecessor (history visible, never merged silently). External identities (CVE<->GHSA<->OSV aliases) stored as alias edges, canonical OSV id primary.
