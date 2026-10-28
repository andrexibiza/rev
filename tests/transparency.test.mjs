import { test } from "node:test";
import assert from "node:assert/strict";
import { createLog, append, verifyChain, meetsThreshold } from "../src/transparency.mjs";
test("chain verifies, tamper detected, threshold counts", () => {
  const log = createLog();
  const a = append(log, { receiptDigest: "r1", generation: "g1", signatures: ["p", "c", "a"] });
  append(log, { receiptDigest: "r2", generation: "g1", supersedes: a.entry.hash });
  assert.equal(verifyChain(log).ok, true);
  assert.equal(meetsThreshold(a.entry, 3), true);
  log.entries[0].receiptDigest = "evil";
  assert.equal(verifyChain(log).ok, false);
});
