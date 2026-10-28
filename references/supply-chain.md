# Reference: Supply Chain Stewardship (Steward hat; joint with Security + Vuln Response)

Hygiene distinct from threat response: dependency selection (maintenance health, bus factor, license compat, transitive weight), pinning discipline (lockfiles committed, hashes where ecosystem supports, Actions pinned to SHA not tags, base images digested), update cadence (continuous small updates beat crisis big-bang; Rev watcher proposes routine update PRs in STANDARD lane), provenance (registry signatures, build attestations, SBOM generation at build — release joint), vendoring rules (vendored trees excluded from 2K but inventoried + patched via vuln-response like first-party).

Review of dependency-adding PRs: necessity (stdlib/existing dep alternative), license, install-script authority (postinstall = spawn edge), native code, maintainer history, abandonment risk, exit cost (consumer census if removed later). Findings: SUPPLY_CHAIN/WARNING for unpinned action/tag, missing lockfile update, license conflict BLOCKING (legal promise). Routine update PRs still run full distinguisher suite (updates are changes; "just a bump" without behavior evidence rejected — changelogs parity-checked, breaking radius via graph).

Compromise playbook: maintainer/account compromise or malicious version — freeze pins, identify exposure window via lockfile history (graph generations), rotate credentials potentially exposed via install scripts, MERGED fix + incident record (costs-incidents).

## Deep patterns
Update factories: grouped routine updates (per ecosystem PR trains with full distinguisher suites, changelogs parity, breaking-radius triage to human when major). License policy as code (allow/deny lists executed in check; exceptions manifested with owner/expiry). Reproducibility: locked builds, hermetic where feasible; provenance attestations verified at release. Mirror/registry outage resilience (lockfile integrity without registry trust-on-first-use beyond pins).
Scorecards (OSSF-style signals) as Report-kind inputs only — scores never gate alone; signals route attention (unmaintained + high radius = human review required).
