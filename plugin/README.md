# Rev Plugin — Cross-Repo Registry (Hermes Desktop panel + localhost fallback)

Static, severe, agent-native ops console. No build step, no external CDN, no framework.
Open it, it queries GraphQL; if no GraphQL server answers, it shows **labeled demo data** and says so in three places (badge, banner, inspector). It never presents fixtures as live settlements.

Contract of record: [`../schema.md`](../schema.md) (knowledge graph + GraphQL, v0.1.0). Build plan: [`../plan.md`](../plan.md) Day 6. This directory implements the Day-6 surfaces as a static web console that works identically as a Hermes Desktop panel and as a localhost page — same files, same GraphQL, same objects.

## Files

| File | Role |
|---|---|
| `index.html` | Console shell: top bar (source badge, pin echo, endpoint), required filters, stats, sections 01–04 + inspector. Semantic tables; every row carries `data-weid` / `data-state` / `data-repo-id` for agents. |
| `app.js` | GraphQL fetch (`Registry` + `Triage` query strings), Relay normalization, demo fallback, filtering, rendering, inspector, JSON export, `window.__REV_REGISTRY__` agent API. Lane data is states + digests + verdicts only. |
| `styles.css` | Monospace-forward, high-contrast, sharp-corner ops theme. No gradients, no glow/glass, no purple/indigo/violet. Respects `prefers-reduced-motion`. |
| `README.md` | This file: packaging assumptions, fallback, endpoint config, gaps. |

No file exceeds the 2K Law ceiling (`npm run check` from repo root covers `plugin/app.js`).

## What it shows

1. **Cross-repo registry (§01)** — every repo, every Rev PR/review as `WorkEvent` rows from the `registry` query: operation, settlement state, pin (`sha · generation · policyHash`), proof digest, findings/repairs, receipt. `SHIPPED ≠ MERGED` everywhere.
2. **Interlock list (§02)** — `Repair —PROJECTS_TO→ PullRequestProjection` with the findings each repair addresses, head→base SHAs, and fresh-reviewer verdicts. Source and fix PRs link both ways; GitHub is the projection, Rev objects are truth.
3. **Lane board (§03) — states only** — `LaneRun` kind, settlement state, verdict, input/output digests, span window. **Chain-of-thought is never a field, attribute, or stream** (schema.md §7); analyst/witness isolation is audited via disjoint input digests, not reasoning text.
4. **Receipts / ledger (§04)** — value-free `Receipt` rows: state, `reasonCode`, outcome digest, merge SHA, pin. Receipts never carry secret values or raw env (schema.md §2, `src/types.mjs` guard).

### Required filters (Day-6)

`AWAITING MAINTAINER` (repair `SHIPPED`, no verified `MERGED` yet) · `REACHABLE` (advisory with a proven `REACHES` path — version-match `AFFECTS` alone never qualifies) · `INDETERMINATE` (timeout after possible side effect; reconcile, never blind-retry). They compose (AND) with search, repo, operation, settlement state, and finding kind. The same predicates drive stats, flags, and the inspector, so counts cannot drift from rows. When live, matching fields are also sent as `RegistryFilterInput`; client-side re-filtering keeps demo and live views reconcilable.

Select any row for the **inspector**: full pin, proof/idempotency/trace IDs, findings with evidence basis, advisory reachability paths, lane states, and the receipt chain. `INDETERMINATE` selections get a reconcile notice naming `reconcileIndeterminate` — the console offers no retry button for them, by design.

## Run it (localhost fallback — always available)

No install, no build. Serve the folder statically and open the page:

```bash
# from repo root — pick one:
python3 -m http.server 8080 --directory plugin
# or: npx --yes serve plugin -l 8080   (downloads serve on first use)
```

Open <http://localhost:8080/> (add `?graphql=` as below). Opening `plugin/index.html` via `file://` also works: the GraphQL `fetch` will fail (CORS/origin) and the console falls back to labeled demo data — that is the designed offline path, not an error state.

Verify the JS parses without opening a browser:

```bash
node --check plugin/app.js
```

## GraphQL endpoint

Resolution order (first hit wins):

1. `?graphql=<url>` query param — e.g. `http://localhost:8080/?graphql=http://localhost:8787/graphql`
2. `window.__REV_GRAPHQL__` (host page / Hermes shell injection point)
3. `localStorage["rev.graphqlEndpoint"]` (set when you edit the endpoint field)
4. Default: `http://localhost:8787/graphql` (the `src/app.mjs` dev port convention; the GraphQL server itself lands Day 2 per plan — until then every load exercises the demo fallback)

The console `POST`s `{ query, variables }` with the `Registry` query from `app.js` (`registry(first:50, filter:…) + repositories(first:20)`, Relay connections). A 4s timeout, non-2xx, GraphQL `errors` without `data`, or an empty payload all degrade to demo data with the banner up. `REFRESH [R]` re-queries; `AUTO 15s` polls. Subscriptions (`laneSpanAdded`, `settlementChanged`, schema.md §7) are the live-update design; this static build polls instead — see Gaps.

**Demo data** is shaped to `fixtures/demo` + plan Acts 1–3 (cap bug at `fixtures/demo/discount.mjs:6`, wrong-supplier bad test, reachable vs unreachable advisory pair, one `SHIPPED` awaiting maintainer, one verified `MERGED`, one `INDETERMINATE`, one `AUTHORITY_AMBIGUOUS` refusal). IDs/digests are illustrative. The badge reads `DEMO DATA`, the amber banner is unmissable, exports stamp `source: "demo"`, and the inspector repeats the label. There is no code path that renders fixtures without the label.

## Dispatch (why this console is read-only)

Plan Day 6 asks the plugin to dispatch review/fix/respond. Those are GraphQL **mutations** consuming a current `ProofObject` (`proof: ProofInput!`, idempotency key required; refusals return as `RefusalPayload` data, schema.md §7/§9). A static page has no authority source and must never fabricate a proof — so this build renders the full read path and names the mutation path in the inspector instead of faking buttons that cannot authorize. Wiring dispatch means: host (Hermes shell or CLI) supplies a proof minter, the console calls the same mutations GitHub ingress creates, and `INDETERMINATE` results surface the reconcile action. Tracked as a gap below, not stubbed over.

## Hermes Desktop packaging — assumptions (UNVERIFIED, read before shipping)

**Status: assumption set, not inspected API.** `plan.md` Risks states the Hermes Desktop plugin API surface and packaging were not inspected; Day 6 “assumes a local plugin can render custom panels and dispatch actions,” with this localhost web UI as the explicit fallback. `docs/architecture.md` likewise lists the Hermes plugin registry as planned, not built. Nothing in this repo verifies a Hermes manifest format, sandbox, or bridge — this README therefore records assumptions to confirm with the Hermes host before any “native plugin” claim:

| # | Assumption this build relies on | If false |
|---|---|---|
| A1 | Hermes Desktop can host a local static web panel (HTML/CSS/JS, no build) in a webview or embedded browser surface. | Ship the identical files via the localhost fallback below; zero UI rewrite. |
| A2 | The panel may `fetch` a localhost GraphQL endpoint (the Rev server), or the host injects `window.__REV_GRAPHQL__` / a proxied endpoint. CORS/origin policy is host-configurable for localhost. | Host must proxy GraphQL or relax localhost CORS; UI code is unchanged (endpoint is config, not compiled in). |
| A3 | The host can persist one string (endpoint URL) or pass `?graphql=` at launch. | Endpoint field still works per session; only convenience persistence is lost. |
| A4 | Dispatch, when wired, goes through a host-provided proof minter / GraphQL mutation bridge with the user's authority — the panel never holds signing keys or tokens. | Console stays read-only (current build). Never embed credentials in these static files to “fix” this. |
| A5 | Packaging is “copy `plugin/` as-is” (plus whatever manifest the host requires, still to be authored once A1–A4 are confirmed). No bundler, no CDN, no remote fonts — deliberately host-agnostic. | Add only the host manifest; do not introduce a build step to satisfy packaging. |

Confirmation checklist for the Day-6 owner (from plan Risks): verify Hermes plugin/panel API + packaging on the real host, confirm it can render custom panels and dispatch actions, then either (a) write the manifest and mark A1–A5 verified with the host version + receipt, or (b) declare localhost the shipping surface. Until then, describe this artifact as **“localhost web UI with identical objects (Hermes panel-ready)”** — never as a verified native Hermes plugin.

### Localhost fallback (the guaranteed surface)

Identical files, identical GraphQL, identical objects — only the chrome differs:

```bash
python3 -m http.server 8080 --directory plugin   # then open http://localhost:8080/
```

Point it at a Rev GraphQL server with `?graphql=http://localhost:8787/graphql` (or the endpoint field). With no server, you get the full console over labeled demo data — suitable for rehearsal and the recorded fallback run (plan Day 7), provided narration states plainly that it is demo data.

## Agent-native surface

Machines get what humans get, no shadow API: rows expose `data-weid` / `data-state` / `data-repo-id`; `window.__REV_REGISTRY__` offers `getState()`, `getData()`, `getFiltered()`, `predicates`, `refresh()`, and both query strings. `EXPORT JSON` downloads the filtered view with `source`, filters, and `RegistryFilterInput` stamped in. Keyboard: `/` search, `R` refresh, click/Enter selects. All interpolated strings are HTML-escaped in `app.js`; PR URLs render as links with `rel="noopener noreferrer"`.

## Gaps (honest, tracked — do not demo over these)

- **GraphQL server does not exist yet** in this repo (`src/app.mjs` is the Day-1 webhook; registry/`repositories` resolvers land Day 2+). Every load today exercises the demo fallback. Live mode is code-complete against schema.md but unverified against a real server — first live claim needs a server receipt.
- **Hermes Desktop packaging unverified** — A1–A5 above. Localhost is the only verified surface.
- **Read-only**: no dispatch mutations, no reconcile button, no proof minting (see Dispatch). Refusals like `AUTHORITY_AMBIGUOUS` render as receipt data; resolving them happens in Rev, not here.
- **Polling, not subscriptions**: `AUTO 15s` re-queries; `laneSpanAdded`/`settlementChanged` subscriptions (schema.md §7) need a host transport this static build does not assume.
- **Persisted queries**: production registers query hashes (schema.md §10); this dev build sends ad-hoc query text. Register `REGISTRY_QUERY`/`TRIAGE_QUERY` hashes with the server before calling it production.
- **Single-page `first: 50`**: no cursor pagination UI yet; large registries need Relay `pageInfo` wiring in `refresh()`/`renderAll()`.
- Demo advisory IDs (`GHSA-demo-*`, `CVE-2026-*`) are fixtures, not real OSV records; real watcher data arrives Day 5.

## Security notes

Receipts and digests are displayed verbatim as value-free data (identities, hashes, reason codes only). The console stores exactly one localStorage key (endpoint URL) — no tokens, no payloads. Do not add credential storage to these files; authority belongs in `ProofObject`s minted outside the page (Nothing Ambient Survives).

