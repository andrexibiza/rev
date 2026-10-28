# Reference: Blind Witness Engine + 2K Law

Normative. Sources: All Gods Must Die (AGMD, 68pp, §§ cited); Blind Witness Engine teaching (22 chapters); 2K Law repo (github.com/andrexibiza/2k-law).

## 1. Problem and acceptance contract (AGMD §§1-2)

Failure shape: agent changes large module, runs some tests, writes persuasive "nothing broke." Second agent reads explanation and agrees. Two favorable statements, one investigation — second inherited boundary, assumptions, omissions, expected conclusion.

Transformation = existing artifact -> changed artifact preserving invariants (extraction: bytes identical, location changes; localization: prose changes, commands/identifiers/meaning survive). Before production, specify: allowed change, invariants, deciding authority.

Definition (binding): (1) producer does not certify output; (2) independently authored, information-isolated verifier accepts/rejects; (3) acceptance requires verifier verdict, not producer self-report; (4) third party reproduces verdict from public artifacts. Excluded as acceptance: summary, green-terminal screenshot without artifact identity, same-model re-rating, private uncheckable assertion.

Rev translation: every review/fix/crisis run is a transformation (diff, upgrade, translation of intent to code). Lanes below are mandatory; orchestrator never evaluates (dispatch + interlock + ledger only).

## 2. Five laws (each needs a mechanism that can disagree)

1. No component accumulates authority without becoming legible (map required: definitions, globals read, callers, tests patching names, overlapping work).
2. No claim outranks its evidence (hash proves selected bytes equal — not right window, not no import cycle, not runtime globals; identifier-present check proves presence — not preserved negation).
3. No actor certifies itself (see authority table below).
4. No rule counts until it executes (repo walk failing on new oversized file > remembered request; parity check every run > editor noticing drift).
5. No debt hides behind forgetting (manifest + status tiers; migration contracts, not waivers).

Authority table (AGMD §2): Implementer/translator produces candidate, cannot certify correctness. Pipeline/lanes organize+accelerate, cannot replace verdict with operational success. Mechanical gate compares bytes/seams/graph, cannot certify unobserved properties. Independent witness challenges meaning, cannot waive mechanical failures. CI enforces release gates, cannot turn incomplete test model into universal truth. CI release authority != pressing maintainer merge button (see authority.md).

Exercise (gate semantics): translation keeps every command block but producer self-rates "excellent." Ship? No — structural parity proven, semantic authority missing; "must not" -> "may" survives code-block checks. Rev reviewers must state which acceptance kinds are present/missing on every verdict.

## 3. Why defenses live inside the work (AGMD §3, Hermes model)

Hermes = persistent bounded memory, profiles, sessions, skills, tools, provider routing/fallback, scheduled execution, delegation, multiple surfaces. Agent can change files, spawn processes, carry info across boundaries, modify procedures later work loads. External wrapper cannot compensate for unsafe assumptions inside tool registry, env loader, docs, review process. Rev inherits placement: broker inside spawn path, gate inside CI, witness inside lane graph — never bolt-on lint after the fact.

Security trace method (full detail in security-architecture.md): follow value source->sink (status, logs, tool results, provider context, caches, child env). State-transition properties over settings labels (legacy plaintext migrated+removed, not just default flipped). Distinguish recognizable credential shapes from opaque sensitive values; carry applied-secret provenance under renamed keys (FOO). Sanitized builder insufficient if later env.update(os.environ) reintroduces. Windows: 0o600 != owner-only ACL (icacls; cover replacement-preserves-mode branch, rotation reopening). Desktop auth: stale env-file token overriding fresh injected token; provenance without printing; bounded retry; real subprocess regression on accepted token. File safety: .git internals are control plane, not workspace content.

Correct output can be NO PATCH: audit establishing already-covered migration/bypass closes uncertainty. Lanes rewarded only for patches manufacture work — forbidden incentive. Verified no-action is a settlement (NO_ACTION), credited like a fix.

## 4. 2K Law and ratchet (AGMD §§5,7)

Exact: no repository code file may exceed 2,000 lines. Exceptions: non-code docs (Markdown, JSON, YAML, lockfiles, LLMS.TXT), vendored third-party trees; walk excludes venv/build artifacts. Renaming source as docs or hiding under vendor/ to evade = violation. 2,000 is a chosen hard ceiling, explicitly not a claimed universal optimum (threats §9.5) — value is non-negotiability. Under ceiling != good architecture (mixed lifecycles still need decomposition lane). Arbitrary chopping preserving hidden dependencies distributes confusion; boundaries follow responsibility, shared state, consumers, init order.

Census before celebration: Aug 5 2026 baseline walk found 119 files over threshold (20 tracked targets, 99 untracked) — selected notorious list is not inventory. Document extensions/exclusions/roots/counting; population must be reproducible. Aggregate lines are inventory, not net deletion; extraction relocates.

Ratchet: Pantheon manifest records oversized files + measured baselines. (1) Over-ceiling first-party file cannot remain unmanifested. (2) Manifested file cannot grow beyond frozen allowance. Removal binds to kill shipping receipt (reviewed slices + public interlock), not smaller working tree. Baselines never quietly raised; rows never erased to silence CI. SHIPPED = every slice extracted, blind-reviewed to agreement, delivered as individually linked open PRs. SHIPPED != merged, != released. Historical aggregate discrepancy in paper is preserved honestly, never reconciled by invention — Rev ledgers follow same rule.

Rev enforcement: scripts/check.mjs (this repo) implements ceiling+manifest; Day-2+ adds growth predicate + census report. Exercise: scanner excluding plugin tree reporting "repo obeys law" is false — claim only covers configured walk.

## 5. Exact 5 x 2 x 3 method (AGMD §6) — Rev lane geometry

Meaning: five regional analysts -> five blind adversarial witnesses -> five regional adjudicators -> one blind implementer per agreed slice -> two new blind reviewers per slice. First two groups = five mutually blind pairs. Implementer/reviewer stages repeat per slice. Fix lanes added on rejection. Never a fixed "30 agents" total.

Wave 1 (regional analysis): partition target into five line-range regions; each analyst gets pinned read-only worktree at same consensus commit, reads complete region (reading partition != independence claim). Six required artifacts (§6, next section). Write-first gate: >10KB durable analysis file before further verification (survives throttling/lost completions; padded emptiness still fails substantive review).

Wave 2 (blind cross-check): five fresh witnesses, same regions/pin/obligations, must not read Wave-1 counterpart until own deliverable written; independently reconstruct incl. own golden hash. Brief targets observed failure classes: ineffective tests, import-time crashes, missing globals, incomplete consumer/PR censuses, missed collisions. Adversarial toward claim, never hostile toward producer. Blindness = answer/reasoning isolation, not different spec/revision (different input creates fake disagreement).

Wave 3 (adjudicate/implement/challenge): one adjudicator per region reads both analyses, re-verifies every load-bearing claim at pin. Not majority vote. Tiebreak order: (1) live open-PR overlap blocks window until that PR lands (land-order coordination; pick collision-free alternative meanwhile); (2) zero module-state entanglement preferred; (3) leafness (fewest outside dependencies). Output consensus contract: first slice, exact window, destination, golden hash, execution order, blocked alternatives. Implementer receives contract WITHOUT witness reasoning; verifies pin, moves agreed body, preserves public seam, adds identity+behavioral tests, compares failures vs pristine pin, commits signed-off, does not push (push/merge remain maintainer edges). Two NEW reviewers (correctness + adversarial, mutually blind, blind to expected answer) inspect committed candidate. Both must approve. Any REQUEST_CHANGES -> fix lane; repaired state returns to BOTH reviewers. Prior approval never carries to changed commit.

Rev scaling: full 5x2x3 for godfile/campaign/crisis-critical work. Standard PR review uses compressed geometry preserving invariants (analyst != witness inputs disjoint; adjudication before implementation; two fresh reviewers; no self-certification). Compression must be declared in receipt (geometry field); silent downgrade is AUTHORITY_WIDENING-adjacent misrepresentation.

## 6. Six artifacts before first move (AGMD §6.2, Ch.6)

Per region, all six or analysis is incomplete: (1) AST inventory (language-structure definitions + exact spans, not def-prefix search); (2) cluster + dependency map; (3) consumer census (every importer/caller/test-patch target); (4) first-extraction recommendation with exact window; (5) golden SHA-256 of window computed BEFORE movement; (6) live census of overlapping open PRs. Missing consumer census = boundary safety unestablished, regardless of diagram quality.

Pin contract, prove bytes (Ch.7): verify pin, hash window pre-move, move, re-hash must match byte-verbatim (extraction) or parity-gate (representation change). Seam (Ch.8): unchanged code changes behavior at seams — imports, globals, patch targets, init order, representation boundaries. Seam inventory is part of contract; reviewers inspect seams first.

Seven defect classes (Ch.9, witnesses credited individually): ineffective/false-green tests; import-time crashes; missing globals/state entanglement; incomplete consumer census; incomplete PR-collision census; seam breakage (behavior changed without code change); identity/byte drift. Each class names credited witness in ledger — attribution is architecture, not courtesy (AGMD §3.6, §20).

Interlock (Ch.10): bidirectional issue<->PR graph, not footer text. Known historical audit limits (Exhibit A) must be taught: unbound PR list excluded from HOLES predicate; closed-unmerged counting as shipped; 200-issue/100-PR caps; comments fetched for first 50 shards without pagination — PASS from such script never certifies full interlock. Rev ledger (schema.md Receipt/GraphEdge) must avoid each limit or disclose it.

## 7. Germination: seven parity gates (AGMD §§13-15, Ch.11-15)

Docs are graphs of operational promises. Translation drift = graph failure. Parity classes: fence_parity, code_span_parity, link_target_parity, anchor_parity, heading_parity, backlink_parity, discoverability (+ whole-tree aggregation). Verifier only as honest as its parser (Ch.13): regex fence backreferences closing early, phantom code spans, badge whitespace, hub-selector over-enforcement, double-suffix rewrites, slugger trailing hyphens, legacy severity blocking CI forever, fence comments vs code — each failure became a rule with property tests. French keystone: seed -> gate -> semantic witness (native reviewer judges meaning; structural gate cannot). Germinated = all classes pass + semantic acceptance + CI enforcement at error tier; legacy debt visible at warning tier (status tiers, AGMD §18).

Rev reuse: any representation change (docs i18n, codegen, config migration, vuln patch changing APIs) declares its parity classes up front; LLM is non-arbiter producer (AGMD §19: prompt as contract surface, model structurally untrusted, mocked tests as product, human path first-class).

## 8. Enforcement as continuous verification (AGMD §7) + evaluation honesty (AGMD §§8-9)

Tests, not prose: 2K enforcement test, progressive-disclosure enforcement test (skill context surface is executable infrastructure, §3.5), KILL LOCK audit. Live campaign accounting (scale, ships, double-blind measurable contribution — e.g., moved-collector false-green caught only adversarially, interlock closure, cost incl. throttling/exhausted credit) reported with scope dates. Threats Rev must repeat on its own claims: LLM agreement is correlation not ground truth; agreement manipulable by artifact; test-suite-as-gate objection answered by sensitivity witnesses, not dismissed; one repo/one model family/no controls limits generality; 2K threshold arbitrary-but-enforced; SHIPPED != merged; write-first/throttle resistance can conceal failure if deliverables padded. Measure what engine proves (Ch.18): reproduced/rejected claims, not favorable statements.

## 9. Adoption checklist (Ch.19-20)

Pin + contract -> six artifacts -> blind pairs -> adjudication with tiebreaks -> blind implementation -> dual fresh review -> mechanical gates + CI -> interlock + credit ledger -> status-tiered debt. Capstone discipline: refuse the wrong green result (green from wrong artifact, wrong window, insensitive test, stale generation, partial audit). If any stage missing, settlement names missing stage. Never upgrade prose confidence to compensate.

## 10. Godfile decomposition playbook (campaign form)

When to campaign vs request: file >2K, or under ceiling but mixing lifecycles/state/formatting/network (headroom decomposition), or repeated change collisions in one window. Steps binding: census (extensions/exclusions/roots documented) -> manifest debt entry with frozen baseline -> regional partition (5 regions, line ranges) -> six artifacts per region -> blind pairs -> adjudication tiebreaks (overlap-block, entanglement, leafness) -> slice contracts (window, destination, golden hash, order, blocked alternatives) -> blind extraction preserving seam (byte-verbatim proof) -> identity tests (same public symbols/behavior) + behavioral tests -> dual fresh review -> interlocked PR slices -> manifest removal only via shipping receipt -> empty-manifest terminal state with CI guard.

Extraction boundary selection: follow responsibility + shared state + consumers + init order. Anti-patterns (each BLOCKING if proposed): size-only chopping distributing hidden globals; moving code while "cleaning up" logic in same slice (mixes transformations — split slices); renaming public seam without consumer census; extracting without golden hash (byte drift undetectable); landing slices out of adjudicated order when state entanglement exists.

Documentation germination parallel: root doc is source graph; locale files rewrite prose under parity gates; seed by translating against current root hash; gate at error tier for germinated locales, warning tier for legacy (status tiers prevent legacy debt blocking CI forever while keeping debt visible — Pitfall 7 lesson). Semantic witness is native-competent reviewer lane, distinct from translator and gate.

## 11. Cost and limits accounting (honest engine)

Method costs: parallel lanes multiply compute; throttling/credit exhaustion are recorded operational facts (AGMD §8.5), mitigated by durable >10KB write-first deliverables (work survives lost completions), never by downgrading blindness silently. Report per campaign: slices shipped/merged (separately), blind-disagreement rate, adjudication overturns, fresh-review rejection rate, false-green catches unique to witnesses, wall-clock, token/compute cost per merged slice. If witnesses never disagree, suspect contamination (shared inputs/prompts) before celebrating quality — agreement is correlation, manipulable by artifact (threats §9.1–9.2); periodic seeded-defect drills (plant known defect, witnesses must catch) calibrate sensitivity like test mutation probes.

Applicability limits (state on every campaign receipt): single-repo evidence, model-family correlation, no randomized control. Federation conformance (authority.md §11) plus public developer-action benchmark (hit = maintainer acted) are the external validity path — internal agreement metrics never substitute.

## 12. Skill-surface engineering (context as code)

Skills are executable infrastructure (AGMD §3.5): progressive disclosure enforced by test (core SKILL.md small; references loaded by concern; monolith skim failure is measured, not assumed). Reference files versioned; lane prompts reference file + section, never copy-paste drift. Changes to references require: failure case motivating change, exercise update, conformance witness (lane run on fixture must change behavior as intended). Reference bloat control: every section must name lane + decision it changes; orphan prose deleted at campaign review. This curriculum (curriculum/) is source; references/ are compiled loadable form — edit curriculum first, recompile references, diff reviewed like code.

## 13. Geometry selection guide (declared in every receipt)

Full 5x2x3: godfile campaigns, crisis CRITICAL/KEV-reachable, auth/money/deletion radius, contested adjudications. Compressed Standard (1 analyst, 1 blind witness, 1 adjudicator, 1 implementer, 2 fresh reviewers): normal PR review/fix with radius within one subsystem. Compressed Light (analyst+witness merged ONLY for read-only diagram/question asks with no mutation downstream; verdict capped at COMMENT, cannot APPROVE): exploratory asks. Downgrade triggers mid-run: radius grows, security signal appears, witness disagreement on load-bearing claim -> escalate geometry, receipt records escalation (never silent). Upgrade cost charged to cost receipt; downgrade to save cost on escalated signals = AUTHORITY-adjacent process finding.

Isolation implementation: lanes receive pin + obligations + artifacts allowlist; witness allowlist excludes counterpart outputs by construction (tool-level, not instruction-level "please don't look" — instruction-only blindness is contaminated by design and fails federation W-E witness checks). Orchestrator enforces allowlists; trace input digests prove disjointness.
