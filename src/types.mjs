// Core Rev types (schema.md §5). Runtime validators enforce Nothing Ambient Survives.
// Coordinates (strings naming repos/branches/packages) never authorize; only ProofObjects do.

export const SettlementStates = [
  "QUEUED", "CLAIMED", "RUNNING", "COMPLETED", "FAILED",
  "CANCELLED", "EXPIRED", "INDETERMINATE", "SHIPPED", "MERGED", "NO_ACTION",
];
export const Operations = ["REVIEW", "FIX", "IMPLEMENT", "DIAGRAM", "AUDIT_TESTS", "RESPOND", "TRIAGE", "MERGE"];

export function refusal(reasonCode, message, retryable = false, pin = null) {
  return { refusal: { reasonCode, message, retryable, pin } };
}
export function isRefusal(x) { return !!x && typeof x === "object" && "refusal" in x; }

// ProofObject: explicit current authority for one edge. Must narrow or equal parent grants.
export function validateProof(p, parent = null) {
  const required = ["authorityId", "principalId", "operation", "policyHash", "generation", "payloadDigest"];
  for (const k of required) if (!p || !p[k]) return refusal("PROOF_INCOMPLETE", `Missing proof field: ${k}`);
  if (!Operations.includes(p.operation)) return refusal("PROOF_BAD_OPERATION", `Unknown operation: ${p.operation}`);
  if (p.expiresAt && Date.now() > Date.parse(p.expiresAt)) return refusal("PROOF_EXPIRED", "Proof expired at use time; revalidate.", true);
  if (parent) {
    const widened = (p.grants || []).filter((g) => !(parent.grants || []).includes(g));
    if (widened.length) return refusal("AUTHORITY_WIDENING", `Grants widen beyond parent: ${widened.join(",")}`);
    if (p.generation !== parent.generation && parent.generation) {
      // Generation change requires explicit revalidation marker; Day 1: refuse.
      return refusal("PROOF_STALE_GENERATION", "Generation changed since parent proof; revalidate.", true);
    }
  }
  return { proof: p };
}

export function makeWorkEvent({ operation, pin, proofDigest, idempotencyKey }) {
  return {
    id: `we_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`,
    operation, state: "QUEUED", pin, proofDigest, idempotencyKey,
    createdAt: new Date().toISOString(), receipt: null,
  };
}

export function makeReceipt({ state, reasonCode, outcomeDigest, pin, mergeSha = null }) {
  if (!SettlementStates.includes(state)) throw new Error(`Bad settlement state: ${state}`);
  // Value-free: callers must pass digests/reason codes only. Guard against secret-shaped values.
  if (/ghp_|github_pat_|-----BEGIN|secret\s*=/i.test(String(outcomeDigest))) {
    throw new Error("Receipt outcomeDigest looks secret-bearing; receipts are value-free.");
  }
  return {
    id: `rc_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`,
    state, reasonCode, outcomeDigest, pin, mergeSha, createdAt: new Date().toISOString(),
  };
}
