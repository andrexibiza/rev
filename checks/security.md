# Check: security (trigger: auth, token, env, spawn, crypto, deps, file paths)
Owner hat: security architect. Load references/security-architecture.md §§1-3,8. (Deploys as .agents/checks/security.md in target repos.)
- [ ] Spawn census diff: new child-creation sites brokered (intent/principal/profile/grants/stdin/descendants) — attach scan receipt.
- [ ] No ambient env inheritance in diff (explicit env/stdin present) — grep + AST evidence.
- [ ] Secret sentinel rename probe passes for touched sinks — test receipt linked.
- [ ] Token/credential rotation or scope change: per-resource probe results attached.
Verdict rule: unchecked applicable box = GAP in remaining boundaries; ambient spawn = BLOCKING.
