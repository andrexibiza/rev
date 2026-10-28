// Durable idempotent WorkEvent queue (schema.md §5.4/§7, authority.md §4-§7, plan Day 2).
// Immutable events, fenced leases (owner/token/generation), ACK/NACK, duplicate replay,
// crash-state transitions. Authority failures are data: methods return
// { refusal: { reasonCode, message, retryable, pin } } (see src/types.mjs), never throw
// for stale generation / expired lease / idempotency conflict. State is preserved on refusal.
import { createHash, randomBytes, randomUUID } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import { makeReceipt, refusal as makeRefusal } from "./types.mjs";

export const DEFAULT_LEASE_MS = 30_000;
export const QUEUE_STATES = [
  "QUEUED", "CLAIMED", "RUNNING", "COMPLETED", "FAILED",
  "CANCELLED", "EXPIRED", "INDETERMINATE",
];
const TERMINAL = new Set(["COMPLETED", "FAILED", "CANCELLED", "EXPIRED"]);

// Stable JSON: object keys sorted recursively so digest binds exact payload bytes.
function stableStringify(v) {
  if (v === null || typeof v !== "object") return JSON.stringify(v) ?? "null";
  if (Array.isArray(v)) return "[" + v.map(stableStringify).join(",") + "]";
  return "{" + Object.keys(v).sort().map((k) => JSON.stringify(k) + ":" + stableStringify(v[k])).join(",") + "}";
}

export function payloadDigest(payload) {
  return createHash("sha256").update(stableStringify(payload), "utf8").digest("hex");
}
export const computePayloadDigest = payloadDigest;
export const digestPayload = payloadDigest;

export function isQueueRefusal(x) {
  return !!x && typeof x === "object" && "refusal" in x;
}
export const isRefusalResult = isQueueRefusal;

function deepFreeze(o) {
  if (o && typeof o === "object" && !Object.isFrozen(o)) {
    Object.freeze(o);
    for (const v of Object.values(o)) deepFreeze(v);
  }
  return o;
}
function clone(v) { return v === undefined ? undefined : structuredClone(v); }

export class DurableQueue {
  /**
   * @param {object} [opts]
   * @param {string|null} [opts.filePath] JSON store path; null/omitted = in-memory.
   * @param {number} [opts.leaseMs] default lease duration.
   * @param {() => number} [opts.now] clock returning epoch ms (injectable for tests).
   */
  constructor({ filePath = null, storagePath = null, dir = null, leaseMs = DEFAULT_LEASE_MS, now = Date.now } = {}) {
    this.filePath = filePath ?? storagePath ?? (dir ? `${dir}/queue.json` : null);
    this.leaseMs = leaseMs;
    this._now = now;
    this._events = []; // insertion order = FIFO
    this._byId = new Map();
    this._byKey = new Map();
    if (this.filePath) {
      mkdirSync(dirname(this.filePath), { recursive: true });
      this._load();
    }
    // Crash recovery: settle leases/events whose window closed while down.
    this.recover();
  }

  static open(opts = {}) { return new DurableQueue(opts); }

  _nowMs() { return this._now(); }
  _iso(ms = this._nowMs()) { return new Date(ms).toISOString(); }

  _load() {
    if (!existsSync(this.filePath)) return;
    const raw = readFileSync(this.filePath, "utf8").trim();
    if (!raw) return;
    const data = JSON.parse(raw);
    for (const rec of data.events ?? []) {
      this._events.push(rec);
      this._byId.set(rec.id, rec);
      this._byKey.set(rec.idempotencyKey, rec);
    }
  }

  _persist() {
    if (!this.filePath) return;
    const tmp = `${this.filePath}.tmp-${process.pid}-${randomBytes(4).toString("hex")}`;
    writeFileSync(tmp, JSON.stringify({ version: 1, events: this._events }, null, 2), "utf8");
    renameSync(tmp, this.filePath); // atomic replace: crash never leaves torn store
  }

  _snapshot(rec) { return deepFreeze(clone(rec)); }
  _transition(rec, to, reasonCode) {
    const from = rec.state;
    rec.state = to;
    rec.history.push({ at: this._iso(), from, to, reasonCode });
  }

  get size() { return this._events.length; }

  // --- Admission: immutable event + idempotent replay -----------------------
  enqueue({ idempotencyKey, payload, operation = "REVIEW", expiresAt = null, ttlMs = null, pin = null, proofDigest = null } = {}) {
    if (!idempotencyKey || typeof idempotencyKey !== "string") {
      return makeRefusal("IDEMPOTENCY_KEY_REQUIRED", "enqueue requires a non-empty idempotencyKey.", false, pin);
    }
    if (payload === undefined) {
      return makeRefusal("PAYLOAD_REQUIRED", "enqueue requires a payload.", false, pin);
    }
    this.sweep();
    const digest = payloadDigest(payload);
    const existing = this._byKey.get(idempotencyKey);
    if (existing) {
      if (existing.payloadDigest !== digest) {
        return makeRefusal("IDEMPOTENCY_CONFLICT",
          `idempotencyKey "${idempotencyKey}" already admitted with a different payload digest; original event preserved.`,
          false, existing.pin ?? pin);
      }
      // Duplicate replay: original event + original (write-once) receipt, no new side effect.
      return { event: this._snapshot(existing), receipt: clone(existing.receipt ?? null), replayed: true, duplicate: true };
    }
    const nowMs = this._nowMs();
    const expMs = expiresAt ? Date.parse(expiresAt) : (ttlMs != null ? nowMs + ttlMs : null);
    const rec = {
      id: `we_${nowMs.toString(36)}_${randomUUID().replace(/-/g, "").slice(0, 12)}`,
      idempotencyKey,
      operation,
      payload: clone(payload),
      payloadDigest: digest,
      proofDigest: proofDigest ?? digest,
      pin: clone(pin),
      state: "QUEUED",
      createdAt: this._iso(nowMs),
      expiresAt: expMs ? this._iso(expMs) : null,
      attempts: 0,
      leaseGeneration: 0,
      lease: null,
      startedAt: null,
      settledGeneration: null,
      receipt: null,
      history: [{ at: this._iso(nowMs), from: null, to: "QUEUED", reasonCode: "ADMITTED" }],
    };
    this._events.push(rec);
    this._byId.set(rec.id, rec);
    this._byKey.set(idempotencyKey, rec);
    if (expMs && nowMs > expMs) this._expireRecord(rec);
    this._persist();
    return { event: this._snapshot(rec), receipt: clone(rec.receipt ?? null), replayed: false, duplicate: false };
  }
  admit(...args) { return this.enqueue(...args); }
  enqueueWorkEvent(...args) { return this.enqueue(...args); }

  // --- Lease: claim / renew / reclaim ---------------------------------------
  claim({ owner, leaseMs = this.leaseMs } = {}) {
    if (!owner) return makeRefusal("LEASE_OWNER_REQUIRED", "claim requires an owner.", false, null);
    this.sweep();
    const rec = this._events.find((e) => e.state === "QUEUED");
    if (!rec) return null;
    const nowMs = this._nowMs();
    const generation = rec.leaseGeneration + 1;
    rec.leaseGeneration = generation;
    rec.attempts += 1;
    rec.lease = {
      owner, token: randomBytes(16).toString("hex"), generation,
      acquiredAt: this._iso(nowMs), renewedAt: this._iso(nowMs),
      expiresAt: this._iso(nowMs + leaseMs),
    };
    this._transition(rec, "CLAIMED", "LEASE_CLAIMED");
    this._persist();
    return { event: this._snapshot(rec), lease: clone(rec.lease) };
  }
  claimNext(...args) { return this.claim(...args); }

  _fence(rec, { owner, token, generation }) {
    if (TERMINAL.has(rec.state) || rec.state === "INDETERMINATE") {
      return makeRefusal("ALREADY_SETTLED", `Event ${rec.id} is ${rec.state}; settlement is write-once.`, false, rec.pin);
    }
    if (rec.state !== "CLAIMED" && rec.state !== "RUNNING") {
      return makeRefusal("NOT_CLAIMED", `Event ${rec.id} is ${rec.state}, not claimed.`, false, rec.pin);
    }
    if (!rec.lease) return makeRefusal("PROOF_STALE_GENERATION", `Event ${rec.id} has no current lease.`, false, rec.pin);
    if (rec.lease.owner !== owner || rec.lease.token !== token || rec.lease.generation !== generation) {
      return makeRefusal("PROOF_STALE_GENERATION",
        `Stale lease fence for ${rec.id}: presented (owner=${owner}, generation=${generation}) does not match current generation ${rec.lease.generation}. State preserved.`,
        false, rec.pin);
    }
    if (this._nowMs() > Date.parse(rec.lease.expiresAt)) {
      return makeRefusal("LEASE_EXPIRED",
        `Lease for ${rec.id} generation ${generation} expired at ${rec.lease.expiresAt}; reclaim before settling.`,
        true, rec.pin);
    }
    return null;
  }
  _find(eventId) { return this._byId.get(eventId) ?? null; }

  renew({ eventId, owner, token, generation, leaseMs = this.leaseMs } = {}) {
    const rec = this._find(eventId);
    if (!rec) return makeRefusal("EVENT_NOT_FOUND", `No event ${eventId}.`, false, null);
    const bad = this._fence(rec, { owner, token, generation });
    if (bad) return bad;
    rec.lease.expiresAt = this._iso(this._nowMs() + leaseMs);
    rec.lease.renewedAt = this._iso();
    this._persist();
    return { event: this._snapshot(rec), lease: clone(rec.lease) };
  }
  heartbeat(...args) { return this.renew(...args); }

  // CLAIMED -> RUNNING: marks execution start; timeout after this is INDETERMINATE.
  markRunning({ eventId, owner, token, generation } = {}) {
    const rec = this._find(eventId);
    if (!rec) return makeRefusal("EVENT_NOT_FOUND", `No event ${eventId}.`, false, null);
    const bad = this._fence(rec, { owner, token, generation });
    if (bad) return bad;
    if (rec.state === "RUNNING") return { event: this._snapshot(rec), lease: clone(rec.lease), replayed: true };
    rec.startedAt = this._iso();
    this._transition(rec, "RUNNING", "EXECUTION_STARTED");
    this._persist();
    return { event: this._snapshot(rec), lease: clone(rec.lease) };
  }
  start(...args) { return this.markRunning(...args); }
  beginExecution(...args) { return this.markRunning(...args); }

  // --- Settlement: ACK / NACK ------------------------------------------------
  ack({ eventId, owner, token, generation, outcomeDigest = "ok", reasonCode = "OK" } = {}) {
    const rec = this._find(eventId);
    if (!rec) return makeRefusal("EVENT_NOT_FOUND", `No event ${eventId}.`, false, null);
    if (rec.state === "COMPLETED" && rec.receipt) {
      if (rec.settledGeneration === generation) {
        return { event: this._snapshot(rec), receipt: clone(rec.receipt), replayed: true, duplicate: true };
      }
      return makeRefusal("PROOF_STALE_GENERATION",
        `Event ${rec.id} already COMPLETED at generation ${rec.settledGeneration}; stale generation ${generation} cannot settle it again.`,
        false, rec.pin);
    }
    const bad = this._fence(rec, { owner, token, generation });
    if (bad) return bad;
    rec.receipt = makeReceipt({ state: "COMPLETED", reasonCode, outcomeDigest, pin: rec.pin });
    rec.settledGeneration = generation;
    rec.lease = null;
    this._transition(rec, "COMPLETED", reasonCode);
    this._persist();
    return { event: this._snapshot(rec), receipt: clone(rec.receipt), replayed: false };
  }
  acknowledge(...args) { return this.ack(...args); }
  complete(...args) { return this.ack(...args); }

  nack({ eventId, owner, token, generation, retryable = true, reasonCode = "NACK", outcomeDigest = "nacked" } = {}) {
    const rec = this._find(eventId);
    if (!rec) return makeRefusal("EVENT_NOT_FOUND", `No event ${eventId}.`, false, null);
    if (rec.state === "FAILED" && rec.receipt && rec.settledGeneration === generation) {
      return { event: this._snapshot(rec), receipt: clone(rec.receipt), replayed: true, duplicate: true };
    }
    const bad = this._fence(rec, { owner, token, generation });
    if (bad) return bad;
    rec.lease = null;
    rec.startedAt = null;
    if (retryable) {
      this._transition(rec, "QUEUED", reasonCode);
      this._persist();
      return { event: this._snapshot(rec), receipt: null, retryable: true, replayed: false };
    }
    rec.receipt = makeReceipt({ state: "FAILED", reasonCode, outcomeDigest, pin: rec.pin });
    rec.settledGeneration = generation;
    this._transition(rec, "FAILED", reasonCode);
    this._persist();
    return { event: this._snapshot(rec), receipt: clone(rec.receipt), retryable: false, replayed: false };
  }
  fail(args = {}) { return this.nack({ ...args, retryable: false, reasonCode: args.reasonCode ?? "FAILED" }); }

  cancel({ eventId, owner = null, token = null, generation = null, reasonCode = "CANCELLED", outcomeDigest = "cancelled" } = {}) {
    const rec = this._find(eventId);
    if (!rec) return makeRefusal("EVENT_NOT_FOUND", `No event ${eventId}.`, false, null);
    if (TERMINAL.has(rec.state)) return { event: this._snapshot(rec), receipt: clone(rec.receipt), replayed: true };
    if (rec.state === "CLAIMED" || rec.state === "RUNNING") {
      const bad = this._fence(rec, { owner, token, generation });
      if (bad) return bad;
    }
    rec.lease = null;
    rec.receipt = makeReceipt({ state: "CANCELLED", reasonCode, outcomeDigest, pin: rec.pin });
    rec.settledGeneration = generation ?? rec.leaseGeneration;
    this._transition(rec, "CANCELLED", reasonCode);
    this._persist();
    return { event: this._snapshot(rec), receipt: clone(rec.receipt), replayed: false };
  }

  // Timeout after execution start: INDETERMINATE, never blind replay (authority §7).
  markIndeterminate({ eventId, owner, token, generation, reasonCode = "INDETERMINATE_RECONCILE_REQUIRED", outcomeDigest = "indeterminate" } = {}) {
    const rec = this._find(eventId);
    if (!rec) return makeRefusal("EVENT_NOT_FOUND", `No event ${eventId}.`, false, null);
    if (rec.state === "INDETERMINATE" && rec.receipt) {
      return { event: this._snapshot(rec), receipt: clone(rec.receipt), replayed: true, duplicate: true };
    }
    const bad = this._fence(rec, { owner, token, generation });
    if (bad) return bad;
    if (!rec.startedAt) {
      return makeRefusal("NOT_STARTED",
        `Event ${rec.id} never started execution; use NACK/reclaim instead of INDETERMINATE.`, true, rec.pin);
    }
    rec.receipt = makeReceipt({ state: "INDETERMINATE", reasonCode, outcomeDigest, pin: rec.pin });
    rec.settledGeneration = generation;
    rec.lease = null;
    this._transition(rec, "INDETERMINATE", reasonCode);
    this._persist();
    return { event: this._snapshot(rec), receipt: clone(rec.receipt), replayed: false };
  }
  settleIndeterminate(...args) { return this.markIndeterminate(...args); }
  timeoutAfterStart(...args) { return this.markIndeterminate(...args); }

  // Reconcile INDETERMINATE against externally observed truth; no blind retry.
  reconcile({ eventId, outcome, outcomeDigest = "reconciled", reasonCode = "RECONCILED" } = {}) {
    const rec = this._find(eventId);
    if (!rec) return makeRefusal("EVENT_NOT_FOUND", `No event ${eventId}.`, false, null);
    if (rec.state !== "INDETERMINATE") {
      if (TERMINAL.has(rec.state) && rec.receipt) return { event: this._snapshot(rec), receipt: clone(rec.receipt), replayed: true };
      return makeRefusal("NOT_INDETERMINATE", `Event ${rec.id} is ${rec.state}; only INDETERMINATE reconciles.`, false, rec.pin);
    }
    if (outcome !== "COMPLETED" && outcome !== "FAILED") {
      return makeRefusal("BAD_RECONCILE_OUTCOME", `Reconcile outcome must be COMPLETED or FAILED, got ${outcome}.`, false, rec.pin);
    }
    rec.receipt = makeReceipt({ state: outcome, reasonCode, outcomeDigest, pin: rec.pin });
    this._transition(rec, outcome, reasonCode);
    this._persist();
    return { event: this._snapshot(rec), receipt: clone(rec.receipt), replayed: false };
  }
  reconcileIndeterminate(...args) { return this.reconcile(...args); }

  // --- Expiry / reclaim sweep + crash recovery --------------------------------
  _expireRecord(rec) {
    rec.lease = null;
    rec.receipt = makeReceipt({ state: "EXPIRED", reasonCode: "EVENT_EXPIRED", outcomeDigest: "expired", pin: rec.pin });
    rec.settledGeneration = rec.leaseGeneration;
    this._transition(rec, "EXPIRED", "EVENT_EXPIRED");
  }

  sweep(nowMs = this._nowMs()) {
    const changed = [];
    for (const rec of this._events) {
      if (TERMINAL.has(rec.state) || rec.state === "INDETERMINATE") continue;
      const eventExpired = rec.expiresAt && nowMs > Date.parse(rec.expiresAt);
      if (rec.state === "QUEUED" && eventExpired) {
        this._expireRecord(rec); changed.push(rec); continue;
      }
      if (rec.state === "CLAIMED" && eventExpired && !rec.startedAt) {
        this._expireRecord(rec); changed.push(rec); continue;
      }
      if ((rec.state === "CLAIMED" || rec.state === "RUNNING") && rec.lease && nowMs > Date.parse(rec.lease.expiresAt)) {
        if (rec.state === "RUNNING") {
          // Lease lost after start: effect may have happened -> INDETERMINATE.
          rec.receipt = makeReceipt({ state: "INDETERMINATE", reasonCode: "INDETERMINATE_RECONCILE_REQUIRED", outcomeDigest: "indeterminate", pin: rec.pin });
          rec.settledGeneration = rec.lease.generation;
          rec.lease = null;
          this._transition(rec, "INDETERMINATE", "LEASE_EXPIRED_AFTER_START");
        } else if (eventExpired) {
          this._expireRecord(rec);
        } else {
          // Claimed but never started: safe to reclaim (back to QUEUED, next claim bumps generation).
          rec.lease = null;
          this._transition(rec, "QUEUED", "LEASE_EXPIRED_RECLAIMABLE");
        }
        changed.push(rec);
      }
    }
    if (changed.length) this._persist();
    return changed.map((r) => this._snapshot(r));
  }
  expireSweep(...args) { return this.sweep(...args); }

  recover() { return this.sweep(); }

  // --- Reads -------------------------------------------------------------------
  get(eventId) {
    this.sweep();
    const rec = this._find(eventId);
    return rec ? this._snapshot(rec) : null;
  }
  getById(eventId) { return this.get(eventId); }
  getByIdempotencyKey(key) {
    this.sweep();
    const rec = this._byKey.get(key);
    return rec ? this._snapshot(rec) : null;
  }
  list({ state = null } = {}) {
    this.sweep();
    return this._events.filter((e) => !state || e.state === state).map((e) => this._snapshot(e));
  }
}

export function createQueue(opts = {}) { return new DurableQueue(opts); }
export const createDurableQueue = createQueue;
export const WorkQueue = DurableQueue;
export const Queue = DurableQueue;
export default DurableQueue;
