# Demo (3 minutes) — runbook

Preflight: `npm run check && npm run check:refs && npm test` (40 tests). Terminal 1: `PORT=8787 WEBHOOK_SECRET=devsecret npm start`. Terminal 2: `node src/demo.mjs`.

- Act 1 Review (60s): show demo markdown — cap bug (blocking, executed) + bad test (blocking), sound credited, verdict REQUEST_CHANGES with pin.
- Act 2 Fix (60s): `node -e "import('./src/queue.mjs').then(async m=>{const q=m.createQueue(); q.enqueue({idempotencyKey:'demo',payload:{pull_request:{number:1}},operation:'REVIEW'}); const w=await import('./src/worker.mjs'); console.log(await w.drainOnce({queue:q}))})"` — COMPLETED receipt, duplicate replay demo on re-run.
- Act 3 Crisis (60s): watcher tests as live proof (`npm test` watcher section) + plugin: serve `plugin/` (`python3 -m http.server -d plugin 8080`), open console, point GraphQL endpoint to `http://localhost:8787/graphql` (live empty registry) vs labeled DEMO DATA fallback. State plainly which is live.

Live GitHub posting (optional, needs your token/repo): `GITHUB_TOKEN=… REV_LIVE_POST=1` enables projector; without it, dry-run receipts only — by design.
Model lanes: set `REV_MODEL_ENDPOINT + REV_MODEL + MUSE_API_KEY` to enable; otherwise deterministic executor is labeled in every receipt.
