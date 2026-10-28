// Queue worker: claim -> markRunning -> factory demo review -> ack/nack with receipts. One pass = drainOnce.
import { runDemoReview } from "./demo.mjs";
import { postReview } from "./projector.mjs";

export async function drainOnce({ queue, owner = "rev-worker-1", projector = postReview } = {}) {
  const claimed = queue.claim({ owner });
  if (!claimed || claimed.refusal) return { drained: false, reason: claimed?.refusal?.reasonCode || "EMPTY" };
  const { event, lease } = claimed;
  const fence = { eventId: event.id, owner, token: lease.token, generation: lease.generation };
  queue.markRunning(fence);
  try {
    const demo = runDemoReview();
    let projection = null;
    const pr = event.payload?.pull_request?.number || event.payload?.issue?.number;
    if (pr && event.payload?.repository?.full_name) {
      const [o, r] = String(event.payload.repository.full_name).split("/");
      projection = await projector({ owner: o, repo: r, prNumber: pr, body: demo.markdown, event: demo.adjudication.verdict === "APPROVE" ? "APPROVE" : "COMMENT" });
    }
    const settled = queue.ack({ ...fence, outcomeDigest: "demo-review-" + demo.adjudication.verdict, reasonCode: "REVIEW_COMPLETED" });
    return { drained: true, eventId: event.id, verdict: demo.adjudication.verdict, projection, receipt: settled.receipt || null };
  } catch (err) {
    const settled = queue.nack({ ...fence, retryable: false, reasonCode: "WORKER_ERROR", outcomeDigest: String(err.message).slice(0, 80) });
    return { drained: true, eventId: event.id, error: String(err.message), receipt: settled.receipt || null };
  }
}
