# Reference: Vulnerability Response (Crisis lane — disclosure to MERGED)

Normative. Sources: OSV schema (ossf.github.io/osv-schema, v1.9.2); GitHub Advisory/OSV export model; authority.md settlement; security-architecture.md §5. Goal metric: disclosure timestamp -> merge timestamp on main. PR-opened is intermediate, never success.

## 1. Watch everything

Ingest OSV-interchange records (id, aliases CVE/GHSA, affected package/ecosystem/ranges, severity, references, database_specific). Ecosystems: PYPI (uv/pip), NPM, CRATES, GO, RUBYGEMS, MAVEN, NUGET, PACKAGIST, HEX, DOCKER/base images, GITHUB_ACTIONS pins, DISTRO where shipped. Enrichment (KEV known-exploited, EPSS) stored as triage inputs; priority = reachability x exploitability x blast radius, never raw CVSS alone. Watcher polls/feeds continuously; each record versioned (modified/withdrawn honored — withdrawn advisory settles open candidates with receipt).

## 2. Match, then prove (coordinates select)

Match against lockfiles, manifests, SBOM, Dockerfiles, workflow pins, vendored census. No match: silence (no event). Match creates AFFECTS edges only. Triage must prove REACHES: vulnerable range includes pinned version AND vulnerable function reachable from repo entry points on shipped platforms AND attacker-authority path stated (security-architecture §5). Unreachable/unexploitable: NO_ACTION receipt with reachability evidence (graph path absence proof scope stated). Never claim "safe" beyond proven scope.

## 3. Factory (reuse, no shortcut lanes)

Contract (affected range, fixed version/patch/mitigation, invariants, parity classes for API changes) -> blind implement (upgrade preferred; patch/mitigation only with expiry + upstream-tracking issue) -> dual fresh review (correctness + adversarial, incl. capability preservation: fix must not disable feature) -> tests red-on-vulnerable/green-on-fixed incl. regression for vuln class siblings (fix whole class, Hermes rubric) -> merge-ready PR with disclosure->now timestamps. Maintainer merge (or explicit pre-authorized policy grant for named class) -> post-merge main verification -> MERGED receipt (merge SHA, green). Rollback edge precomputed (revert + version pin) attached before merge.

Timeouts settle INDETERMINATE + reconcile against main. Duplicate advisory deliveries replay. Stale authority generation at merge revalidates (authority.md §6). SLA posture (demo): triage minutes, fix PR hours — measured on receipts, reported as distribution (p50/p90 disclosure->merged per ecosystem), never asserted averages without ledger query.

## 4. Incident response (backwards factory)

Production incident ingests as graph event. Link implicated merges (deploy window + graph radius). Run factory backwards: broken promise, seam, insensitive test, underestimated radius. Outputs: post-incident graph diff, red-capable regression test, new .agents/checks entry, ledger entry crediting reporters/responders. Blameless in text; precise in evidence. Disclosure fixes future; incident analysis fixes past — both mandatory hats.

## 5. Triage scoring worked form

Priority score inputs (each evidenced, weights repo-configurable but declared): reachability (REACHES proven = gate; AFFECTS only = investigate queue by exposure), known-exploited (CISA KEV listing — catalog of vulnerabilities known exploited in wild; presence accelerates to crisis geometry), EPSS percentile (exploitation probability context, never sole trigger), blast radius (owners/entities), input authority (internet-facing > internal > dev-only — dev-tooling vulns like uv/npm/electron build chain still crisis-class because developer machines are production-adjacent: install scripts execute with developer authority), fix availability (fixed version exists + breaking-change radius). Output: CRISIS (full geometry, hours), STANDARD (queued fix PR, days), MONITOR (no-action receipt + re-triage on new evidence: exploit publication, reachability change via new caller). Re-triage triggers stored — "monitor" without trigger is forgetting (Law 5 violation).

KEV handling: KEV entry is coordinate + strong prior, not proof of repo reachability. Rev still proves REACHES or settles NO_ACTION with scope. Conversely non-KEV never means safe; zero-days enter via vendor/GHSA before KEV.

## 6. Fix strategies ranked

1. Upgrade to fixed version (assess breaking radius via graph + changelog parity). 2. Backport patch (when upgrade radius too large; patch provenance + upstream commit linked). 3. Mitigation config/code (expiry mandatory, upstream issue linked, removal condition). 4. Remove/replace dependency (consumer census drives effort). 5. Accept risk (actual maintainer grant only, expiry, compensating controls — reviewer lanes can recommend, never grant). Each strategy states capability preservation + sibling-class sweep (same package family, same vulnerable pattern in first-party code).

Ecosystem notes (search lenses): npm — install scripts, transitive explosion (lockfile diff radius), electron — bundled node/chromium advisories map to app version, auto-update signing; uv/pip — resolver confusion, index priority, build backends executing at install; crates/go — build scripts/proc macros and toolchain pins; actions — mutable tags vs SHA pins (pin to SHA, tag is coordinate).

## 7. Disclosure coordination and comms

Receipts are internal truth; external comms (maintainer notification, advisory comment) generated from receipts with scope intact. Never announce "fixed" before MERGED + artifact verification (#90150: built artifact is system under test — verify published package/image contains fix, not just main). Embargoed disclosures: proof objects carry confidentiality grant; graph nodes for embargoed advisory restricted; lanes isolated; leak via receipt = security incident in Rev itself.

## 8. Executable crisis checklist (seed for .agents/checks/advisories.md)
- [ ] Advisory normalized to OSV (id/aliases/ranges) with source refs; withdrawn check current.
- [ ] Match report: artifacts matched (lockfile/SBOM/Dockerfile/Actions) with pins; non-matches silent.
- [ ] Reachability: REACHES path artifact or NO_ACTION with scope; input-authority stated.
- [ ] Priority inputs recorded (KEV, EPSS, radius, fix availability) + lane geometry chosen.
- [ ] Fix: strategy ranked justification, sibling sweep, capability preservation, red-on-vulnerable/green-on-fixed receipts.
- [ ] Merge edge: authority generation revalidated; post-merge main + published artifact verified; MERGED receipt with timestamps (disclosure, triage, PR, merge).
- [ ] Rollback edge + monitoring trigger (re-triage conditions) stored.

## 9. Ecosystem deep dives (watcher matchers + fix specifics)

npm/Node: lockfileVersion, transitive closure explosion (radius often thousands — triage by reachability through entry graphs, bundler tree-shaking evidence never assumed for server), install scripts (arbitrary code at install with developer authority — treat malicious/compromised version as credential exposure: rotate), electron apps: advisories map via bundled Chromium/Node versions to app releases (fix = electron upgrade + rebuild + auto-update verification on packaged artifact), yarn/pnpm resolver overrides as mitigation with expiry.
uv/Python: resolver index priority (confusion), build backends (code exec at build), wheel vs sdist differences, compiled extensions; fix verification includes fresh venv install from lock (uv.lock parity) + import probes of vulnerable function path.
Rust: build.rs/proc-macro execution surface, cargo audit ranges, yanked crates handling. Go: govulncheck-style reachability (symbol-level) as model for REACHES standard across ecosystems. Ruby/Java/.NET/PHP/Hex: analogous symbol/package reachability adapters; matcher must declare reachability fidelity (package-level vs symbol-level) in receipt — package-level REACHES is weaker scope, stated.
Actions/CI: compromised action tags (mutable) — pin SHA + reviewer for action updates equal to code review; workflow token permissions per job.
Docker: base digest pinning, rebuild cadence, runtime vs build-stage vuln separation (build-stage-only vulns affect supply chain, not runtime exploitability — scope honestly, still fix on cadence).
