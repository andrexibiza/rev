import { test } from "node:test";
import assert from "node:assert/strict";
import {
  Trace, Span, createTrace, makeTrace, createSpan, makeSpan,
  validateSpanAttributes, checkTraceCompleteness, isTraceComplete,
  checkWitnessIsolation, buildCostReceipt, aggregateCostPerOutcome,
  SPAN_KINDS, SPAN_ATTRIBUTES,
} from "../src/traces.mjs";

const PIN = { sha: "a".repeat(40), generation: "gen-1", policyHash: "policy-1" };
const T0 = "2026-10-28T00:00:00.000Z";
const at = (s) => new Date(Date.parse(T0) + s * 1000).toISOString();

function authorityTrace() {
  const trace = createTrace({ workEventId: "we-1", pin: PIN });
  const a = trace.addSpan({ kind: "AUTHORITY", name: "authority.admission", startedAt: at(0), endedAt: at(1), pin: PIN, attributes: { authorityId: "auth-1", policyHash: "policy-1", generation: "gen-1" } });
  const p = trace.addSpan({ kind: "AUTHORITY", name: "authority.projection", parentSpanId: a.id, startedAt: at(1), endedAt: at(2), attributes: { authorityId: "auth-1", policyHash: "policy-1", generation: "gen-1" } });
  trace.addSpan({ kind: "AUTHORITY", name: "authority.settlement", parentSpanId: p.id, startedAt: at(2), endedAt: at(3), attributes: { authorityId: "auth-1", policyHash: "policy-1", generation: "gen-1" } });
  return trace;
}

test("span kinds and allowlisted attributes per schema §8", () => {
  assert.deepEqual(SPAN_KINDS, ["AUTHORITY", "LANE", "EXECUTION"]);
  assert.deepEqual(SPAN_ATTRIBUTES.AUTHORITY, ["authorityId", "policyHash", "generation", "reasonCode"]);
  assert.deepEqual(SPAN_ATTRIBUTES.LANE, ["laneKind", "inputDigests", "outputDigest", "verdict"]);
  assert.deepEqual(SPAN_ATTRIBUTES.EXECUTION, ["argvDigest", "envKeyNames", "stdinPolicy", "exitObservation"]);

  const auth = makeSpan({ kind: "AUTHORITY", name: "authority.admission", traceId: "t1", attributes: { authorityId: "a1", policyHash: "p1", generation: "gen-1" } });
  assert.equal(auth.kind, "AUTHORITY");
  const lane = makeSpan({ kind: "LANE", name: "lane.ANALYST", attributes: { laneKind: "ANALYST", inputDigests: ["d1"], outputDigest: "d2", verdict: "APPROVE" } });
  assert.deepEqual(lane.attributes.inputDigests, ["d1"]);
  const exec = makeSpan({ kind: "EXECUTION", name: "exec.test", attributes: { argvDigest: "a1", envKeyNames: ["PATH", "CI"], stdinPolicy: "CLOSED", exitObservation: "exit:0" } });
  assert.deepEqual(exec.attributes.envKeyNames, ["PATH", "CI"]);
  assert.throws(() => makeSpan({ kind: "BOGUS", name: "x" }), /Unknown span kind/);
});

test("span allowlist rejection: unknown, cross-kind, and free-form attributes", () => {
  assert.throws(() => makeSpan({ kind: "LANE", name: "lane.x", attributes: { freeForm: "hi" } }), /not allowlisted for LANE/);
  // policyHash belongs to AUTHORITY, not LANE.
  assert.throws(() => makeSpan({ kind: "LANE", name: "lane.x", attributes: { policyHash: "p" } }), /not allowlisted/);
  assert.throws(() => validateSpanAttributes("EXECUTION", { verdict: "APPROVE" }), /not allowlisted for EXECUTION/);
  assert.throws(() => makeSpan({ kind: "EXECUTION", name: "exec.x", attributes: { env: "PATH=/usr/bin" } }), /not allowlisted/);
});

test("span rejection: chain-of-thought in any spelling, as field or attribute", () => {
  for (const key of ["chainOfThought", "chain_of_thought", "chain-of-thought", "reasoning", "thinking", "cot"]) {
    assert.throws(() => makeSpan({ kind: "LANE", name: "lane.x", attributes: { [key]: "secret thoughts" } }), /chain-of-thought/, key);
  }
  assert.throws(() => makeSpan({ kind: "LANE", name: "lane.x", chainOfThought: "x" }), /chain-of-thought/);
  assert.throws(() => makeSpan({ kind: "AUTHORITY", name: "authority.admission", attributes: { authorityId: "a", nested: { chainOfThought: "x" } } }), /not allowlisted|chain-of-thought/);
});

test("span rejection: secret-shaped keys and values, env values not names", () => {
  assert.throws(() => makeSpan({ kind: "AUTHORITY", name: "authority.admission", attributes: { authorityId: "ghp_1234567890abcdefghij" } }), /secret-bearing/);
  assert.throws(() => makeSpan({ kind: "LANE", name: "lane.x", attributes: { laneKind: "ANALYST", outputDigest: "-----BEGIN RSA PRIVATE KEY----- abc" } }), /secret-bearing/);
  assert.throws(() => makeSpan({ kind: "EXECUTION", name: "exec.x", attributes: { argvDigest: "d", envKeyNames: ["API_KEY=supersecretvalue"] } }), /env key names only/);
  assert.throws(() => makeSpan({ kind: "EXECUTION", name: "exec.x", attributes: { argvDigest: "d", stdinPolicy: "api_key=supersecret" } }), /secret-bearing/);
  assert.throws(() => makeSpan({ kind: "AUTHORITY", name: "authority.admission", attributes: { apiKey: "x" } }), /secret|not allowlisted/);
  assert.throws(() => makeSpan({ kind: "LANE", name: "lane.x", attributes: { laneKind: "ANALYST", outputDigest: "Bearer abcdefghijklmnop" } }), /secret-bearing/);
  // Digests and key names are value-free and must pass.
  assert.doesNotThrow(() => makeSpan({ kind: "EXECUTION", name: "exec.x", attributes: { argvDigest: "deadbeef", envKeyNames: ["API_KEY"] } }));
});

test("trace completeness: unbroken authority chain passes", () => {
  const trace = authorityTrace();
  const r = checkTraceCompleteness(trace);
  assert.equal(r.complete, true);
  assert.equal(r.ok, true);
  assert.equal(r.hasRefusal, false);
  assert.equal(isTraceComplete(trace), true);
  assert.equal(trace.checkCompleteness().complete, true);
  // LANE/EXECUTION spans do not affect the authority chain.
  trace.addSpan({ kind: "LANE", name: "lane.ANALYST", attributes: { laneKind: "ANALYST", inputDigests: ["d1"] } });
  assert.equal(checkTraceCompleteness(trace).complete, true);
  assert.equal(checkTraceCompleteness(trace.spans).complete, true);
});

test("trace completeness: refusal span completes an otherwise short trace", () => {
  const trace = createTrace({ workEventId: "we-2" });
  trace.addSpan({ kind: "AUTHORITY", name: "authority.admission", attributes: { authorityId: "a1", policyHash: "p1", generation: "gen-1", reasonCode: "PROOF_STALE_GENERATION" } });
  const r = checkTraceCompleteness(trace);
  assert.equal(r.complete, true);
  assert.equal(r.hasRefusal, true);
  assert.equal(r.refusalSpan.attributes.reasonCode, "PROOF_STALE_GENERATION");
});

test("trace completeness: broken, forked, and missing authority chains fail", () => {
  const broken = createTrace({ workEventId: "we-3" });
  const a = broken.addSpan({ kind: "AUTHORITY", name: "authority.admission", startedAt: at(0), attributes: { authorityId: "a1" } });
  broken.addSpan({ kind: "AUTHORITY", name: "authority.settlement", parentSpanId: "missing-id", startedAt: at(1), attributes: { authorityId: "a1" } });
  assert.equal(a.kind, "AUTHORITY");
  const br = checkTraceCompleteness(broken);
  assert.equal(br.complete, false);
  assert.match(br.gaps.join(" "), /broken chain|not found/);

  const empty = createTrace({ workEventId: "we-4" });
  empty.addSpan({ kind: "LANE", name: "lane.ANALYST", attributes: { laneKind: "ANALYST", inputDigests: [] } });
  assert.equal(checkTraceCompleteness(empty).complete, false);
  assert.match(checkTraceCompleteness(empty).reason, /missing AUTHORITY/);

  const forked = authorityTrace();
  const admission = forked.spans.find((s) => s.name === "authority.admission");
  // Bypass Trace.addSpan duplicate checks by using a raw span list.
  const forkSpans = [...forked.spans, makeSpan({ kind: "AUTHORITY", name: "authority.projection", parentSpanId: admission.id, startedAt: at(4), attributes: { authorityId: "a1" } })];
  assert.equal(checkTraceCompleteness(forkSpans).complete, false);
});

test("witness isolation: analyst and witness input digests must be disjoint", () => {
  const ok = createTrace({ workEventId: "we-5" });
  ok.addSpan({ kind: "LANE", name: "lane.ANALYST", attributes: { laneKind: "ANALYST", inputDigests: ["d1", "d2"] } });
  ok.addSpan({ kind: "LANE", name: "lane.WITNESS", attributes: { laneKind: "WITNESS", inputDigests: ["d3"] } });
  assert.equal(checkWitnessIsolation(ok).isolated, true);
  const bad = createTrace({ workEventId: "we-6" });
  bad.addSpan({ kind: "LANE", name: "lane.ANALYST", attributes: { laneKind: "ANALYST", inputDigests: ["d1"] } });
  bad.addSpan({ kind: "LANE", name: "lane.WITNESS", attributes: { laneKind: "WITNESS", inputDigests: ["d1"] } });
  assert.equal(checkWitnessIsolation(bad).isolated, false);
});

test("cost receipt: totals, breakdowns, wall clock, human minutes labeled estimate", () => {
  const r = buildCostReceipt({
    workEventId: "we-1", repoId: "rev:repo:github:acme/widgets",
    laneSeconds: { ANALYST: 10, WITNESS: 5 }, tokens: { "model-a": 100, "model-b": 50 },
    ciMinutes: 3, wallClock: { queueSeconds: 20, runSeconds: 100 }, humanMinutes: 15,
    outcome: "verified-finding", outcomeCount: 1,
  });
  assert.equal(r.laneSeconds, 15);
  assert.deepEqual(r.laneSecondsByKind, { ANALYST: 10, WITNESS: 5 });
  assert.equal(r.tokens, 150);
  assert.deepEqual(r.tokensByModel, { "model-a": 100, "model-b": 50 });
  assert.equal(r.ciMinutes, 3);
  assert.equal(r.wallClock, 120);
  assert.equal(r.wallClockSeconds, 120);
  assert.equal(r.wallClockQueueSeconds, 20);
  assert.equal(r.wallClockRunSeconds, 100);
  assert.equal(r.humanMinutes, 15);
  assert.equal(r.humanMinutesEst, 15);
  assert.equal(r.humanMinutesKind, "estimate");
  assert.equal(r.humanMinutesLabel, "estimate");
  assert.equal(r.human.kind, "estimate");
  // Anatomy alias used by the review composer.
  const r2 = buildCostReceipt({ laneSeconds: 2, tokens: 10, ciMinutes: 1, wallClockSeconds: 30, humanMinutesEst: 7 });
  assert.equal(r2.humanMinutes, 7);
  assert.equal(r2.wallClock, 30);
  assert.throws(() => buildCostReceipt({ laneSeconds: -1 }), /non-negative/);
  assert.throws(() => buildCostReceipt({ tokens: Number.NaN }), /non-negative/);
});

test("cost receipt derived from spans and lane runs", () => {
  const trace = createTrace({ workEventId: "we-7" });
  trace.addSpan({ kind: "LANE", name: "lane.ANALYST", startedAt: at(0), endedAt: at(12), attributes: { laneKind: "ANALYST", inputDigests: ["d1"] } });
  const r = buildCostReceipt({ spans: trace.spans, laneRuns: [{ kind: "ANALYST", modelPin: "model-a", usage: { input: 40, output: 10 } }], ciMinutes: 2 });
  assert.equal(r.laneSeconds, 12);
  assert.equal(r.tokens, 50);
  assert.deepEqual(r.tokensByModel, { "model-a": 50 });
});

test("cost aggregation: cost per outcome, totals, zero-outcome is null", () => {
  const receipts = [
    buildCostReceipt({ laneSeconds: 20, tokens: 200, ciMinutes: 4, wallClock: 200, humanMinutes: 20, outcome: "verified-finding", outcomeCount: 2, repoId: "r1", week: "2026-W44" }),
    buildCostReceipt({ laneSeconds: 10, tokens: 100, ciMinutes: 2, wallClock: 100, humanMinutes: 10, outcome: "verified-finding", outcomeCount: 1, repoId: "r1", week: "2026-W44" }),
    buildCostReceipt({ laneSeconds: 60, tokens: 600, ciMinutes: 12, wallClock: 600, humanMinutes: 30, outcome: "merged-repair", outcomeCount: 1, repoId: "r1", week: "2026-W44" }),
    buildCostReceipt({ laneSeconds: 5, tokens: 50, ciMinutes: 1, wallClock: 50, humanMinutes: 5, outcomeCount: 0 }),
  ];
  const agg = aggregateCostPerOutcome(receipts);
  assert.equal(agg.total.laneSeconds, 95);
  assert.equal(agg.total.tokens, 950);
  assert.equal(agg.total.outcomes, 4);
  const vf = agg.byOutcome["verified-finding"];
  assert.equal(vf.outcomes, 3);
  assert.equal(vf.laneSeconds, 30);
  assert.equal(vf.costPerOutcome.laneSeconds, 10);
  assert.equal(vf.costPerOutcome.tokens, 100);
  assert.equal(vf.costPerOutcome.humanMinutes, 10);
  assert.equal(vf.humanMinutesKind, "estimate");
  assert.equal(agg.costPerVerifiedFinding.tokens, 100);
  assert.equal(agg.costPerMergedRepair.laneSeconds, 60);
  assert.equal(agg.costPerClosedAdvisory, null);
  assert.equal(agg.byRepo.r1.laneSeconds, 90);
  assert.equal(agg.byRepoWeek["r1@2026-W44"].outcomes, 4);
  // No outcomes -> per-outcome costs are null, never Infinity/NaN.
  const none = aggregateCostPerOutcome([buildCostReceipt({ laneSeconds: 5, tokens: 5 })]);
  assert.equal(none.total.costPerOutcome, null);
  assert.equal(none.total.tokensPerOutcome, null);
});
