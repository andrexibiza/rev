// GraphQL-over-HTTP handler + minimal query executor for Rev (schema.md §5-§6).
// Zero dependencies (Node >=22 built-ins only). No `graphql` package.
//
// SUPPORTED SUBSET (honest scope — this is NOT a full GraphQL implementation):
//   Root Query fields: node(id), repository(id, at), repositories(first, after),
//     workEvent(id), advisory(osvId), advisories(first, after, ecosystem,
//     reachableOnly), trace(id), registry(first, after, filter).
//     This covers the schema.md core queries including the single-round-trip
//     advisory reachability triage query (repository pin/authorityMap +
//     advisory reachableEntities/reachabilityPath in one operation).
//   Nested fields: Repository { id, host, owner, name, defaultBranch, pin,
//     authorityMap, promises, codeEntities, findings, advisories, workEvents,
//     knowledgeGraph }, Promise { codeEntities, findings },
//     CodeEntity { id, path, spanStart, spanEnd, language, contentHash,
//     consumers, tests, owners, advisories },
//     Advisory { id, osvId, aliases, ecosystem, packageName, summary,
//     publishedAt, knownExploited, affectedEntities, reachableEntities,
//     reachabilityPath }, WorkEvent { id, operation, state, pin, proofDigest,
//     idempotencyKey, trace, receipt, findings, repairs },
//     Finding/Repair/Trace/Span/LaneRun/Receipt/PullRequestProjection fields
//     as stored on graph nodes, KnowledgeGraph { pin, nodeCount, edgeCount,
//     nodes(first, after, kinds), path(fromId, toId, at),
//     blastRadius(entityId, at, depth) }, GraphEdge { kind, fromId, toId,
//     evidence, pin }, EvidenceRef { kind, ref, digest, pin },
//     Pin { sha, generation, policyHash, resolvedAt },
//     AuthorityMap { pin, codeownersPath, holders, requiredApprovals,
//     mergeHolders, ambiguous, refusalReason }.
//   Language: operations (query + shorthand), named operations, variables
//     ($var in arguments and nested PinInput/filter objects), aliases,
//     inline fragments (... on Type), Relay connections
//     (edges { cursor, node }, pageInfo) with first/after cursor pagination.
//     AFFECTS vs REACHES remain distinct: affectedEntities reads AFFECTS
//     edges only, reachableEntities/reachabilityPath read REACHES only.
//   Transport: createGraphQLHandler returns a (req, res) handler for
//     node:http (POST JSON { query, variables, operationName } and
//     GET ?query=&variables=). executeGraphQL runs the same executor
//     without HTTP, which is what tests and in-process callers should use.
//
// NOT SUPPORTED / GAPS (documented, not silently faked):
//   - Mutations and subscriptions: parsed, then refused with a GraphQL
//     error (extensions.code = "NOT_IMPLEMENTED"); schema.md mutations
//     (enqueueReview, requestFix, respondToAdvisory, recordMaintainerMerge,
//     reconcileIndeterminate, ...) are not executed by this module.
//   - Named fragment spreads (parsed and resolved if defined in the same
//     document for inline use, but no persisted-query registry by hash).
//   - Directives (@include/@skip/@deprecated etc. are skipped, not applied),
//     schema introspection (__schema/__type return a minimal stub error),
//     union/interface runtime type resolution beyond the node-kind mapping,
//     validation against the full SDL (unknown fields resolve to null
//     rather than a spec validation error), sorting, `last/before`
//     pagination, and proof-object authorization (queries assume the
//     caller already holds a repo-scoped read context; no grant widening
//     checks are performed here — see src/types.mjs validateProof).
//   - Data lives only in the injected KnowledgeGraph (src/graph.mjs)
//     and/or plain arrays passed in context; there is no database.

import { makePin } from "./graph.mjs";

export const SUPPORTED_QUERIES = ["repository", "workEvent", "advisory", "registry", "repositories", "advisories", "node", "trace"];

// ---------------------------------------------------------------------------
// Tokenizer
// ---------------------------------------------------------------------------
function tokenize(source) {
  const tokens = [];
  let i = 0;
  const isNameStart = (c) => /[A-Za-z_]/.test(c);
  const isNameChar = (c) => /[A-Za-z0-9_]/.test(c);
  while (i < source.length) {
    const c = source[i];
    if (c === " " || c === "\t" || c === "\n" || c === "\r" || c === ",") { i++; continue; }
    if (c === "#") { while (i < source.length && source[i] !== "\n") i++; continue; }
    if (source.startsWith("...", i)) { tokens.push({ type: "SPREAD", value: "..." }); i += 3; continue; }
    if ("{}():[]=@$!".includes(c)) { tokens.push({ type: "PUNCT", value: c }); i++; continue; }
    if (c === '"') {
      if (source.startsWith('"""', i)) {
        const end = source.indexOf('"""', i + 3);
        if (end === -1) throw new Error("Unterminated block string");
        tokens.push({ type: "STRING", value: source.slice(i + 3, end) });
        i = end + 3; continue;
      }
      let j = i + 1; let out = "";
      while (j < source.length && source[j] !== '"') {
        if (source[j] === "\\" && j + 1 < source.length) { out += source[j + 1]; j += 2; }
        else { out += source[j]; j++; }
      }
      if (j >= source.length) throw new Error("Unterminated string");
      tokens.push({ type: "STRING", value: out }); i = j + 1; continue;
    }
    if (c === "-" || /[0-9]/.test(c)) {
      let j = i; if (source[j] === "-") j++;
      while (j < source.length && /[0-9]/.test(source[j])) j++;
      let isFloat = false;
      if (source[j] === ".") { isFloat = true; j++; while (j < source.length && /[0-9]/.test(source[j])) j++; }
      if (source[j] === "e" || source[j] === "E") { isFloat = true; j++; if (source[j] === "+" || source[j] === "-") j++; while (j < source.length && /[0-9]/.test(source[j])) j++; }
      const raw = source.slice(i, j);
      tokens.push({ type: isFloat ? "FLOAT" : "INT", value: isFloat ? parseFloat(raw) : parseInt(raw, 10) });
      i = j; continue;
    }
    if (isNameStart(c)) {
      let j = i; while (j < source.length && isNameChar(source[j])) j++;
      tokens.push({ type: "NAME", value: source.slice(i, j) }); i = j; continue;
    }
    throw new Error(`Unexpected character: ${JSON.stringify(c)} at ${i}`);
  }
  tokens.push({ type: "EOF", value: null });
  return tokens;
}

// ---------------------------------------------------------------------------
// Parser (operations, fragments, selection sets, arguments)
// ---------------------------------------------------------------------------
class Parser {
  constructor(tokens) { this.tokens = tokens; this.pos = 0; }
  peek() { return this.tokens[this.pos]; }
  next() { return this.tokens[this.pos++]; }
  expect(type, value) {
    const t = this.next();
    if (t.type !== type || (value !== undefined && t.value !== value)) throw new Error(`Expected ${type} ${value ?? ""}, got ${t.type} ${t.value}`);
    return t;
  }
  skipPunct(value) { if (this.peek().type === "PUNCT" && this.peek().value === value) { this.pos++; return true; } return false; }
  parseDocument() {
    const definitions = [];
    while (this.peek().type !== "EOF") definitions.push(this.parseDefinition());
    return { definitions };
  }
  parseDefinition() {
    const t = this.peek();
    if (t.type === "PUNCT" && t.value === "{") return { kind: "Operation", operation: "query", name: null, variableDefinitions: [], selectionSet: this.parseSelectionSet() };
    if (t.type === "NAME" && (t.value === "query" || t.value === "mutation" || t.value === "subscription")) {
      this.next();
      const operation = t.value;
      let name = null;
      if (this.peek().type === "NAME") name = this.next().value;
      const variableDefinitions = this.peek().type === "PUNCT" && this.peek().value === "(" ? this.parseVariableDefinitions() : [];
      this.skipDirectives();
      const selectionSet = this.parseSelectionSet();
      return { kind: "Operation", operation, name, variableDefinitions, selectionSet };
    }
    if (t.type === "NAME" && t.value === "fragment") {
      this.next();
      const name = this.expect("NAME").value;
      this.expect("NAME", "on");
      const typeCondition = this.expect("NAME").value;
      this.skipDirectives();
      const selectionSet = this.parseSelectionSet();
      return { kind: "Fragment", name, typeCondition, selectionSet };
    }
    throw new Error(`Unexpected definition token: ${t.type} ${t.value}`);
  }
  parseVariableDefinitions() {
    this.expect("PUNCT", "(");
    const defs = [];
    while (!(this.peek().type === "PUNCT" && this.peek().value === ")")) {
      this.expect("PUNCT", "$");
      const name = this.expect("NAME").value;
      this.expect("PUNCT", ":");
      this.parseType();
      let defaultValue = null;
      if (this.skipPunct("=")) defaultValue = this.parseValue(true);
      this.skipDirectives();
      defs.push({ name, defaultValue });
    }
    this.expect("PUNCT", ")");
    return defs;
  }
  parseType() {
    if (this.skipPunct("[")) { this.parseType(); this.expect("PUNCT", "]"); }
    else this.expect("NAME");
    this.skipPunct("!");
  }
  skipDirectives() {
    while (this.peek().type === "PUNCT" && this.peek().value === "@") {
      this.next(); this.expect("NAME");
      if (this.peek().type === "PUNCT" && this.peek().value === "(") this.parseArguments();
    }
  }
  parseSelectionSet() {
    this.expect("PUNCT", "{");
    const selections = [];
    while (!(this.peek().type === "PUNCT" && this.peek().value === "}")) selections.push(this.parseSelection());
    this.expect("PUNCT", "}");
    return selections;
  }
  parseSelection() {
    if (this.peek().type === "SPREAD") {
      this.next();
      if (this.peek().type === "NAME" && this.peek().value === "on") {
        this.next();
        const typeCondition = this.expect("NAME").value;
        this.skipDirectives();
        const selectionSet = this.parseSelectionSet();
        return { kind: "InlineFragment", typeCondition, selectionSet };
      }
      const name = this.expect("NAME").value;
      this.skipDirectives();
      return { kind: "FragmentSpread", name };
    }
    // Field: [alias:] name [args] [directives] [selectionSet]
    let name = this.expect("NAME").value;
    let alias = null;
    if (this.skipPunct(":")) { alias = name; name = this.expect("NAME").value; }
    const args = this.peek().type === "PUNCT" && this.peek().value === "(" ? this.parseArguments() : {};
    this.skipDirectives();
    const selectionSet = this.peek().type === "PUNCT" && this.peek().value === "{" ? this.parseSelectionSet() : null;
    return { kind: "Field", name, alias, arguments: args, selectionSet };
  }
  parseArguments() {
    this.expect("PUNCT", "(");
    const args = {};
    while (!(this.peek().type === "PUNCT" && this.peek().value === ")")) {
      const name = this.expect("NAME").value;
      this.expect("PUNCT", ":");
      args[name] = this.parseValue(false);
    }
    this.expect("PUNCT", ")");
    return args;
  }
  parseValue(isConst) {
    const t = this.peek();
    if (t.type === "PUNCT" && t.value === "$") { this.next(); return { kind: "Variable", name: this.expect("NAME").value }; }
    if (t.type === "INT") { this.next(); return { kind: "Int", value: t.value }; }
    if (t.type === "FLOAT") { this.next(); return { kind: "Float", value: t.value }; }
    if (t.type === "STRING") { this.next(); return { kind: "String", value: t.value }; }
    if (t.type === "NAME") {
      this.next();
      if (t.value === "true") return { kind: "Boolean", value: true };
      if (t.value === "false") return { kind: "Boolean", value: false };
      if (t.value === "null") return { kind: "Null", value: null };
      return { kind: "Enum", value: t.value };
    }
    if (t.type === "PUNCT" && t.value === "[") {
      this.next(); const values = [];
      while (!(this.peek().type === "PUNCT" && this.peek().value === "]")) values.push(this.parseValue(isConst));
      this.expect("PUNCT", "]");
      return { kind: "List", values };
    }
    if (t.type === "PUNCT" && t.value === "{") {
      this.next(); const fields = {};
      while (!(this.peek().type === "PUNCT" && this.peek().value === "}")) {
        const name = this.expect("NAME").value;
        this.expect("PUNCT", ":");
        fields[name] = this.parseValue(isConst);
      }
      this.expect("PUNCT", "}");
      return { kind: "Object", fields };
    }
    throw new Error(`Unexpected value token: ${t.type} ${t.value}`);
  }
}

function resolveValue(node, variables) {
  if (!node) return undefined;
  switch (node.kind) {
    case "Variable": return variables[node.name];
    case "Int": case "Float": case "String": case "Boolean": case "Enum": return node.value;
    case "Null": return null;
    case "List": return node.values.map((v) => resolveValue(v, variables));
    case "Object": {
      const out = {};
      for (const [k, v] of Object.entries(node.fields)) out[k] = resolveValue(v, variables);
      return out;
    }
    default: return undefined;
  }
}
function resolveArgs(argNodes, variables) {
  const out = {};
  for (const [k, v] of Object.entries(argNodes ?? {})) out[k] = resolveValue(v, variables);
  return out;
}

// ---------------------------------------------------------------------------
// Data access helpers (graph-first, plain-array context as fallback)
// ---------------------------------------------------------------------------
const KIND_TO_TYPE = {
  Repository: "Repository", Promise: "Promise", CodeEntity: "CodeEntity", Consumer: "CodeEntity",
  Seam: "Seam", TestAssertion: "TestAssertion", AuthorityHolder: "AuthorityHolder",
  Advisory: "Advisory", Finding: "Finding", Repair: "Repair",
  PullRequestProjection: "PullRequestProjection", Receipt: "Receipt",
  LaneRun: "LaneRun", Trace: "Trace", Span: "Span", WorkEvent: "WorkEvent",
};
function typenameOf(obj) {
  if (!obj || typeof obj !== "object") return null;
  if (obj.__typename) return obj.__typename;
  if (obj.kind && KIND_TO_TYPE[obj.kind]) return KIND_TO_TYPE[obj.kind];
  if (obj.osvId) return "Advisory";
  if (obj.operation && obj.state) return "WorkEvent";
  if (obj.path && obj.contentHash) return "CodeEntity";
  return "GraphNode";
}
function wrap(node) {
  if (!node || typeof node !== "object") return node;
  if (node.__typename) return node;
  return { __typename: typenameOf(node), ...node };
}

function graphOf(ctx) { return ctx.graph ?? ctx.store ?? ctx.context?.graph ?? null; }

function collection(ctx, arrayName, kind, at) {
  const raw = ctx[arrayName] ?? ctx.context?.[arrayName];
  if (Array.isArray(raw)) return raw.map(wrap);
  const graph = graphOf(ctx);
  if (graph && typeof graph.listNodes === "function") return graph.listNodes({ at, kinds: [kind] }).map(wrap);
  return [];
}
function findNode(ctx, id, at) {
  const graph = graphOf(ctx);
  if (graph && typeof graph.getNode === "function") {
    const n = graph.getNode(id, at);
    if (n) return wrap(n);
  }
  for (const name of ["repositories", "workEvents", "advisories", "traces", "nodes"]) {
    const arr = ctx[name] ?? ctx.context?.[name];
    if (Array.isArray(arr)) { const hit = arr.find((x) => x.id === id); if (hit) return wrap(hit); }
  }
  return null;
}
function resolvedPin(ctx, at, fallbackObj) {
  const graph = graphOf(ctx);
  if (at && (at.sha || at.generation)) return makePin({ sha: at.sha, generation: at.generation, policyHash: at.policyHash });
  if (fallbackObj?.pin) return fallbackObj.pin;
  if (graph && typeof graph.getPin === "function") return graph.getPin();
  if (graph?.pin) return graph.pin;
  return makePin({});
}
function encodeCursor(idx) { return Buffer.from(`cursor:${idx}`).toString("base64"); }
function decodeCursor(cursor) {
  try {
    const raw = Buffer.from(String(cursor), "base64").toString("utf8");
    const m = /^cursor:(\d+)$/.exec(raw);
    if (m) return parseInt(m[1], 10);
    const n = parseInt(raw, 10);
    return Number.isNaN(n) ? 0 : n;
  } catch { return 0; }
}
function connection(items, args = {}) {
  const list = items ?? [];
  const first = args.first != null ? Math.max(0, args.first) : list.length;
  const start = args.after ? decodeCursor(args.after) + 1 : 0;
  const slice = list.slice(start, start + first);
  const edges = slice.map((node, i) => ({ __typename: `${typenameOf(node) ?? "GraphNode"}Edge`, cursor: encodeCursor(start + i), node: wrap(node) }));
  return {
    __typename: `${typenameOf(slice[0]) ?? "GraphNode"}Connection`,
    edges,
    pageInfo: {
      __typename: "PageInfo",
      hasNextPage: start + slice.length < list.length,
      hasPreviousPage: start > 0,
      startCursor: edges[0]?.cursor ?? null,
      endCursor: edges[edges.length - 1]?.cursor ?? null,
    },
  };
}

// ---------------------------------------------------------------------------
// Field resolution
// ---------------------------------------------------------------------------
function advisoryByOsv(ctx, osvId, at) {
  const all = collection(ctx, "advisories", "Advisory", at);
  return all.find((a) => a.osvId === osvId || a.id === osvId || (a.aliases ?? []).includes(osvId)) ?? null;
}

function resolveRootField(fieldName, args, ctx) {
  const graph = graphOf(ctx);
  const at = args.at;
  switch (fieldName) {
    case "node": return args.id ? findNode(ctx, args.id, at) : null;
    case "repository": {
      if (!args.id) return null;
      const hit = findNode(ctx, args.id, at);
      if (hit && typenameOf(hit) === "Repository") return { ...hit, pin: resolvedPin(ctx, at, hit) };
      const fromCol = collection(ctx, "repositories", "Repository", at).find((r) => r.id === args.id);
      return fromCol ? { ...fromCol, pin: resolvedPin(ctx, at, fromCol) } : (hit ?? null);
    }
    case "repositories": return connection(collection(ctx, "repositories", "Repository", at), args);
    case "workEvent": {
      if (!args.id) return null;
      const hit = findNode(ctx, args.id, at);
      if (hit) return hit;
      return collection(ctx, "workEvents", "WorkEvent", at).find((w) => w.id === args.id) ?? null;
    }
    case "advisory": return args.osvId ? advisoryByOsv(ctx, args.osvId, at) : null;
    case "advisories": {
      let list = collection(ctx, "advisories", "Advisory", at);
      if (args.ecosystem) list = list.filter((a) => a.ecosystem === args.ecosystem);
      if (args.reachableOnly) {
        list = list.filter((a) => {
          if (graph && typeof graph.listEdges === "function") return graph.listEdges({ at, fromId: a.id, kind: "REACHES" }).length > 0;
          return (a.reachableEntities ?? []).length > 0;
        });
      }
      return connection(list, args);
    }
    case "trace": {
      if (!args.id) return null;
      const hit = findNode(ctx, args.id, at);
      if (hit) return hit;
      const fromCol = collection(ctx, "traces", "Trace", at).find((t) => t.id === args.id);
      if (fromCol) return fromCol;
      // Synthesize a Trace facade for a WorkEvent id so trace(id) stays useful.
      const we = resolveRootField("workEvent", { id: args.id }, ctx);
      return we ? { __typename: "Trace", id: args.id, workEvent: we } : null;
    }
    case "registry": {
      let list = collection(ctx, "workEvents", "WorkEvent", at);
      const f = args.filter ?? {};
      if (f.repoId) list = list.filter((w) => w.repoId === f.repoId || w.repositoryId === f.repoId);
      if (f.state) list = list.filter((w) => w.state === f.state);
      if (f.advisoryId) list = list.filter((w) => w.advisoryId === f.advisoryId || w.osvId === f.advisoryId || w.advisoryOsvId === f.advisoryId);
      if (f.findingKind) list = list.filter((w) => w.findingKind === f.findingKind);
      if (f.awaitingMaintainer != null) {
        list = list.filter((w) => {
          const awaiting = w.awaitingMaintainer ?? (w.state === "QUEUED" || w.state === "COMPLETED");
          return Boolean(awaiting) === Boolean(f.awaitingMaintainer);
        });
      }
      return connection(list, args);
    }
    default: return null;
  }
}

function resolveFieldValue(obj, typeName, fieldName, args, ctx) {
  const graph = graphOf(ctx);
  if (obj == null) return null;
  // Facades carrying behaviour.
  if (typeName === "KnowledgeGraph") {
    const g = obj._graph ?? graph;
    const at = args.at ?? obj._at;
    switch (fieldName) {
      case "pin": return obj.pin ?? resolvedPin(ctx, at, obj);
      case "nodeCount": return g ? g.listNodes({ at }).length : (obj.nodes?.length ?? 0);
      case "edgeCount": return g ? g.listEdges({ at }).length : 0;
      case "nodes": return connection(g ? g.listNodes({ at, kinds: args.kinds }).map(wrap) : [], args);
      case "path": return (g && args.fromId && args.toId) ? g.path(args.fromId, args.toId, { at }).map((e) => ({ __typename: "GraphEdge", ...e })) : [];
      case "blastRadius": {
        if (!g || !args.entityId) return [];
        return g.blastRadius(args.entityId, { at, depth: args.depth }).map(wrap);
      }
      default: return obj[fieldName] ?? null;
    }
  }
  if (typeName === "Query") return resolveRootField(fieldName, args, ctx);

  if (typeName === "Repository") {
    const at = args.at;
    switch (fieldName) {
      case "pin": return resolvedPin(ctx, at, obj);
      case "authorityMap": {
        if (obj.authorityMap) {
          const am = obj.authorityMap;
          return { __typename: "AuthorityMap", pin: resolvedPin(ctx, at, obj), codeownersPath: am.codeownersPath ?? null, holders: (am.holders ?? []).map(wrap), requiredApprovals: am.requiredApprovals ?? 1, mergeHolders: (am.mergeHolders ?? []).map(wrap), ambiguous: Boolean(am.ambiguous), refusalReason: am.refusalReason ?? null };
        }
        const holders = collection(ctx, "authorityHolders", "AuthorityHolder", at);
        return { __typename: "AuthorityMap", pin: resolvedPin(ctx, at, obj), codeownersPath: obj.codeownersPath ?? null, holders, requiredApprovals: obj.requiredApprovals ?? 1, mergeHolders: holders, ambiguous: holders.length === 0, refusalReason: holders.length === 0 ? "AUTHORITY_AMBIGUOUS" : null };
      }
      case "promises": return connection(collection(ctx, "promises", "Promise", at), args);
      case "codeEntities": {
        let list = collection(ctx, "codeEntities", "CodeEntity", at);
        if (args.pathPrefix) list = list.filter((c) => (c.path ?? "").startsWith(args.pathPrefix));
        return connection(list, args);
      }
      case "findings": {
        let list = collection(ctx, "findings", "Finding", at);
        if (args.disposition) list = list.filter((f) => f.disposition === args.disposition);
        return connection(list, args);
      }
      case "advisories": {
        let list = collection(ctx, "advisories", "Advisory", at);
        if (args.reachableOnly && graph) list = list.filter((a) => graph.listEdges({ at, fromId: a.id, kind: "REACHES" }).length > 0);
        return connection(list, args);
      }
      case "workEvents": {
        let list = collection(ctx, "workEvents", "WorkEvent", at);
        if (args.state) list = list.filter((w) => w.state === args.state);
        return connection(list, args);
      }
      case "knowledgeGraph": {
        const pin = resolvedPin(ctx, at, obj);
        return { __typename: "KnowledgeGraph", pin, _graph: graph, _at: at ?? pin };
      }
      default: return obj[fieldName] ?? null;
    }
  }

  if (typeName === "CodeEntity") {
    const at = args.at;
    switch (fieldName) {
      case "consumers": {
        if (graph) return connection(graph.consumersOf(obj.id, { at }).map(wrap), args);
        return connection([], args);
      }
      case "tests": {
        if (graph) {
          const tests = graph.listEdges({ at, toId: obj.id, kind: "ASSERTS" }).map((e) => graph.getNode(e.fromId, at)).filter(Boolean).map(wrap);
          return connection(tests, args);
        }
        return connection([], args);
      }
      case "owners": {
        if (graph) return graph.listEdges({ at, toId: obj.id, kind: "OWNS" }).map((e) => graph.getNode(e.fromId, at)).filter(Boolean).map(wrap);
        return (obj.owners ?? []).map(wrap);
      }
      case "advisories": {
        if (graph) return connection(graph.advisoriesForEntity(obj.id, { at }).map(wrap), args);
        return connection([], args);
      }
      default: return obj[fieldName] ?? null;
    }
  }

  if (typeName === "Advisory") {
    const at = args.at;
    switch (fieldName) {
      case "affectedEntities": {
        if (graph) return connection(graph.affectedEntities(obj.id, { at }).map(wrap), args);
        return connection((obj.affectedEntities ?? []).map(wrap), args);
      }
      case "reachableEntities": {
        if (graph) return connection(graph.reachableEntities(obj.id, { at }).map(wrap), args);
        return connection((obj.reachableEntities ?? []).map(wrap), args);
      }
      case "reachabilityPath": {
        if (graph) return graph.reachabilityPath(obj.id, { at }).map((e) => ({ __typename: "GraphEdge", ...e }));
        return obj.reachabilityPath ?? [];
      }
      default: return obj[fieldName] ?? null;
    }
  }

  if (typeName === "WorkEvent") {
    switch (fieldName) {
      case "pin": return resolvedPin(ctx, args.at, obj);
      case "trace": {
        if (obj.trace && typeof obj.trace === "object") return wrap(obj.trace);
        if (obj.traceId) { const t = findNode(ctx, obj.traceId, args.at); if (t) return t; }
        return { __typename: "Trace", id: obj.traceId ?? `trace:${obj.id}`, workEvent: wrap(obj) };
      }
      case "receipt": {
        if (obj.receipt && typeof obj.receipt === "object") return wrap({ __typename: "Receipt", ...obj.receipt });
        if (graph && obj.id) {
          const e = graph.listEdges({ toId: obj.id, kind: "SETTLES" })[0];
          if (e) { const r = graph.getNode(e.fromId); if (r) return wrap(r); }
        }
        return obj.receipt ?? null;
      }
      case "findings": return connection(collection(ctx, "findings", "Finding", args.at).filter((f) => !obj.findingIds || obj.findingIds.includes(f.id)), args);
      case "repairs": return connection(collection(ctx, "repairs", "Repair", args.at), args);
      default: return obj[fieldName] ?? null;
    }
  }

  if (typeName === "Promise") {
    if (fieldName === "codeEntities") {
      if (graph) {
        const list = graph.listEdges({ fromId: obj.id, kind: "PROMISES" }).map((e) => graph.getNode(e.toId)).filter(Boolean).map(wrap);
        return connection(list, args);
      }
      return connection((obj.codeEntities ?? []).map(wrap), args);
    }
    if (fieldName === "findings") return connection(collection(ctx, "findings", "Finding", args.at), args);
    return obj[fieldName] ?? null;
  }
  if (typeName === "Finding") {
    if (fieldName === "repairs") return connection(collection(ctx, "repairs", "Repair", args.at), args);
    if (fieldName === "pin") return resolvedPin(ctx, args.at, obj);
    if (fieldName === "evidence") return obj.evidence ?? [];
    return obj[fieldName] ?? null;
  }
  if (typeName === "Repair") {
    if (fieldName === "findings") return connection(collection(ctx, "findings", "Finding", args.at), args);
    if (fieldName === "laneRuns") return connection(collection(ctx, "laneRuns", "LaneRun", args.at), args);
    if (fieldName === "projection") return obj.projection ? wrap(obj.projection) : null;
    if (fieldName === "receipt") return obj.receipt ? wrap(obj.receipt) : null;
    return obj[fieldName] ?? null;
  }
  if (typeName === "Trace") {
    if (fieldName === "workEvent") {
      if (obj.workEvent && typeof obj.workEvent === "object") return wrap(obj.workEvent);
      if (obj.workEventId) return findNode(ctx, obj.workEventId, args.at);
      return obj.workEvent ?? null;
    }
    if (fieldName === "spans") {
      let list = collection(ctx, "spans", "Span", args.at);
      if (args.kind) list = list.filter((s) => s.kind === args.kind);
      return connection(list, args);
    }
    return obj[fieldName] ?? null;
  }

  // Generic types: Pin, GraphEdge, EvidenceRef, AuthorityMap, holders, etc.
  if (fieldName === "pin") return resolvedPin(ctx, args.at, obj);
  if (obj && typeof obj === "object" && fieldName in obj) return obj[fieldName];
  return null;
}

// ---------------------------------------------------------------------------
// Executor
// ---------------------------------------------------------------------------
function expandSelections(selections, fragments, typeName) {
  const out = [];
  for (const sel of selections ?? []) {
    if (sel.kind === "Field") out.push(sel);
    else if (sel.kind === "InlineFragment") {
      if (!sel.typeCondition || !typeName || sel.typeCondition === typeName) out.push(...expandSelections(sel.selectionSet, fragments, typeName));
    } else if (sel.kind === "FragmentSpread") {
      const frag = fragments.get(sel.name);
      if (frag && (!frag.typeCondition || !typeName || frag.typeCondition === typeName)) out.push(...expandSelections(frag.selectionSet, fragments, typeName));
    }
  }
  return out;
}

function executeSelectionSet(obj, selections, ctx, fragments, typeName) {
  const fields = expandSelections(selections, fragments, typeName);
  const out = {};
  for (const field of fields) {
    const responseKey = field.alias ?? field.name;
    if (field.name === "__typename") { out[responseKey] = typeName; continue; }
    if (field.name === "__schema" || field.name === "__type") {
      out[responseKey] = null;
      (ctx._errors ??= []).push({ message: `Introspection ${field.name} is not supported by this minimal executor`, extensions: { code: "NOT_IMPLEMENTED" } });
      continue;
    }
    const args = resolveArgs(field.arguments, ctx.variables);
    let value;
    try { value = resolveFieldValue(obj, typeName, field.name, args, ctx); }
    catch (err) {
      (ctx._errors ??= []).push({ message: err.message, extensions: { code: "FIELD_ERROR" } });
      value = null;
    }
    if (value == null) { out[responseKey] = null; continue; }
    if (!field.selectionSet) { out[responseKey] = value; continue; }
    if (Array.isArray(value)) {
      out[responseKey] = value.map((item) => {
        if (item == null || typeof item !== "object") return item;
        return executeSelectionSet(item, field.selectionSet, ctx, fragments, typenameOf(item));
      });
    } else if (typeof value === "object") {
      out[responseKey] = executeSelectionSet(value, field.selectionSet, ctx, fragments, typenameOf(value) ?? typeName);
    } else out[responseKey] = value;
  }
  return out;
}

export function executeGraphQL({ query, variables = {}, operationName = null, context = {}, graph, ...rest } = {}) {
  const ctx = { ...rest, ...context, variables: variables ?? {} };
  if (graph) ctx.graph = graph;
  if (context.graph && !ctx.graph) ctx.graph = context.graph;
  // Allow data arrays passed directly alongside the call.
  for (const k of ["repositories", "workEvents", "advisories", "traces", "findings", "repairs", "promises", "codeEntities", "spans", "laneRuns"]) {
    if (rest[k] && !ctx[k]) ctx[k] = rest[k];
    if (context[k] && !ctx[k]) ctx[k] = context[k];
  }
  if (typeof query !== "string" || !query.trim()) {
    return { data: null, errors: [{ message: "GraphQL query string is required", extensions: { code: "BAD_REQUEST" } }] };
  }
  let document;
  try { document = new Parser(tokenize(query)).parseDocument(); }
  catch (err) { return { data: null, errors: [{ message: err.message, extensions: { code: "BAD_REQUEST" } }] }; }

  const fragments = new Map();
  const operations = [];
  for (const def of document.definitions) {
    if (def.kind === "Fragment") fragments.set(def.name, def);
    else operations.push(def);
  }
  const operation = operationName ? operations.find((o) => o.name === operationName) : operations[0];
  if (!operation) return { data: null, errors: [{ message: "No GraphQL operation found", extensions: { code: "BAD_REQUEST" } }] };
  if (operation.operation !== "query") {
    return { data: null, errors: [{ message: `${operation.operation} operations are not supported by this minimal executor (queries only; see file header)`, extensions: { code: "NOT_IMPLEMENTED" } }] };
  }
  // Variable defaults.
  const vars = { ...ctx.variables };
  for (const vd of operation.variableDefinitions ?? []) {
    if (vars[vd.name] === undefined && vd.defaultValue) vars[vd.name] = resolveValue(vd.defaultValue, vars);
  }
  ctx.variables = vars;
  const root = { __typename: "Query" };
  const data = executeSelectionSet(root, operation.selectionSet, ctx, fragments, "Query");
  const result = { data };
  if (ctx._errors?.length) result.errors = ctx._errors;
  return result;
}
export const execute = executeGraphQL;
export const graphql = executeGraphQL;

// ---------------------------------------------------------------------------
// HTTP transport (zero-dependency, for node:http)
// ---------------------------------------------------------------------------
export function createGraphQLHandler(options = {}) {
  return async function graphqlHttpHandler(req, res) {
    const send = (status, payload) => {
      const body = JSON.stringify(payload);
      res.writeHead(status, { "content-type": "application/json" });
      res.end(body);
    };
    try {
      const url = new URL(req.url ?? "/", "http://localhost");
      let query; let variables = {}; let operationName = null;
      if (req.method === "GET") {
        query = url.searchParams.get("query");
        const rawVars = url.searchParams.get("variables");
        if (rawVars) variables = JSON.parse(rawVars);
        operationName = url.searchParams.get("operationName");
      } else if (req.method === "POST") {
        const chunks = [];
        for await (const chunk of req) chunks.push(chunk);
        const raw = Buffer.concat(chunks).toString("utf8");
        if (!raw) { send(400, { data: null, errors: [{ message: "Empty request body", extensions: { code: "BAD_REQUEST" } }] }); return; }
        let body;
        try { body = JSON.parse(raw); } catch { send(400, { data: null, errors: [{ message: "Invalid JSON body", extensions: { code: "BAD_REQUEST" } }] }); return; }
        query = body.query; variables = body.variables ?? {}; operationName = body.operationName ?? null;
      } else {
        send(405, { data: null, errors: [{ message: `Method ${req.method} not allowed`, extensions: { code: "BAD_REQUEST" } }] });
        return;
      }
      if (!query) { send(400, { data: null, errors: [{ message: "Missing GraphQL query", extensions: { code: "BAD_REQUEST" } }] }); return; }
      const context = typeof options.context === "function" ? options.context(req) : (options.context ?? {});
      const result = executeGraphQL({ query, variables, operationName, context, graph: options.graph ?? context.graph, repositories: options.repositories, workEvents: options.workEvents, advisories: options.advisories, traces: options.traces });
      send(result.errors?.some((e) => e.extensions?.code === "BAD_REQUEST") ? 400 : 200, result);
    } catch (err) {
      send(500, { data: null, errors: [{ message: err.message, extensions: { code: "INTERNAL" } }] });
    }
  };
}
export const createHandler = createGraphQLHandler;
export async function handleGraphQLRequest(req, res, options = {}) {
  return createGraphQLHandler(options)(req, res);
}

export default executeGraphQL;
