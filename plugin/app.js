"use strict";
/* REV REGISTRY — static ops console. GraphQL-first (schema.md §6), no build, no CDN.
   Live path: POST {query, variables} to the configured endpoint.
   Fallback: labeled DEMO_DATA shaped to the same Relay/Pin/Receipt contract.
   Lane board renders states + digests + verdicts ONLY. Chain-of-thought is
   never requested, never stored, never rendered (schema.md §7).
   This console is read-only: dispatch requires a current ProofObject via a
   GraphQL mutation; a static page must never fabricate authority. */

const CONFIG = {
  defaultEndpoint: "http://localhost:8787/graphql",
  storageKey: "rev.graphqlEndpoint",
  timeoutMs: 4000,
  schemaVersion: "0.1.0",
};

/* Single-round-trip registry read (schema.md §6). Persisted-query hash is
   registered server-side in production; ad-hoc queries are dev-only (§10). */
const REGISTRY_QUERY = `query Registry($first: Int, $filter: RegistryFilterInput) {
  repositories(first: 20) { edges { node { id host owner name defaultBranch
    pin { sha generation policyHash } } } }
  registry(first: $first, filter: $filter) { edges { node {
    id operation state proofDigest idempotencyKey
    pin { sha generation policyHash }
    receipt { id state reasonCode outcomeDigest mergeSha createdAt }
    findings(first: 10) { edges { node { id kind severity disposition title filePath line verdict evidenceBasis } } }
    repairs(first: 5) { edges { node { id title state headSha baseSha
      projection { host number url headSha baseSha }
      laneRuns(first: 10) { edges { node { id kind state verdict inputDigests outputDigest startedAt endedAt
        span { id traceId } } } } } }
  } } }
}`;

/* Required triage query (schema.md §6) — exported for the inspector/docs.
   The console does not fan out N+1 REST calls; reachability comes from GraphQL. */
const TRIAGE_QUERY = `query Triage($repo: ID!, $adv: String!, $at: PinInput) {
  repository(id: $repo, at: $at) {
    pin { sha generation policyHash }
    authorityMap { ambiguous mergeHolders { principalId } } }
  advisory(osvId: $adv) {
    reachableEntities(first: 20) { edges { node { path owners { principalId } } } }
    reachabilityPath(at: $at) { kind fromId toId } }
}`;

/* ---------------- demo data (LABELED — never presented as live) ----------------
   Mirrors fixtures/demo + plan Acts 1–3. SHIPPED ≠ MERGED by construction. */
const DEMO_PIN = { sha: "a1b2c3d4e5f60718293a4b5c6d7e8f90a1b2c3d4", generation: "gen-2026-10-27.4", policyHash: "pol_9f2c1a" };
const DEMO_DATA = {
  repositories: [
    { id: "rev:repo:github:acme/shop-api", host: "github", owner: "acme", name: "shop-api", defaultBranch: "main", pin: DEMO_PIN },
    { id: "rev:repo:github:acme/billing", host: "github", owner: "acme", name: "billing", defaultBranch: "main", pin: { sha: "b2c3d4e5f60718293a4b5c6d7e8f90a1b2c3d4e5", generation: "gen-2026-10-27.2", policyHash: "pol_41bd77" } },
    { id: "rev:repo:github:NousResearch/hermes-agent", host: "github", owner: "NousResearch", name: "hermes-agent", defaultBranch: "main", pin: { sha: "c3d4e5f60718293a4b5c6d7e8f90a1b2c3d4e5f6", generation: "gen-2026-10-26.9", policyHash: "pol_77aa10" } },
  ],
  workEvents: [
    {
      id: "01J9ZQ7K2M4X8N0PQRSTUVWXYZ".slice(0, 26), operation: "REVIEW", state: "RUNNING",
      repoId: "rev:repo:github:acme/shop-api", pin: DEMO_PIN, proofDigest: "sha256:proof_7c1e…a901",
      idempotencyKey: "idem-review-shop-4821", traceId: "trace_4f8a21", createdAt: "2026-10-27T14:02:11Z", updatedAt: "2026-10-27T14:04:40Z",
      receipt: null,
      findings: [
        { id: "fnd_101", kind: "DEFECT", severity: "CRITICAL", disposition: "BLOCKING", title: "Member discount ignores $15 cap (uncapped on member path)", filePath: "fixtures/demo/discount.mjs", line: 6, verdict: null, evidenceBasis: "red-on-parent receipt" },
        { id: "fnd_102", kind: "BAD_TEST", severity: "WARNING", disposition: "BLOCKING", title: "Pin test cannot go red — later setup supplies asserted state", filePath: "fixtures/demo/bad.test.mjs", line: 11, verdict: null, evidenceBasis: "wrong-supplier (class 2)" },
      ],
      repairs: [],
      advisories: [],
      laneRuns: [
        { id: "lane_a1", kind: "ANALYST", state: "COMPLETED", verdict: null, inputDigests: ["sha256:in_11aa"], outputDigest: "sha256:out_91bc", spanId: "span_a1", startedAt: "2026-10-27T14:02:20Z", endedAt: "2026-10-27T14:03:01Z" },
        { id: "lane_w1", kind: "WITNESS", state: "RUNNING", verdict: null, inputDigests: ["sha256:in_77de"], outputDigest: null, spanId: "span_w1", startedAt: "2026-10-27T14:03:05Z", endedAt: null },
        { id: "lane_j1", kind: "ADJUDICATOR", state: "QUEUED", verdict: null, inputDigests: [], outputDigest: null, spanId: "span_j1", startedAt: "2026-10-27T14:03:05Z", endedAt: null },
      ],
    },
    {
      id: "01J9ZQ8A3N5Y9P1QRSTUVWXYZA", operation: "FIX", state: "SHIPPED",
      repoId: "rev:repo:github:acme/shop-api", pin: DEMO_PIN, proofDigest: "sha256:proof_2b8d…c410",
      idempotencyKey: "idem-fix-shop-4822", traceId: "trace_91cd07", createdAt: "2026-10-27T13:11:02Z", updatedAt: "2026-10-27T13:48:19Z",
      receipt: { id: "rc_801", state: "SHIPPED", reasonCode: "PR_OPENED_AWAITING_MAINTAINER", outcomeDigest: "sha256:outcome_55e1", mergeSha: null, createdAt: "2026-10-27T13:48:19Z" },
      findings: [
        { id: "fnd_101", kind: "DEFECT", severity: "CRITICAL", disposition: "BLOCKING", title: "Member discount ignores $15 cap (uncapped on member path)", filePath: "fixtures/demo/discount.mjs", line: 6, verdict: "APPROVE", evidenceBasis: "green-on-head receipt" },
      ],
      repairs: [
        { id: "rep_201", title: "Cap member discount at $15 before tax", state: "SHIPPED", headSha: "d4e5f60718293a4b5c6d7e8f90a1b2c3d4e5f607", baseSha: DEMO_PIN.sha, verdicts: ["APPROVE", "APPROVE"],
          projection: { host: "github", number: 142, url: "https://github.com/acme/shop-api/pull/142", headSha: "d4e5f60718293a4b5c6d7e8f90a1b2c3d4e5f607", baseSha: DEMO_PIN.sha } },
      ],
      advisories: [],
      laneRuns: [
        { id: "lane_i2", kind: "IMPLEMENTER", state: "COMPLETED", verdict: null, inputDigests: ["sha256:contract_09"], outputDigest: "sha256:diff_3f77", spanId: "span_i2", startedAt: "2026-10-27T13:20:00Z", endedAt: "2026-10-27T13:31:44Z" },
        { id: "lane_rc2", kind: "REVIEWER_CORRECTNESS", state: "COMPLETED", verdict: "APPROVE", inputDigests: ["sha256:diff_3f77"], outputDigest: "sha256:verdict_c201", spanId: "span_rc2", startedAt: "2026-10-27T13:33:00Z", endedAt: "2026-10-27T13:40:12Z" },
        { id: "lane_ra2", kind: "REVIEWER_ADVERSARIAL", state: "COMPLETED", verdict: "APPROVE", inputDigests: ["sha256:diff_3f77"], outputDigest: "sha256:verdict_a202", spanId: "span_ra2", startedAt: "2026-10-27T13:33:00Z", endedAt: "2026-10-27T13:41:03Z" },
      ],
    },
    {
      id: "01J9ZQ9B4P6Z0Q2RSTUVWXYZAB", operation: "RESPOND", state: "MERGED",
      repoId: "rev:repo:github:acme/shop-api", pin: DEMO_PIN, proofDigest: "sha256:proof_9a02…f777",
      idempotencyKey: "idem-respond-ghsa-310", traceId: "trace_02be99", createdAt: "2026-10-27T09:15:30Z", updatedAt: "2026-10-27T10:02:55Z",
      receipt: { id: "rc_802", state: "MERGED", reasonCode: "MERGE_VERIFIED_ON_MAIN", outcomeDigest: "sha256:outcome_81cd", mergeSha: "e5f60718293a4b5c6d7e8f90a1b2c3d4e5f60718", createdAt: "2026-10-27T10:02:55Z" },
      findings: [
        { id: "fnd_310", kind: "SECURITY", severity: "CRITICAL", disposition: "BLOCKING", title: "Reachable vulnerable call in request path (demo-reachable-lib)", filePath: "src/handler.mjs", line: 18, verdict: "APPROVE", evidenceBasis: "REACHES path artifact" },
      ],
      repairs: [
        { id: "rep_310", title: "Upgrade demo-reachable-lib to patched release", state: "MERGED", headSha: "f60718293a4b5c6d7e8f90a1b2c3d4e5f6071829", baseSha: DEMO_PIN.sha, verdicts: ["APPROVE", "APPROVE"],
          projection: { host: "github", number: 139, url: "https://github.com/acme/shop-api/pull/139", headSha: "f60718293a4b5c6d7e8f90a1b2c3d4e5f6071829", baseSha: DEMO_PIN.sha } },
      ],
      advisories: [
        { osvId: "GHSA-demo-reachable-0001", aliases: ["CVE-2026-00001"], packageName: "demo-reachable-lib", reachable: true, knownExploited: false, reachablePaths: ["src/handler.mjs:18 → lib/vuln()"] },
      ],
      laneRuns: [
        { id: "lane_t3", kind: "TRIAGE", state: "COMPLETED", verdict: null, inputDigests: ["sha256:osv_310"], outputDigest: "sha256:triage_310", spanId: "span_t3", startedAt: "2026-10-27T09:16:00Z", endedAt: "2026-10-27T09:18:20Z" },
        { id: "lane_i3", kind: "IMPLEMENTER", state: "COMPLETED", verdict: null, inputDigests: ["sha256:contract_310"], outputDigest: "sha256:diff_310", spanId: "span_i3", startedAt: "2026-10-27T09:20:00Z", endedAt: "2026-10-27T09:29:41Z" },
      ],
    },
    {
      id: "01J9ZQAC5Q7A1R3STUVWXYZABC", operation: "TRIAGE", state: "NO_ACTION",
      repoId: "rev:repo:github:acme/shop-api", pin: DEMO_PIN, proofDigest: "sha256:proof_4d55…b120",
      idempotencyKey: "idem-triage-ghsa-311", traceId: "trace_77aa10", createdAt: "2026-10-27T09:15:31Z", updatedAt: "2026-10-27T09:17:02Z",
      receipt: { id: "rc_803", state: "NO_ACTION", reasonCode: "ADVISORY_UNREACHABLE_VERIFIED", outcomeDigest: "sha256:outcome_02fe", mergeSha: null, createdAt: "2026-10-27T09:17:02Z" },
      findings: [], repairs: [],
      advisories: [
        { osvId: "GHSA-demo-unreachable-0002", aliases: ["CVE-2026-00002"], packageName: "demo-unreachable-lib", reachable: false, knownExploited: false, reachablePaths: [] },
      ],
      laneRuns: [
        { id: "lane_t4", kind: "TRIAGE", state: "COMPLETED", verdict: null, inputDigests: ["sha256:osv_311"], outputDigest: "sha256:triage_311", spanId: "span_t4", startedAt: "2026-10-27T09:16:01Z", endedAt: "2026-10-27T09:17:02Z" },
      ],
    },
    {
      id: "01J9ZQBD6R8B2S4TUVWXYZABCD", operation: "FIX", state: "INDETERMINATE",
      repoId: "rev:repo:github:acme/billing", pin: { sha: "b2c3d4e5f60718293a4b5c6d7e8f90a1b2c3d4e5", generation: "gen-2026-10-27.2", policyHash: "pol_41bd77" },
      proofDigest: "sha256:proof_6e90…d033", idempotencyKey: "idem-fix-billing-0917", traceId: "trace_c411e0",
      createdAt: "2026-10-27T12:40:10Z", updatedAt: "2026-10-27T12:55:10Z",
      receipt: { id: "rc_804", state: "INDETERMINATE", reasonCode: "INDETERMINATE_RECONCILE_REQUIRED", outcomeDigest: "sha256:outcome_unknown_91", mergeSha: null, createdAt: "2026-10-27T12:55:10Z" },
      findings: [
        { id: "fnd_917", kind: "RELIABILITY", severity: "WARNING", disposition: "BLOCKING", title: "Timeout after possible side effect — settlement unknown", filePath: "src/charge.mjs", line: 44, verdict: null, evidenceBasis: "executor timeout receipt" },
      ],
      repairs: [
        { id: "rep_917", title: "Guard duplicate charge on retry", state: "INDETERMINATE", headSha: "0718293a4b5c6d7e8f90a1b2c3d4e5f60718293a", baseSha: "b2c3d4e5f60718293a4b5c6d7e8f90a1b2c3d4e5", verdicts: [],
          projection: { host: "github", number: 88, url: "https://github.com/acme/billing/pull/88", headSha: "0718293a4b5c6d7e8f90a1b2c3d4e5f60718293a", baseSha: "b2c3d4e5f60718293a4b5c6d7e8f90a1b2c3d4e5" } },
      ],
      advisories: [],
      laneRuns: [
        { id: "lane_i5", kind: "IMPLEMENTER", state: "INDETERMINATE", verdict: null, inputDigests: ["sha256:contract_917"], outputDigest: null, spanId: "span_i5", startedAt: "2026-10-27T12:44:00Z", endedAt: null },
        { id: "lane_e5", kind: "EXECUTOR", state: "INDETERMINATE", verdict: null, inputDigests: ["sha256:argv_917"], outputDigest: null, spanId: "span_e5", startedAt: "2026-10-27T12:45:00Z", endedAt: null },
      ],
    },
    {
      id: "01J9ZQCE7S9C3T5UVWXYZABCDE", operation: "REVIEW", state: "COMPLETED",
      repoId: "rev:repo:github:NousResearch/hermes-agent", pin: { sha: "c3d4e5f60718293a4b5c6d7e8f90a1b2c3d4e5f6", generation: "gen-2026-10-26.9", policyHash: "pol_77aa10" },
      proofDigest: "sha256:proof_1f3a…8890", idempotencyKey: "idem-review-hermes-1204", traceId: "trace_55f001",
      createdAt: "2026-10-26T18:22:00Z", updatedAt: "2026-10-26T18:40:31Z",
      receipt: { id: "rc_805", state: "COMPLETED", reasonCode: "REVIEW_POSTED", outcomeDigest: "sha256:outcome_77c2", mergeSha: null, createdAt: "2026-10-26T18:40:31Z" },
      findings: [
        { id: "fnd_1204", kind: "BAD_TEST", severity: "WARNING", disposition: "QUESTION", title: "Assertion supplied by later setup — sensitivity unproven", filePath: "tests/session.test.mjs", line: 62, verdict: "COMMENT", evidenceBasis: "assertion parse" },
      ],
      repairs: [], advisories: [],
      laneRuns: [
        { id: "lane_a6", kind: "ANALYST", state: "COMPLETED", verdict: null, inputDigests: ["sha256:in_1204a"], outputDigest: "sha256:out_1204a", spanId: "span_a6", startedAt: "2026-10-26T18:23:00Z", endedAt: "2026-10-26T18:29:10Z" },
        { id: "lane_w6", kind: "WITNESS", state: "COMPLETED", verdict: null, inputDigests: ["sha256:in_1204w"], outputDigest: "sha256:out_1204w", spanId: "span_w6", startedAt: "2026-10-26T18:23:00Z", endedAt: "2026-10-26T18:30:02Z" },
        { id: "lane_j6", kind: "ADJUDICATOR", state: "COMPLETED", verdict: "COMMENT", inputDigests: ["sha256:out_1204a", "sha256:out_1204w"], outputDigest: "sha256:verdict_1204", spanId: "span_j6", startedAt: "2026-10-26T18:31:00Z", endedAt: "2026-10-26T18:35:44Z" },
      ],
    },
    {
      id: "01J9ZQDF8T0D4U6VWXYZABCDEF", operation: "IMPLEMENT", state: "QUEUED",
      repoId: "rev:repo:github:acme/billing", pin: { sha: "b2c3d4e5f60718293a4b5c6d7e8f90a1b2c3d4e5", generation: "gen-2026-10-27.2", policyHash: "pol_41bd77" },
      proofDigest: "sha256:proof_8c21…aa19", idempotencyKey: "idem-impl-billing-0330", traceId: "trace_0330aa",
      createdAt: "2026-10-27T14:05:00Z", updatedAt: "2026-10-27T14:05:00Z",
      receipt: null, findings: [], repairs: [], advisories: [], laneRuns: [],
    },
    {
      id: "01J9ZQEG9U1E5V7WXYZABCDEFG", operation: "AUDIT_TESTS", state: "FAILED",
      repoId: "rev:repo:github:acme/billing", pin: { sha: "b2c3d4e5f60718293a4b5c6d7e8f90a1b2c3d4e5", generation: "gen-2026-10-27.2", policyHash: "pol_41bd77" },
      proofDigest: "sha256:proof_3d77…12bc", idempotencyKey: "idem-audit-billing-0511", traceId: "trace_0511bb",
      createdAt: "2026-10-27T08:01:00Z", updatedAt: "2026-10-27T08:09:12Z",
      receipt: { id: "rc_806", state: "FAILED", reasonCode: "AUTHORITY_AMBIGUOUS", outcomeDigest: "sha256:outcome_refused_11", mergeSha: null, createdAt: "2026-10-27T08:09:12Z" },
      findings: [], repairs: [], advisories: [],
      laneRuns: [
        { id: "lane_t8", kind: "TRIAGE", state: "FAILED", verdict: null, inputDigests: ["sha256:in_0511"], outputDigest: null, spanId: "span_t8", startedAt: "2026-10-27T08:02:00Z", endedAt: "2026-10-27T08:09:12Z" },
      ],
    },
  ],
};

/* ---------------- utils ---------------- */
const $ = (id) => document.getElementById(id);
function esc(s) {
  return String(s == null ? "" : s).replace(/[&<>"']/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}
function shortSha(sha) { return sha ? String(sha).slice(0, 10) : "—"; }
function fmtTime(iso) { return iso ? String(iso).replace("T", " ").replace("Z", "Z") : "—"; }
function edges(conn) {
  if (!conn) return [];
  if (Array.isArray(conn)) return conn;
  return (conn.edges || []).map((e) => e.node).filter(Boolean);
}
function stateBadge(state) {
  const s = esc(state || "—");
  return `<span class="state state-${s}">${s}</span>`;
}
function repoLabel(repoId, repos) {
  const r = (repos || []).find((x) => x.id === repoId);
  return r ? `${r.owner}/${r.name}` : String(repoId || "—").replace("rev:repo:github:", "");
}

/* Derived predicates — single source for stats, filters and flags.
   awaitingMaintainer: shipped repair awaiting a maintainer merge; SHIPPED ≠ MERGED.
   reachable: any advisory on the event has a proven REACHES path (not mere AFFECTS). */
function isAwaiting(ev) {
  if (ev.state === "SHIPPED") return true;
  if (ev.receipt && ev.receipt.state === "SHIPPED") return true;
  return (ev.repairs || []).some((r) => r.state === "SHIPPED");
}
function isReachable(ev) { return (ev.advisories || []).some((a) => a.reachable === true); }
function isIndeterminate(ev) {
  if (ev.state === "INDETERMINATE") return true;
  if (ev.receipt && ev.receipt.state === "INDETERMINATE") return true;
  return (ev.laneRuns || []).some((l) => l.state === "INDETERMINATE");
}

/* Normalize a live GraphQL payload (Relay connections) into the console model.
   Tolerant by design: missing optional connections render empty, never throw. */
function normalizeLive(data) {
  const repos = edges(data.repositories).map((r) => ({
    id: r.id, host: r.host, owner: r.owner, name: r.name,
    defaultBranch: r.defaultBranch, pin: r.pin || null,
  }));
  const events = edges(data.registry).map((n) => {
    const repairs = edges(n.repairs).map((r) => ({
      id: r.id, title: r.title, state: r.state, headSha: r.headSha, baseSha: r.baseSha,
      projection: r.projection || null,
      verdicts: edges(r.laneRuns).map((l) => l.verdict).filter(Boolean),
      laneRuns: edges(r.laneRuns).map((l) => ({
        id: l.id, kind: l.kind, state: l.state, verdict: l.verdict,
        inputDigests: l.inputDigests || [], outputDigest: l.outputDigest || null,
        spanId: l.span ? l.span.id : null, traceId: l.span ? l.span.traceId : null,
        startedAt: l.startedAt, endedAt: l.endedAt,
      })),
    }));
    const laneRuns = repairs.flatMap((r) => r.laneRuns || []);
    return {
      id: n.id, operation: n.operation, state: n.state, repoId: n.repoId || (repos[0] && repos[0].id) || "",
      pin: n.pin || null, proofDigest: n.proofDigest || "", idempotencyKey: n.idempotencyKey || "",
      traceId: n.trace ? n.trace.id : (laneRuns[0] && laneRuns[0].traceId) || "",
      createdAt: n.createdAt || "", updatedAt: n.updatedAt || (n.receipt && n.receipt.createdAt) || "",
      receipt: n.receipt || null,
      findings: edges(n.findings),
      repairs, advisories: n.advisories ? edges(n.advisories).map((a) => ({
        osvId: a.osvId || a.id, aliases: a.aliases || [], packageName: a.packageName || "",
        reachable: edges(a.reachableEntities).length > 0, knownExploited: !!a.knownExploited,
        reachablePaths: edges(a.reachableEntities).map((e) => e.path).filter(Boolean),
      })) : [],
      laneRuns,
    };
  });
  return { repositories: repos, workEvents: events };
}

async function fetchGraphQL(endpoint, variables) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), CONFIG.timeoutMs);
  try {
    const res = await fetch(endpoint, {
      method: "POST",
      headers: { "content-type": "application/json", accept: "application/json" },
      body: JSON.stringify({ query: REGISTRY_QUERY, variables }),
      signal: ctrl.signal,
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const json = await res.json();
    if (json.errors && json.errors.length && !json.data) {
      throw new Error(json.errors.map((e) => e.message).join("; "));
    }
    if (!json.data || (!json.data.registry && !json.data.repositories)) {
      throw new Error("GraphQL response missing registry/repositories data");
    }
    return json.data;
  } finally { clearTimeout(timer); }
}

function resolveEndpoint() {
  const params = new URLSearchParams(location.search);
  const fromQuery = params.get("graphql");
  if (fromQuery) return fromQuery;
  if (window.__REV_GRAPHQL__) return String(window.__REV_GRAPHQL__);
  try {
    const saved = localStorage.getItem(CONFIG.storageKey);
    if (saved) return saved;
  } catch (_) { /* storage unavailable (file:// private mode) — use default */ }
  return CONFIG.defaultEndpoint;
}

/* ---------------- state, filtering, rendering ---------------- */
const state = {
  source: "boot", /* live | demo */
  endpoint: resolveEndpoint(),
  data: { repositories: [], workEvents: [] },
  selectedId: null,
  lastError: null,
  lastSync: null,
  autoTimer: null,
};

function currentFilters() {
  return {
    q: $("fSearch").value.trim().toLowerCase(),
    repo: $("fRepo").value, operation: $("fOperation").value,
    st: $("fState").value, kind: $("fKind").value,
    awaiting: $("fAwaiting").checked, reachable: $("fReachable").checked,
    indeterminate: $("fIndeterminate").checked,
  };
}
function registryFilterInput(f) {
  const out = {};
  if (f.repo) out.repoId = f.repo;
  if (f.st) out.state = f.st;
  if (f.awaiting) out.awaitingMaintainer = true;
  if (f.kind) out.findingKind = f.kind;
  return Object.keys(out).length ? out : null;
}
function applyFilters(events, f) {
  return events.filter((ev) => {
    if (f.repo && ev.repoId !== f.repo) return false;
    if (f.operation && ev.operation !== f.operation) return false;
    if (f.st && ev.state !== f.st) return false;
    if (f.kind && !(ev.findings || []).some((x) => x.kind === f.kind)) return false;
    if (f.awaiting && !isAwaiting(ev)) return false;
    if (f.reachable && !isReachable(ev)) return false;
    if (f.indeterminate && !isIndeterminate(ev)) return false;
    if (f.q) {
      const hay = [ev.id, ev.repoId, ev.operation, ev.state, ev.traceId,
        ...(ev.findings || []).flatMap((x) => [x.title, x.filePath, x.kind]),
        ...(ev.advisories || []).flatMap((x) => [x.osvId, x.packageName, ...(x.aliases || [])]),
        ...(ev.repairs || []).flatMap((x) => [x.title, x.id]),
      ].join(" ").toLowerCase();
      if (!hay.includes(f.q)) return false;
    }
    return true;
  });
}
function sortedEvents() {
  return [...state.data.workEvents].sort((a, b) => String(b.updatedAt || b.createdAt).localeCompare(String(a.updatedAt || a.createdAt)));
}

function renderStats(filtered) {
  const all = state.data.workEvents;
  $("stRepos").textContent = String(state.data.repositories.length);
  $("stEvents").textContent = `${filtered.length} / ${all.length}`;
  $("stAwaiting").textContent = String(all.filter(isAwaiting).length);
  $("stReachable").textContent = String(all.filter(isReachable).length);
  $("stIndeterminate").textContent = String(all.filter(isIndeterminate).length);
  $("stMerged").textContent = String(all.filter((e) => e.state === "MERGED" || (e.receipt && e.receipt.state === "MERGED")).length);
  $("stSync").textContent = state.lastSync ? `${fmtTime(state.lastSync)} · ${state.source.toUpperCase()}` : "—";
}

function renderRegistry(filtered) {
  const body = $("registryBody");
  $("registryCount").textContent = `${filtered.length} EVENT(S) · ${state.source.toUpperCase()}`;
  if (!filtered.length) {
    body.innerHTML = `<tr><td colspan="8" class="empty">NO WORK EVENTS MATCH FILTERS. Clear filters or check the endpoint — an empty live registry and a filter miss look identical here by design; see source badge.</td></tr>`;
    return;
  }
  body.innerHTML = filtered.map((ev) => {
    const pin = ev.pin || {};
    const findings = (ev.findings || []).map((x) => `${x.kind}:${x.disposition}`).join(", ") || "—";
    const repairs = (ev.repairs || []).map((x) => x.id).join(", ") || "—";
    const flags = [
      isAwaiting(ev) ? `<span class="flag">AWAITING MAINTAINER</span>` : "",
      isReachable(ev) ? `<span class="flag flag-reach">REACHABLE</span>` : "",
      isIndeterminate(ev) ? `<span class="flag">INDETERMINATE — RECONCILE</span>` : "",
    ].join("");
    return `<tr data-weid="${esc(ev.id)}" data-state="${esc(ev.state)}" data-repo-id="${esc(ev.repoId)}" aria-selected="${state.selectedId === ev.id}" tabindex="0">
      <td><span class="cell-main">${esc(ev.id)}</span><span class="cell-sub">trace ${esc(ev.traceId || "—")} · idem ${esc(ev.idempotencyKey || "—")}</span></td>
      <td><span class="cell-main">${esc(repoLabel(ev.repoId, state.data.repositories))}</span><span class="cell-sub">${esc(ev.repoId)}</span></td>
      <td class="nowrap">${esc(ev.operation)}</td>
      <td>${stateBadge(ev.state)}${flags}</td>
      <td><span class="digest">${esc(shortSha(pin.sha))} · ${esc(pin.generation || "—")}</span><span class="cell-sub">policy ${esc(pin.policyHash || "—")} · proof <span class="digest">${esc(ev.proofDigest || "—")}</span></span></td>
      <td><span class="cell-sub"><strong>F</strong> ${esc(findings)}</span><span class="cell-sub"><strong>R</strong> ${esc(repairs)}</span></td>
      <td>${ev.receipt ? `${stateBadge(ev.receipt.state)}<span class="cell-sub">${esc(ev.receipt.reasonCode || "")}</span>` : `<span class="cell-sub">— pending —</span>`}</td>
      <td class="nowrap">${esc(fmtTime(ev.updatedAt || ev.createdAt))}</td></tr>`;
  }).join("");
}

function renderInterlocks(filtered) {
  const rows = [];
  for (const ev of filtered) for (const r of ev.repairs || []) rows.push({ ev, r });
  $("interlockCount").textContent = `${rows.length} REPAIR(S)`;
  const body = $("interlockBody");
  if (!rows.length) {
    body.innerHTML = `<tr><td colspan="6" class="empty">NO REPAIRS IN FILTERED VIEW. Interlocks appear when a Repair projects to a GitHub PR.</td></tr>`;
    return;
  }
  body.innerHTML = rows.map(({ ev, r }) => {
    const p = r.projection || {};
    const verdicts = (r.verdicts && r.verdicts.length) ? r.verdicts.map(esc).join(" + ") : "— pending fresh review —";
    const addresses = (ev.findings || []).map((x) => x.id).join(", ") || "—";
    const prCell = p.number
      ? `<a class="linklike" href="${esc(p.url || "#")}" target="_blank" rel="noopener noreferrer">${esc(p.host || "github")} PR #${esc(p.number)}</a><span class="cell-sub">${esc(p.url || "")}</span>`
      : `<span class="cell-sub">— no projection —</span>`;
    return `<tr data-weid="${esc(ev.id)}">
      <td><span class="cell-main">${esc(r.id)}</span><span class="cell-sub">${esc(r.title || "")}</span></td>
      <td>${esc(addresses)}<span class="cell-sub">${esc(ev.id)}</span></td>
      <td>${prCell}</td>
      <td><span class="digest">${esc(shortSha(r.headSha || p.headSha))} → ${esc(shortSha(r.baseSha || p.baseSha))}</span></td>
      <td>${stateBadge(r.state)}</td><td>${verdicts}</td></tr>`;
  }).join("");
}

function renderLanes(filtered) {
  const rows = [];
  for (const ev of filtered) for (const l of ev.laneRuns || []) rows.push({ ev, l });
  $("laneCount").textContent = `${rows.length} LANE RUN(S) · STATES ONLY`;
  const body = $("laneBody");
  if (!rows.length) {
    body.innerHTML = `<tr><td colspan="7" class="empty">NO LANE RUNS IN FILTERED VIEW. Queued work has no lanes yet — that absence is data, not an error.</td></tr>`;
    return;
  }
  body.innerHTML = rows.map(({ ev, l }) => `<tr data-weid="${esc(ev.id)}">
    <td><span class="cell-main">${esc(ev.traceId || ev.id)}</span><span class="cell-sub">${esc(ev.id)} · ${esc(repoLabel(ev.repoId, state.data.repositories))}</span></td>
    <td class="nowrap">${esc(l.kind)}</td>
    <td>${stateBadge(l.state)}</td>
    <td>${l.verdict ? esc(l.verdict) : `<span class="cell-sub">—</span>`}</td>
    <td><span class="digest">${esc((l.inputDigests || []).join(", ") || "—")}</span></td>
    <td><span class="digest">${esc(l.outputDigest || "—")}</span></td>
    <td><span class="digest">${esc(l.spanId || "—")}</span><span class="cell-sub">${esc(fmtTime(l.startedAt))} → ${esc(fmtTime(l.endedAt))}</span></td></tr>`).join("");
}

function renderLedger(filtered) {
  const rows = filtered.filter((e) => e.receipt).map((e) => ({ ev: e, rc: e.receipt }));
  $("ledgerCount").textContent = `${rows.length} RECEIPT(S) · VALUE-FREE`;
  const body = $("ledgerBody");
  if (!rows.length) {
    body.innerHTML = `<tr><td colspan="7" class="empty">NO RECEIPTS IN FILTERED VIEW. Running/queued work settles later; absence of a receipt is not success.</td></tr>`;
    return;
  }
  body.innerHTML = rows.map(({ ev, rc }) => `<tr data-weid="${esc(ev.id)}">
    <td><span class="cell-main">${esc(rc.id)}</span></td>
    <td>${esc(ev.id)}<span class="cell-sub">${esc(ev.operation)} · ${esc(repoLabel(ev.repoId, state.data.repositories))}</span></td>
    <td>${stateBadge(rc.state)}</td>
    <td>${esc(rc.reasonCode || "—")}</td>
    <td><span class="digest">${esc(rc.outcomeDigest || "—")}</span><span class="cell-sub">pin ${esc(shortSha(ev.pin && ev.pin.sha))} · ${esc((ev.pin && ev.pin.generation) || "—")}</span></td>
    <td><span class="digest">${esc(rc.mergeSha ? shortSha(rc.mergeSha) : "—")}</span>${rc.mergeSha ? `<span class="cell-sub">${esc(rc.mergeSha)}</span>` : ""}</td>
    <td class="nowrap">${esc(fmtTime(rc.createdAt))}</td></tr>`).join("");
}

function renderInspector() {
  const box = $("inspector");
  const ev = state.data.workEvents.find((e) => e.id === state.selectedId);
  $("inspectorHint").textContent = ev ? ev.id : "NO SELECTION";
  if (!ev) return;
  const pin = ev.pin || {};
  const findings = (ev.findings || []).map((f) =>
    `<li><strong>${esc(f.id)}</strong> [${esc(f.kind)} / ${esc(f.severity)} / ${esc(f.disposition)}] ${esc(f.title)}` +
    `<span class="cell-sub">${esc(f.filePath || "")}${f.line ? `:${esc(f.line)}` : ""} · evidence: ${esc(f.evidenceBasis || "—")} · verdict: ${esc(f.verdict || "—")}</span></li>`).join("") || "<li>— none —</li>";
  const advisories = (ev.advisories || []).map((a) =>
    `<li><strong>${esc(a.osvId)}</strong> ${esc(a.packageName)} aliases=${esc((a.aliases || []).join(", ") || "—")} ` +
    `${a.reachable ? `<span class="flag flag-reach">REACHABLE</span>` : `<span class="flag flag-ok">UNREACHABLE → NO_ACTION</span>`}` +
    `<span class="cell-sub">${esc((a.reachablePaths || []).join(" · ") || "no REACHES path (AFFECTS only)")}</span></li>`).join("") || "<li>— none —</li>";
  const lanes = (ev.laneRuns || []).map((l) =>
    `<li>${esc(l.kind)} ${stateBadge(l.state)} verdict=${esc(l.verdict || "—")} in=[${esc((l.inputDigests || []).join(", "))}] out=${esc(l.outputDigest || "—")} span=${esc(l.spanId || "—")}</li>`).join("") || "<li>— none —</li>";
  const indeterminate = isIndeterminate(ev)
    ? `<div class="notice-indeterminate"><strong>INDETERMINATE — RECONCILE REQUIRED.</strong> Timeout after possible side effect. Do not blind-retry or blind-merge. Reconcile via <span class="mono">reconcileIndeterminate(workEventId, observedMainSha, proof)</span> against current <span class="mono">main</span> (schema.md §7), then re-read this receipt.</div>` : "";
  box.innerHTML = `
    <dl class="kv">
      <dt>WORK EVENT</dt><dd>${esc(ev.id)} · ${esc(ev.operation)} · ${stateBadge(ev.state)}</dd>
      <dt>REPO</dt><dd>${esc(ev.repoId)}</dd>
      <dt>PIN</dt><dd>sha ${esc(pin.sha || "—")} · generation ${esc(pin.generation || "—")} · policyHash ${esc(pin.policyHash || "—")}</dd>
      <dt>PROOF / IDEMPOTENCY</dt><dd>proofDigest ${esc(ev.proofDigest || "—")} · key ${esc(ev.idempotencyKey || "—")} · trace ${esc(ev.traceId || "—")}</dd>
      <dt>RECEIPT</dt><dd>${ev.receipt ? `${esc(ev.receipt.id)} · ${esc(ev.receipt.state)} · ${esc(ev.receipt.reasonCode || "")} · outcome ${esc(ev.receipt.outcomeDigest || "")}${ev.receipt.mergeSha ? ` · mergeSha ${esc(ev.receipt.mergeSha)}` : ""}` : "— pending (running/queued work has no settlement yet) —"}</dd>
      <dt>SOURCE</dt><dd>${esc(state.source.toUpperCase())}${state.source === "demo" ? " — labeled fixture data, not live" : ""} · endpoint ${esc(state.endpoint)}</dd>
    </dl>
    ${indeterminate}
    <h3>FINDINGS (${(ev.findings || []).length})</h3><ul>${findings}</ul>
    <h3>ADVISORIES / REACHABILITY (${(ev.advisories || []).length})</h3><ul>${advisories}</ul>
    <h3>LANES — STATES ONLY (${(ev.laneRuns || []).length})</h3><ul>${lanes}</ul>
    <p>Read-only inspector. Dispatch (review / fix / respond / reconcile) is a GraphQL mutation consuming a current <span class="mono">ProofObject</span>; this static console never fabricates one. See README “Dispatch”.</p>`;
}

function renderAll() {
  const f = currentFilters();
  const filtered = applyFilters(sortedEvents(), f);
  renderStats(filtered);
  renderRegistry(filtered);
  renderInterlocks(filtered);
  renderLanes(filtered);
  renderLedger(filtered);
  renderInspector();
  const first = state.data.workEvents[0];
  const pin = (first && first.pin) || {};
  $("pinEcho").textContent = pin.sha ? `PIN ${shortSha(pin.sha)} · ${pin.generation || "—"} · ${pin.policyHash || "—"}` : "PIN —";
  $("queryInfo").textContent = `QUERY Registry(first:50, filter:${JSON.stringify(registryFilterInput(f))}) · schema v${CONFIG.schemaVersion} · ${state.source.toUpperCase()}`;
}

function populateRepoFilter() {
  const sel = $("fRepo");
  const keep = sel.value;
  sel.innerHTML = `<option value="">ALL REPOS</option>` + state.data.repositories.map((r) =>
    `<option value="${esc(r.id)}">${esc(r.owner)}/${esc(r.name)}</option>`).join("");
  if ([...sel.options].some((o) => o.value === keep)) sel.value = keep;
}

function setSource(source, errMsg) {
  state.source = source;
  state.lastSync = new Date().toISOString();
  const badge = $("sourceBadge");
  badge.textContent = source === "live" ? "LIVE · GRAPHQL" : "DEMO DATA";
  badge.className = `badge ${source === "live" ? "badge-live" : "badge-demo"}`;
  badge.dataset.source = source;
  $("demoBanner").hidden = source === "live";
  $("connStatus").textContent = source === "live"
    ? `LIVE · ${state.endpoint}` : `DEMO FALLBACK · endpoint unreachable`;
  const eb = $("errorBanner");
  if (errMsg && source !== "live") {
    eb.hidden = false;
    eb.textContent = `GraphQL unavailable (${errMsg}). Showing DEMO DATA below. Fix the endpoint and REFRESH — the demo banner stays until a live registry query succeeds.`;
  } else if (errMsg) {
    eb.hidden = false; eb.textContent = errMsg;
  } else { eb.hidden = true; eb.textContent = ""; }
}

async function refresh() {
  const endpoint = $("endpointInput").value.trim() || CONFIG.defaultEndpoint;
  state.endpoint = endpoint;
  try { localStorage.setItem(CONFIG.storageKey, endpoint); } catch (_) { /* ignore */ }
  $("connStatus").textContent = `QUERYING ${endpoint} …`;
  try {
    const data = await fetchGraphQL(endpoint, { first: 50, filter: registryFilterInput(currentFilters()) });
    const normalized = normalizeLive(data);
    if (!normalized.workEvents.length && !normalized.repositories.length) throw new Error("empty registry payload");
    state.data = normalized;
    state.lastError = null;
    setSource("live", null);
  } catch (err) {
    state.lastError = String(err && err.message ? err.message : err);
    state.data = DEMO_DATA;
    setSource("demo", state.lastError);
  }
  populateRepoFilter();
  renderAll();
}

function exportJSON() {
  const f = currentFilters();
  const payload = {
    exportedAt: new Date().toISOString(), source: state.source, endpoint: state.endpoint,
    schemaVersion: CONFIG.schemaVersion, filters: f,
    registryFilterInput: registryFilterInput(f),
    data: { repositories: state.data.repositories, workEvents: applyFilters(sortedEvents(), f) },
    note: state.source === "demo" ? "DEMO DATA — labeled fixture data, not live." : "Live GraphQL snapshot.",
  };
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = `rev-registry-${state.source}-${new Date().toISOString().slice(0, 19).replace(/[:T]/g, "-")}.json`;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}

function bindEvents() {
  $("filterForm").addEventListener("submit", (e) => e.preventDefault());
  for (const id of ["fSearch", "fRepo", "fOperation", "fState", "fKind", "fAwaiting", "fReachable", "fIndeterminate"]) {
    $(id).addEventListener("input", renderAll);
    $(id).addEventListener("change", renderAll);
  }
  $("btnClearFilters").addEventListener("click", () => {
    $("fSearch").value = ""; $("fRepo").value = ""; $("fOperation").value = "";
    $("fState").value = ""; $("fKind").value = "";
    $("fAwaiting").checked = false; $("fReachable").checked = false; $("fIndeterminate").checked = false;
    renderAll();
  });
  $("btnRefresh").addEventListener("click", refresh);
  $("btnExport").addEventListener("click", exportJSON);
  $("endpointInput").addEventListener("change", refresh);
  $("fAuto").addEventListener("change", (e) => {
    if (state.autoTimer) { clearInterval(state.autoTimer); state.autoTimer = null; }
    if (e.target.checked) state.autoTimer = setInterval(refresh, 15000);
  });
  document.addEventListener("click", (e) => {
    const tr = e.target.closest("tr[data-weid]");
    if (!tr) return;
    state.selectedId = tr.dataset.weid;
    renderAll();
    document.getElementById("inspector").scrollIntoView({ block: "nearest" });
  });
  document.addEventListener("keydown", (e) => {
    if (e.key === "/" && !/INPUT|SELECT|TEXTAREA/.test(document.activeElement.tagName)) {
      e.preventDefault(); $("fSearch").focus();
    }
    if ((e.key === "r" || e.key === "R") && !/INPUT|SELECT|TEXTAREA/.test(document.activeElement.tagName)) refresh();
    if (e.key === "Enter" && document.activeElement && document.activeElement.matches("tr[data-weid]")) {
      state.selectedId = document.activeElement.dataset.weid; renderAll();
    }
  });
}

/* Agent-native surface: machines read the same state humans see. No hidden data. */
window.__REV_REGISTRY__ = {
  version: CONFIG.schemaVersion, queries: { registry: REGISTRY_QUERY, triage: TRIAGE_QUERY },
  getState: () => ({ source: state.source, endpoint: state.endpoint, lastError: state.lastError, lastSync: state.lastSync }),
  getData: () => state.data,
  getFiltered: () => applyFilters(sortedEvents(), currentFilters()),
  predicates: { isAwaiting, isReachable, isIndeterminate },
  refresh,
};

document.addEventListener("DOMContentLoaded", () => {
  $("endpointInput").value = state.endpoint;
  bindEvents();
  refresh();
});




