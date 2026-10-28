// In-memory knowledge graph for Rev (schema.md §4).
// Nodes/edges are pinned (sha + generation + policyHash). Prior generations
// remain queryable: a query pinned at generation G sees the version of each
// node/edge as of G (carried forward until superseded), never newer data.
// AFFECTS (version-range match) and REACHES (reachability-proven path) are
// distinct edge kinds; REACHES requires non-empty evidence (see addEdge).

export const NODE_KINDS = [
  "Repository", "Promise", "CodeEntity", "Consumer", "Seam", "TestAssertion",
  "AuthorityHolder", "Advisory", "Finding", "Repair", "PullRequestProjection",
  "Receipt", "LaneRun", "Trace", "Span", "WorkEvent",
];
export const NodeKinds = NODE_KINDS;

export const EDGE_KINDS = [
  "PROMISES", "IMPLEMENTS", "CONSUMES", "CROSSES", "ASSERTS", "COVERS_SEAM",
  "OWNS", "AFFECTS", "REACHES", "REPORTS", "ADDRESSES", "REVIEWS",
  "PROJECTS_TO", "SETTLES", "SUPERSEDES",
];
export const EdgeKinds = EDGE_KINDS;

// Edge kinds traversed (reversed) for blast radius: a consumer depends on its
// target, so changing the target blasts its consumers transitively.
const BLAST_EDGE_KINDS = new Set(["CONSUMES", "CROSSES"]);

export function makePin({ sha, generation, policyHash } = {}) {
  return {
    sha: sha ?? "0".repeat(40),
    generation: generation ?? "gen-1",
    policyHash: policyHash ?? "policy-v1",
    resolvedAt: new Date().toISOString(),
  };
}
export const createPin = makePin;

function clonePin(pin) { return pin ? { ...pin } : pin; }
function cloneNode(n) { return n ? { ...n, pin: clonePin(n.pin) } : n; }
function cloneEdge(e) {
  return e ? { ...e, evidence: (e.evidence ?? []).map((x) => ({ ...x, pin: x.pin ? clonePin(x.pin) : x.pin })), pin: clonePin(e.pin) } : e;
}

export class KnowledgeGraph {
  constructor(options = {}) {
    const initialPin = options.pin ? makePin(options.pin) : makePin(options);
    this._pin = initialPin;
    this._generationOrder = [initialPin.generation];
    this._pinsByGeneration = new Map([[initialPin.generation, initialPin]]);
    // id -> Map(generation -> node version)
    this._nodes = new Map();
    // flat list of edges, each stamped with its creating generation
    this._edges = [];
  }

  // --- pin / generation handling -------------------------------------------
  get pin() { return clonePin(this._pin); }
  get currentPin() { return clonePin(this._pin); }
  getPin() { return clonePin(this._pin); }
  get generation() { return this._pin.generation; }

  setPin(pinInput) {
    const pin = makePin(pinInput);
    this._pin = pin;
    if (!this._pinsByGeneration.has(pin.generation)) this._generationOrder.push(pin.generation);
    this._pinsByGeneration.set(pin.generation, pin);
    return clonePin(pin);
  }
  // Advance to a new generation. Prior generations stay queryable.
  advanceGeneration(pinInput = {}) {
    const generation = typeof pinInput === "string" ? pinInput : (pinInput.generation ?? `gen-${this._generationOrder.length + 1}`);
    const pin = makePin({
      sha: typeof pinInput === "object" ? pinInput.sha : undefined,
      generation,
      policyHash: typeof pinInput === "object" ? pinInput.policyHash : undefined,
    });
    // Preserve sha/policyHash from current pin when not supplied.
    if (typeof pinInput === "object") {
      if (!pinInput.sha) pin.sha = this._pin.sha;
      if (!pinInput.policyHash) pin.policyHash = this._pin.policyHash;
    }
    return this.setPin(pin);
  }

  _resolvePin(at) {
    if (!at) return this._pin;
    if (typeof at === "string") return this._pinsByGeneration.get(at) ?? makePin({ generation: at, sha: this._pin.sha, policyHash: this._pin.policyHash });
    const generation = at.generation ?? this._pin.generation;
    const known = this._pinsByGeneration.get(generation);
    return makePin({
      sha: at.sha ?? known?.sha ?? this._pin.sha,
      generation,
      policyHash: at.policyHash ?? known?.policyHash ?? this._pin.policyHash,
    });
  }
  _genIndex(generation) { return this._generationOrder.indexOf(generation); }
  // True when `createdGen` is visible at `queryGen` (created at or before it).
  // Unknown generations fall back to exact match (fail-closed pinning).
  _visibleAt(createdGen, queryGen) {
    const c = this._genIndex(createdGen);
    const q = this._genIndex(queryGen);
    if (c === -1 || q === -1) return createdGen === queryGen;
    return c <= q;
  }
  _effectivePin(pinOverride, at) {
    if (pinOverride) return this._resolvePin(pinOverride);
    if (at) return this._resolvePin(at);
    return this._pin;
  }
  _registerPin(pin) {
    if (!this._pinsByGeneration.has(pin.generation)) this._generationOrder.push(pin.generation);
    if (!this._pinsByGeneration.has(pin.generation)) this._pinsByGeneration.set(pin.generation, pin);
    else if (pin.sha) this._pinsByGeneration.set(pin.generation, pin);
  }

  // --- nodes -----------------------------------------------------------------
  addNode(node, pinOverride) {
    if (!node || typeof node !== "object") throw new TypeError("addNode: node object required");
    if (!node.id) throw new TypeError("addNode: node.id required");
    const kind = node.kind ?? node.type;
    if (!kind) throw new TypeError("addNode: node.kind required");
    if (!NODE_KINDS.includes(kind)) throw new TypeError(`addNode: unknown node kind: ${kind}`);
    node = { ...node, kind };
    const pin = clonePin(this._effectivePin(pinOverride, node.pin ?? node.at));
    this._registerPin(pin);
    const stored = cloneNode({ ...node, pin, generation: pin.generation });
    delete stored.at;
    if (!this._nodes.has(node.id)) this._nodes.set(node.id, new Map());
    this._nodes.get(node.id).set(pin.generation, stored);
    return cloneNode(stored);
  }
  // Alias used by some callers.
  upsertNode(node, pin) { return this.addNode(node, pin); }
  putNode(node, pin) { return this.addNode(node, pin); }

  getNode(id, at) {
    const versions = this._nodes.get(id);
    if (!versions) return null;
    const queryGen = this._resolvePin(at).generation;
    // Exact version at generation, else latest version visible at that pin.
    if (versions.has(queryGen)) return cloneNode(versions.get(queryGen));
    let best = null; let bestIdx = -1;
    for (const [gen, node] of versions) {
      if (!this._visibleAt(gen, queryGen)) continue;
      const idx = this._genIndex(gen);
      if (idx >= bestIdx) { best = node; bestIdx = idx; }
    }
    return best ? cloneNode(best) : null;
  }
  hasNode(id, at) { return this.getNode(id, at) != null; }

  listNodes(options = {}) {
    const { at, kinds, kind } = options;
    const queryGen = this._resolvePin(at ?? options.pin).generation;
    const kindFilter = kinds ?? (kind ? [kind] : null);
    const out = [];
    for (const id of this._nodes.keys()) {
      const node = this.getNode(id, { generation: queryGen });
      if (!node) continue;
      if (kindFilter && !kindFilter.includes(node.kind)) continue;
      out.push(node);
    }
    return out;
  }
  nodes(options) { return this.listNodes(options); }
  getNodes(options) { return this.listNodes(options); }
  allNodes(options) { return this.listNodes(options); }
  nodeCount(at) { return this.listNodes({ at }).length; }

  // --- edges -----------------------------------------------------------------
  addEdge(edge, pinOverride) {
    if (!edge || typeof edge !== "object") throw new TypeError("addEdge: edge object required");
    const kind = edge.kind ?? edge.type;
    const fromId = edge.fromId ?? edge.from ?? edge.source ?? edge.sourceId;
    const toId = edge.toId ?? edge.to ?? edge.target ?? edge.targetId;
    if (!kind) throw new TypeError("addEdge: edge.kind required");
    if (!EDGE_KINDS.includes(kind)) throw new TypeError(`addEdge: unknown edge kind: ${kind}`);
    if (!fromId) throw new TypeError("addEdge: edge.fromId required");
    if (!toId) throw new TypeError("addEdge: edge.toId required");
    const rawEvidence = edge.evidence ?? (edge.evidenceRef ? [edge.evidenceRef] : []);
    const evidence = Array.isArray(rawEvidence) ? rawEvidence : [rawEvidence];
    if (!Array.isArray(evidence)) throw new TypeError("addEdge: edge.evidence must be an array");
    // REACHES is reachability-proven only (schema.md §4.3): a version-range
    // match creates AFFECTS, never REACHES. REACHES without a proven-path
    // evidence artifact is refused at write time, not merely down-ranked.
    const normalizedEvidence = evidence.map((e) => (typeof e === "string" ? { kind: "evidence", ref: e } : e));
    if (kind === "REACHES") {
      const valid = normalizedEvidence.length > 0 && normalizedEvidence.every((e) => e && typeof e === "object" && e.kind && e.ref);
      if (!valid) {
        const err = new Error("REACHES requires evidence: a reachability-proven path artifact (non-empty evidence with kind+ref per entry); version match alone only creates AFFECTS");
        err.code = "REACHES_EVIDENCE_REQUIRED";
        err.reasonCode = "REACHES_EVIDENCE_REQUIRED";
        throw err;
      }
    }
    const pin = clonePin(this._effectivePin(pinOverride, edge.pin ?? edge.at));
    this._registerPin(pin);
    const stored = cloneEdge({
      kind, fromId, toId,
      evidence: normalizedEvidence.map((e) => ({ kind: e.kind, ref: e.ref, digest: e.digest ?? null, pin: e.pin ? clonePin(this._resolvePin(e.pin)) : clonePin(pin) })),
      pin, generation: pin.generation,
    });
    this._edges.push(stored);
    return cloneEdge(stored);
  }
  putEdge(edge, pin) { return this.addEdge(edge, pin); }

  listEdges(options = {}) {
    const { at, kind, kinds, fromId, toId } = options;
    const queryPin = this._resolvePin(at ?? options.pin);
    const kindFilter = kinds ?? (kind ? [kind] : null);
    return this._edges
      .filter((e) => this._visibleAt(e.generation, queryPin.generation))
      // At a pinned generation, prefer exact-generation view for superseded
      // edges is unnecessary: edges are immutable once written.
      .filter((e) => !kindFilter || kindFilter.includes(e.kind))
      .filter((e) => !fromId || e.fromId === fromId)
      .filter((e) => !toId || e.toId === toId)
      .map(cloneEdge);
  }
  edges(options) { return this.listEdges(options); }
  getEdges(options) { return this.listEdges(options); }
  edgeCount(at) { return this.listEdges({ at }).length; }
  edgesFrom(fromId, options = {}) { return this.listEdges({ ...options, fromId }); }
  edgesTo(toId, options = {}) { return this.listEdges({ ...options, toId }); }

  // --- queries ---------------------------------------------------------------
  // Transitive consumers of entityId (reverse CONSUMES/CROSSES), BFS order.
  // depth=1 means direct consumers only; omitted depth is unbounded.
  blastRadius(entityId, options = {}) {
    const at = options.at ?? options.pin;
    const depth = options.depth ?? options.maxDepth ?? Infinity;
    const all = this.listEdges({ at });
    const reverse = new Map(); // toId -> [fromId]
    for (const e of all) {
      if (!BLAST_EDGE_KINDS.has(e.kind)) continue;
      if (!reverse.has(e.toId)) reverse.set(e.toId, []);
      reverse.get(e.toId).push(e.fromId);
    }
    const visited = new Set([entityId]);
    const result = [];
    let frontier = [entityId];
    let level = 0;
    while (frontier.length && level < depth) {
      const next = [];
      for (const current of frontier) {
        for (const consumerId of reverse.get(current) ?? []) {
          if (visited.has(consumerId)) continue;
          visited.add(consumerId);
          next.push(consumerId);
          const node = this.getNode(consumerId, at);
          // Traverse through Seam intermediates but only return entities.
          if (node && node.kind === "Seam") continue;
          result.push(node ?? { id: consumerId, kind: "CodeEntity" });
        }
      }
      frontier = next;
      level += 1;
    }
    return result;
  }
  getBlastRadius(entityId, options) { return this.blastRadius(entityId, options); }

  consumersOf(entityId, options = {}) {
    return this.listEdges({ ...options, toId: entityId, kind: "CONSUMES" })
      .map((e) => this.getNode(e.fromId, options.at ?? options.pin))
      .filter(Boolean);
  }

  // Directed shortest path (BFS) from fromId to toId. Returns GraphEdge[]
  // in traversal order, [] when unreachable (or fromId === toId).
  path(fromId, toId, options = {}) {
    if (fromId === toId) return [];
    const at = options.at ?? options.pin;
    const kindFilter = options.kinds ?? (options.kind ? [options.kind] : null);
    const all = this.listEdges({ at });
    const adj = new Map();
    for (const e of all) {
      if (kindFilter && !kindFilter.includes(e.kind)) continue;
      if (!adj.has(e.fromId)) adj.set(e.fromId, []);
      adj.get(e.fromId).push(e);
    }
    const visited = new Set([fromId]);
    const prev = new Map(); // nodeId -> { edge, from }
    const queue = [fromId];
    while (queue.length) {
      const current = queue.shift();
      for (const e of adj.get(current) ?? []) {
        if (visited.has(e.toId)) continue;
        visited.add(e.toId);
        prev.set(e.toId, { edge: e, from: current });
        if (e.toId === toId) {
          const edges = [];
          let cur = toId;
          while (cur !== fromId) {
            const step = prev.get(cur);
            edges.unshift(cloneEdge(step.edge));
            cur = step.from;
          }
          return edges;
        }
        queue.push(e.toId);
      }
    }
    return [];
  }
  findPath(fromId, toId, options) { return this.path(fromId, toId, options); }
  getPath(fromId, toId, options) { return this.path(fromId, toId, options); }
  queryPath(fromId, toId, options) { return this.path(fromId, toId, options); }

  // AFFECTS vs REACHES stay distinct: each reads only its own edge kind.
  affectedEntities(advisoryId, options = {}) {
    return this.listEdges({ ...options, fromId: advisoryId, kind: "AFFECTS" })
      .map((e) => this.getNode(e.toId, options.at ?? options.pin)).filter(Boolean);
  }
  getAffectedEntities(advisoryId, options) { return this.affectedEntities(advisoryId, options); }
  reachableEntities(advisoryId, options = {}) {
    return this.listEdges({ ...options, fromId: advisoryId, kind: "REACHES" })
      .map((e) => this.getNode(e.toId, options.at ?? options.pin)).filter(Boolean);
  }
  getReachableEntities(advisoryId, options) { return this.reachableEntities(advisoryId, options); }

  // REACHES edges from an advisory (optionally only those reaching entityId),
  // or the proven path advisory -> ... -> entityId when both ids are given.
  reachabilityPath(advisoryId, entityIdOrOptions, maybeOptions) {
    let entityId = null; let options = {};
    if (typeof entityIdOrOptions === "string") { entityId = entityIdOrOptions; options = maybeOptions ?? {}; }
    else options = entityIdOrOptions ?? {};
    if (entityId) {
      const direct = this.listEdges({ ...options, fromId: advisoryId, toId: entityId, kind: "REACHES" });
      if (direct.length) return direct;
      return this.path(advisoryId, entityId, options);
    }
    return this.listEdges({ ...options, fromId: advisoryId, kind: "REACHES" });
  }

  advisoriesForEntity(entityId, options = {}) {
    return this.listEdges({ ...options, toId: entityId })
      .filter((e) => e.kind === "AFFECTS" || e.kind === "REACHES")
      .map((e) => this.getNode(e.fromId, options.at ?? options.pin)).filter(Boolean);
  }

  snapshot(at) {
    const pin = clonePin(this._resolvePin(at));
    return { pin, nodes: this.listNodes({ at: pin }), edges: this.listEdges({ at: pin }) };
  }
}

export const GraphStore = KnowledgeGraph;
export const KnowledgeGraphStore = KnowledgeGraph;

export function createKnowledgeGraph(options) { return new KnowledgeGraph(options); }
export function createGraphStore(options) { return new KnowledgeGraph(options); }
export function createGraph(options) { return new KnowledgeGraph(options); }

export default KnowledgeGraph;
