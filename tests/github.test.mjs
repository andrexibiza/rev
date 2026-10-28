import { test } from "node:test";
import assert from "node:assert/strict";
import { generateKeyPairSync, createVerify } from "node:crypto";
import {
  createAppJWT, createInstallationToken,
  fetchPullRequestDiff, fetchPullRequestFiles, fetchPullRequest,
  postReview, createFixPr, verifyMerge, createGitHubClient,
} from "../src/github.mjs";

const { privateKey, publicKey } = generateKeyPairSync("rsa", { modulusLength: 2048 });
const pem = privateKey.export({ type: "pkcs8", format: "pem" });
const pubPem = publicKey.export({ type: "spki", format: "pem" });

function jsonRes(body, status = 200) {
  return { ok: status >= 200 && status < 300, status, json: async () => body, text: async () => JSON.stringify(body) };
}
function makeFakeFetch(handler) {
  const calls = [];
  const fetchFn = async (url, init = {}) => { calls.push({ url, init }); return handler(url, init); };
  return { fetchFn, calls };
}

// --- JWT shape: 3 parts, RS256 header, iss/iat/exp, verifiable signature
test("createAppJWT: 3-part RS256 JWT, verifiable, GitHub claims", () => {
  const jwt = createAppJWT({ appId: 12345, privateKeyPem: pem, now: 1_700_000_000 });
  const parts = jwt.split(".");
  assert.equal(parts.length, 3);
  const header = JSON.parse(Buffer.from(parts[0], "base64url").toString());
  const payload = JSON.parse(Buffer.from(parts[1], "base64url").toString());
  assert.equal(header.alg, "RS256");
  assert.equal(header.typ, "JWT");
  assert.equal(payload.iss, "12345");
  assert.equal(payload.iat, 1_700_000_000 - 60);
  assert.equal(payload.exp - payload.iat, 600);
  const v = createVerify("RSA-SHA256");
  v.update(`${parts[0]}.${parts[1]}`);
  assert.equal(v.verify(pubPem, Buffer.from(parts[2], "base64url")), true);
});

test("createAppJWT: rejects missing appId / non-PEM key", () => {
  assert.throws(() => createAppJWT({ privateKeyPem: pem }), TypeError);
  assert.throws(() => createAppJWT({ appId: 1, privateKeyPem: "not-a-key" }), TypeError);
});

// --- Installation token exchange via fake fetch
test("createInstallationToken: POSTs JWT to access_tokens endpoint", async () => {
  const { fetchFn, calls } = makeFakeFetch(async () => jsonRes({ token: "ghs_test_token", expires_at: "2030-01-01T00:00:00Z" }));
  const out = await createInstallationToken({ appId: 99, privateKeyPem: pem, installationId: 777, fetchFn, now: 1_700_000_000 });
  assert.equal(out.token, "ghs_test_token");
  assert.equal(calls.length, 1);
  assert.equal(calls[0].url, "https://api.github.com/app/installations/777/access_tokens");
  assert.equal(calls[0].init.method, "POST");
  assert.equal(calls[0].init.headers.authorization.split(".").length, 3); // Bearer <jwt>
  assert.ok(calls[0].init.headers.authorization.startsWith("Bearer "));
});

// --- Diff + files fetch
test("fetchPullRequestDiff: GETs PR with diff Accept, returns text", async () => {
  const diffText = "diff --git a/a.mjs b/a.mjs\n+hello\n";
  const { fetchFn, calls } = makeFakeFetch(async () => ({ ok: true, status: 200, text: async () => diffText, json: async () => { throw new Error("not json"); } }));
  const out = await fetchPullRequestDiff({ owner: "o", repo: "r", prNumber: 42, token: "t0ken", fetchFn });
  assert.equal(out.diff, diffText);
  assert.equal(calls[0].url, "https://api.github.com/repos/o/r/pulls/42");
  assert.equal(calls[0].init.headers.accept, "application/vnd.github.diff");
  assert.equal(calls[0].init.headers.authorization, "Bearer t0ken");
});

test("fetchPullRequestFiles: returns parsed files array", async () => {
  const files = [{ filename: "a.mjs", status: "modified", additions: 1, deletions: 0 }];
  const { fetchFn } = makeFakeFetch(async () => jsonRes(files));
  const out = await fetchPullRequestFiles({ owner: "o", repo: "r", prNumber: 42, token: "t", fetchFn });
  assert.equal(out.count, 1);
  assert.equal(out.files[0].filename, "a.mjs");
});

test("fetchPullRequestDiff: HTTP error is a typed refusal, no throw", async () => {
  const { fetchFn } = makeFakeFetch(async () => jsonRes({ message: "Not Found" }, 404));
  const out = await fetchPullRequestDiff({ owner: "o", repo: "r", prNumber: 1, fetchFn });
  assert.equal(out.refusal.reasonCode, "GITHUB_FETCH_FAILED");
  assert.equal(out.refusal.retryable, false);
});

// --- Post review: projector dry-run semantics by default, live via fetchFn
test("postReview: dry-run by default, never calls fetch", async () => {
  const { fetchFn, calls } = makeFakeFetch(async () => jsonRes({ id: 1 }));
  const out = await postReview({ owner: "o", repo: "r", prNumber: 3, body: "hello", fetchFn });
  assert.equal(out.posted, false);
  assert.equal(out.dryRun, true);
  assert.equal(out.wouldPost.bytes, 5);
  assert.equal(calls.length, 0);
});

test("postReview: dryRun:false POSTs review via fetchFn", async () => {
  const { fetchFn, calls } = makeFakeFetch(async () => jsonRes({ id: 555, html_url: "https://github.com/o/r/pull/3#pullrequestreview-555" }));
  const out = await postReview({ owner: "o", repo: "r", prNumber: 3, body: "LGTM", event: "APPROVE", token: "tok", fetchFn, dryRun: false });
  assert.equal(out.posted, true);
  assert.equal(out.id, 555);
  assert.equal(calls[0].url, "https://api.github.com/repos/o/r/pulls/3/reviews");
  assert.equal(JSON.parse(calls[0].init.body).event, "APPROVE");
});

// --- Fix PR: dry-run plans steps with zero network; live walks Git Data API
test("createFixPr: dry-run default returns planned step receipts, no fetch", async () => {
  const { fetchFn, calls } = makeFakeFetch(async () => jsonRes({}));
  const out = await createFixPr({
    owner: "o", repo: "r", branch: "rev/fix-1", title: "fix: cap",
    files: [{ path: "a.mjs", content: "export const x = 1;\n" }], fetchFn,
  });
  assert.equal(out.created, false);
  assert.equal(out.dryRun, true);
  assert.equal(calls.length, 0);
  assert.ok(out.steps.length >= 6);
  assert.ok(out.steps.every((s) => s.status === "planned"));
  assert.deepEqual(out.wouldCreate.files, ["a.mjs"]);
  // receipts are value-free: no file content leaks
  assert.ok(!JSON.stringify(out).includes("export const x"));
});

test("createFixPr: live mode creates branch/tree/commit/PR in order", async () => {
  const { fetchFn, calls } = makeFakeFetch(async (url) => {
    if (url.includes("/git/ref/heads/main")) return jsonRes({ object: { sha: "base111" } });
    if (url.endsWith("/git/refs")) return jsonRes({ ref: "refs/heads/rev/fix-1" }, 201);
    if (url.includes("/git/commits/base111")) return jsonRes({ tree: { sha: "tree000" } });
    if (url.endsWith("/git/blobs")) return jsonRes({ sha: "blob111" }, 201);
    if (url.endsWith("/git/trees")) return jsonRes({ sha: "tree222" }, 201);
    if (url.endsWith("/git/commits")) return jsonRes({ sha: "commit999" }, 201);
    if (url.includes("/git/refs/heads/rev/fix-1")) return jsonRes({ object: { sha: "commit999" } });
    if (url.endsWith("/pulls")) return jsonRes({ number: 9, html_url: "https://github.com/o/r/pull/9" }, 201);
    return jsonRes({}, 404);
  });
  const out = await createFixPr({
    owner: "o", repo: "r", branch: "rev/fix-1", title: "fix: cap",
    files: [{ path: "a.mjs", content: "x" }], token: "tok", fetchFn, dryRun: false,
  });
  assert.equal(out.created, true);
  assert.equal(out.prNumber, 9);
  assert.equal(out.commitSha, "commit999");
  assert.ok(out.steps.every((s) => s.status === "ok"));
  assert.ok(calls.length >= 8);
});

// --- Merge verification: GET PR + compare-API ancestor stub
test("verifyMerge: merged PR + compare ahead => verified ancestor", async () => {
  const { fetchFn, calls } = makeFakeFetch(async (url) => {
    if (url.includes("/compare/")) return jsonRes({ status: "ahead", ahead_by: 3, behind_by: 0 });
    return jsonRes({ merged: true, merge_commit_sha: "mergeabc", state: "closed", base: { ref: "main" } });
  });
  const out = await verifyMerge({ owner: "o", repo: "r", prNumber: 7, token: "t", fetchFn });
  assert.equal(out.merged, true);
  assert.equal(out.verified, true);
  assert.equal(out.isAncestor, true);
  assert.equal(out.mergeCommitSha, "mergeabc");
  assert.ok(calls.some((c) => c.url === "https://api.github.com/repos/o/r/compare/mergeabc...main"));
});

test("verifyMerge: unmerged PR short-circuits without compare call", async () => {
  const { fetchFn, calls } = makeFakeFetch(async () => jsonRes({ merged: false, merge_commit_sha: null, state: "open" }));
  const out = await verifyMerge({ owner: "o", repo: "r", prNumber: 8, fetchFn });
  assert.equal(out.merged, false);
  assert.equal(out.verified, false);
  assert.equal(calls.length, 1);
});

test("verifyMerge: merged but diverged compare => not verified", async () => {
  const { fetchFn } = makeFakeFetch(async (url) => {
    if (url.includes("/compare/")) return jsonRes({ status: "diverged", ahead_by: 1, behind_by: 2 });
    return jsonRes({ merged: true, merge_commit_sha: "m1", state: "closed", base: { ref: "main" } });
  });
  const out = await verifyMerge({ owner: "o", repo: "r", prNumber: 9, fetchFn });
  assert.equal(out.merged, true);
  assert.equal(out.verified, false);
});

// --- Client factory binds fetchFn/token
test("createGitHubClient: bound diff fetch uses injected transport", async () => {
  const { fetchFn, calls } = makeFakeFetch(async () => ({ ok: true, status: 200, text: async () => "diff!", json: async () => ({}) }));
  const client = createGitHubClient({ token: "tok", fetchFn });
  const out = await client.fetchPullRequestDiff({ owner: "o", repo: "r", prNumber: 1 });
  assert.equal(out.diff, "diff!");
  assert.equal(calls[0].init.headers.authorization, "Bearer tok");
});
