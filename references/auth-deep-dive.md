# Reference: Auth Deep Dive (joint Security/API)

Identity proofing vs session authority: login establishes identity at generation; session/token carries scoped derivation (monotonic). MFA/step-up for high-radius operations (merge, release, credential rotation) as policy grants. Token types: opaque vs structured (JWT validation: signature, aud, exp, alg pinning — header-guided alg selection = BLOCKING pattern), refresh rotation + reuse detection (reuse = generation compromise event, revoke family). API keys: hashed storage, per-key scopes probed, last-used receipts, rotation overlap windows fenced.

Authorization models: RBAC/ABAC/ReBAC expressed as grant tuples; policy evaluation point must consume current generation (cached policy = coordinate with TTL receipt). Tenant isolation: every query scoped by tenant from proof, never from request param alone (param is coordinate; proof tenant authorizes; mismatch refuses). Service-to-service: workload identity (cert/token exchange), no shared static secrets where platform offers identity.

Session UX security flows (ux joint): fixation, concurrent sessions visibility/revocation, device list as settlement surface.

## Deep patterns
Password/credential flows: reset tokens single-use generation-fenced, expiry, no account enumeration via timing/response (probes). OAuth/OIDC: state/nonce/PKCE, redirect allowlist exact, token audience binding (scope equality). Passkeys/WebAuthn: challenge generations, recovery flows as weakest link review. Session listing/revocation UX as security surface. Service accounts: owner, scope review cadence, unused-key debt (last-used receipts drive revocation proposals — stewardship).
Checklist: reuse-detection test, redirect fuzz cases, tenant-mismatch refusal probes (two-tenant fixtures mandatory for multi-tenant changes).
