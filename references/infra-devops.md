# Reference: Infrastructure + DevOps (Platform hat, joint with Release)

IaC as code: plan output is diff requiring review (state scope equality — plan on stale state = generation violation), drift detection, state file as authority object (locking = lease fencing). CI/CD: pipeline definitions are production code (2K, review, tests); secrets in CI scoped per job (ambient org secrets to every job = widening); artifact provenance chain (build -> sign -> deploy receipts, release.md). Containers: base image advisories (vuln watcher DOCKER), run-as user, read-only FS, install-time vs runtime authority separated. Networking: validation-vs-dial scope (SSRF), cert rotation generations, DNS as coordinate.

Environments: prod-like rehearsal claims scoped (data volume, flags, integrations actually present); env parity docs gated like translations. Cost: infra changes carry cost delta estimate + measured post-deploy (costs joint).

Review specifics: Terraform/state backends (locking, versioning, backup restore), Kubernetes (probes truthfulness — readiness lying is wrong-green in ops form, resource limits, PDBs, image pull policy mutable tags), serverless (cold start, per-invocation authority, env secrets scope), DNS/cert automation generations. Observability of infra itself (pipeline failure alerting, deploy markers on dashboards by generation).

Cost/finops: tag/owner completeness, idle resource reports as ops findings with receipts; infra cost in release cost receipt.
