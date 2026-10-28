# Reference: Release Engineering (Release Engineer hat)

Sources: curriculum Module 11; #90150 built-artifact law; #88683 one transactional deployment plan.

Chain: MERGED (main green at merge SHA) -> BUILD (artifact from exact SHA, provenance/SBOM) -> VERIFY ARTIFACT (real protocol peers, not source-only tests; desktop: packaged app, not dev server) -> STAGE (flags, % rollout, migration order with data.md gates) -> OBSERVE (SLO windows, error budget) -> PROMOTE or ROLLBACK (precomputed edge, rehearsed). Each step own receipt + authority grant (release authorizer distinct from merger where repo policy requires).

Deployment as one atomic plan (#88683 lens): install/update/bootstrap steps share generation; partial deployment states named and recoverable (indeterminate deployment reconciles against actual fleet state). Feature flags: owner, expiry, removal PR linked at creation (flag debt manifested like 2K debt). Version skew: old/new clients + old/new data compat windows declared (api/data joints).

Findings: RELEASE/BLOCKING for artifact unverified, rollback unrehearsed on risky change, flag without expiry/owner. Demo constraint: Rev demo releases only demo repo; production release guidance remains reference until adopted per repo policy.

## Worked patterns
Desktop/Electron: packaged artifact tested (installer, auto-update from previous version with state migration, code-signing verification), dev-server green explicitly rejected as release evidence. Mobile: store review constraints as schedule risk; phased release halt criteria predeclared. Server: canary analysis automated (error/latency vs control, generation-tagged), promotion receipts, DB migration order (expand before deploy, contract after old versions drain — version skew window named). Feature-flag rollout: flag evaluation provenance (which generation/config), kill-switch drill executed.
Release notes as promise documents: user-visible changes, known issues with scope, rollback instructions — parity with actual artifact behavior sampled. Incident-ready release: on-call owner, dashboard links, rollback command in PR/release record before promotion.
Checklist: artifact hash = source SHA mapping; artifact verification report; rollout plan with halt thresholds; rollback rehearsal receipt date.

## Deep patterns
Versioning/release trains: semantic claims kept honest (breaking in minor = CONTRACT incident), LTS branches with backport authority + generation rules, deprecation trains (announce -> warn -> remove generations with receipts). Signing/provenance verification at deploy (attestation digest = artifact identity; tag mutable = coordinate). Progressive delivery analytics: canary cohorts by generation, automatic halt on guardrail breach (settlement: halted release INDETERMINATE until human reconcile — never auto-promote after halt without new grant).
Changelog/release-note parity sampled against artifact behavior (docs joint). Support matrix (OS/browser/runtime versions) as promise with test matrix generations.
