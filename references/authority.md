# Reference: Authority — Nothing Ambient Survives

Normative for all Rev lanes. Sources: [Hermes #93943](https://github.com/NousResearch/hermes-agent/issues/93943) (capstone, open), [Hermes #95028](https://github.com/NousResearch/hermes-agent/issues/95028) (Authority Execution Layer, canonical), sibling laws [#90142](https://github.com/NousResearch/hermes-agent/issues/90142), [#90144](https://github.com/NousResearch/hermes-agent/issues/90144), [#90145](https://github.com/NousResearch/hermes-agent/issues/90145), [#90866](https://github.com/NousResearch/hermes-agent/issues/90866), [#91911](https://github.com/NousResearch/hermes-agent/issues/91911). Doctrine: All Gods Must Die (AGMD) §1–§3, §23.

## 1. The law (verbatim, #93943)

> Nothing ambient survives a boundary. A route, profile name, renderer, socket, parent environment, PID, executable path, cached row, current process role, or successful return code may identify a candidate operation. None of those coordinates grants authority. Every consequential transition must consume an explicit current proof object, narrow it to the exact edge, fence it by identity and generation, and produce a typed settlement receipt.

Compressed (#95028): every mutation is an edge in a version-controlled authority graph; the edge exists only if the path from admission to it is unbroken; the refusal is the typed reason the path broke. The AuthorityCarrier is that path. The gate is the path validator. The refusal algebra is the typed output when validation fails.

## 2. The single defect the law kills (#95028 Part I)

Twelve architecture issues are one event: a proof is created at one boundary, degraded as it crosses projection edges, and a later mutation accepts the degraded form. Four stages:

| Stage | Question | Failing issues |
|---|---|---|
| Admission | Who is acting? | #90142, #88680, #90149 |
| Projection | How does the proof travel? | #90144, #90866, #90145 |
| Mutation | Where does the effect land? | #90200 (metadata ✓ / objects ✗ split), #91911, #88683 |
| Settlement | What counts as done? | #91230 (exact-object), #90150 (built artifact ≠ source) |

#93943 (ambient coordinates confer authority) cuts across all four. Any Rev finding that matches this shape is classified `DEFECT` with kind mapped to the broken stage. Reviewers must name the stage. "Looks risky" is not a finding.

### 2.1 Worked degradations (real incidents, #90142)

- Qualified `(connectionId, profile)` reduced to URL/host fields, then `connectionId` re-inferred by first-match. Legacy inference is valid only for genuinely unqualified descriptors and must fail closed on zero or multiple matches (#89719/#90048 residual).
- Filesystem/Git facades receiving a session already bound to a remote gateway but forwarding only path/profile, forcing backend re-selection (#89916).
- Session hydration assuming unscoped by-id lookup covers the active profile (#89902).

Rule extracted: **Resolution happens once, at the boundary. Qualification is monotonic thereafter.** Once identity is composite, no downstream layer may project it down and reconstruct the discarded dimensions from foreground, endpoint, profile, registry, credential, or process-global state.

## 3. Proof scope equals mutation scope (#90144)

A mutation may commit only against the exact object set, qualified identity, generation, and snapshot the authorizing evidence covered. Widening classes reviewers must test explicitly:

1. **Object widening** — proof "model A idle" → mutation restarts router {A,B,C}. Rev analog: proof "file X reviewed" → verdict claims PR safe.
2. **Generation/endpoint widening** — hostname validated at G, transport re-resolves at G+1 (SSRF/redirect gap). Rev analog: diff fetched at head H1, comment posted after force-push to H2 without range-diff.
3. **Topology widening** — PID observed → inferred tree killed. Rev analog: one consumer found → "all consumers" claimed without census.
4. **Snapshot widening** — surviving row proves cleanup window. Rev analog: one passing test selection advertised as whole-suite green.

If execution widens, re-resolves, or crosses generations, the proof is invalid: revalidate or fail closed. Findings must quote both scopes (proof scope, mutation scope). Equality is the pass condition.

## 4. Generation fencing — ABA kills (#90145)

Logical ID answers "which object?" Generation answers "which incarnation?" Confusing them is the ABA defect: actor observes X/gen-A, pauses, X recreated as gen-B, actor resumes, proxy check passes, actor mutates gen-B as if gen-A.

Proxies that never authorize alone: list length, timestamp recency, bare PID, object identity, heartbeat presence, connection ID alone, "latest row", foreground profile. Always pair: `(pid, process_start_marker)`, `(connection_id, profile, activation_epoch)`, `(session_id, lineage)`, `(job_id, claim_id)`.

Rev rules: leases/claims carry owner+token+generation; stale courier cannot claim/ACK/settle successor work; policy/profile/credential revocation between queue and spawn is observed at spawn (queue-time authority is never grandfathered); timeout after possible execution settles INDETERMINATE, never blind replay.

## 5. Relay-to-process composition (#93943, the seam)

Foundations: durable relay (PR #92931: immutable SQLite events, courier leadership, renewable fenced leases, exact installation identity, idempotent admission, write-once results, ACK/NACK/reclaim, typed retryable/terminal/indeterminate) and typed child-process authority (PR #93925: immutable ChildProcessSpec — intent, expected principal, target profile, exact grants/prefixes, stdin policy, descendant policy, source identity, value-free receipt bound to policy hash; blocking AST gate for retired ambient hatches).

Composed defect (observed at #92931 head c89dd2b9): `bot_relay.deliver` admitted durably, validated identity, obtained token, then launched via direct `subprocess.run(...)` with no explicit env/stdin — gateway ambient env became unrecorded escalation at the exact authority handoff. Rev must never reproduce this: delivery edge consumes the broker for first launch AND bounded retry; multiplex missing target scope fails closed; spawn receipt correlates (policy hash, event digest, target profile, executable identity, generation) without secret values.

Authority monotonicity chain (each >= next, never wider):
source Bot context >= outbound message >= courier delivery >= recipient admission >= child execution >= descendant.

## 6. ProofObject checklist (schema.md §5.1) — reviewer script

For every consequential transition verify, in order: authorityId + parentAuthorityId chain unbroken; source/target installation identity current; principal + operation match edge; policy version+hash equals repo manifest hash (mismatch = typed refusal, never best-effort); grants exact for edge (message content, env presence, executable name, prompt text, alias may request capability, never mint it); stdin + descendant policy explicit; lease owner/token/generation current; issued/expires window contains use time; payload digest binds exact bytes/argv. Any failure: preserve state, emit typed refusal (PROOF_STALE_GENERATION, AUTHORITY_AMBIGUOUS, POLICY_HASH_MISMATCH, GRANT_TOO_NARROW, AUTHORITY_WIDENING, PIN_MOVED, INDETERMINATE_RECONCILE_REQUIRED).

## 7. Settlement semantics (binding)

ACK = exact claimed generation committed exact outcome digest. NACK retryability is policy, not prose inference. Duplicates replay committed result. Exit code alone proves nothing about side effects. Receipts: identities, key names, hashes, reason codes, generations — never credential values. Every accepted event reaches COMPLETED/FAILED/CANCELLED/EXPIRED/INDETERMINATE durably; Rev adds SHIPPED (linked PRs delivered) and MERGED (merge SHA verified green on main) — SHIPPED never implies MERGED (#95028 honest-gap rule: record gaps, never smooth them).

## 8. Mechanical enforcement (no rule counts until it executes, AGMD §7)

Generate Python+TypeScript policy artifacts from one manifest. Route all child creation through typed broker intents. Ban direct subprocess/Popen/spawn/exec/fork/PTY outside approved brokers (AST gate). Reject spawns omitting env/stdin policy. Scan for fallback to current/default/primary profile, renderer ownership, cached route, process-global role. Value-free receipts at spawn + settlement. Checks required on main. Mutation witnesses must fail if broker/lease/idempotency/scope/settlement checks are removed.

## 9. Adversarial matrix (minimum, composed — from #93943)

Identity: same-named profiles on two installations stay distinct end-to-end; removed/recreated connection inherits nothing; stale leadership token cannot claim/renew/settle; forged body cannot replace identity fields.
Isolation: relay into profile B inherits zero profile-A/default secrets in multiplex; missing target scope fails closed (never os.environ fallback); gateway/session/Kanban/vault/provider authority absent unless granted; caller overrides cannot reintroduce stripped grants; case variants/container wrappers cannot tunnel.
Crash/idempotency: crash points (pre-claim, post-claim, post-admission, post-spawn) each settle correctly; duplicate/reordered delivery replays without duplicate side effect; retry reuses identical env/policy/session.
Generation: revocation observed at spawn; stale receipt cannot settle successor; legacy capability mismatch stays retryable without erasing durable event; Py/TS hash disagreement refuses.
Guardrails: removing env/stdin fails CI; direct spawn outside broker fails CI; weakening any single check fails a witness; final proof on one immutable upstream main SHA (CI/Docker/Nix/Windows + suites green).

## 10. Comment format as authority surface (Conventional Comments binding)

Review text is machine-parsed input to later automation, so format is protocol. Rev adopts Conventional Comments grammar: `<label> [decorations]: <subject>` + optional discussion. Labels: praise, note, suggestion, issue, question, thought, chore. Decorations carry Rev dispositions: `(blocking)`, `(non-blocking)`, `(security)`, `(bad-test)`, `(regression)`, plus Pin + severity appended by composer (never hand-typed — composer injects pin/generation so humans cannot accidentally mint stale authority with fresh-looking text).

Parsing contract: label decides speech act; decorations decide gating. `issue (blocking)` requires Finding tuple (claim/pin/kind/scope) in discussion or composer rejects to QUESTION. `praise` requires sincere specific relation (false praise is accounting fraud — it widens social proof without evidence). `suggestion (non-blocking)` never gates merge. This prevents the classic failure where tone ("This is not worded correctly" vs "suggestion: ...") changes perceived authority without changing evidence. Grep-ability is a feature: ledger queries filter by label/decoration exactly.

Examples (composer output shape):
- `issue (blocking, security): Child inherits gateway env via ambient spawn.` + tuple + receipt refs.
- `question (non-blocking): Does this claim cover a second persistence cycle?` + unresolved object named.
- `praise: Member-path cap preserved while fixing tax order — verified by red/green at <sha>.`

## 11. Federation profile (protocol, not product)

Authority rules here are written to federate: any forge/host implementing ProofObject validation, monotonic narrowing, generation fencing, typed settlement, value-free receipts, and the §9 mutation witnesses can claim conformance. Conformance levels: L1 read (pins + receipts verifiable offline), L2 review (findings carry tuples, scope equality enforced), L3 mutation (brokered spawns, merge edge revalidation, indeterminate reconciliation). Rev targets L3; adapters may target lower levels but must declare level in every receipt (level is part of proof scope — claiming L3 behavior with L1 machinery is widening).

Cross-implementation traps: policy manifest hash must cover semantics, not file bytes alone (reformatted manifest with identical grants must hash-equal or federation splits on whitespace); generation must be monotonic per repo even across hosts (host-local counters need vector or authority-service ordering); receipt reason codes are versioned registry — new codes additive, never repurposed.

## 12. Worked refusals (what good refusal looks like)

- Stale generation at merge: `POLICY_HASH_MISMATCH / retryable:false / pin:{head, base, gen-7} / "CODEOWNERS changed (gen-6->gen-7) after review; revalidate owners for paths X."` State preserved, no partial merge, next action named.
- Ambiguous owners: `AUTHORITY_AMBIGUOUS / retryable:true after declaration / "No CODEOWNERS in root/.github/docs; Rev will not guess. Declare owners or explicit fallback policy."`
- Post-execution timeout: settlement `INDETERMINATE / INDETERMINATE_RECONCILE_REQUIRED / "Child may have started (span …); reconcile against main/event log before any retry."` Never "failed, retry" — that phrasing has caused duplicate side effects in every ecosystem that uses it.

Each refusal is a successful protocol outcome. Suppressing refusals to look "frictionless" destroys the audit trail federation depends on.

## 13. GitHub App permission design (least authority, probed)

App permissions requested per resource with justification in manifest PR: metadata read (always), contents (read for diffs; write only for fix-branch pushes — separate installation grant tiers: Review-only install vs Review+Fix install, declared in receipt), pull_requests write (reviews/comments), issues write (triage comments), checks write (Rev check runs), actions read (CI receipts), security-events/alerts read where available for advisory correlation. Webhook events minimal: pull_request, issue_comment, pull_request_review (dismissal learning), installation, push (main verification), repository advisories where delivered. Permission upgrades require re-install consent — silent scope growth impossible by platform; Rev mirrors by bumping policy generation + re-consent receipt.

Token lifecycle: installation tokens short-lived, minted per WorkEvent scope, never stored; spawn/child edges receive no GitHub token unless grant names it (broker rule). App private key custody: host secret store, rotation procedure in release checklist; key compromise = generation revocation event across installations (incident protocol).

## 14. Worked interlock (relay + spawn, step by step with receipts)

Event E (message, target profile B on install T) -> admission receipt (event_id, payload digest, expiry) -> courier claim (owner, token, gen) -> recipient admission on T (execution token, target lane bound) -> ChildProcessSpec (TRUSTED_HERMES_CHILD narrowed: profile B tools only, stdin CLOSED, descendants SAME_PROFILE_ONLY, policy hash H) -> spawn receipt (spec digest, exe identity, env key-names) -> execution spans -> write-once result -> ACK (generation + outcome digest) -> settlement COMPLETED. Failure variants receipted at exact break: claim crash -> lease reclaim; spawn revocation -> PROOF_STALE_GENERATION refusal, event preserved; post-spawn timeout -> INDETERMINATE + reconcile (check child result store before any continuation). Each arrow is GraphQL-traceable (systems §9). This tabletop is federation exam W-S series in narrative form; implementers rehearse it before coding Day 2 queue.

## 15. Time + Identity as authority dimensions (operationalized)
Time: every grant carries issued/expires; clocks compared in UTC with skew allowance declared; "recent" never authorizes (recency is coordinate). Expiry mid-flight: operations already settled stand; unsettled revalidate or INDETERMINATE. Identity: principals and resources always composite in receipts (installation+profile, repo+generation, model+version pin). Display names (profile alias, branch, tag) rendered only beside composite IDs in plugin/PR outputs — UI must not train bare-name reasoning.

## 16. Check-run authority (Rev as status provider)
Rev check contexts (`rev/review`, `rev/fix-verify`, `rev/advisory`) are required-status candidates only when repo maintainer adds them — App never self-requires (that would mint gating authority from installation coordinate). Check conclusion binds exact head SHA (platform enforces head binding; Rev additionally binds base+generation in details URL -> GraphQL receipt). Neutral/skipped conclusions for out-of-scope paths with scope text; failure only for proven blocking at pin. Duplicate job-name ambiguity (platform warning) avoided by namespacing (ownership file).
