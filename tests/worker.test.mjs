import { test } from "node:test";
import assert from "node:assert/strict";
import { createQueue } from "../src/queue.mjs";
import { drainOnce } from "../src/worker.mjs";
import { postReview } from "../src/projector.mjs";
import { completeLane, modelConfigured } from "../src/model.mjs";

test("worker drains queued PR to COMPLETED receipt", async () => {
  const q = createQueue();
  q.enqueue({ idempotencyKey: "w1", payload: { pull_request: { number: 3 } }, operation: "REVIEW" });
  const out = await drainOnce({ queue: q });
  assert.equal(out.drained, true);
  assert.equal(out.verdict, "REQUEST_CHANGES");
  assert.equal(out.receipt.state, "COMPLETED");
  assert.equal(q.size, 1);
});

test("projector dry-run never posts", async () => {
  const out = await postReview({ owner: "o", repo: "r", prNumber: 1, body: "x" });
  assert.equal(out.posted, false);
  assert.equal(out.dryRun, true);
});

test("model lane honest without credentials", async () => {
  delete process.env.REV_MODEL_ENDPOINT;
  const out = await completeLane({ kind: "ANALYST", brief: "test" });
  assert.equal(out.modelPin, "deterministic-executor");
  assert.equal(modelConfigured(), false);
});
