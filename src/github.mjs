// GitHub live loop: App auth -> diff/files -> review -> fix PR -> merge verify.
// All network goes through an injectable `fetchFn` (defaults to global fetch)
// so tests run with a fake fetch and never touch the network.
// Dry-run is the default for every write (review + fix PR), mirroring the
// projector: nothing posts without an explicit `dryRun: false`.
// Receipts/steps are value-free: no tokens, no file contents, only
// step names, methods, paths, HTTP statuses and SHAs.
import { createSign } from "node:crypto";
import { postReview as projectorPostReview } from "./projector.mjs";
import { refusal } from "./types.mjs";

export const GITHUB_API_BASE = "https://api.github.com";
const API_VERSION = "2022-11-28";

// ---------------------------------------------------------------- helpers
function b64url(input) {
  return Buffer.from(input).toString("base64url");
}

function resolveFetch(fetchFn) {
  const fn = fetchFn ?? globalThis.fetch;
  if (typeof fn !== "function") throw new TypeError("github: no fetchFn provided and global fetch unavailable");
  return fn;
}

function apiHeaders(token, extra = {}) {
  const h = {
    accept: "application/vnd.github+json",
    "x-github-api-version": API_VERSION,
    "user-agent": "rev-github",
    ...extra,
  };
  if (token) h.authorization = `Bearer ${token}`;
  return h;
}

function httpRefusal(code, res) {
  return refusal(code, `HTTP ${res.status}`, res.status >= 500 || res.status === 429);
}

async function callFetch(fetchFn, url, init) {
  const fn = resolveFetch(fetchFn);
  try {
    return { res: await fn(url, init) };
  } catch (err) {
    return { refusal: refusal("GITHUB_NETWORK_ERROR", String(err?.message || err).slice(0, 200), true) };
  }
}

async function readJson(res) {
  try { return await res.json(); } catch { return {}; }
}

function requireStr(value, name) {
  if (typeof value !== "string" || !value) throw new TypeError(`github: ${name} is required`);
  return value;
}

function checkCoords(owner, repo) {
  requireStr(owner, "owner");
  requireStr(repo, "repo");
}

// ------------------------------------------------------------- App JWT
// GitHub App JWT: RS256, iss=appId, iat backdated 60s, exp <= 10 min out.
// `privateKeyPem` is a PEM string param (never read from disk/env here).
// `now` accepts a Date, epoch seconds, or epoch milliseconds (tests pin it).
export function createAppJWT({ appId, privateKeyPem, privateKey, pem, now, ttlSeconds, expiresInSeconds } = {}) {
  const key = privateKeyPem ?? privateKey ?? pem;
  if (appId === undefined || appId === null || String(appId) === "") throw new TypeError("github: appId is required");
  if (typeof key !== "string" || !key.includes("PRIVATE KEY")) throw new TypeError("github: privateKeyPem (PEM string) is required");

  let nowSec;
  if (now instanceof Date) nowSec = Math.floor(now.getTime() / 1000);
  else if (typeof now === "number" && Number.isFinite(now)) nowSec = Math.floor(now > 1e12 ? now / 1000 : now);
  else nowSec = Math.floor(Date.now() / 1000);

  const ttl = Math.min(Math.max(Number(ttlSeconds ?? expiresInSeconds ?? 600) || 600, 1), 600);
  const iat = nowSec - 60;
  const exp = iat + ttl;

  const header = b64url(JSON.stringify({ alg: "RS256", typ: "JWT" }));
  const payload = b64url(JSON.stringify({ iat, exp, iss: String(appId) }));
  const signingInput = `${header}.${payload}`;
  const signer = createSign("RSA-SHA256");
  signer.update(signingInput);
  signer.end();
  const signature = signer.sign(key).toString("base64url");
  return `${signingInput}.${signature}`;
}
export const createAppJwt = createAppJWT;
export const makeAppJWT = createAppJWT;

// ------------------------------------------- Installation token exchange
// POST /app/installations/{id}/access_tokens with the App JWT as Bearer.
// Accepts a pre-made `jwt`, or mints one from {appId, privateKeyPem}.
export async function createInstallationToken({
  installationId, jwt, appId, privateKeyPem, privateKey, pem, now,
  fetchFn, baseUrl = GITHUB_API_BASE, token: _ignored,
} = {}) {
  if (installationId === undefined || installationId === null || String(installationId) === "") {
    throw new TypeError("github: installationId is required");
  }
  const appJwt = jwt ?? createAppJWT({ appId, privateKeyPem: privateKeyPem ?? privateKey ?? pem, now });
  const url = `${baseUrl}/app/installations/${installationId}/access_tokens`;
  const { res, refusal: netRefusal } = await callFetch(fetchFn, url, {
    method: "POST",
    headers: apiHeaders(appJwt, { "content-type": "application/json" }),
    body: "{}",
  });
  if (netRefusal) return netRefusal;
  if (!res.ok) return httpRefusal("GITHUB_AUTH_FAILED", res);
  const data = await readJson(res);
  return {
    token: data.token,
    expiresAt: data.expires_at ?? null,
    permissions: data.permissions ?? null,
    repositorySelection: data.repository_selection ?? null,
  };
}
export const getInstallationToken = createInstallationToken;
export const exchangeInstallationToken = createInstallationToken;

// ------------------------------------------------------------ PR reads
export async function fetchPullRequestDiff({ owner, repo, prNumber, token, fetchFn, baseUrl = GITHUB_API_BASE } = {}) {
  checkCoords(owner, repo);
  if (prNumber === undefined || prNumber === null) throw new TypeError("github: prNumber is required");
  const url = `${baseUrl}/repos/${owner}/${repo}/pulls/${prNumber}`;
  const { res, refusal: netRefusal } = await callFetch(fetchFn, url, {
    method: "GET",
    headers: apiHeaders(token, { accept: "application/vnd.github.diff" }),
  });
  if (netRefusal) return netRefusal;
  if (!res.ok) return httpRefusal("GITHUB_FETCH_FAILED", res);
  const diff = typeof res.text === "function" ? await res.text() : "";
  return { diff, bytes: diff.length, owner, repo, prNumber };
}
export const fetchPrDiff = fetchPullRequestDiff;
export const getPullRequestDiff = fetchPullRequestDiff;

export async function fetchPullRequestFiles({ owner, repo, prNumber, token, fetchFn, baseUrl = GITHUB_API_BASE, perPage = 100 } = {}) {
  checkCoords(owner, repo);
  if (prNumber === undefined || prNumber === null) throw new TypeError("github: prNumber is required");
  const url = `${baseUrl}/repos/${owner}/${repo}/pulls/${prNumber}/files?per_page=${perPage}`;
  const { res, refusal: netRefusal } = await callFetch(fetchFn, url, {
    method: "GET",
    headers: apiHeaders(token),
  });
  if (netRefusal) return netRefusal;
  if (!res.ok) return httpRefusal("GITHUB_FETCH_FAILED", res);
  const data = await readJson(res);
  const files = Array.isArray(data) ? data : [];
  return { files, count: files.length, owner, repo, prNumber };
}
export const fetchPrFiles = fetchPullRequestFiles;
export const getPullRequestFiles = fetchPullRequestFiles;

// Metadata + diff + files in one call; first refusal wins.
export async function fetchPullRequest({ owner, repo, prNumber, token, fetchFn, baseUrl = GITHUB_API_BASE } = {}) {
  checkCoords(owner, repo);
  if (prNumber === undefined || prNumber === null) throw new TypeError("github: prNumber is required");
  const url = `${baseUrl}/repos/${owner}/${repo}/pulls/${prNumber}`;
  const { res, refusal: netRefusal } = await callFetch(fetchFn, url, {
    method: "GET",
    headers: apiHeaders(token),
  });
  if (netRefusal) return netRefusal;
  if (!res.ok) return httpRefusal("GITHUB_FETCH_FAILED", res);
  const pullRequest = await readJson(res);
  const diffOut = await fetchPullRequestDiff({ owner, repo, prNumber, token, fetchFn, baseUrl });
  if (diffOut?.refusal) return diffOut;
  const filesOut = await fetchPullRequestFiles({ owner, repo, prNumber, token, fetchFn, baseUrl });
  if (filesOut?.refusal) return filesOut;
  return { pullRequest, diff: diffOut.diff, files: filesOut.files, owner, repo, prNumber };
}
export const fetchPr = fetchPullRequest;

// ------------------------------------------------------------- Post review
// Reuses projector semantics: dry-run unless explicitly live.
// - dryRun !== false  -> delegates to projector (same {posted:false,
//   dryRun:true, wouldPost:{owner,repo,prNumber,event,bytes}} shape, and the
//   projector's REV_LIVE_POST/GITHUB_TOKEN env gate is preserved when the
//   caller passes dryRun:false without a fetchFn/token).
// - dryRun === false with a fetchFn or token -> POST via fetchFn so tests
//   and callers control the transport. Token comes from `token` param or
//   GITHUB_TOKEN env; it is never echoed back.
export async function postReview({
  owner, repo, prNumber, body, event = "COMMENT", token, fetchFn, dryRun, baseUrl = GITHUB_API_BASE,
} = {}) {
  checkCoords(owner, repo);
  if (prNumber === undefined || prNumber === null) throw new TypeError("github: prNumber is required");
  if (typeof body !== "string") throw new TypeError("github: body is required");

  if (dryRun !== false) {
    return projectorPostReview({ owner, repo, prNumber, body, event, dryRun });
  }
  // Live path.
  const bearer = token ?? process.env.GITHUB_TOKEN;
  if (!fetchFn && !bearer) {
    // No injectable transport and no token: let the projector refuse/report.
    return projectorPostReview({ owner, repo, prNumber, body, event, dryRun });
  }
  if (!bearer) return refusal("GITHUB_POST_FAILED", "No token for live review post", false);
  const url = `${baseUrl}/repos/${owner}/${repo}/pulls/${prNumber}/reviews`;
  const { res, refusal: netRefusal } = await callFetch(fetchFn, url, {
    method: "POST",
    headers: apiHeaders(bearer, { "content-type": "application/json" }),
    body: JSON.stringify({ body, event }),
  });
  if (netRefusal) return { posted: false, refusal: netRefusal.refusal };
  if (!res.ok) return { posted: false, refusal: { reasonCode: "GITHUB_POST_FAILED", message: `HTTP ${res.status}`, retryable: res.status >= 500 } };
  const data = await readJson(res);
  return { posted: true, id: data.id, url: data.html_url };
}
export const postPullRequestReview = postReview;
export const createReview = postReview;

// ------------------------------------------------------------- Fix PR
// Creating a fix PR via the Git Data API is a multi-step dance:
//   get-base-ref -> create-branch (git/refs) -> get-base-commit/tree ->
//   create-blob(s) -> create-tree -> create-commit -> update-branch ->
//   create-pr (pulls)
// Dry-run (default) performs zero network calls and returns the planned
// steps as receipts. Live mode runs them in order, appending one
// value-free receipt per step and stopping at the first failure.
// `files`: [{ path, content }] with utf8 string content.
export async function createFixPr({
  owner, repo, branch, baseBranch = "main", title, body = "",
  files = [], token, fetchFn, dryRun = true, baseUrl = GITHUB_API_BASE,
} = {}) {
  checkCoords(owner, repo);
  requireStr(branch, "branch");
  requireStr(title, "title");
  if (!Array.isArray(files) || files.length === 0) throw new TypeError("github: files (non-empty [{path, content}]) is required");
  for (const f of files) {
    if (!f?.path || typeof f.content !== "string") throw new TypeError("github: each file needs {path, content:string}");
  }

  const planned = [
    { step: "get-base-ref", method: "GET", path: `/repos/${owner}/${repo}/git/ref/heads/${baseBranch}` },
    { step: "create-branch", method: "POST", path: `/repos/${owner}/${repo}/git/refs` },
    { step: "get-base-commit", method: "GET", path: `/repos/${owner}/${repo}/git/commits/{baseSha}` },
    { step: "create-blob", method: "POST", path: `/repos/${owner}/${repo}/git/blobs`, count: files.length },
    { step: "create-tree", method: "POST", path: `/repos/${owner}/${repo}/git/trees` },
    { step: "create-commit", method: "POST", path: `/repos/${owner}/${repo}/git/commits` },
    { step: "update-branch", method: "PATCH", path: `/repos/${owner}/${repo}/git/refs/heads/${branch}` },
    { step: "create-pr", method: "POST", path: `/repos/${owner}/${repo}/pulls` },
  ];

  if (dryRun !== false) {
    return {
      created: false, dryRun: true, owner, repo, branch, baseBranch,
      wouldCreate: { owner, repo, branch, baseBranch, title, files: files.map((f) => f.path) },
      steps: planned.map((s) => ({ ...s, status: "planned" })),
    };
  }

  const bearer = token ?? process.env.GITHUB_TOKEN;
  if (!bearer) return { created: false, dryRun: false, steps: [], refusal: refusal("GITHUB_AUTH_REQUIRED", "No token for live fix PR", false).refusal };

  const steps = [];
  const run = async (step, url, init) => {
    const { res, refusal: netRefusal } = await callFetch(fetchFn, url, init);
    if (netRefusal) { steps.push({ step, status: "failed", method: init.method, path: new URL(url).pathname }); return { failure: netRefusal }; }
    if (!res.ok) {
      steps.push({ step, status: "failed", method: init.method, path: new URL(url).pathname, httpStatus: res.status });
      return { failure: httpRefusal("GITHUB_FIX_PR_FAILED", res) };
    }
    steps.push({ step, status: "ok", method: init.method, path: new URL(url).pathname, httpStatus: res.status });
    return { data: await readJson(res) };
  };
  const fail = (failure) => ({ created: false, dryRun: false, owner, repo, branch, baseBranch, steps, refusal: failure.refusal });
  const jsonInit = (method, payload) => ({
    method, headers: apiHeaders(bearer, { "content-type": "application/json" }), body: JSON.stringify(payload),
  });
  const B = baseUrl;

  let out = await run("get-base-ref", `${B}/repos/${owner}/${repo}/git/ref/heads/${baseBranch}`, { method: "GET", headers: apiHeaders(bearer) });
  if (out.failure) return fail(out.failure);
  const baseSha = out.data?.object?.sha;
  if (!baseSha) return fail(refusal("GITHUB_FIX_PR_FAILED", "Base ref returned no sha", false));

  out = await run("create-branch", `${B}/repos/${owner}/${repo}/git/refs`, jsonInit("POST", { ref: `refs/heads/${branch}`, sha: baseSha }));
  if (out.failure) return fail(out.failure);

  out = await run("get-base-commit", `${B}/repos/${owner}/${repo}/git/commits/${baseSha}`, { method: "GET", headers: apiHeaders(bearer) });
  if (out.failure) return fail(out.failure);
  const baseTreeSha = out.data?.tree?.sha;
  if (!baseTreeSha) return fail(refusal("GITHUB_FIX_PR_FAILED", "Base commit returned no tree sha", false));

  const blobShas = [];
  for (const f of files) {
    // One receipt per blob is noisy; aggregate under a single step entry.
    const { res, refusal: netRefusal } = await callFetch(fetchFn, `${B}/repos/${owner}/${repo}/git/blobs`, jsonInit("POST", {
      content: Buffer.from(f.content, "utf8").toString("base64"), encoding: "base64",
    }));
    if (netRefusal) { steps.push({ step: "create-blob", status: "failed", method: "POST", path: `/repos/${owner}/${repo}/git/blobs` }); return fail(netRefusal); }
    if (!res.ok) { steps.push({ step: "create-blob", status: "failed", method: "POST", path: `/repos/${owner}/${repo}/git/blobs`, httpStatus: res.status }); return fail(httpRefusal("GITHUB_FIX_PR_FAILED", res)); }
    blobShas.push((await readJson(res)).sha);
  }
  steps.push({ step: "create-blob", status: "ok", method: "POST", path: `/repos/${owner}/${repo}/git/blobs`, count: files.length });

  out = await run("create-tree", `${B}/repos/${owner}/${repo}/git/trees`, jsonInit("POST", {
    base_tree: baseTreeSha,
    tree: files.map((f, i) => ({ path: f.path, mode: "100644", type: "blob", sha: blobShas[i] })),
  }));
  if (out.failure) return fail(out.failure);
  const treeSha = out.data?.sha;

  out = await run("create-commit", `${B}/repos/${owner}/${repo}/git/commits`, jsonInit("POST", {
    message: title, tree: treeSha, parents: [baseSha],
  }));
  if (out.failure) return fail(out.failure);
  const commitSha = out.data?.sha;

  out = await run("update-branch", `${B}/repos/${owner}/${repo}/git/refs/heads/${branch}`, jsonInit("PATCH", { sha: commitSha, force: false }));
  if (out.failure) return fail(out.failure);

  out = await run("create-pr", `${B}/repos/${owner}/${repo}/pulls`, jsonInit("POST", {
    title, head: branch, base: baseBranch, body,
  }));
  if (out.failure) return fail(out.failure);

  return {
    created: true, dryRun: false, owner, repo, branch, baseBranch,
    prNumber: out.data?.number ?? null, url: out.data?.html_url ?? null,
    commitSha, treeSha, steps,
  };
}
export const createFixPR = createFixPr;
export const createFixPullRequest = createFixPr;

// ------------------------------------------------------------ Merge verify
// GET the PR; if merged, stub-check that merge_commit_sha is an ancestor
// of the base branch via the Compare API: GET /compare/{merge}...{base}
// reports status "ahead" (base contains merge sha) or "identical".
// "behind"/"diverged" mean the sha is not an ancestor of the base head.
export async function verifyMerge({ owner, repo, prNumber, token, fetchFn, baseUrl = GITHUB_API_BASE, baseBranch } = {}) {
  checkCoords(owner, repo);
  if (prNumber === undefined || prNumber === null) throw new TypeError("github: prNumber is required");
  const { res, refusal: netRefusal } = await callFetch(fetchFn, `${baseUrl}/repos/${owner}/${repo}/pulls/${prNumber}`, {
    method: "GET", headers: apiHeaders(token),
  });
  if (netRefusal) return netRefusal;
  if (!res.ok) return httpRefusal("GITHUB_FETCH_FAILED", res);
  const pr = await readJson(res);
  const mergeCommitSha = pr.merge_commit_sha ?? null;
  const merged = pr.merged === true;

  if (!merged) {
    return { merged: false, verified: false, isAncestor: false, mergeCommitSha, state: pr.state ?? null, prNumber };
  }
  if (!mergeCommitSha) {
    return { merged: true, verified: false, isAncestor: false, mergeCommitSha: null, state: pr.state ?? null, prNumber, note: "PR merged but no merge_commit_sha" };
  }

  const headRef = baseBranch ?? pr.base?.ref ?? "main";
  const cmp = await callFetch(fetchFn, `${baseUrl}/repos/${owner}/${repo}/compare/${mergeCommitSha}...${headRef}`, {
    method: "GET", headers: apiHeaders(token),
  });
  if (cmp.refusal) return { merged: true, verified: false, isAncestor: false, mergeCommitSha, prNumber, refusal: cmp.refusal.refusal };
  if (!cmp.res.ok) {
    return { merged: true, verified: false, isAncestor: false, mergeCommitSha, prNumber, compareStatus: null, httpStatus: cmp.res.status };
  }
  const data = await readJson(cmp.res);
  const isAncestor = data.status === "ahead" || data.status === "identical";
  return {
    merged: true, verified: isAncestor, isAncestor, mergeCommitSha, prNumber,
    compareStatus: data.status ?? null, aheadBy: data.ahead_by ?? null, behindBy: data.behind_by ?? null,
    baseBranch: headRef,
  };
}
export const verifyPullRequestMerged = verifyMerge;
export const checkMerged = verifyMerge;

// ------------------------------------------------------------ Client factory
// Binds {token|app credentials, fetchFn, baseUrl} once. Installation tokens
// are fetched lazily via `installationToken()` and cached until expiry-ish
// (no timer: callers re-invoke; the cached value is reused as-is).
export function createGitHubClient({ token, appId, privateKeyPem, installationId, fetchFn, baseUrl = GITHUB_API_BASE, dryRun = true } = {}) {
  let cachedInstallationToken = token ?? null;
  return {
    baseUrl, dryRun,
    createAppJWT: (opts = {}) => createAppJWT({ appId, privateKeyPem, ...opts }),
    async installationToken() {
      if (cachedInstallationToken) return { token: cachedInstallationToken };
      const out = await createInstallationToken({ appId, privateKeyPem, installationId, fetchFn, baseUrl });
      if (out?.token) cachedInstallationToken = out.token;
      return out;
    },
    fetchPullRequestDiff: (a) => fetchPullRequestDiff({ token: cachedInstallationToken, fetchFn, baseUrl, ...a }),
    fetchPullRequestFiles: (a) => fetchPullRequestFiles({ token: cachedInstallationToken, fetchFn, baseUrl, ...a }),
    fetchPullRequest: (a) => fetchPullRequest({ token: cachedInstallationToken, fetchFn, baseUrl, ...a }),
    postReview: (a) => postReview({ token: cachedInstallationToken, fetchFn, baseUrl, dryRun, ...a }),
    createFixPr: (a) => createFixPr({ token: cachedInstallationToken, fetchFn, baseUrl, dryRun, ...a }),
    verifyMerge: (a) => verifyMerge({ token: cachedInstallationToken, fetchFn, baseUrl, ...a }),
  };
}
export const createClient = createGitHubClient;

export default createGitHubClient;
