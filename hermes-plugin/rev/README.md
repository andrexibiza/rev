# Rev Hermes Plugin (real native + desktop package)

Structure (Hermes native contract): `plugin.yaml` + `__init__.py` `register(ctx)` registering tools `rev_demo_review`, `rev_registry`, `rev_triage` (schemas.py/tools.py, stdlib only), bundled skill `skills/rev/SKILL.md`, desktop surface `desktop/plugin.js` (ESM, `@hermes/plugin-sdk`, pane + status bar; id `rev` matches folder).

Install:
```bash
cp -R hermes-plugin/rev ~/.hermes/plugins/rev
hermes plugins enable rev
hermes plugins doctor ~/.hermes/plugins/rev --ci
# desktop: also copy desktop/plugin.js to $HERMES_HOME/desktop-plugins/rev/plugin.js
```
Requires Rev server: `PORT=8787 WEBHOOK_SECRET=devsecret npm start` in Rev repo.

Verification in this build (2026-10-28): Python register harness executed — tools registered exactly as declared in plugin.yaml. Desktop JS syntax-checked (`node --check`). `hermes plugins doctor` attempted twice: blocked by Hermes runtime dependency sync (PyPI unreachable in sandbox: google-auth/pyasn1 fetch failures) — environment blocker, re-run doctor on networked machine; do not claim doctor-green until then.
