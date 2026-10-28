// Traces + costs (schema.md §8, references/costs-incidents.md, references/observability.md).
// Three span kinds share one Trace per WorkEvent: AUTHORITY, LANE, EXECUTION.
// Span attributes are allowlisted per kind, value-free only: no secrets, no raw
// env values, and chain-of-thought is never a field, attribute, or streamed value.
import { randomBytes } from "node:crypto";

export const SPAN_KINDS = ["AUTHORITY", "LANE", "EXECUTION"];
export const SpanKinds = SPAN_KINDS;
export const SpanKind = SPAN_KINDS;

export const AUTHORITY_STAGES = ["admission", "projection", "mutation", "settlement"];
export const AuthorityStages = AUTHORITY_STAGES;

// Allowlist per schema.md §8. Any other key is rejected, not stripped.
export const AUTHORITY_ATTRIBUTES = ["authorityId", "policyHash", "generation", "reasonCode"];
export const LANE_ATTRIBUTES = ["laneKind", "inputDigests", "outputDigest", "verdict"];
export const EXECUTION_ATTRIBUTES = ["argvDigest", "envKeyNames", "stdinPolicy", "exitObservation"];

export const SPAN_ATTRIBUTES = Object.freeze({
  AUTHORITY: Object.freeze([...AUTHORITY_ATTRIBUTES]),
  LANE: Object.freeze([...LANE_ATTRIBUTES]),
  EXECUTION: Object.freeze([...EXECUTION_ATTRIBUTES]),
});
export const ATTRIBUTE_ALLOWLIST = SPAN_ATTRIBUTES;
export const ALLOWED_ATTRIBUTES = SPAN_ATTRIBUTES;
export const SPAN_ATTRIBUTE_ALLOWLIST = SPAN_ATTRIBUTES;

// Normalized (lowercase, separators removed) key fragments that are always banned.
// Classification is by meaning: aliases / long forms of the concept are banned too,
// not only the exact spellings listed here.
const COT_FRAGMENTS = [
  "chainofthought", "chainthought", "innerthought", "innermonologue",
  "scratchpad", "hiddenreasoning", "reasoningtrace", "thoughtprocess",
  "thinkingtrace", "chainofreasoning",
];
const COT_KEYS = new Set(["cot", "reasoning", "thinking", "thought", "thoughts", "think"]);
const SECRET_KEY_FRAGMENTS = [
  "secret", "password", "passwd", "apikey", "apisecret", "accesstoken",
  "authtoken", "bearertoken", "refreshtoken", "sessiontoken", "privatekey",
  "credential", "credentials", "clientsecret", "webhooksecret", "signingkey",
  "encryptionkey", "secretkey", "tokenvalue", "envvalue", "rawenv",
];

const SECRET_VALUE_PATTERNS = [
  /ghp_[A-Za-z0-9]{16,}/,
  /gho_[A-Za-z0-9]{16,}/,
  /ghu_[A-Za-z0-9]{16,}/,
  /ghs_[A-Za-z0-9]{16,}/,
  /ghr_[A-Za-z0-9]{16,}/,
  /github_pat_[A-Za-z0-9_]{16,}/,
  /sk-ant-[A-Za-z0-9_-]{10,}/,
  /sk-proj-[A-Za-z0-9_-]{10,}/,
  /\bsk-[A-Za-z0-9_-]{16,}/,
  /\bAKIA[0-9A-Z]{16}\b/,
  /-----BEGIN [A-Z ]*PRIVATE KEY-----/,
  /\bBearer\s+[A-Za-z0-9._~+/=-]{8,}/i,
  /\beyJ[A-Za-z0-9_-]{8,}\.eyJ[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}\b/,
  /(?:secret|password|passwd|api[\s_-]?key|access[\s_-]?token|auth[\s_-]?token|client[\s_-]?secret)\s*[:=]\s*\S+/i,
];

function normalizeKind(kind) {
  const k = String(kind ?? "").toUpperCase();
  if (!SPAN_KINDS.includes(k)) throw new Error(`Unknown span kind: ${kind} (expected AUTHORITY, LANE, or EXECUTION)`);
  return k;
}

function normalizeKey(key) {
  return String(key).toLowerCase().replace(/[^a-z0-9]/g, "");
}

export function isChainOfThoughtKey(key) {
  const n = normalizeKey(key);
  return COT_KEYS.has(n) || COT_FRAGMENTS.some((f) => n.includes(f)) || n.endsWith("chainofthought") || n.includes("chainofthought");
}
export const isCoTKey = isChainOfThoughtKey;

export function isSecretKey(key) {
  const n = normalizeKey(key);
  return SECRET_KEY_FRAGMENTS.some((f) => n.includes(f));
}

export function isSecretShaped(value) {
  if (typeof value === "string") {
    const v = value.trim();
    if (SECRET_VALUE_PATTERNS.some((re) => re.test(v))) return true;
    // KEY=value where KEY names a secret is a leaked env value, whatever the value.
    const m = /^([A-Za-z_][A-Za-z0-9_.-]*)\s*=\s*(.+)$/.exec(v);
    if (m && isSecretKey(m[1])) return true;
    return false;
  }
  if (Array.isArray(value)) return value.some((v) => isSecretShaped(v));
  if (value && typeof value === "object") {
    return Object.entries(value).some(([k, v]) => isChainOfThoughtKey(k) || isSecretKey(k) || isSecretShaped(v));
  }
  return false;
}
export const looksSecretShaped = isSecretShaped;
export const isSecretValue = isSecretShaped;

function assertValueFree(key, value) {
  if (isSecretShaped(value)) {
    throw new Error(`Span attribute "${key}" looks secret-bearing; spans are value-free (ids, digests, key names, reason codes only)`);
  }
  if (value && typeof value === "object") {
    for (const [k, v] of Object.entries(value)) {
      if (isChainOfThoughtKey(k)) throw new Error(`Span attribute "${key}.${k}" is chain-of-thought; chain-of-thought is never a span field or attribute`);
      if (isSecretKey(k)) throw new Error(`Span attribute "${key}.${k}" looks secret-bearing; spans are value-free`);
      assertValueFree(`${key}.${k}`, v);
    }
  }
}

export function validateSpanAttributes(kind, attributes = {}) {
  const k = normalizeKind(kind);
  if (attributes == null) attributes = {};
  if (typeof attributes !== "object" || Array.isArray(attributes)) throw new Error("Span attributes must be an object");
  const allowed = SPAN_ATTRIBUTES[k];
  for (const [key, value] of Object.entries(attributes)) {
    if (isChainOfThoughtKey(key)) {
      throw new Error(`Span attribute "${key}" is chain-of-thought; chain-of-thought is never a span field, attribute, or streamed value`);
    }
    if (!allowed.includes(key)) {
      if (isSecretKey(key)) throw new Error(`Span attribute "${key}" is not allowlisted for ${k} and looks secret-bearing; spans are value-free`);
      throw new Error(`Span attribute "${key}" is not allowlisted for ${k} span (allowed: ${allowed.join(", ")})`);
    }
    if (key === "envKeyNames") {
      if (!Array.isArray(value) || value.some((v) => typeof v !== "string" || !/^[A-Za-z_][A-Za-z0-9_]*$/.test(v))) {
        throw new Error(`Span attribute "envKeyNames" must be env key names only (names, never KEY=value values)`);
      }
    } else if (key === "inputDigests") {
      if (!Array.isArray(value) || value.some((v) => typeof v !== "string" || !v)) throw new Error(`Span attribute "inputDigests" must be an array of digest strings`);
    }
    assertValueFree(key, value);
  }
  return { ...attributes };
}
export const validateAttributes = validateSpanAttributes;
export const assertSpanAttributes = validateSpanAttributes;
export const validateSpanAttrs = validateSpanAttributes;

function hexId(bytes) { return randomBytes(bytes).toString("hex"); }

export class Span {
  constructor({ id, spanId, traceId, kind, name, parentSpanId = null, parentId = null, startedAt = null, endedAt = null, pin = null, attributes = {} } = {}) {
    this.kind = normalizeKind(kind);
    if (!name || typeof name !== "string") throw new Error("Span name is required");
    if (/chain.of.thought/i.test(name)) throw new Error("Span name must not reference chain-of-thought; it is never a span field");
    this.id = id ?? spanId ?? hexId(8);
    this.traceId = traceId ?? null;
    this.name = name;
    this.parentSpanId = parentSpanId ?? parentId ?? null;
    this.startedAt = startedAt ?? new Date().toISOString();
    this.endedAt = endedAt ?? null;
    if (this.endedAt && Date.parse(this.endedAt) < Date.parse(this.startedAt)) throw new Error("Span endedAt is before startedAt");
    this.pin = pin ?? null;
    this.attributes = validateSpanAttributes(this.kind, attributes);
  }
  get durationSeconds() {
    if (!this.endedAt) return null;
    const d = (Date.parse(this.endedAt) - Date.parse(this.startedAt)) / 1000;
    return Number.isFinite(d) && d >= 0 ? d : null;
  }
  toJSON() {
    return { id: this.id, traceId: this.traceId, kind: this.kind, name: this.name, parentSpanId: this.parentSpanId, startedAt: this.startedAt, endedAt: this.endedAt, pin: this.pin, attributes: { ...this.attributes } };
  }
}

export function makeSpan(input = {}) {
  // Reject a top-level chainOfThought field outright, in any spelling.
  for (const key of Object.keys(input ?? {})) {
    if (isChainOfThoughtKey(key)) throw new Error(`Field "${key}" is chain-of-thought; chain-of-thought is never a span field, attribute, or streamed value`);
  }
  return new Span(input);
}
export const createSpan = makeSpan;
export const makeSpanFrom = makeSpan;

export class Trace {
  constructor({ id, traceId, workEventId = null, workEvent = null, pin = null, spans = [] } = {}) {
    this.id = id ?? traceId ?? hexId(16);
    this.traceId = this.id;
    const we = workEvent ?? workEventId;
    this.workEventId = typeof we === "string" ? we : (we?.id ?? null);
    this.workEvent = we && typeof we === "object" ? we : null;
    this.pin = pin ?? null;
    this.spans = [];
    for (const s of spans) this.addSpan(s);
  }
  addSpan(input = {}) {
    const span = input instanceof Span ? input : makeSpan({ ...input, traceId: input.traceId ?? this.id });
    if (span.traceId && span.traceId !== this.id) throw new Error(`Span traceId ${span.traceId} does not match trace ${this.id}`);
    span.traceId = this.id;
    if (this.spans.some((s) => s.id === span.id)) throw new Error(`Duplicate span id: ${span.id}`);
    this.spans.push(span);
    return span;
  }
  // Alias used by lane runners.
  span(input) { return this.addSpan(input); }
  pushSpan(input) { return this.addSpan(input); }
  getSpans(kind = null) {
    return kind ? this.spans.filter((s) => s.kind === normalizeKind(kind)) : [...this.spans];
  }
  spansByKind(kind) { return this.getSpans(kind); }
  checkCompleteness(options) { return checkTraceCompleteness(this, options); }
  isComplete(options) { return checkTraceCompleteness(this, options).complete; }
  toJSON() {
    return { id: this.id, traceId: this.traceId, workEventId: this.workEventId, workEvent: this.workEvent, pin: this.pin, spans: this.spans.map((s) => s.toJSON()) };
  }
}

export function makeTrace(input = {}) { return new Trace(input); }
export const createTrace = makeTrace;
export const newTrace = makeTrace;

// ---------------------------------------------------------------------------
// Trace completeness: AUTHORITY chain unbroken, or a refusal span (§8 /
// references/observability.md checklist). A refusal is decisive and retained:
// its presence completes the trace even though later checkpoints never ran.
// ---------------------------------------------------------------------------
function spansOf(traceOrSpans, maybeSpans) {
  if (Array.isArray(traceOrSpans)) return [...traceOrSpans];
  if (Array.isArray(maybeSpans)) return [...maybeSpans];
  if (traceOrSpans?.spans) return typeof traceOrSpans.spans === "function" ? traceOrSpans.spans() : [...traceOrSpans.spans];
  if (traceOrSpans?.spanList) return [...traceOrSpans.spanList];
  return [];
}
function spanKindOf(s) { return String(s?.kind ?? "").toUpperCase(); }
function spanStage(name) {
  const n = String(name ?? "").toLowerCase();
  const tail = n.includes(".") ? n.split(".").pop() : n;
  return AUTHORITY_STAGES.includes(tail) ? tail : null;
}

export function checkTraceCompleteness(traceOrSpans, options = {}) {
  // Support checkTraceCompleteness(spans) and (trace, options) / (trace, spans).
  let opts = options;
  if (Array.isArray(options)) opts = {};
  const spans = spansOf(traceOrSpans, Array.isArray(options) ? options : null);
  const authority = spans.filter((s) => spanKindOf(s) === "AUTHORITY");
  const gaps = [];
  const refusalSpan = authority.find((s) => s?.attributes?.reasonCode || /refusal/i.test(String(s?.name ?? ""))) ?? null;
  if (refusalSpan) {
    return { complete: true, ok: true, valid: true, hasRefusal: true, refusalSpan, authoritySpans: authority, gaps: [], missing: [], reason: `AUTHORITY refusal span present (${refusalSpan.attributes?.reasonCode ?? refusalSpan.name})` };
  }
  if (!authority.length) {
    gaps.push("missing AUTHORITY spans");
    return { complete: false, ok: false, valid: false, hasRefusal: false, refusalSpan: null, authoritySpans: authority, gaps, missing: [...gaps], reason: gaps.join("; ") };
  }
  const byId = new Map(spans.map((s) => [s.id, s]));
  const ordered = [...authority].sort((a, b) => String(a.startedAt ?? "").localeCompare(String(b.startedAt ?? "")));
  // Stage order, when stages are named, must not go backwards.
  let lastStage = -1;
  for (const s of ordered) {
    const stage = spanStage(s.name);
    if (stage) {
      const idx = AUTHORITY_STAGES.indexOf(stage);
      if (idx < lastStage) gaps.push(`AUTHORITY stage out of order: ${s.name}`);
      lastStage = Math.max(lastStage, idx);
    }
  }
  const hasParentInfo = ordered.some((s) => s.parentSpanId != null || s.parentId != null);
  if (hasParentInfo) {
    const authIds = new Set(ordered.map((s) => s.id));
    const parentOf = (s) => s.parentSpanId ?? s.parentId ?? null;
    const roots = ordered.filter((s) => parentOf(s) == null);
    if (roots.length !== 1) gaps.push(`AUTHORITY chain must have exactly one root, found ${roots.length}`);
    const childCount = new Map();
    for (const s of ordered) {
      const p = parentOf(s);
      if (p == null) continue;
      if (!byId.has(p)) gaps.push(`AUTHORITY span ${s.id} (${s.name}) parent ${p} not found (broken chain)`);
      else if (!authIds.has(p)) gaps.push(`AUTHORITY span ${s.id} (${s.name}) parent ${p} is not an AUTHORITY span (broken chain)`);
      childCount.set(p, (childCount.get(p) ?? 0) + 1);
    }
    for (const [p, n] of childCount) if (n > 1) gaps.push(`AUTHORITY span ${p} has ${n} AUTHORITY children (forked chain)`);
    if (roots.length === 1 && !gaps.length) {
      // Walk the chain; a cycle or unreachable span leaves nodes unvisited.
      const childOf = new Map(ordered.map((s) => [parentOf(s), s]));
      const seen = new Set();
      let cur = roots[0];
      while (cur && !seen.has(cur.id)) { seen.add(cur.id); cur = childOf.get(cur.id) ?? null; }
      if (cur) gaps.push("AUTHORITY chain contains a cycle");
      if (seen.size !== ordered.length) gaps.push(`AUTHORITY chain visits ${seen.size}/${ordered.length} spans (broken chain)`);
    }
  }
  if (opts.requireSettlement) {
    if (!ordered.some((s) => spanStage(s.name) === "settlement")) gaps.push("missing AUTHORITY settlement stage");
  }
  const complete = gaps.length === 0;
  return { complete, ok: complete, valid: complete, hasRefusal: false, refusalSpan: null, authoritySpans: ordered, gaps, missing: [...gaps], reason: complete ? "AUTHORITY chain unbroken" : gaps.join("; ") };
}
export const validateTraceCompleteness = checkTraceCompleteness;
export const traceCompleteness = checkTraceCompleteness;
export const checkCompleteness = checkTraceCompleteness;
export function isTraceComplete(traceOrSpans, options) { return checkTraceCompleteness(traceOrSpans, options).complete; }
export const isCompleteTrace = isTraceComplete;

// Analyst and witness LANE spans over the same region must use disjoint input
// digests, otherwise witness isolation is not auditable (§8).
export function checkWitnessIsolation(traceOrSpans) {
  const spans = spansOf(traceOrSpans);
  const lanes = spans.filter((s) => spanKindOf(s) === "LANE");
  const byKind = new Map();
  for (const s of lanes) {
    const k = s.attributes?.laneKind ?? s.name;
    if (!byKind.has(k)) byKind.set(k, new Set());
    for (const d of s.attributes?.inputDigests ?? []) byKind.get(k).add(d);
  }
  const kinds = [...byKind.keys()];
  const overlaps = [];
  for (let i = 0; i < kinds.length; i++) for (let j = i + 1; j < kinds.length; j++) {
    const shared = [...byKind.get(kinds[i])].filter((d) => byKind.get(kinds[j]).has(d));
    if (shared.length) overlaps.push({ a: kinds[i], b: kinds[j], sharedDigests: shared });
  }
  const isolated = overlaps.length === 0;
  return { isolated, ok: isolated, disjoint: isolated, overlaps };
}
export const validateLaneIsolation = checkWitnessIsolation;
export const checkLaneIsolation = checkWitnessIsolation;

// ---------------------------------------------------------------------------
// Cost receipts (references/costs-incidents.md). Human minutes are always an
// estimate in kind: self-reported or approximated, never measured fact.
// ---------------------------------------------------------------------------
export const COST_OUTCOMES = ["verified-finding", "merged-repair", "closed-advisory"];
export const CostOutcomes = COST_OUTCOMES;

function num(value, field) {
  if (value == null) return 0;
  const n = Number(value);
  if (!Number.isFinite(n) || n < 0) throw new Error(`Cost field "${field}" must be a non-negative finite number`);
  return n;
}
function round6(n) { return Math.round(n * 1e6) / 1e6; }

function laneSecondsFrom(input) {
  let total = 0; const byKind = {};
  const add = (kind, secs) => { const s = num(secs, "laneSeconds"); total += s; if (kind) byKind[kind] = round6((byKind[kind] ?? 0) + s); };
  const raw = input.laneSeconds ?? input.laneSecondsByKind ?? input.laneSecondsByLane;
  if (typeof raw === "number") total += num(raw, "laneSeconds");
  else if (Array.isArray(raw)) for (const e of raw) add(e.kind ?? e.laneKind ?? e.lane ?? null, e.seconds ?? e.laneSeconds ?? e.durationSeconds ?? 0);
  else if (raw && typeof raw === "object") for (const [k, v] of Object.entries(raw)) add(k, typeof v === "object" ? (v.seconds ?? v.total ?? 0) : v);
  let laneRunSeconds = 0;
  if (input.laneRuns) for (const r of input.laneRuns) {
    if (r.laneSeconds != null) { laneRunSeconds += Number(r.laneSeconds) || 0; add(r.kind ?? r.laneKind ?? null, r.laneSeconds); }
    else if (r.startedAt && r.endedAt) { const s = Math.max(0, (Date.parse(r.endedAt) - Date.parse(r.startedAt)) / 1000); laneRunSeconds += s; add(r.kind ?? r.laneKind ?? null, s); }
  }
  const spans = input.spans ? spansOf(input.spans) : [];
  if (raw == null && laneRunSeconds === 0 && spans.length) {
    for (const s of spans.filter((x) => spanKindOf(x) === "LANE")) {
      const d = s.durationSeconds ?? (s.endedAt && s.startedAt ? (Date.parse(s.endedAt) - Date.parse(s.startedAt)) / 1000 : 0);
      if (d) add(s.attributes?.laneKind ?? null, d);
    }
  }
  return { total: round6(total), byKind };
}

function tokensFrom(input) {
  let total = 0; const byModel = {};
  const add = (model, count) => { const c = num(count, "tokens"); total += c; if (model) byModel[model] = (byModel[model] ?? 0) + c; };
  const parseUsage = (usage, model) => {
    if (usage == null) return;
    if (typeof usage === "number") { add(model, usage); return; }
    if (usage.total != null || usage.totalTokens != null) { add(model, usage.total ?? usage.totalTokens); return; }
    if (usage.input != null || usage.output != null || usage.inputTokens != null || usage.outputTokens != null || usage.promptTokens != null || usage.completionTokens != null) {
      add(model, (usage.input ?? usage.inputTokens ?? usage.promptTokens ?? 0) + (usage.output ?? usage.outputTokens ?? usage.completionTokens ?? 0)); return;
    }
    for (const [k, v] of Object.entries(usage)) if (typeof v === "number") add(k, v);
  };
  const raw = input.tokens ?? input.tokensByModel ?? input.tokensByModelPin;
  if (typeof raw === "number") total += num(raw, "tokens");
  else if (Array.isArray(raw)) for (const e of raw) parseUsage(e.usage ?? e.tokens ?? e.count, e.modelPin ?? e.model ?? null);
  else if (raw && typeof raw === "object") {
    if (raw.total != null || raw.input != null || raw.output != null || raw.inputTokens != null || raw.totalTokens != null) parseUsage(raw, input.modelPin ?? null);
    else for (const [k, v] of Object.entries(raw)) parseUsage(v, k);
  }
  if (input.usage) parseUsage(input.usage, input.modelPin ?? null);
  if (input.laneRuns) for (const r of input.laneRuns) if (r.usage || r.tokens) parseUsage(r.usage ?? r.tokens, r.modelPin ?? r.model ?? null);
  return { total, byModel };
}

function wallClockFrom(input) {
  const raw = input.wallClock ?? input.wallClockSeconds ?? input.wallClockMs;
  let queueSeconds = input.wallClockQueueSeconds ?? input.queueSeconds ?? null;
  let runSeconds = input.wallClockRunSeconds ?? input.runSeconds ?? null;
  if (raw && typeof raw === "object") {
    queueSeconds = raw.queueSeconds ?? raw.queue ?? queueSeconds;
    runSeconds = raw.runSeconds ?? raw.run ?? runSeconds;
    if (raw.totalSeconds != null || raw.total != null || raw.seconds != null) return { total: round6(num(raw.totalSeconds ?? raw.total ?? raw.seconds, "wallClock")), queueSeconds: queueSeconds != null ? num(queueSeconds, "queueSeconds") : null, runSeconds: runSeconds != null ? num(runSeconds, "runSeconds") : null };
    if (queueSeconds != null || runSeconds != null) return { total: round6(num(queueSeconds ?? 0, "queueSeconds") + num(runSeconds ?? 0, "runSeconds")), queueSeconds: queueSeconds != null ? num(queueSeconds, "queueSeconds") : null, runSeconds: runSeconds != null ? num(runSeconds, "runSeconds") : null };
  }
  if (typeof raw === "number" || typeof raw === "string") {
    const total = input.wallClockMs != null && input.wallClock == null ? num(raw, "wallClock") / 1000 : num(raw, "wallClock");
    return { total: round6(total), queueSeconds: queueSeconds != null ? num(queueSeconds, "queueSeconds") : null, runSeconds: runSeconds != null ? num(runSeconds, "runSeconds") : null };
  }
  if (input.wallClockMs != null) return { total: round6(num(input.wallClockMs, "wallClockMs") / 1000), queueSeconds: null, runSeconds: null };
  if (input.queuedAt && input.endedAt) {
    const q = input.startedAt ? (Date.parse(input.startedAt) - Date.parse(input.queuedAt)) / 1000 : null;
    const r = input.startedAt ? (Date.parse(input.endedAt) - Date.parse(input.startedAt)) / 1000 : null;
    return { total: round6((Date.parse(input.endedAt) - Date.parse(input.queuedAt)) / 1000), queueSeconds: q, runSeconds: r };
  }
  if (queueSeconds != null || runSeconds != null) return { total: round6(num(queueSeconds ?? 0, "queueSeconds") + num(runSeconds ?? 0, "runSeconds")), queueSeconds: queueSeconds != null ? num(queueSeconds, "queueSeconds") : null, runSeconds: runSeconds != null ? num(runSeconds, "runSeconds") : null };
  const spans = input.spans ? spansOf(input.spans) : [];
  if (spans.length) {
    const starts = spans.map((s) => Date.parse(s.startedAt)).filter(Number.isFinite);
    const ends = spans.map((s) => Date.parse(s.endedAt ?? s.startedAt)).filter(Number.isFinite);
    if (starts.length && ends.length) return { total: round6(Math.max(0, (Math.max(...ends) - Math.min(...starts)) / 1000)), queueSeconds: null, runSeconds: null };
  }
  return { total: 0, queueSeconds: null, runSeconds: null };
}

export function buildCostReceipt(input = {}) {
  if (!input || typeof input !== "object" || Array.isArray(input)) throw new Error("buildCostReceipt requires an object");
  for (const key of Object.keys(input)) if (isChainOfThoughtKey(key)) throw new Error(`Field "${key}" is chain-of-thought; never a cost field`);
  const lane = laneSecondsFrom(input);
  const tok = tokensFrom(input);
  const wall = wallClockFrom(input);
  const humanRaw = input.humanMinutes ?? input.humanMinutesEst ?? input.humanMinutesEstimate ?? input.human?.minutes ?? input.human?.humanMinutes ?? 0;
  const humanMinutes = round6(num(humanRaw, "humanMinutes"));
  const ciMinutes = round6(num(input.ciMinutes ?? input.ci?.minutes ?? 0, "ciMinutes"));
  const outcome = input.outcome ?? input.outcomeKind ?? input.outcomeType ?? null;
  const outcomeCountRaw = input.outcomeCount ?? input.outcomes ?? input.verifiedFindings ?? input.mergedRepairs ?? input.closedAdvisories ?? null;
  const receipt = {
    id: input.id ?? `cost_${hexId(6)}`,
    workEventId: input.workEventId ?? input.workEvent?.id ?? null,
    traceId: input.traceId ?? input.trace?.id ?? null,
    repoId: input.repoId ?? null,
    pin: input.pin ?? null,
    week: input.week ?? null,
    laneSeconds: lane.total,
    laneSecondsByKind: lane.byKind,
    laneSecondsByLane: lane.byKind,
    tokens: tok.total,
    tokensByModel: tok.byModel,
    tokensByModelPin: tok.byModel,
    ciMinutes,
    wallClock: wall.total,
    wallClockSeconds: wall.total,
    wallClockQueueSeconds: wall.queueSeconds,
    wallClockRunSeconds: wall.runSeconds,
    humanMinutes,
    humanMinutesEst: humanMinutes,
    humanMinutesEstimate: humanMinutes,
    humanMinutesKind: "estimate",
    humanMinutesLabel: "estimate",
    human: { minutes: humanMinutes, kind: "estimate", label: "estimate", estimated: true },
    outcome,
    outcomeKind: outcome,
    outcomeCount: outcomeCountRaw != null ? num(outcomeCountRaw, "outcomeCount") : (outcome ? 1 : 0),
    createdAt: input.createdAt ?? new Date().toISOString(),
  };
  if (input.toolSpendUsd != null || input.apiSpendUsd != null || input.toolSpend != null || input.apiSpend != null) {
    receipt.toolSpendUsd = round6(num(input.toolSpendUsd ?? input.toolSpend ?? 0, "toolSpendUsd"));
    receipt.apiSpendUsd = round6(num(input.apiSpendUsd ?? input.apiSpend ?? 0, "apiSpendUsd"));
  }
  if (input.modelPin && !Object.keys(tok.byModel).length && tok.total) receipt.tokensByModel[input.modelPin] = tok.total;
  return receipt;
}
export const makeCostReceipt = buildCostReceipt;
export const createCostReceipt = buildCostReceipt;
export const costReceipt = buildCostReceipt;

function receiptCost(r) {
  const c = r?.cost && typeof r.cost === "object" ? r.cost : r;
  // Rebuild through the builder so plain cost objects and receipts agree.
  return buildCostReceipt({ ...c, workEventId: r.workEventId ?? c.workEventId, traceId: r.traceId ?? c.traceId, repoId: r.repoId ?? c.repoId, week: r.week ?? c.week, outcome: r.outcome ?? r.outcomeKind ?? c.outcome ?? c.outcomeKind, outcomeCount: r.outcomeCount ?? c.outcomeCount, createdAt: c.createdAt });
}

function emptyBucket() {
  return { receipts: 0, outcomes: 0, laneSeconds: 0, tokens: 0, ciMinutes: 0, wallClock: 0, wallClockSeconds: 0, humanMinutes: 0, humanMinutesEst: 0, humanMinutesKind: "estimate", humanMinutesLabel: "estimate" };
}
function addTo(bucket, cost) {
  bucket.receipts += 1;
  bucket.outcomes += cost.outcomeCount ?? 0;
  bucket.laneSeconds = round6(bucket.laneSeconds + cost.laneSeconds);
  bucket.tokens += cost.tokens;
  bucket.ciMinutes = round6(bucket.ciMinutes + cost.ciMinutes);
  bucket.wallClock = round6(bucket.wallClock + cost.wallClock);
  bucket.wallClockSeconds = bucket.wallClock;
  bucket.humanMinutes = round6(bucket.humanMinutes + cost.humanMinutes);
  bucket.humanMinutesEst = bucket.humanMinutes;
}
function finalize(bucket) {
  const n = bucket.outcomes;
  const per = (v) => (n > 0 ? round6(v / n) : null);
  return {
    ...bucket,
    costPerOutcome: n > 0 ? {
      laneSeconds: per(bucket.laneSeconds), tokens: per(bucket.tokens), ciMinutes: per(bucket.ciMinutes),
      wallClock: per(bucket.wallClock), wallClockSeconds: per(bucket.wallClock), humanMinutes: per(bucket.humanMinutes), humanMinutesEst: per(bucket.humanMinutes),
    } : null,
    laneSecondsPerOutcome: per(bucket.laneSeconds), tokensPerOutcome: per(bucket.tokens),
    ciMinutesPerOutcome: per(bucket.ciMinutes), wallClockPerOutcome: per(bucket.wallClock), humanMinutesPerOutcome: per(bucket.humanMinutes),
  };
}

export function aggregateCostPerOutcome(receipts = [], outcomes = null) {
  let list = Array.isArray(receipts) ? receipts : [receipts];
  if (Array.isArray(outcomes)) list = list.map((r, i) => ({ ...(r?.cost ? r : {}), ...(typeof outcomes[i] === "string" ? { outcome: outcomes[i] } : (outcomes[i] ?? {})), ...(r?.cost ? { cost: r.cost } : r) }));
  const total = emptyBucket();
  const byOutcome = {}; const byRepo = {}; const byRepoWeek = {};
  for (const raw of list) {
    if (!raw) continue;
    const cost = receiptCost(raw);
    addTo(total, cost);
    const key = cost.outcome ?? "unknown";
    (byOutcome[key] ??= emptyBucket()); addTo(byOutcome[key], cost);
    if (cost.repoId) { (byRepo[cost.repoId] ??= emptyBucket()); addTo(byRepo[cost.repoId], cost); }
    if (cost.repoId && cost.week) { const k = `${cost.repoId}@${cost.week}`; (byRepoWeek[k] ??= emptyBucket()); addTo(byRepoWeek[k], cost); }
  }
  const byOutcomeFinal = Object.fromEntries(Object.entries(byOutcome).map(([k, v]) => [k, finalize(v)]));
  const result = {
    total: finalize(total),
    byOutcome: byOutcomeFinal,
    // Registry-shaped shortcuts (null when no such outcome was recorded).
    costPerVerifiedFinding: byOutcomeFinal["verified-finding"]?.costPerOutcome ?? null,
    costPerMergedRepair: byOutcomeFinal["merged-repair"]?.costPerOutcome ?? null,
    costPerClosedAdvisory: byOutcomeFinal["closed-advisory"]?.costPerOutcome ?? null,
  };
  if (Object.keys(byRepo).length) result.byRepo = Object.fromEntries(Object.entries(byRepo).map(([k, v]) => [k, finalize(v)]));
  if (Object.keys(byRepoWeek).length) result.byRepoWeek = Object.fromEntries(Object.entries(byRepoWeek).map(([k, v]) => [k, finalize(v)]));
  result.costPerOutcome = result.byOutcome;
  return result;
}
export const costPerOutcome = aggregateCostPerOutcome;
export const aggregateCosts = aggregateCostPerOutcome;
export const aggregateCost = aggregateCostPerOutcome;
export const summarizeCosts = aggregateCostPerOutcome;

export default Trace;

