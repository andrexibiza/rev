# Rev — 7-Day Hackathon Implementation Plan

Dates: Day 1 Tue 2026-10-28 to Day 7 Mon 2026-11-03. Submission buffer Tue 2026-11-04.
Today is Mon 2026-10-27. Workspace is an empty Git repo on `main` with no commits.
Build window closes 2026-11-04 21:00 ET. Demo must run PR-in to merged-on-`main` in under 3 minutes.

## Goal

Ship Rev as a demoable machine: any installed repo tags `@Rev` (or fires a webhook, or matches a live advisory) and receives an inspectable code review or implementation PR, settled through to MERGED on `main` with a typed receipt chain.
GitHub is source material (repos, commits, diffs, identities, advisories). Rev is the platform where reviewing happens. Hermes Desktop plugin is the native home and cross-repo registry.
Hermes Agent is Exhibit A, not the boundary.

## Success Criteria

- `@Rev review` on the demo PR posts a pinned review (head/base SHAs, knowledge-map diagram, blocking vs nit, evidence labels) without human steps.
- `@Rev fix` opens a minimal implementation PR with red-on-parent / green-on-head receipts and two fresh reviewer verdicts (correctness + adversarial).
- A live advisory matching the demo lockfile produces triage, a merge-ready fix PR, and a maintainer merge; receipt chain shows disclosure -> triage -> merge SHA on `main` with timestamps.
- Watcher ingests OSV-format advisories for all ecosystems in scope (Python/`uv`, npm, Rust, Go, Ruby, Java, .NET, PHP, Docker, GitHub Actions) and stays silent on non-matching or unreachable items (verified no-action receipt).
- Per-repo authority map is resolved per run (CODEOWNERS location, branch protection, required approvals, current merge holders). No inferred merge rights. Diligent community review never mints merge authority.
- Hermes Desktop plugin lists every repo and every Rev PR/review, with lane states, proof path, and settlement (including `indeterminate`), filterable by repo, advisory, and finding class.
- Demo runs end-to-end live in under 3 minutes with a recorded fallback of the same run.

## Approach

Doctrine stack (user canon, inspected this run):
- All Gods Must Die: adversarially verified transformation; no actor certifies itself.
- Introduction to Code Review: knowledge mapping (promise, code, observed behavior, uncertainty, decision).
- Blind Witness Engine: 2K Law (no code file over 2,000 lines; manifested ratchet) and 5 x 2 x 3 blind lanes.
- Nothing Ambient Survives (#93943, capstone; #95028 canonical): coordinates select, proof objects authorize; authority narrows monotonically; every consequential transition consumes an explicit current proof object and emits a typed settlement receipt.

Machine shape:
- Ingress: GitHub App (installed per repo, narrow permissions, built-in webhooks) + `@Rev` mention parser + advisory watcher (OSV interchange format as aggregation schema). Every trigger is a coordinate only.
- Core: proof-object builder (pinned SHAs, target identity, policy hash, grants, stdin/descendant policy) -> durable idempotent queue (immutable event, fenced lease) -> blind factory (analysts, adversarial witnesses, adjudicator, blind implementer, two fresh reviewers) -> settlement projector (review/PR/merge receipts back to GitHub; truth lives in Rev).
- Knowledge product: each run extends a per-repo knowledge graph (promises, code entities, consumers, seams, test assertions, authority per path, advisories + reachability, findings + repairs, credit). Graph is pinned by SHA/generation.
- Surfaces: GitHub App, portable agent/subagent profile, skill files, Hermes Desktop plugin, CLI/API over the same objects. Skills use progressive disclosure: small core `SKILL.md`; massive `references/*.md` per discipline, loaded by concern; repo-local `.agents/checks/*.md` (one concern per file, verifiable actions).
- Stack assumption (reversible): TypeScript for App + plugin shared types; policy artifacts generated for Python and TypeScript from one manifest (per #93943). Meta AI tooling (Muse family) powers lanes; lane prompts are versioned reference files, not inline strings.

Key decisions and rejected alternatives:
- Build Rev-native objects first, project to GitHub second. Rejected: building inside GitHub comments as system of record (cannot hold graph, lanes, or receipts).
- Demo-path-first scope (one demo repo, three acts), generalize after. Rejected: multi-forge launch (GitLab/Bitbucket) in 7 days; keep adapter boundary, ship GitHub only.
- OSV as advisory interchange schema. Rejected: per-ecosystem bespoke parsers for v1 (keep ecosystem matchers, one schema).
- Human maintainer merge click in demo (plus optional pre-authorized policy path). Rejected: unattended auto-merge as default (violates maintainer-vs-reviewer authority distinction).
- Eight-hat single profile with progressive disclosure. Rejected: eight separate agents (coordination cost, inconsistent verdicts).

## Steps

### Day 1 — Tue 2026-10-28 — Foundations and proof object
Milestone due EOD: repo skeleton, doctrine encoded, empty machine accepts a webhook and refuses correctly.
- Init package layout under 2K Law; add `scripts/check` ratchet stub (line ceiling + manifest).
- Encode core protocols as reference files: `references/authority.md` (Nothing Ambient Survives), `references/knowledge-mapping.md`, `references/blind-witness.md`.
- Define types: `ProofObject`, `WorkEvent`, `SettlementReceipt` (`completed|failed|cancelled|expired|indeterminate|merged`), `AuthorityMap`.
- GitHub App scaffold: registration config, webhook receiver, signature verification, installation store. No review logic yet.
- Subtask: authority-map resolver v1 (CODEOWNERS in root/`.github/`/`docs/`, first-found wins; branch protection read; fail-closed on ambiguity).
- Subtask: demo repo selection + planted fixtures (real bug, bad test that cannot go red, reachable advisory target).

### Day 2 — Wed 2026-10-29 — Ingress, queue, knowledge graph v1
Milestone due EOD: `@Rev review` enqueues durable work; duplicates replay, never double-run.
- Mention parser for `review|fix|implement|diagram|audit tests|respond` with explicit args; unknown asks return typed refusal with usage.
- Durable queue: immutable events (ID, payload digest, expiry, idempotency key), renewable lease fenced by owner/token/generation; ACK/NACK/reclaim; replay committed results.
- Graph builder v1: AST inventory, import/consumer edges, file->owner mapping from AuthorityMap; persist per repo keyed by base SHA.
- Webhook handlers: `pull_request` opened/synchronize, `issue_comment` for `@Rev`; payload has no diff, fetch diff via API and pin SHAs.
- Subtask: value-free receipt writer (identities, hashes, reason codes only; never secrets).

### Day 3 — Thu 2026-10-30 — Review lane (Act 1 live)
Milestone due EOD: `@Rev review` posts a complete pinned review on the demo PR.
- Skill core `SKILL.md` + references: systems, security, bug-finding, bad-tests, regression, subsystems, diagramming, accounting (v1 depth sufficient for demo fixtures; massive files grow Days 5-6).
- Blind factory for review: analysts -> witnesses (information-isolated) -> adjudicator contract -> verdict composer (File:Line, severity Critical/Warning/Suggestion, blocking vs nit, Conventional-Comments-style labels, APPROVE/REQUEST_CHANGES/COMMENT).
- Evidence executors: red-on-parent / green-on-head harness (temp worktrees, real test run, no mocks for demo paths); test-sensitivity check for bad-test fixture.
- Mermaid knowledge-map + process diagram renderer embedded in review output.
- Subtask: `.agents/checks/*.md` loader (match by touched paths, verifiable actions only).

### Day 4 — Fri 2026-10-31 — Fix lane (Act 2 live)
Milestone due EOD: `@Rev fix` opens a merge-ready implementation PR.
- Blind implementer: consumes adjudicated contract only (no witness reasoning); minimal diff; preserves capability under repair (no disabling feature to pass check).
- Two fresh reviewers (correctness + adversarial) on committed candidate; either REQUEST_CHANGES loops to fix lane, then both re-inspect new head; range-diff revalidation after force-push.
- PR opener: links source PR/issue both ways (interlock), credits authors, attaches receipts + CI status on exact head.
- Settlement projector: post review/PR links back to GitHub; Rev objects remain source of truth.
- Subtask: salvage/credit path (cherry-pick preserves authorship; never reimplement to claim credit).

### Day 5 — Sat 2026-11-01 — Advisory watcher for everything + crisis lane (Act 3 live)
Milestone due EOD: live advisory traverses disclosure -> triage -> fix PR -> maintainer merge on `main`.
- Watcher: OSV-format ingestion (GitHub Advisory Database / OSV export), ecosystem matchers for lockfiles/manifests/SBOM/Dockerfiles/workflow pins; KEV/EPSS enrichment fields stored as triage inputs (not sole priority).
- Matcher: silent on non-match; candidate event on match. Triage: reachability query on knowledge graph (version range, platform, call reachability, exploitability context); unreachable settles as verified no-action receipt.
- Crisis factory reuse: contract -> blind implement (upgrade/patch/mitigation) -> dual review -> fix PR labeled with disclosure-to-now timestamps.
- Merge edge: revalidate head/base/checks/authority generation at merge click; post-merge verify `main` at merge SHA; emit `merged` receipt with merge commit; rollback note attached.
- Subtask: demo advisory drill with a real recent CVE in demo dependency (pinned vulnerable version in fixture branch only).

### Day 6 — Sun 2026-11-02 — Hermes Desktop plugin platform + hardening
Milestone due EOD: plugin is the demo stage; full run visible without GitHub UI.
- Plugin surfaces: cross-repo registry (every repo, every Rev PR/review), interlock graph view, live lane board (states only, no chain-of-thought), receipt/ledger viewer, filters (mine awaiting maintainer, reachable+exploitable, indeterminate).
- Dispatch from plugin: review/fix/respond actions create same WorkEvents as GitHub ingress.
- Hardening: ban ambient spawns (explicit env/stdin via broker only), policy-hash mismatch = typed refusal, stale generation cannot settle successor, timeout-after-start = `indeterminate` with reconciliation (no blind retry/merge).
- Adversarial regression pass on demo paths: same-name profiles, duplicate delivery, crash-after-claim, revoked CODEOWNERS change between review and merge.
- Subtask: expand reference files toward massive (worked examples, failure traces) without changing core contracts.

### Day 7 — Mon 2026-11-03 — Demo freeze, rehearsal, submission package
Milestone due EOD: frozen demo, recorded fallback, submission assets complete.
- Freeze feature scope at noon; only demo-blocking fixes after. Pin demo repo SHAs and advisory fixture.
- Rehearse 3-minute script twice timed: Act 1 review (60s), Act 2 fix (60s), Act 3 crisis-to-merged (60s). Record clean fallback video of identical run.
- Submission package: demo video, README (install App, tag `@Rev`, plugin install), architecture diagram (admission->projection->mutation->settlement), evidence appendix (sample receipts).
- Final checks: `scripts/check` green, no file over 2,000 lines, queue/lease/receipt tests green, fresh-clone install smoke test.
- Tue 2026-11-04: buffer only. Submit before 21:00 ET. No new features.

## Validation Plan

- Daily: `scripts/check` (2K ceiling, lint, policy-manifest sync) must pass on exact head; record SHA with each milestone.
- Queue: duplicate webhook delivery replays committed result (test asserts single lane execution, single posted review).
- Authority: CODEOWNERS change between review and merge blocks merge with typed refusal (integration test).
- Review lane: demo PR review flags planted bug as blocking and bad test as ineffective, with red/green receipts reproducible from artifacts (fresh clone rerun).
- Fix lane: either fresh reviewer rejecting sends candidate to fix lane; approval on old head does not carry to new head (test).
- Crisis lane: unreachable advisory fixture settles no-action with receipt and opens no PR; reachable fixture ends in `merged` receipt whose merge SHA is ancestor of `main` and green.
- E2E demo check: timed live run under 3 minutes from tag to merged receipt visible in plugin; fallback video hash matches rehearsed run script.
- Manual checks that cannot be automated: maintainer merge click uses real maintainer account; plugin registry visually reconciles with GitHub state at pinned SHAs.

## Risks / Open Questions

- Hermes Desktop plugin API surface and packaging were not inspected this run; Day 6 assumes a local plugin can render custom panels and dispatch actions. If not, fallback is a localhost web UI with identical objects. Owner to confirm before Day 6.
- Meta AI tooling specifics (Muse model/API access, quotas, latency) not verified; lane timeouts budget for `indeterminate` settlement rather than blocking demo. Confirm credits/access Day 1.
- GitHub App approval/install friction for judges: mitigate with pre-installed demo repo + recorded fallback; public install is post-demo.
- Live advisory choice may be patched upstream before demo; freeze vulnerable fixture by lockfile pin, disclose fixture nature in README.
- Open question: Startup vs Indie track selection affects judging emphasis (production credibility vs creative ambition). Default assumption: Startup, demo proves production path. Change only by explicit owner decision before Day 7 packaging.

## Sources

- https://axlibiza.com/learn/code-review/
- https://axlibiza.com/learn/blind-witness-engine/
- https://axlibiza.com/writing/all-gods-must-die/
- https://github.com/NousResearch/hermes-agent/issues/93943
- https://github.com/NousResearch/hermes-agent/issues/95028
- https://docs.github.com/en/apps/creating-github-apps/about-creating-github-apps/about-creating-github-apps
- https://ossf.github.io/osv-schema/
- https://docs.github.com/en/repositories/managing-your-repositorys-settings-and-features/customizing-your-repository/about-code-owners
