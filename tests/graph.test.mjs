import { test } from "node:test";
import assert from "node:assert/strict";
import { KnowledgeGraph, createKnowledgeGraph, makePin } from "../src/graph.mjs";
import { executeGraphQL, createGraphQLHandler } from "../src/graphql.mjs";

const PIN1 = { sha: "a".repeat(40), generation: "gen-1", policyHash: "policy-1" };
const PIN2 = { sha: "b".repeat(40), generation: "gen-2", policyHash: "policy-1" };
const EVIDENCE = [{ kind: "reachability-proof", ref: "artifact://path/1", digest: "d1" }];

function seededGraph() {
  const g = createKnowledgeGraph({ pin: PIN1 });
  // Chain: app -> lib -> core ; ui -> lib ; app also crosses a seam to lib.
  for (const [id, path] of [["app", "src/app.mjs"], ["lib", "src/lib.mjs"], ["core", "src/core.mjs"], ["ui", "src/ui.mjs"], ["lonely", "src/lonely.mjs"]]) {
    g.addNode({ id: `rev:node:CodeEntity:${id}`, kind: "CodeEntity", path, contentHash: `h-${id}` });
  }
  const ev = [{ kind: "ast-import", ref: "import:1" }];
  g.addEdge({ kind: "CONSUMES", fromId: "rev:node:CodeEntity:app", toId: "rev:node:CodeEntity:lib", evidence: ev });
  g.addEdge({ kind: "CONSUMES", fromId: "rev:node:CodeEntity:lib", toId: "rev:node:CodeEntity:core", evidence: ev });
  g.addEdge({ kind: "CONSUMES", fromId: "rev:node:CodeEntity:ui", toId: "rev:node:CodeEntity:lib", evidence: ev });
  return g;
}

test("blast radius: transitive consumers only, depth limits, direction matters", () => {
  const g = seededGraph();
  const blastCore = g.blastRadius("rev:node:CodeEntity:core").map((n) => n.id);
  // lib consumes core directly, app and ui consume lib -> all three blast.
  assert.deepEqual(new Set(blastCore), new Set(["rev:node:CodeEntity:lib", "rev:node:CodeEntity:app", "rev:node:CodeEntity:ui"]));
  // BFS order: direct consumer first.
  assert.equal(blastCore[0], "rev:node:CodeEntity:lib");
  // Depth 1 = direct consumers only.
  assert.deepEqual(g.blastRadius("rev:node:CodeEntity:core", { depth: 1 }).map((n) => n.id), ["rev:node:CodeEntity:lib"]);
  assert.deepEqual(g.blastRadius("rev:node:CodeEntity:lib", { depth: 1 }).map((n) => n.id).sort(), ["rev:node:CodeEntity:app", "rev:node:CodeEntity:ui"]);
  // Nothing consumes app; dependencies (what app consumes) are NOT blast radius.
  assert.deepEqual(g.blastRadius("rev:node:CodeEntity:app"), []);
  assert.deepEqual(g.blastRadius("rev:node:CodeEntity:lonely"), []);
});

test("REACHES requires evidence; AFFECTS vs REACHES stay distinct", () => {
  const g = createKnowledgeGraph({ pin: PIN1 });
  g.addNode({ id: "adv-1", kind: "Advisory", osvId: "GHSA-1", aliases: ["CVE-1"], ecosystem: "NPM", packageName: "left-pad" });
  g.addNode({ id: "rev:node:CodeEntity:lib", kind: "CodeEntity", path: "src/lib.mjs", contentHash: "h" });
  g.addNode({ id: "rev:node:CodeEntity:core", kind: "CodeEntity", path: "src/core.mjs", contentHash: "h" });

  // No evidence, empty evidence, and malformed evidence are all refused.
  assert.throws(() => g.addEdge({ kind: "REACHES", fromId: "adv-1", toId: "rev:node:CodeEntity:lib" }), /REACHES requires evidence/);
  assert.throws(() => g.addEdge({ kind: "REACHES", fromId: "adv-1", toId: "rev:node:CodeEntity:lib", evidence: [] }), /REACHES requires evidence/);
  assert.throws(() => g.addEdge({ kind: "REACHES", fromId: "adv-1", toId: "rev:node:CodeEntity:lib", evidence: [{ kind: "x" }] }), /REACHES requires evidence/);
  // Version-match alone is AFFECTS and does not make the entity reachable.
  g.addEdge({ kind: "AFFECTS", fromId: "adv-1", toId: "rev:node:CodeEntity:lib", evidence: [{ kind: "version-range", ref: "osv:1" }] });
  assert.deepEqual(g.affectedEntities("adv-1").map((n) => n.id), ["rev:node:CodeEntity:lib"]);
  assert.deepEqual(g.reachableEntities("adv-1"), []);

  // With a proven-path artifact, REACHES lands and is queryable distinctly.
  g.addEdge({ kind: "REACHES", fromId: "adv-1", toId: "rev:node:CodeEntity:core", evidence: EVIDENCE });
  assert.deepEqual(g.reachableEntities("adv-1").map((n) => n.id), ["rev:node:CodeEntity:core"]);
  assert.deepEqual(g.affectedEntities("adv-1").map((n) => n.id), ["rev:node:CodeEntity:lib"]);
  assert.equal(g.reachabilityPath("adv-1").length, 1);
  assert.equal(g.reachabilityPath("adv-1")[0].kind, "REACHES");
});

test("generation pinning: pinned queries never float to a newer generation", () => {
  const g = createKnowledgeGraph({ pin: PIN1 });
  g.addNode({ id: "rev:node:CodeEntity:lib", kind: "CodeEntity", path: "src/lib.mjs", contentHash: "v1" });
  g.addEdge({ kind: "CONSUMES", fromId: "rev:node:CodeEntity:lib", toId: "rev:node:CodeEntity:lib", evidence: [{ kind: "self", ref: "s" }] });

  g.advanceGeneration(PIN2);
  g.addNode({ id: "rev:node:CodeEntity:lib", kind: "CodeEntity", path: "src/lib.mjs", contentHash: "v2" });
  g.addNode({ id: "rev:node:CodeEntity:new", kind: "CodeEntity", path: "src/new.mjs", contentHash: "new" });

  // Pinned at gen-1: sees v1, does not see the gen-2-only entity.
  assert.equal(g.getNode("rev:node:CodeEntity:lib", { generation: "gen-1" }).contentHash, "v1");
  assert.equal(g.getNode("rev:node:CodeEntity:new", { generation: "gen-1" }), null);
  assert.deepEqual(g.listNodes({ at: { generation: "gen-1" } }).map((n) => n.id), ["rev:node:CodeEntity:lib"]);
  // Pin echo carries sha+generation through.
  assert.equal(g.getNode("rev:node:CodeEntity:lib", { generation: "gen-1" }).pin.sha, PIN1.sha);
  // Latest (no pin) and explicit gen-2 see the new generation.
  assert.equal(g.getNode("rev:node:CodeEntity:lib").contentHash, "v2");
  assert.equal(g.getNode("rev:node:CodeEntity:lib", PIN2).contentHash, "v2");
  assert.equal(g.snapshot({ generation: "gen-1" }).pin.generation, "gen-1");
  assert.equal(g.snapshot({ generation: "gen-1" }).pin.sha, PIN1.sha);
  assert.equal(g.snapshot().pin.generation, "gen-2");
});

test("path query: shortest directed path, unreachable returns []", () => {
  const g = seededGraph();
  const edges = g.path("rev:node:CodeEntity:app", "rev:node:CodeEntity:core");
  assert.deepEqual(edges.map((e) => `${e.fromId}->${e.toId}`), [
    "rev:node:CodeEntity:app->rev:node:CodeEntity:lib",
    "rev:node:CodeEntity:lib->rev:node:CodeEntity:core",
  ]);
  assert.equal(edges[0].kind, "CONSUMES");
  // Direction matters: no path backwards, no path from isolated node.
  assert.deepEqual(g.path("rev:node:CodeEntity:core", "rev:node:CodeEntity:app"), []);
  assert.deepEqual(g.path("rev:node:CodeEntity:lonely", "rev:node:CodeEntity:app"), []);
  assert.deepEqual(g.path("rev:node:CodeEntity:app", "rev:node:CodeEntity:app"), []);
});

function triageFixture() {
  const g = createKnowledgeGraph({ pin: PIN1 });
  g.addNode({ id: "rev:repo:github:acme/widgets", kind: "Repository", host: "github.com", owner: "acme", name: "widgets", defaultBranch: "main",
    authorityMap: { codeownersPath: "CODEOWNERS", holders: [{ id: "h1", kind: "AuthorityHolder", principalId: "@acme/team", grants: ["REVIEW"] }], mergeHolders: [{ id: "h1", kind: "AuthorityHolder", principalId: "@acme/team", grants: ["REVIEW"] }], requiredApprovals: 1, ambiguous: false, refusalReason: null } });
  g.addNode({ id: "rev:node:CodeEntity:lib", kind: "CodeEntity", path: "src/lib.mjs", contentHash: "h-lib" });
  g.addNode({ id: "rev:node:CodeEntity:core", kind: "CodeEntity", path: "src/core.mjs", contentHash: "h-core" });
  g.addNode({ id: "h1", kind: "AuthorityHolder", principalId: "@acme/team", grants: ["REVIEW"] });
  g.addNode({ id: "adv-1", kind: "Advisory", osvId: "GHSA-xxxx", aliases: ["CVE-2026-1"], ecosystem: "NPM", packageName: "widgets-lib", summary: "RCE", knownExploited: true });
  g.addNode({ id: "we-1", kind: "WorkEvent", operation: "TRIAGE", state: "QUEUED", repoId: "rev:repo:github:acme/widgets", proofDigest: "pd", idempotencyKey: "k1" });
  g.addEdge({ kind: "AFFECTS", fromId: "adv-1", toId: "rev:node:CodeEntity:lib", evidence: [{ kind: "version-range", ref: "osv:1" }] });
  g.addEdge({ kind: "REACHES", fromId: "adv-1", toId: "rev:node:CodeEntity:core", evidence: EVIDENCE });
  g.addEdge({ kind: "OWNS", fromId: "h1", toId: "rev:node:CodeEntity:core", evidence: [{ kind: "codeowners", ref: "CODEOWNERS:1" }] });
  return g;
}

test("graphql: repository, workEvent and advisory triage in one round trip", () => {
  const g = triageFixture();
  const query = `query Triage($repo: ID!, $adv: String!) {
    repository(id: $repo) { id pin { sha generation } authorityMap { ambiguous mergeHolders { principalId } } }
    advisory(osvId: $adv) { osvId reachableEntities(first: 20) { edges { node { path owners { principalId } } } } reachabilityPath { kind fromId toId } }
    workEvent(id: "we-1") { id operation state }
    registry(first: 10, filter: { repoId: $repo }) { edges { node { id state } } pageInfo { hasNextPage } }
  }`;
  const out = executeGraphQL({ query, variables: { repo: "rev:repo:github:acme/widgets", adv: "GHSA-xxxx" }, graph: g });
  assert.equal(out.errors, undefined, JSON.stringify(out.errors));
  assert.equal(out.data.repository.pin.generation, "gen-1");
  assert.equal(out.data.repository.authorityMap.ambiguous, false);
  assert.deepEqual(out.data.repository.authorityMap.mergeHolders, [{ principalId: "@acme/team" }]);
  // Only the REACHES entity is reachable (AFFECTS lib is not), owner resolved via OWNS.
  assert.deepEqual(out.data.advisory.reachableEntities.edges.map((e) => e.node.path), ["src/core.mjs"]);
  assert.deepEqual(out.data.advisory.reachableEntities.edges[0].node.owners, [{ principalId: "@acme/team" }]);
  assert.deepEqual(out.data.advisory.reachabilityPath, [{ kind: "REACHES", fromId: "adv-1", toId: "rev:node:CodeEntity:core" }]);
  assert.equal(out.data.workEvent.operation, "TRIAGE");
  assert.equal(out.data.registry.edges[0].node.id, "we-1");
  assert.equal(out.data.registry.pageInfo.hasNextPage, false);
});

test("graphql: knowledgeGraph blastRadius/path and mutation refusal are honest", () => {
  const g = seededGraph();
  const out = executeGraphQL({ query: `{ repository(id: "rev:repo:github:acme/widgets") { knowledgeGraph { blastRadius(entityId: "rev:node:CodeEntity:core", depth: 1) { path } path(fromId: "rev:node:CodeEntity:app", toId: "rev:node:CodeEntity:core") { kind fromId toId } } } }`, graph: g });
  // seededGraph has no Repository node, so repository is null; use node-level graph via a repo node instead.
  const g2 = triageFixture();
  const kg = executeGraphQL({ query: `{ repository(id: "rev:repo:github:acme/widgets") { knowledgeGraph { nodeCount blastRadius(entityId: "rev:node:CodeEntity:core") { id } } } }`, graph: g2 });
  assert.equal(kg.data.repository.knowledgeGraph.nodeCount > 0, true);
  assert.deepEqual(kg.data.repository.knowledgeGraph.blastRadius, []); // nothing consumes core in this fixture
  const mut = executeGraphQL({ query: `mutation { enqueueReview(input: {}) { workEvent { id } } }`, graph: g2 });
  assert.equal(mut.data, null);
  assert.equal(mut.errors[0].extensions.code, "NOT_IMPLEMENTED");
  assert.equal(out.data.repository, null);
});

test("graphql HTTP handler: POST round-trips, bad JSON is 400", async () => {
  const g = triageFixture();
  const handler = createGraphQLHandler({ graph: g });
  // Mock req/res (no socket needed): handler only needs method/url + async-iterable body.
  const run = async (body) => {
    const req = { method: "POST", url: "/graphql", headers: {}, async *[Symbol.asyncIterator]() { yield Buffer.from(body); } };
    const res = { status: null, body: null, writeHead(s) { this.status = s; }, end(b) { this.body = b; } };
    await handler(req, res);
    return res;
  };
  const ok = await run(JSON.stringify({ query: `{ advisory(osvId: "GHSA-xxxx") { osvId } }` }));
  assert.equal(ok.status, 200);
  assert.equal(JSON.parse(ok.body).data.advisory.osvId, "GHSA-xxxx");
  const bad = await run("{nope");
  assert.equal(bad.status, 400);
});
