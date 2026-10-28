// GitHub App webhook receiver (Day 1): verify signature, accept, refuse with typed reasons.
// No review logic in Day 1. Valid signature + unsupported/unauthorized ask = typed refusal (data, 200).
// Bad signature = 401 (never processed). Coordinates in payload never authorize work.
import { createHmac, timingSafeEqual } from "node:crypto";
import { refusal } from "./types.mjs";

export function verifySignature(secret, rawBody, signatureHeader) {
  if (!secret || !signatureHeader || !signatureHeader.startsWith("sha256=")) return false;
  const expected = "sha256=" + createHmac("sha256", secret).update(rawBody).digest("hex");
  const a = Buffer.from(expected);
  const b = Buffer.from(signatureHeader);
  return a.length === b.length && timingSafeEqual(a, b);
}

export function handleWebhook({ event, payload, deliveryId, queue = null }) {
  if (event === "ping") return { status: 200, body: { ok: true, app: "rev", zen: payload?.zen ?? null } };
  if (event === "installation" || event === "installation_repositories") {
    return { status: 200, body: { ok: true, recorded: event, deliveryId } };
  }
  if (event === "pull_request" || event === "issue_comment") {
    if (queue) {
      const key = deliveryId || `pr-${payload?.pull_request?.number ?? payload?.issue?.number ?? "unknown"}`;
      const out = queue.enqueue({ idempotencyKey: String(key), payload: payload ?? {}, operation: "REVIEW" });
      if (out?.refusal) return { status: 200, body: out };
      return { status: 200, body: { ok: true, queued: true, replayed: !!out.replayed, eventId: out.event?.id, state: out.event?.state } };
    }
    return {
      status: 200,
      body: refusal(
        "LANES_NOT_READY",
        "Rev received source material but no queue configured. No action taken; nothing ambient was authorized.",
        true,
        null,
      ),
    };
  }
  return { status: 200, body: refusal("UNSUPPORTED_EVENT", `Unsupported event: ${event}`, false, null) };
}
