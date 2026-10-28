import { test } from "node:test";
import assert from "node:assert/strict";
import { witnessProbe, sensitivityProbe, adjudicate, freshReview } from "../src/factory.mjs";
import * as discount from "../fixtures/demo/discount.mjs";

test("witness: member cap bug found by execution, non-member credited", () => {
  const w = witnessProbe({ discountModule: discount });
  assert.equal(w.verdict, "REQUEST_CHANGES");
  assert.equal(w.findings[0].kind, "DEFECT");
});

test("sensitivity: wrong-supplier apparatus is insensitive", () => {
  // base passes, mutated (protected write removed) still passes because later setup supplies state
  const s = sensitivityProbe({ run: (v) => true });
  assert.equal(s.sensitive, false);
  const adj = adjudicate({ analyst: {}, witness: { findings: [] }, sensitivity: s });
  assert.equal(adj.verdict, "REQUEST_CHANGES");
  assert.equal(adj.findings[0].kind, "BAD_TEST");
});

test("fresh review: either rejection loops to fix lane", () => {
  assert.equal(freshReview({ candidateOk: true, adversarialOk: false }).loop, "FIX_LANE");
  assert.equal(freshReview({ candidateOk: true, adversarialOk: true }).verdict, "APPROVE");
});
