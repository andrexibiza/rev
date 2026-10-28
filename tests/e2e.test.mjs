import { test } from "node:test";
import assert from "node:assert/strict";
import { createQueue } from "../src/queue.mjs";
import { createKnowledgeGraph } from "../src/graph.mjs";
import { executeGraphQL } from "../src/graphql.mjs";
import { runDemoReview } from "../src/demo.mjs";
import { triageAdvisory, matchPackageJson } from "../src/watcher.mjs";

test("e2e: queue admits once, demo review requests changes", () => {
  const q = createQueue();
  const a = q.enqueue({ idempotencyKey: "demo-pr-1", payload: { pr: 1 }, operation: "REVIEW" });
  const b = q.enqueue({ idempotencyKey: "demo-pr-1", payload: { pr: 1 }, operation: "REVIEW" });
  assert.equal(b.replayed, true);
  assert.equal(q.size, 1);
  const demo = runDemoReview();
  assert.equal(demo.adjudication.verdict, "REQUEST_CHANGES");
  assert.match(demo.markdown, /Verdict: REQUEST_CHANGES/);
});

test("e2e: watcher triage reachable vs silent", () => {
  const osv = { id: "CVE-TEST-1", affected: [{ package: { ecosystem: "npm", name: "lodash" }, ranges: [{ type: "ECOSYSTEM", events: [{ introduced: "0" }, { fixed: "4.17.21" }] }] }] };
  const pkg = JSON.stringify({ dependencies: { lodash: "4.17.20" } });
  assert.equal(matchPackageJson(osv, pkg).length, 1);
  const tri = triageAdvisory(osv, matchPackageJson(osv, pkg), { reachable: true, proof: [{ kind: "reachability-proof", ref: "x" }] }, { kev: true });
  assert.ok(["CRISIS", "STANDARD"].includes(tri.priority));
  const safe = triageAdvisory(osv, [], null, {});
  assert.equal(safe.silent, true);
});

test("e2e: graphql repository query over graph", () => {
  const g = createKnowledgeGraph({ pin: { sha: "a".repeat(40), generation: "gen-1", policyHash: "p1" } });
  g.addNode({ id: "rev:node:CodeEntity:lib", kind: "CodeEntity", path: "src/lib.mjs", contentHash: "h" });
  const out = executeGraphQL({ query: `{ repository(id: "r1") { id pin { sha generation } } }`, graph: g, repositories: [{ id: "r1" }] });
  assert.ok(out.data, JSON.stringify(out));
});
