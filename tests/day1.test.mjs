import { test } from "node:test";
import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import { mkdtempSync, mkdirSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { validateProof, makeReceipt, isRefusal } from "../src/types.mjs";
import { resolveAuthorityMap, parseCodeowners, ownersForPath } from "../src/authority-map.mjs";
import { verifySignature, handleWebhook } from "../src/webhook.mjs";
import { total } from "../fixtures/demo/discount.mjs";

test("proof: widening grants refused", () => {
  const parent = { authorityId: "a1", principalId: "rev", operation: "REVIEW", policyHash: "h", generation: "g1", payloadDigest: "d", grants: ["READ"] };
  const child = { ...parent, authorityId: "a2", grants: ["READ", "MERGE"] };
  assert.equal(isRefusal(validateProof(child, parent)), true);
  assert.equal(validateProof(child, parent).refusal.reasonCode, "AUTHORITY_WIDENING");
});

test("receipt: secret-shaped digest rejected", () => {
  assert.throws(() => makeReceipt({ state: "COMPLETED", reasonCode: "OK", outcomeDigest: "ghp_123", pin: null }), /value-free/);
});

test("authority: first CODEOWNERS wins, fail closed when absent", () => {
  const dir = mkdtempSync(join(tmpdir(), "rev-"));
  assert.equal(resolveAuthorityMap(dir).ambiguous, true);
  mkdirSync(join(dir, ".github"));
  writeFileSync(join(dir, ".github", "CODEOWNERS"), "*.mjs @owner/team\n");
  writeFileSync(join(dir, "CODEOWNERS"), "* @root-owner\n");
  const map = resolveAuthorityMap(dir);
  assert.equal(map.codeownersPath, "CODEOWNERS"); // root wins over .github
  const idx = parseCodeowners(dir, map.codeownersPath);
  assert.deepEqual(ownersForPath(map, idx, "x.mjs"), ["@root-owner"]);
});

test("webhook: bad signature never processes; good ping ok; PR refuses typed", () => {
  const secret = "s3cret";
  const body = JSON.stringify({ zen: "hi" });
  const sig = "sha256=" + createHmac("sha256", secret).update(body).digest("hex");
  assert.equal(verifySignature(secret, body, sig), true);
  assert.equal(verifySignature(secret, body, "sha256=deadbeef"), false);
  assert.equal(handleWebhook({ event: "ping", payload: { zen: "hi" } }).status, 200);
  const pr = handleWebhook({ event: "pull_request", payload: {} });
  assert.equal(pr.body.refusal.reasonCode, "LANES_NOT_READY");
});

test("fixture: planted member-path bug is observable", () => {
  const buggy = total({ subtotal: 200, discountPct: 10, taxPct: 10, member: true });
  const correct = (200 - 15) * 1.1; // $15 cap, discount before tax
  assert.notEqual(buggy, correct); // fixture must stay red until Day 4 fix lane
  assert.equal(total({ subtotal: 200, discountPct: 10, taxPct: 10, member: false }), correct);
});

test("authority glob: mid-path * and ** semantics (REV-REVIEW B1)", async () => {
  const { mkdtempSync, writeFileSync } = await import("node:fs");
  const { join } = await import("node:path");
  const { tmpdir } = await import("node:os");
  const dir = mkdtempSync(join(tmpdir(), "rev-glob-"));
  writeFileSync(join(dir, "CODEOWNERS"), "*.md @docs\ndocs/*.md @docs2\nsrc/** @src-team\n");
  const map = resolveAuthorityMap(dir);
  const idx = parseCodeowners(dir, "CODEOWNERS");
  assert.deepEqual(ownersForPath(map, idx, "docs/a.md"), ["@docs2"]);
  assert.deepEqual(ownersForPath(map, idx, "docs/sub/a.md"), ["@docs"]);
  assert.deepEqual(ownersForPath(map, idx, "src/deep/x.js"), ["@src-team"]);
});

test("webhook with queue: PR enqueues idempotently", async () => {
  const { createQueue } = await import("../src/queue.mjs");
  const q = createQueue();
  const a = handleWebhook({ event: "pull_request", payload: { pull_request: { number: 7 } }, deliveryId: "d-1", queue: q });
  const b = handleWebhook({ event: "pull_request", payload: { pull_request: { number: 7 } }, deliveryId: "d-1", queue: q });
  assert.equal(a.body.queued, true);
  assert.equal(b.body.replayed, true);
  assert.equal(q.size, 1);
});
