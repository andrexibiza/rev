// Transparency log (federation §3): append-only hash-chained receipts, threshold countersign check.
// No edits, no deletes. Corrections are SUPERSEDES entries. Crypto via node:crypto SHA-256.
import { createHash } from "node:crypto";
const h = (s) => createHash("sha256").update(s).digest("hex");
export function createLog() { return { entries: [], head: "GENESIS" }; }
export function append(log, { receiptDigest, generation, signatures = [], supersedes = null }) {
  if (!receiptDigest) return { refusal: { reasonCode: "PAYLOAD_REQUIRED", message: "receiptDigest required" } };
  const hash = h(log.head + "|" + receiptDigest + "|" + generation + "|" + (supersedes || ""));
  const entry = { seq: log.entries.length, hash, prevHash: log.head, receiptDigest, generation, signatures, supersedes, countersigned: signatures.length };
  log.entries.push(entry); log.head = hash;
  return { entry };
}
export function verifyChain(log) {
  let prev = "GENESIS";
  for (const e of log.entries) {
    const expect = h(prev + "|" + e.receiptDigest + "|" + e.generation + "|" + (e.supersedes || ""));
    if (expect !== e.hash || e.prevHash !== prev) return { ok: false, at: e.seq };
    prev = e.hash;
  }
  return { ok: true, head: log.head, count: log.entries.length };
}
export function meetsThreshold(entry, threshold = 3) { return (entry.signatures || []).length >= threshold; }
export { h as digest };
