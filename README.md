# Rev — Automated Code Review & Implementation Machine

Rev produces code reviews and implementation PRs on demand (`@Rev`), by webhook, or from live vulnerability advisories. Blind agent lanes investigate, implement, and review under one operating law:

> **Nothing ambient survives a boundary.** A route, profile name, socket, parent environment, PID, branch, tag, or CVE ID may identify a candidate operation. None grants authority. Every consequential transition consumes an explicit proof object, narrows it to the exact edge, fences it by identity and generation, and emits a typed settlement receipt. — Hermes [#93943](https://github.com/NousResearch/hermes-agent/issues/93943), canonical account [#95028](https://github.com/NousResearch/hermes-agent/issues/95028)

GitHub is source material (repos, commits, diffs, identities, advisories). Rev is the platform where reviewing happens. Settlements project back to GitHub. Truth lives in Rev's knowledge graph, served over real GraphQL.

**Status (2026-10-28, v0.6.0):** core machine + federated protocol implemented, 81 tests green, live smoke verified locally. Live GitHub posting and model-backed lanes require operator credentials (see §11 — exact env, exact behavior without them). What is stubbed is labeled stubbed. Nothing in this README claims otherwise; §12 lists every remaining gap with its owner.

---

## Table of Contents

1. Doctrine & invariants
2. Architecture
3. The nine primitives
4. Knowledge graph & GraphQL
5. Module reference (`src/`, 4,500+ lines)
6. The blind factory & verdict format
7. The advisory crisis lane
8. Federated protocols
9. Usage
10. Configuration
11. Development & verification
12. Known gaps & roadmap
13. License & lineage

---

## §1. Doctrine & invariants

### 1.1 Canon

Layered references applied in order of authority:

| Layer | Source | What it governs |
|---|---|---|
| Operating law | [Nothing Ambient Survives, #93943](https://github.com/NousResearch/hermes-agent/issues/93943) + [Authority Execution Layer, #95028](https://github.com/NousResearch/hermes-agent/issues/95028) | Proof objects, narrowing, generation fencing, settlement |
| Doctrine | [All Gods Must Die](https://axlibiza.com/writing/all-gods-must-die/) (also `specs/theory.md`) | Adversarially verified transformation, 2K Law, 5×2×3 geometry, manifested debt |
| Review frame | [Introduction to Code Review](https://axlibiza.com/learn/code-review/) | Knowledge mapping: promise, participants, observed behavior, uncertainty, decision |
| Engine teaching | [Blind Witness Engine](https://axlibiza.com/learn/blind-witness-engine/) | Teachable form of the above, 22 chapters |

Full text of the theory base, including the distributed-systems lineage (Byzantine agreement, object capabilities, transparency logs), is in [specs/theory.md](specs/theory.md) and the from-scratch [`curriculum/`](curriculum/README.md) (14 modules, primitives → disciplines → studios).

### 1.2 The 10 core invariants

Rev cannot exist without these. Any violation voids a verdict's conformance claim. (Full text + witnesses: [`references/invariants.md`](references/invariants.md).)

1. **No self-certification.** The producer never accepts its own work; an independently authored, information-isolated verifier accepts or rejects.
2. **Nothing ambient survives a boundary.** Coordinates select; proof objects authorize.
3. **Authority only narrows.** Every derived grant is a subset of its parent.
4. **Proof scope equals mutation scope.** Object, identity, generation, and snapshot covered by evidence must match what the action touches.
5. **Everything is pinned.** Commit SHA, authority generation, and policy hash on every claim, verdict, diagram, and receipt.
6. **Evidence must be able to fail.** A distinguisher that cannot go red (insensitive test, wrong-supplier apparatus, disconnected patch target) decides nothing.
7. **Settlement is typed and honest.** `QUEUED / CLAIMED / RUNNING / COMPLETED / FAILED / CANCELLED / EXPIRED / INDETERMINATE / SHIPPED / MERGED / NO_ACTION` are distinct states. `SHIPPED` (PRs delivered) ≠ `MERGED` (merge SHA verified green on `main`). Timeout after possible execution settles `INDETERMINATE` and reconciles — never blind-retries.
8. **Identity is composite.** `(logical ID, generation)` always. Bare names, PIDs, profiles, and branches identify nothing across a boundary.
9. **Capability is preserved.** A repair that disables the promised behavior to pass a check has failed. Legitimate controls are part of every fix contract.
10. **No rule counts until it executes; no debt hides.** Gates run in CI or they are prose. Violations enter manifested ledgers (2K ceiling, flaky tests, feature flags, docs debt) with owners and expiries.

### 1.3 The nine core primitives

Promise · State/Lifetime · Boundary · Change (transformation + invariants) · Evidence (claim/pin/kind/scope tuples, with sensitivity) · Authority (scoped grants, monotonic, generation-fenced) · Time (ordering, expiry, freshness) · Identity (logical vs incarnation) · Cost (compute, CI, human attention as budgeted receipts). Derivations for each: `curriculum/00-foundations.md` + `references/primitives.md`.

---

## §2. Architecture

```
GitHub App webhook ─┐
@Rev mention ───────┼─► Proof builder ─► Durable queue ─► Blind factory ─► Graph ─► Settlement ─┬─► GitHub projection
Advisory watcher ───┘   (pin+grants)     (fenced lease)   (blind lanes)   (GraphQL)  (receipts) ├─► Hermes plugin registry
                                                                                              └─► Transparency log
```

* **Ingress.** GitHub App (narrow per-resource permissions, built-in webhooks, 1 MB body cap, signature-verified) + `@Rev` parser + OSV/GHSA/KEV advisory watcher. Every trigger is a coordinate, never a grant.
* **Proof & queue.** Each trigger builds a `ProofObject` (target identity, pinned head/base SHAs, policy version + hash, exact grants, stdin/descendant policy, lease fencing). Work queues as immutable, idempotent `WorkEvent`s under renewable leases fenced by owner/token/generation. Duplicates replay committed results — they never execute twice.
* **Factory.** Blind lanes (§6) investigate, adjudicate a contract, implement blind, and face two fresh reviewers. The orchestrator dispatches and keeps the ledger only; it never evaluates.
* **Graph.** Every run extends a per-repo knowledge graph (§4): promises, code entities, seams, consumers, owners, tests-that-actually-assert, advisories, reachability, findings, repairs, credit. Pinned by SHA + generation and served over real GraphQL — the plugin's only read path.
* **Settlement.** Typed receipts (§1.2.7) with cost attached (`lane compute, tokens, CI minutes, wall-clock, human minutes`). Crisis lane targets `MERGED` on `main`, proven by merge SHA. Receipts hash-chain into an append-only transparency log (§8) for offline, third-party verification.
* **Surfaces.** GitHub App (ingress/projection) · Hermes native plugin + Desktop plugin (native home: cross-repo registry, interlock graph, live lane board) · `SKILL.md` progressive-disclosure skill tree (49 reference files) · CLI/GraphQL for everything else. Same objects on every surface.

Design rule that repeats at every seam: **coordinates select, proof objects authorize; summaries are not contracts; a second agent repeating the first agent's explanation is not independent analysis.**

Key structural documents: [`schema.md`](schema.md) (graph + GraphQL SDL, 79 types), [`plan.md`](plan.md) (7-day build plan of record), [`agents.md`](agents.md) (rules for working in this repo), [`REV-REVIEW.md`](REV-REVIEW.md) (adversarial self-review; blockers B1/B2 fixed, see file).

---

## §3. Module reference (`src/`)

All pure Node ≥22 ESM, zero runtime dependencies. `npm test` runs everything with `node --test`.

| File | Lines (approx) | Exports (the actual surface) | Role & status |
|---|---|---|---|
| `src/types.mjs` | 70 | `validateProof` (incl. `revalidates` chain, `AUTHORITY_WIDENING` refusal), `makeWorkEvent`, `makeReceipt` (value-free guard), `SettlementStates`, `Operations` | Proof/receipt primitives. **Live.** |
| `src/queue.mjs` | 390 | `createQueue({storePath?, now?, leaseTtlMs?})` → `enqueue/claim/heartbeat/markRunning/ack/nack/abandon/reclaimExpired/get/list/size`, `ackReceipt/nackReceipt`, `getByIdempotency`, `SETTLEMENT_STATES`, `REFUSAL_CODES` | Durable idempotent queue, fenced leases, write-once results, crash/reclaim, `INDETERMINATE`. File-persisted when `storePath` set. **Live.** |
| `src/authority-map.mjs` | 90 | `resolveAuthorityMap(repoRoot, opts)`, `parseCodeowners`, `ownersForPath` (fnmatch `*`/`**`/`?`, last-match wins, first CODEOWNERS in root → `.github/` → `docs/`) | Per-run authority map; fail-closed on ambiguity. **Live.** |
| `src/graph.mjs` | 650 | `createKnowledgeGraph({pin})`, `NODE_KINDS` (13), `EDGE_KINDS` (14), `blastRadius`, `path/reachabilityPath`, `addAdvisory/findAdvisories/affectedEntities/reachableEntities`, `registry`, pins + generations, transparency-log helpers | In-memory knowledge graph. `AFFECTS` (version match) strictly distinct from evidence-bearing `REACHES`. **Live.** |
| `src/ingest.mjs` | 450 | `ingestDirectory`, `buildGraphFromDirectory`, import/consumer extraction (JS `import/require`, Py `import`), owner mapping | Real repo → graph. Heuristic parsing, labeled as such. **Live.** |
| `src/graphql.mjs` | 700 | `executeGraphQL({query, variables, graph, repositories, workEvents, advisories, pin})`, `createGraphQLHandler(context)` | Zero-dependency GraphQL executor + HTTP handler. Core queries: `repository`, `repositories`, `workEvent`, `advisory` (reachability), `registry`. SDL in `schema.md` (validated by `scripts/check-sdl.mjs`). **Live (query subset; mutations are roadmap).** |
| `src/factory.mjs` | 90 | `analystScan`, `witnessProbe` (executed boundary values), `sensitivityProbe`, `adjudicate`, `freshReview`, `runNodeTest` | Deterministic blind-factory core. **Live on fixtures; general-diff lanes need §11 credentials.** |
| `src/fixlane.mjs` | 250 | `runFixLane` (+ aliases `blindImplement` etc.), `applyCapFix`, `buildPatch`, `evaluateCandidate`, `CAP_AMOUNT` | Blind implementer: contract-only input, patch + head content, dual fresh-review gate. **Live on the demo repair class.** |
| `src/crisis.mjs` | 400 | `runCrisisLane` (+ aliases), `applyUpgradeFix`, `simulateMerge/isAncestor/verifyMergeOnMain`, `upgradeSpec` | Advisory → REACHES proof → upgrade fix → merge verification → `MERGED`/`NO_ACTION` receipt with disclosure/triage/merge timestamps. **Live (simulated main; live main via `src/github.mjs`).** |
| `src/watcher.mjs` | 860 | `normalizeAdvisory` (OSV), `matchPackageJson/matchLockfile/matchDockerfile/matchActions`, `triageAdvisory` (CRISIS/STANDARD/MONITOR/NO_ACTION + re-triage triggers), reachability helpers | Advisory ingestion for all ecosystems (PyPI/npm/Crates/Go/RubyGems/Maven/NuGet/Packagist/Hex/Docker/GitHub Actions/Distro), KEV/EPSS as inputs. **Live.** |
| `src/github.mjs` | 550 | `createAppJWT` (RS256, Node crypto), `createInstallationToken`, `fetchPullRequestDiff/Files`, `postReview`, `createFixPr`, `verifyMerge`, `createGitHubClient({dryRun})` | GitHub App live loop. All network through injectable `fetchFn`. **Live plumbing; needs App ID + private key to run against GitHub.** |
| `src/projector.mjs` | 30 | `postReview` | Settlement → GitHub review export. Dry-run unless `REV_LIVE_POST=1` + `GITHUB_TOKEN`. **Live.** |
| `src/worker.mjs` | 40 | `drainOnce({queue, owner?, projector?})` | Claim → `markRunning` → factory → `ack`/`nack` with receipts. **Live (demo workload).** |
| `src/model.mjs` | 40 | `completeLane({kind, brief})`, `modelConfigured()` | Lane model provider. Muse endpoint when `REV_MODEL_ENDPOINT`/`REV_MODEL`/API key set; otherwise returns labeled `deterministic-executor` (never fabricates model output). **Hook live; model path needs credentials.** |
| `src/traces.mjs` | 300 | `Trace/Span` (`AUTHORITY`/`LANE`/`EXECUTION`), allowlisted attributes, secret/CoT rejection, `costReceipt`, per-outcome aggregation | Traces & PR costs per schema §8. **Live.** |
| `src/transparency.mjs` | 25 | `createLog/append/verifyChain/meetsThreshold(threshold=3)/digest` | Append-only hash-chained receipt log; tamper-evident; corrections via SUPERSEDES only. **Live.** |
| `src/webhook.mjs` | 50 (post-wiring) | `verifySignature` (HMAC-SHA256, timing-safe), `handleWebhook({... ,queue})` | Signature gate; with queue configured, PR/issue events enqueue idempotently by delivery ID. No-queue embeddings refuse `LANES_NOT_READY`. **Live.** |
| `src/app.mjs` | 60 | HTTP server: `POST /webhooks/github`, `/graphql` (GET/POST), `GET /healthz` | Rev server entry. **Live (verified 2026-10-28).** |
| `src/review.mjs` | 35 | `composeReview({pin, promise, findings, sound, gaps, verdict, cost})` | Findings → Conventional Comments verdict markdown (anatomy-enforced). **Live.** |
| `src/demo.mjs` | 30 | `runDemoReview()` | Offline demo orchestration (Acts 1–2 core). **Live.** |

Other top-level artifacts: `conformance/run.mjs` (executable federation witnesses, §8), `scripts/check.mjs` (2K Law ratchet), `scripts/check-refs.mjs` (reference index + anti-stub gate), `scripts/check-sdl.mjs` (GraphQL type closure — 79 types, 11 connections), `hermes-plugin/rev/` (native Hermes plugin + Desktop plugin), `plugin/` (standalone severe registry web UI served statically — Hermes is the native home; this is the portable window).

Tests (14 files, `node --test tests/*.test.mjs`): `day1` (proof/authority/webhook/glob) · `queue` (10) · `graph` (7) · `ingest` (4) · `github` (fake-fetch JWT/diff/merge) · `factory` (witness/sensitivity/fresh-review) · `fixlane` · `crisis` (MERGED + NO_ACTION) · `watcher` (7) · `traces` · `transparency` (tamper) · `worker` (drain, dry-run projector, honest model fallback) · `e2e` (queue→demo, watcher, GraphQL) · `conformance` (witnesses all-pass). **81 tests.**

Planted demo fixtures (`fixtures/demo/`, all labeled): discount-cap bug (member path), wrong-supplier bad test that cannot go red, reachable + unreachable advisory pair. The first planted bug written for this repo was mathematically invisible (commutative tax/discount) and was caught by our own sensitivity test — kept in history (`REV-REVIEW.md`) as the method working on ourselves.

---

## §4. Usage

### 4.1 Run the server

```bash
git clone https://github.com/andrexibiza/rev && cd rev
npm run check && npm run check:refs && node scripts/check-sdl.mjs && npm test
PORT=8787 WEBHOOK_SECRET=devsecret npm start
# POST /webhooks/github (signed) · /graphql · GET /healthz
```

Verified live 2026-10-28 on this tree: webhook `pull_request` → `200 {queued, replayed:false}`; duplicate delivery → same `eventId`, `replayed:true`; `drainOnce` → verdict `REQUEST_CHANGES`, receipt `COMPLETED`; `POST /graphql { registry }` → `200`. (Commands in `DEMO.md`.)

### 4.2 `@Rev` asks (target UX; offline/demo path exists today — see §12 for what is live vs wired)

```
@Rev review [--security]     promise-first review of pinned head vs base
@Rev fix <finding>           blind implementation + dual fresh review -> PR
@Rev implement <issue>       build the change, with receipts
@Rev respond CVE-.../GHSA-...  disclosure -> triage -> fix PR -> merged
@Rev diagram <subsystem>     knowledge-map / process diagram at pin
@Rev audit tests             bad-test hunt across touched paths
```

Every response states its evidence boundary per claim (source-inspected / executed / unresolved), is pinned to SHAs, and ends in a typed settlement. A tag, CVE ID, branch, or advisory headline is a coordinate: it selects work, it never authorizes it.

### 4.3 Review and fix, offline (works today)

```bash
node src/demo.mjs        # Act 1: REQUEST_CHANGES — cap bug (blocking, executed) + bad test (blocking)
# Fix lane + crisis lane are exercised by tests/fixlane.test.mjs and tests/crisis.test.mjs
```

### 4.4 Hermes

Native plugin (tools in any Hermes session) + Desktop plugin (pane + status bar):

```bash
cp -R hermes-plugin/rev ~/.hermes/plugins/rev
hermes plugins enable rev && hermes plugins doctor ~/.hermes/plugins/rev --ci
# Desktop: copy hermes-plugin/rev/desktop/plugin.js to $HERMES_HOME/desktop-plugins/rev/plugin.js
```

Tools: `rev_demo_review`, `rev_registry`, `rev_triage` — explicit `endpoint` argument, typed refusals when Rev is down, never ambient authority. Register wiring verified by harness in this build; `doctor` itself was blocked by sandbox PyPI sync (environment, not plugin) — run it on a networked host. See [`hermes-plugin/rev/README.md`](hermes-plugin/rev/README.md).

Standalone registry UI (any static host): serve `plugin/` and point it at `http://localhost:8787/graphql`. Demo data, when shown, is always labeled DEMO DATA.

### 4.5 Federation conformance

```bash
node conformance/run.mjs && cat conformance/REPORT.md
```

Executes six witnesses (W-A authority, W-S settlement, W-E evidence, W-P process, W-G graph — 6/6 at 0.6.0) against the real `src/` code. Gate removal turns witnesses red by construction (cache-busted imports).

---

## §5. Configuration

| Env / input | Effect | Without it |
|---|---|---|
| `PORT` (default 8787), `WEBHOOK_SECRET` (required) | Server + signature verification | Unsigned deliveries → `401` |
| `GITHUB_TOKEN` + `REV_LIVE_POST=1` | Projector posts real GitHub reviews | Dry-run receipts only (explicit, never silent) |
| `MUSE_API_KEY` or `META_AI_API_KEY`, `REV_MODEL`, `REV_MODEL_ENDPOINT` | Model-backed lanes | Receipts state `deterministic-executor`; probes still carry verdicts |
| GitHub App ID + private key PEM + installation | `src/github.mjs` live loop (JWT → installation token → diff/review/PR/merge-verify) | Fake-fetch tested plumbing only |
| Hermes: `~/.hermes/plugins/rev` + enable | Native tools + Desktop pane | CLI/GraphQL surfaces unaffected |

Per-repo policy (versions the proof): CODEOWNERS + branch protection (resolved per run into an AuthorityMap — ambiguous ownership fails closed), `.agents/checks/*.md` (one concern per file; seeds in `checks/`), 2K manifest (`.rev-2k-manifest.json`), cost ceilings and geometry defaults (policy data, declared per repo).

---

## §6. Development & verification

Gates (all must pass; each is an executed rule, per Invariant 10):

```bash
npm run check          # 2K Law: no code file >2000 lines beyond manifested allowances
npm run check:refs     # every references/*.md indexed, >=100 words, curriculum 00-12 present
node scripts/check-sdl.mjs   # schema.md GraphQL closure: 79 types, 11 connections
npm test               # 81 tests (node --test tests/*.test.mjs)
node conformance/run.mjs     # federation witnesses 6/6
```

Repo conventions (`agents.md`): read `plan.md` first; small core + massive references (progressive disclosure); one concern per check file; orchestrator never evaluates; shortest focused test first, broad run once after final edit; docs + `CHANGELOG.md` updated in the same PR as behavior (docs are parity-gated promises, `references/docs-parity.md`). Commit style on `main`: short versioned summaries (`Phase 0.6.0: ...`).

The reference library is the method, versioned like code: [`references/INDEX.md`](references/INDEX.md) (49 files), deep source in [`curriculum/`](curriculum/README.md), protocols in [`specs/`](specs/federation.md), output contract in [`references/anatomy-of-a-rev-review.md`](references/anatomy-of-a-rev-review.md), calibration drills in [`references/failure-gallery.md`](references/failure-gallery.md) (20 seeded/historical cases).

## §7. Federated protocols

Three publishable specs + governance, designed to outlive this implementation (crypto lessons adopted: threshold countersignatures, transparency logs, content addressing, reproducible verdicts, reputation-by-outcomes; token speculation and consensus theater explicitly rejected):

- [`specs/authority-protocol.md`](specs/authority-protocol.md) — proof objects, monotonic derivation, typed execution edges, revocation, offline verification. Levels L1 read / L2 review / L3 mutation.
- [`specs/review-protocol.md`](specs/review-protocol.md) — promise/finding/verdict objects, evidence sensitivity, privacy-preserving conformance via hash commitments.
- [`specs/graph-protocol.md`](specs/graph-protocol.md) — graph model, pinning, GraphQL contract, signed generation exchange. `AFFECTS` never propagates as `REACHES`.
- [`specs/federation.md`](specs/federation.md) — key registry, transparency-log heads cross-checked by mirrors, RFC process (two implementations prove breaking changes), developer-action benchmark governance, weight slashing on proven wrong-greens.
- [`specs/theory.md`](specs/theory.md) — the full bibliography every clause traces to.

Conformance is a suite, not a badge image: `conformance/REPORT.md` links witness receipts anchored by digest.

---

## §8. Known gaps & roadmap (honest, owned)

| Gap | State today | Unblocks with |
|---|---|---|
| Model-backed lanes | `src/model.mjs` hook live; verdicts carried by deterministic probes; `modelConfigured()` false without env | Operator Muse endpoint + key + `REV_MODEL`; then gallery catch-rate publication |
| Live GitHub posting / fix PRs / merge | Plumbing complete + fake-fetch tested; projector dry-run by default | GitHub App credentials + test repo; then Steps 5–6 of next-phase plan (live drill, n≥3 for timing claims) |
| `hermes plugins doctor` green | Register harness passes; doctor blocked by sandbox PyPI dependency sync (google-auth/pyasn1) | Any networked host: `hermes plugins doctor ~/.hermes/plugins/rev --ci` |
| Desktop pane live observation | `desktop/plugin.js` syntax-valid, SDK-shaped; not yet observed in Electron host here | Hermes Desktop on operator machine |
| Demo video | `DEMO.md` runbook rehearsed in pieces (live smoke + demo + queue) | Recording pass (freeze per plan Day 7) |
| Public benchmark | Design + internal developer-action tracking (`references/benchmark.md`) | Corpus build (federation Phase 1: 500 PRs) post-loop |
| Second federation implementation | Specs + conformance published; Rev is sole implementation | Recruit adapter (GitLab / non-Hermes host) — protocol status starts at two |

Roadmap order is fixed by dependency: live loop → live crisis → Hermes/Desktop observed → benchmark → second implementation. Campaign mode (godfile decomposition, repo-wide bad-test hunts, docs germination) reuses the same factory and is specced in `references/`; it is not in the current test count and is not claimed here.

---

## §9. License & lineage

MIT — see [`LICENSE`](LICENSE). © 2026 Andrex Ibiza.

Lineage, credited as architecture (not courtesy): Hermes Agent (Nous Research) as proving ground — PRs #139222 (red-on-parent discipline at scale), #130909, #124787, #126167, #132365 and architecture issues #93943, #95028, #90142, #90144, #90145, #90866, #91911 from which the operating law is drawn verbatim; Greptile/CodeRabbit/Copilot benchmark literature and the Martian developer-action methodology for §7 evaluation honesty; OSV/OpenSSF, CISA KEV, OWASP, Conventional Comments, Graphite/GitHub stacked PRs, Gerrit Change-Id, Tangled/Jujutsu interdiff as protocol precedents cited in-file. The author's Hermes review practice is the firsthand source of the method; public artifacts above are the inspectable evidence for it.

Issues and RFCs welcome. Protocol changes follow `specs/federation.md` §4: problem, witnesses, two implementations for breaking changes.
