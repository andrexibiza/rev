# Check: advisories (trigger: lockfiles, manifests, SBOM, Dockerfiles, Actions pins)
Owner: vuln-response. Load references/vuln-response.md. (Deploys as .agents/checks/advisories.md in target repos.)
- [ ] Lockfile diff radius + install-script changes explicitly reviewed.
- [ ] New pins SHA/digest where ecosystem supports; tags alone = WARNING.
- [ ] Watcher match status for changed packages recorded (AFFECTS/REACHES/NO_ACTION).
