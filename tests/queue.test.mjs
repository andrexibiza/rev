import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { DurableQueue, createQueue, payloadDigest, isQueueRefusal } from "../src/queue.mjs";

function fakeClock(start = 1_700_000_000_000) {
  let t = start;
  return { now: () => t, advance: (ms) => { t += ms; }, get t() { return t; } };
}
function fileQueue(clock) {
  const dir = mkdtempSync(join(tmpdir(), "rev-queue-"));
  const filePath = join(dir, "queue.json");
  return { q: new DurableQueue({ filePath, now: clock.now }), filePath, dir };
}

test("duplicate replay returns original event+receipt, single side effect", () => {
  const clock = fakeClock();
  const { q } = fileQueue(clock);
  const payload = { repoId: "rev:repo:github:o/r", headSha: "a".repeat(40) };
  const first = q.enqueue({ idempotencyKey: "k-dup", payload, operation: "REVIEW" });
  assert.equal(first.replayed, false);
  assert.equal(q.size, 1);

  // Replay before settlement: same id, no new event.
  const replay1 = q.enqueue({ idempotencyKey: "k-dup", payload, operation: "REVIEW" });
  assert.equal(replay1.replayed, true);
  assert.equal(replay1.duplicate, true);
  assert.equal(replay1.event.id, first.event.id);
  assert.equal(replay1.event.payloadDigest, first.event.payloadDigest);
  assert.equal(q.size, 1);

  const { lease } = q.claim({ owner: "courier-1" });
  const acked = q.ack({ eventId: first.event.id, owner: "courier-1", token: lease.token, generation: lease.generation, outcomeDigest: "done-1" });
  assert.equal(acked.event.state, "COMPLETED");
  assert.ok(acked.receipt.id);

  // Replay after settlement: original event + write-once receipt verbatim.
  const replay2 = q.enqueue({ idempotencyKey: "k-dup", payload, operation: "REVIEW" });
  assert.equal(replay2.replayed, true);
  assert.equal(replay2.event.id, first.event.id);
  assert.equal(replay2.event.state, "COMPLETED");
  assert.equal(replay2.receipt.id, acked.receipt.id);
  assert.equal(replay2.receipt.outcomeDigest, "done-1");
  assert.equal(q.size, 1);
});

test("duplicate with different payload conflicts and preserves original", () => {
  const clock = fakeClock();
  const q = createQueue({ now: clock.now });
  const first = q.enqueue({ idempotencyKey: "k-conflict", payload: { n: 1 } });
  const conflict = q.enqueue({ idempotencyKey: "k-conflict", payload: { n: 2 } });
  assert.equal(isQueueRefusal(conflict), true);
  assert.equal(conflict.refusal.reasonCode, "IDEMPOTENCY_CONFLICT");
  assert.equal(conflict.refusal.retryable, false);
  assert.equal(q.size, 1);
  assert.equal(q.get(first.event.id).payloadDigest, payloadDigest({ n: 1 }));
});

test("immutable events: payload digest binds payload, snapshots are frozen", () => {
  const clock = fakeClock();
  const q = createQueue({ now: clock.now });
  const { event } = q.enqueue({ idempotencyKey: "k-imm", payload: { a: { b: 1 } } });
  assert.equal(event.payloadDigest, payloadDigest({ a: { b: 1 } }));
  assert.equal(Object.isFrozen(event), true);
  assert.equal(Object.isFrozen(event.payload), true);
  assert.throws(() => { event.payload.a.b = 99; }, TypeError);
  assert.equal(q.get(event.id).payload.a.b, 1);
  assert.equal(q.get(event.id).idempotencyKey, "k-imm");
});

test("lease fencing: stale token cannot settle (ACK/NACK/renew fenced)", () => {
  const clock = fakeClock();
  const { q } = fileQueue(clock);
  const { event } = q.enqueue({ idempotencyKey: "k-fence", payload: { x: 1 } });

  const c1 = q.claim({ owner: "owner-a", leaseMs: 1_000 });
  assert.equal(c1.lease.generation, 1);

  // Let lease expire, then a second owner reclaims at generation 2.
  clock.advance(2_000);
  const c2 = q.claim({ owner: "owner-b", leaseMs: 10_000 });
  assert.ok(c2, "expired lease must be reclaimable");
  assert.equal(c2.lease.generation, 2);
  assert.notEqual(c2.lease.token, c1.lease.token);
  assert.equal(c2.event.attempts, 2);

  for (const settle of [
    () => q.ack({ eventId: event.id, owner: "owner-a", token: c1.lease.token, generation: c1.lease.generation, outcomeDigest: "stale" }),
    () => q.nack({ eventId: event.id, owner: "owner-a", token: c1.lease.token, generation: c1.lease.generation }),
    () => q.renew({ eventId: event.id, owner: "owner-a", token: c1.lease.token, generation: c1.lease.generation }),
    () => q.markRunning({ eventId: event.id, owner: "owner-a", token: c1.lease.token, generation: c1.lease.generation }),
  ]) {
    const r = settle();
    assert.equal(isQueueRefusal(r), true);
    assert.equal(r.refusal.reasonCode, "PROOF_STALE_GENERATION");
    assert.equal(r.refusal.retryable, false);
  }
  // State preserved under stale attempts; current owner settles.
  assert.equal(q.get(event.id).state, "CLAIMED");
  const ok = q.ack({ eventId: event.id, owner: "owner-b", token: c2.lease.token, generation: c2.lease.generation, outcomeDigest: "fresh" });
  assert.equal(ok.event.state, "COMPLETED");
  assert.equal(ok.receipt.outcomeDigest, "fresh");

  // Stale generation cannot re-settle successor/terminal work either.
  const again = q.ack({ eventId: event.id, owner: "owner-a", token: c1.lease.token, generation: 1, outcomeDigest: "stale2" });
  assert.equal(isQueueRefusal(again), true);
  assert.equal(again.refusal.reasonCode, "PROOF_STALE_GENERATION");
});

test("expiry reclaim: expired CLAIMED (not started) reclaims; QUEUED expiry settles EXPIRED", () => {
  const clock = fakeClock();
  const q = createQueue({ now: clock.now });

  const a = q.enqueue({ idempotencyKey: "k-reclaim", payload: { n: "a" } });
  const c1 = q.claim({ owner: "owner-a", leaseMs: 500 });
  clock.advance(600);
  const swept = q.sweep();
  assert.ok(swept.some((e) => e.id === a.event.id && e.state === "QUEUED"));
  assert.equal(q.get(a.event.id).state, "QUEUED");
  assert.equal(q.get(a.event.id).lease, null);

  const c2 = q.claim({ owner: "owner-b", leaseMs: 5_000 });
  assert.equal(c2.lease.generation, c1.lease.generation + 1);
  assert.equal(c2.event.id, a.event.id);

  // QUEUED event past its event expiry settles EXPIRED with receipt, never claimed.
  const b = q.enqueue({ idempotencyKey: "k-expire", payload: { n: "b" }, ttlMs: 100 });
  clock.advance(200);
  assert.equal(q.get(b.event.id).state, "EXPIRED");
  assert.equal(q.get(b.event.id).receipt.state, "EXPIRED");
  // Only the still-claimed event remains claimable work; expired one is skipped.
  assert.equal(q.list({ state: "EXPIRED" }).length, 1);
});

test("renew extends lease and blocks reclaim until new expiry", () => {
  const clock = fakeClock();
  const q = createQueue({ now: clock.now });
  const { event } = q.enqueue({ idempotencyKey: "k-renew", payload: {} });
  const c = q.claim({ owner: "owner-a", leaseMs: 1_000 });
  clock.advance(800);
  const renewed = q.renew({ eventId: event.id, owner: "owner-a", token: c.lease.token, generation: c.lease.generation, leaseMs: 1_000 });
  assert.equal(isQueueRefusal(renewed), false);
  clock.advance(800); // past original expiry, within renewed window
  assert.equal(q.claim({ owner: "owner-b" }), null);
  assert.equal(q.get(event.id).state, "CLAIMED");
  clock.advance(500); // past renewed expiry
  const reclaimed = q.claim({ owner: "owner-b", leaseMs: 1_000 });
  assert.equal(reclaimed.lease.generation, 2);
});

test("ACK completes with receipt; NACK retryable requeues and terminal FAILED settles", () => {
  const clock = fakeClock();
  const q = createQueue({ now: clock.now });
  const { event } = q.enqueue({ idempotencyKey: "k-acknack", payload: { v: 1 } });

  let c = q.claim({ owner: "w1" });
  const n1 = q.nack({ eventId: event.id, owner: "w1", token: c.lease.token, generation: c.lease.generation, retryable: true, reasonCode: "RETRY_LATER" });
  assert.equal(n1.event.state, "QUEUED");
  assert.equal(n1.receipt, null);

  c = q.claim({ owner: "w1" });
  assert.equal(c.lease.generation, 2);
  const n2 = q.nack({ eventId: event.id, owner: "w1", token: c.lease.token, generation: c.lease.generation, retryable: false, reasonCode: "BAD_INPUT", outcomeDigest: "bad" });
  assert.equal(n2.event.state, "FAILED");
  assert.equal(n2.receipt.state, "FAILED");
  assert.equal(q.claim({ owner: "w1" }), null);
});

test("indeterminate on timeout-after-start: never blind-replayed, reconcile settles", () => {
  const clock = fakeClock();
  const { q } = fileQueue(clock);
  const { event } = q.enqueue({ idempotencyKey: "k-indet", payload: { run: true } });
  const c = q.claim({ owner: "runner-1", leaseMs: 1_000 });
  const started = q.markRunning({ eventId: event.id, owner: "runner-1", token: c.lease.token, generation: c.lease.generation });
  assert.equal(started.event.state, "RUNNING");
  assert.ok(started.event.startedAt);

  // Timeout after start via explicit settlement.
  const ind = q.markIndeterminate({ eventId: event.id, owner: "runner-1", token: c.lease.token, generation: c.lease.generation });
  assert.equal(ind.event.state, "INDETERMINATE");
  assert.equal(ind.receipt.state, "INDETERMINATE");
  assert.equal(ind.receipt.reasonCode, "INDETERMINATE_RECONCILE_REQUIRED");

  // Never returned for blind retry.
  assert.equal(q.claim({ owner: "runner-2" }), null);
  assert.equal(q.list({ state: "QUEUED" }).length, 0);

  // Duplicate indeterminate replays the same receipt (write-once).
  const ind2 = q.markIndeterminate({ eventId: event.id, owner: "runner-1", token: c.lease.token, generation: c.lease.generation });
  assert.equal(ind2.receipt.id, ind.receipt.id);

  const rec = q.reconcile({ eventId: event.id, outcome: "COMPLETED", outcomeDigest: "observed-done" });
  assert.equal(rec.event.state, "COMPLETED");
  assert.equal(rec.receipt.outcomeDigest, "observed-done");
});

test("indeterminate via lease expiry after start (crash-state transition)", () => {
  const clock = fakeClock();
  const q = createQueue({ now: clock.now });
  const { event } = q.enqueue({ idempotencyKey: "k-indet-expiry", payload: {} });
  const c = q.claim({ owner: "runner-1", leaseMs: 1_000 });
  q.markRunning({ eventId: event.id, owner: "runner-1", token: c.lease.token, generation: c.lease.generation });
  clock.advance(2_000); // lease lost after start: effect may have happened
  const swept = q.sweep();
  assert.ok(swept.some((e) => e.id === event.id && e.state === "INDETERMINATE"));
  assert.equal(q.get(event.id).state, "INDETERMINATE");
  assert.equal(q.get(event.id).receipt.reasonCode, "INDETERMINATE_RECONCILE_REQUIRED");
  assert.equal(q.claim({ owner: "runner-2" }), null);
  // Timeout before start would have reclaimed; after start it must not.
  const badAck = q.ack({ eventId: event.id, owner: "runner-1", token: c.lease.token, generation: c.lease.generation });
  assert.equal(isQueueRefusal(badAck), true);
});

test("crash durability: state and receipts survive restart; expired lease recovers", () => {
  const clock = fakeClock();
  const dir = mkdtempSync(join(tmpdir(), "rev-queue-crash-"));
  const filePath = join(dir, "queue.json");

  const q1 = new DurableQueue({ filePath, now: clock.now });
  const { event } = q1.enqueue({ idempotencyKey: "k-crash", payload: { durable: true } });
  const c = q1.claim({ owner: "owner-a", leaseMs: 1_000 });

  // Simulated crash: new instance over same store, lease now expired.
  clock.advance(2_000);
  const q2 = new DurableQueue({ filePath, now: clock.now });
  assert.equal(q2.get(event.id).state, "QUEUED"); // claimed-not-started recovered as reclaimable
  const c2 = q2.claim({ owner: "owner-b", leaseMs: 5_000 });
  assert.equal(c2.lease.generation, c.lease.generation + 1);
  const stale = q2.ack({ eventId: event.id, owner: "owner-a", token: c.lease.token, generation: c.lease.generation });
  assert.equal(stale.refusal.reasonCode, "PROOF_STALE_GENERATION");
  const done = q2.ack({ eventId: event.id, owner: "owner-b", token: c2.lease.token, generation: c2.lease.generation, outcomeDigest: "after-crash" });
  assert.equal(done.event.state, "COMPLETED");

  const q3 = new DurableQueue({ filePath, now: clock.now });
  assert.equal(q3.get(event.id).state, "COMPLETED");
  assert.equal(q3.get(event.id).receipt.outcomeDigest, "after-crash");
  const replay = q3.enqueue({ idempotencyKey: "k-crash", payload: { durable: true } });
  assert.equal(replay.replayed, true);
  assert.equal(replay.receipt.id, done.receipt.id);
  assert.equal(q3.size, 1);
});
