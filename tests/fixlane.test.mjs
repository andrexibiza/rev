import { test } from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdtempSync, readFileSync, writeFileSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { adjudicate, witnessProbe, sensitivityProbe, freshReview } from "../src/factory.mjs";
import * as discount from "../fixtures/demo/discount.mjs";
import {
  runFixLane, blindImplement, applyCapFix, buildPatch, evaluateCandidate, FIXTURE_PATH,
} from "../src/fixlane.mjs";

const fixtureUrl = new URL("../fixtures/demo/discount.mjs", import.meta.url);
const fixturePath = FIXTURE_PATH;

function hash(text) { return createHash("sha256").update(text, "utf8").digest("hex"); }

function makeAdjudication() {
  const witness = witnessProbe({ discountModule: discount });
  // Sensitive distinguisher: base passes, mutated fails -> no BAD_TEST noise.
  const sensitivity = sensitivityProbe({ run: (v) => v === "base" });
  assert.equal(sensitivity.sensitive, true);
  const adjudication = adjudicate({ analyst: {}, witness, sensitivity });
  assert.equal(adjudication.verdict, "REQUEST_CHANGES");
  assert.ok(adjudication.contract.mustFix.some((t) => /cap/i.test(t)));
  return adjudication;
}

async function importHead(headContent) {
  const dir = mkdtempSync(join(tmpdir(), "rev-fixlane-test-"));
  const file = join(dir, "discount.mjs");
  writeFileSync(file, headContent, "utf8");
  return import(pathToFileURL(file).href);
}

function closeTo(got, expected) {
  assert.ok(Math.abs(got - expected) < 1e-9, `got ${got}, expected ${expected}`);
}

test("fixlane: repaired totals correct at cap boundaries (member + guest)", async () => {
  const repair = runFixLane({ adjudication: makeAdjudication() });
  assert.equal(repair.state, "COMPLETED");
  assert.equal(repair.verdicts.verdict, "APPROVE");
  assert.equal(repair.verdicts.loop, null);
  assert.ok(repair.patch.includes("Math.min(rawDiscount, 15)"));
  assert.ok(repair.headContent.includes("Math.min(rawDiscount, 15)"));

  const mod = await importHead(repair.headContent);
  // Above cap: raw $20 -> capped $15, discount before tax.
  closeTo(mod.total({ subtotal: 200, discountPct: 10, taxPct: 10, member: true }), (200 - 15) * 1.1);
  closeTo(mod.total({ subtotal: 200, discountPct: 10, taxPct: 10, member: false }), (200 - 15) * 1.1);
  // Exactly at cap: raw $15 -> $15.
  closeTo(mod.total({ subtotal: 150, discountPct: 10, taxPct: 0, member: true }), 135);
  closeTo(mod.total({ subtotal: 150, discountPct: 10, taxPct: 10, member: true }), 135 * 1.1);
  // Just above / just below cap.
  closeTo(mod.total({ subtotal: 160, discountPct: 10, taxPct: 10, member: true }), (160 - 15) * 1.1);
  closeTo(mod.total({ subtotal: 140, discountPct: 10, taxPct: 10, member: true }), (140 - 14) * 1.1);
  // Below cap: raw $10 unchanged.
  closeTo(mod.total({ subtotal: 100, discountPct: 10, taxPct: 10, member: true }), (100 - 10) * 1.1);
  closeTo(mod.total({ subtotal: 100, discountPct: 10, taxPct: 0, member: true }), 90);
  // Large discount still capped; zero discount untouched.
  closeTo(mod.total({ subtotal: 200, discountPct: 50, taxPct: 10, member: true }), (200 - 15) * 1.1);
  closeTo(mod.total({ subtotal: 200, discountPct: 0, taxPct: 10, member: true }), 200 * 1.1);

  // Temp output holds the same repaired bytes and is not the fixture.
  assert.ok(repair.headPath && existsSync(repair.headPath));
  assert.notEqual(repair.headPath, fixturePath);
  assert.equal(readFileSync(repair.headPath, "utf8"), repair.headContent);
});

test("fixlane: original fixture unchanged after repair", () => {
  const before = readFileSync(fixturePath, "utf8");
  const beforeHash = hash(before);
  const repair = runFixLane({ adjudication: makeAdjudication() });
  const after = readFileSync(fixturePath, "utf8");
  assert.equal(after, before);
  assert.equal(hash(after), beforeHash);
  // Fixture still carries the planted bug; repair lives only in headContent/temp.
  assert.match(after, /BUG: uncapped discount on member path/);
  assert.notEqual(repair.headContent, before);
  assert.equal(discount.total({ subtotal: 200, discountPct: 10, taxPct: 10, member: true }), (200 - 20) * 1.1);
});

test("fixlane: fresh review approves only when both reviewers pass", () => {
  const adjudication = makeAdjudication();

  const both = runFixLane({ adjudication, candidateOk: true, adversarialOk: true });
  assert.equal(both.verdicts.verdict, "APPROVE");
  assert.equal(both.verdicts.loop, null);
  assert.equal(both.state, "COMPLETED");

  for (const overrides of [
    { candidateOk: false, adversarialOk: true },
    { candidateOk: true, adversarialOk: false },
    { candidateOk: false, adversarialOk: false },
  ]) {
    const r = runFixLane({ adjudication, ...overrides });
    assert.equal(r.verdicts.verdict, "REQUEST_CHANGES", JSON.stringify(overrides));
    assert.equal(r.verdicts.loop, "FIX_LANE");
    assert.notEqual(r.state, "COMPLETED");
    assert.equal(r.state, "FAILED");
  }

  // Factory gate has the same truth table (fixlane must reuse it, not re-decide).
  assert.equal(freshReview({ candidateOk: true, adversarialOk: true }).verdict, "APPROVE");
  assert.equal(freshReview({ candidateOk: true, adversarialOk: false }).verdict, "REQUEST_CHANGES");
  assert.equal(freshReview({ candidateOk: false, adversarialOk: true }).verdict, "REQUEST_CHANGES");
  assert.equal(freshReview({ candidateOk: false, adversarialOk: false }).verdict, "REQUEST_CHANGES");

  // Execution reviewers: buggy original fails both, repaired head passes both.
  const original = readFileSync(fixturePath, "utf8");
  assert.equal(evaluateCandidate(original).candidateOk, false);
  assert.equal(evaluateCandidate(original).adversarialOk, false);
  assert.equal(evaluateCandidate(both.headContent).candidateOk, true);
  assert.equal(evaluateCandidate(both.headContent).adversarialOk, true);
});

test("fixlane: blind — consumes contract only, extra reasoning never leaks", () => {
  const adjudication = makeAdjudication();
  const canary = "CANARY-REASONING-7f3d9a";
  const poisoned = {
    ...adjudication,
    witness: { kind: "WITNESS", verdict: "REQUEST_CHANGES", findings: [{ title: canary, evidence: [{ kind: "exec", ref: canary }] }] },
    analyst: { kind: "ANALYST", findings: [{ title: canary }] },
    reasoning: canary,
  };
  const clean = runFixLane({ adjudication });
  const fromPoisoned = runFixLane({ adjudication: poisoned });
  assert.equal(fromPoisoned.headContent, clean.headContent);
  assert.equal(fromPoisoned.patch, clean.patch);
  assert.ok(!fromPoisoned.headContent.includes(canary));
  assert.ok(!fromPoisoned.patch.includes(canary));
  assert.ok(!JSON.stringify(fromPoisoned.verdicts).includes(canary));
  // Bare contract input (no adjudication wrapper) yields the same repair.
  const fromContract = runFixLane({ contract: adjudication.contract });
  assert.equal(fromContract.headContent, clean.headContent);
  assert.equal(fromContract.state, "COMPLETED");
  // Alias export is the same lane.
  assert.equal(blindImplement, runFixLane);
});

test("fixlane: patch is a minimal member-path diff; helpers are sound", () => {
  const original = readFileSync(fixturePath, "utf8");
  const repaired = applyCapFix(original);
  const patch = buildPatch(original, repaired);
  assert.match(patch, /^--- a\/fixtures\/demo\/discount\.mjs/m);
  assert.match(patch, /^\+\+\+ b\/fixtures\/demo\/discount\.mjs/m);
  assert.match(patch, /^-.*return \(subtotal - rawDiscount\)/m);
  assert.match(patch, /^\+.*Math\.min\(rawDiscount, 15\)/m);
  // Non-member capped line is context, not a changed line.
  assert.ok(!patch.split("\n").some((l) => l.startsWith("-") && l.includes("const discount")));
  // Idempotent: fixing an already-fixed file changes nothing.
  assert.equal(applyCapFix(repaired), repaired);
  assert.equal(buildPatch(repaired, repaired), "");
  // No contract fix named -> verified NO_ACTION, no patch, fixture bytes returned.
  const noop = runFixLane({ contract: { findings: [], mustFix: [] } });
  assert.equal(noop.state, "NO_ACTION");
  assert.equal(noop.patch, "");
  assert.equal(noop.headContent, original);
});
