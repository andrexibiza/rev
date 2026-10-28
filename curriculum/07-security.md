# Module 07 — Security: Adversarial Boundaries

Executes references/security-architecture.md. First principle: assume an actor who chooses inputs, timing, names, and order to make your assumptions false. Defenses must hold under renaming (secret as FOO), reordering (revocation mid-flight), replay (duplicate delivery), and substitution (same-named profile/process/package).

Core drills: secret source->sink census with sentinel-renaming probe; spawn-site AST census (broker coverage); scope-split verification (metadata vs contents grants); platform-mechanism evidence (ACL, token acceptance in real subprocess); supply-chain reachability+authority pairing (vuln-response.md). Security rarely surfaces in general review comments (empirically sparse) — explicit hat, explicit probes, or it did not happen.

Exercises: rename-attack one sanitizer; scope-split audit one integration token; write one BLOCKING finding in proof-scope vs mutation-scope form.

## Studio: spawn census
Run AST census on fixture repo: enumerate spawn sites, classify intent, mark env/stdin explicitness. Convert one ambient site to broker spec (intent, principal, profile, grants, stdin, descendants, receipt). Witness drill: renamed-secret sentinel through converted vs unconverted sites; report sink-by-sink.

Studio: split-authority token (like #90200 metadata vs objects). Enumerate API operations token can perform (executed probes, not docs), map to mutations PR needs; narrow proof discovered before merge, not at push failure. Lesson generalizes to cloud IAM, DB roles, GraphQL scopes.

Threat modeling lightweight (per PR, 10 min): assets (secrets, money, messages, admin), actors (anonymous, user, tenant-neighbor, compromised dep, malicious input author), edges (graph), abused relations (from Module 04 catalogue negated under adversarial choice). Output feeds probes; model without probes is literature.
