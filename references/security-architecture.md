# Reference: Security Architecture (Security Architect hat)

Normative. Sources: AGMD §3 (security hardening as internal organ), #93943 process contract, #90144 scope law. Method: follow value source->sink; state transitions over labels; platform claims must reach platform.

## 1. Threat unit: authority edge, not file

Review unit is a boundary crossing: renderer->gateway, gateway->child, source installation->target installation, parent env->descendant, stored secret->provider egress, file tool->.git control plane. For each edge state: principal, operation, exact grants, generation, settlement. Ambient possession (parent has variable, process launched from gateway, child runs trusted code) never authorizes crossing.

Child process contract (#93925): immutable spec carries intent (model driver / trusted Hermes child / PTY / vault CLI / secret helper / checkpoint Git / container control / image build / probe — never "child in general"), expected principal, target profile, exact grants+prefixes, stdin policy, descendant policy, source identity, value-free receipt bound to policy hash. "Copy parent env minus denylist" is a finding (BLOCKING, SECURITY). Explicit env+stdin or refusal. Broker only; direct spawn outside broker = BLOCKING.

## 2. Secret flow trace (AGMD §3.1 worked series)

Enumerate sinks for every secret class: status output, logs, tool results, provider-bound context, cache files, child-process environments, error messages, receipts (receipts must be value-free — key names/hashes only). Failure traces to hunt:
- Plaintext storage branch surviving behind encryption flag (fix removed branch; disable = memory-only; legacy plaintext migrated+removed — verify old files, not settings screen).
- Shape-based scrubbing missing opaque sensitive values (no vendor prefix != non-secret). Carry applied-secret provenance so renamed FOO remains secret through egress.
- Central sanitizer bypassed by sibling paths: terminal factories, compute host, language servers, plugin sidecars, shell.exec route; env.update(os.environ) reintroducing scrubbed values after builder. Census all spawn sites (mechanical AST gate), not sampled ones.
- Env var name checks (HERMES_KANBAN_* etc.) treated as ownership proof — name is coordinate; lifecycle authority needs grant+fence.

Checks (verifiable): grep+AST census of spawn sites with broker coverage %; spawn receipt env key-name list diffed against grant list (values never logged); renamed-secret probe (inject sentinel under novel name, assert absent at every sink); legacy-file migration test on pre-fix fixture tree.

## 3. Platform truth (AGMD §3.2)

POSIX mode bits do not establish Windows ACLs — require icacls-equivalent evidence + replacement-branch coverage (existing file mode preserved on rotate can reopen access; test rotation, not just first creation). Token lifecycle: stale env-file token must not override freshly injected desktop token; diagnostics show provenance without printing token; bounded retry avoids lockout amplification; regression runs real subprocess asserting accepted token identity. File tools: .git/ contents are repository control data — workspace-containment checks that permit writing git internals are BLOCKING. Path/case variants + container wrappers must not tunnel stripped authority (adversarial cases mandatory).

## 4. Standard review sequence

1. Inventory edges + principals from graph (consumers, spawn census, egress points).
2. For each secret/control class, trace source->each sink; mark unobserved sinks as gaps (never assume).
3. Scope equality: proof credential scope vs mutation scope (metadata-write proof never authorizes object-write; #90200 split-authority lesson: GitHub App permissions are per-resource — verify contents vs metadata separately).
4. Generation: rotation/revocation observed at use time; cached tokens revalidated.
5. Verdicts: BLOCKING for ambient inheritance, denylist env, unbrokered spawn, receipt with values, platform claim without platform evidence. QUESTION when sink unobserved. VERIFIED_SOUND when trace+probes cover all sinks at pin.

## 5. Crisis overlap

Security architecture feeds vuln-response.md triage: reachability without authority analysis is incomplete — reachable vulnerable code with no grant to attacker-controlled input differs from reachable with it. State both: code reachability + input authority path. Never inflate (coordinate advisory -> claimed exploitability) or deflate (installed -> claimed safe without reachability proof).

## 6. Vulnerability classes as review lenses (applied, not checklist theater)

Use industry classes only as search lenses tied to proof obligations (each demands trace/probe, not keyword grep):
- Broken access control / IDOR: principal from proof object vs resource owner relation in graph; horizontal + vertical cases probed with distinct principals.
- Injection (SQL/command/template/path): data flow from attacker-controlled input to sink with parameterization evidence; string concatenation at sink = BLOCKING until disproven by executed probe with hostile payload.
- SSRF / request forgery: validation-resolution vs dial-resolution scope equality (Module 01 gallery); allowlist at dial time with pinned resolution.
- Deserialization / template / eval: provenance of bytes reaching interpreter; ambient code execution grants treated as mutation edges.
- Secrets in artifacts: history-aware scan (current tree green never proves history clean); rotation + revocation receipts, not just removal commit.
- Dependency confusion / typosquat / compromised maintainer: lockfile diff review, provenance (registry, signatures, publish history), pin + hash equality; crisis lane owns response (vuln-response.md).
- Race/TOCTOU on security checks: check-use generation gap; fence or revalidate at use.
- Crypto misuse: bespoke crypto, static IV/nonce reuse, unauthenticated encryption — route to specialist check files; lane states GAP rather than improvising assurance.

Dependency review specifics for uv/npm/electron-class ecosystems: install scripts (postinstall = child-process authority edge, broker rules apply), native binaries, electron nodeIntegration/contextIsolation flags, auto-update channel signing. Electron: renderer is untrusted boundary — preload grant minimization is proof-scope review.

## 7. Security review output shape

Per edge: threat (actor, input authority), trace (source->sink hops with pins), probes executed (sentinel, hostile payload, renamed secret), scope statement, verdict. Unobserved sink = GAP listed in remaining boundaries. "No vulnerabilities found" without census scope is rejected by adjudicator as overclaim; correct form: "No X in surfaces S at pin P by probes M; gaps G remain."

## 8. Executable security checklist (repo check-file seed; copy to .agents/checks/security.md and specialize)
- [ ] Spawn census: AST list of child-creation sites; each brokered with intent/principal/profile/grants/stdin/descendants or BLOCKING filed. Command: repo spawn-scan script; output receipt attached.
- [ ] Env diff: spawn receipt key-names subset of grants (automated compare).
- [ ] Sentinel rename probe: novel-named secret absent from logs, tool results, provider payloads, child env (test receipt).
- [ ] Token rotation: old token rejected, new accepted, in real subprocess (receipt).
- [ ] Git-internals write attempt refused by file tools (test).
- [ ] Dependency install scripts inventoried; new postinstall in diff = explicit review point.
- [ ] Auth scope table: token permissions probed per resource (metadata vs contents separated).
Each unchecked box in a security-relevant PR must appear as GAP in remaining boundaries — checklist rendered, not remembered.

## 9. Electron / desktop deep dive (Hermes Desktop relevant)

Trust boundaries: renderer (untrusted web content) -> preload (minimal grant bridge) -> main (OS authority) -> child processes (broker). Review: nodeIntegration off, contextIsolation on, sandbox on — verified in packaged config, not dev defaults; preload API inventory exact (each exposed function is grant; generic ipcRenderer passthrough = BLOCKING); navigation/new-window handlers; auto-update signature + rollback protection; deep-link/custom protocol input as untrusted (validation at main); local server/token lifecycle (Module: stale env token case). Local data: credential storage OS keychain vs file modes per platform truth (§3).

## 10. Web/API deep dive (companion to api-contracts)

Authn/session: token generation entropy, fixation, rotation on privilege change, logout invalidation generation. Authz: per-operation object-level checks (IDOR probes with two principals in tests). Input: boundary validation + canonicalization before security decisions (path traversal after decode, Unicode). Output: encoding per context, headers as config promises (CSP tested on rendered responses). Rate limiting/abuse: per-principal budgets, credential stuffing defenses. File upload: type by content, storage outside web root, processing sandbox spawns brokered.

## 11. OWASP Top 10 (2025 current; 2021 widely deployed) as triage lens
Use as coverage lens only — each category still requires trace/probe per §§1-5. Map: Broken Access Control (principal-resource relation probes), Cryptographic Failures (secret/data protection traces, platform truth), Injection (input-to-sink parameterization proof), Insecure Design (threat model absence — design-stage findings), Security Misconfiguration (config precedence/provenance, defaults executed not assumed), Vulnerable Components (vuln-response ownership), Identification/Auth Failures (auth-deep-dive), Software/Data Integrity (supply-chain provenance, CI/CD authority), Logging/Monitoring Failures (observability joint — value-free + retained refusals), SSRF (validation/dial scope equality). Version note: cite edition year in findings; categories shift between editions, proof obligations do not.
Source: OWASP Top 10 project (owasp.org/www-project-top-ten; current release Top 10 2025, previous 2021).
