// Rev GitHub App server (Day 1 scaffold). Env: PORT, WEBHOOK_SECRET (required to accept deliveries).
import { createServer } from "node:http";
import { verifySignature, handleWebhook } from "./webhook.mjs";
import { createQueue } from "./queue.mjs";
import { createGraphQLHandler } from "./graphql.mjs";
import { createKnowledgeGraph } from "./graph.mjs";
const gqlHandler = createGraphQLHandler({ graph: createKnowledgeGraph({ pin: { sha: "0".repeat(40), generation: "gen-0", policyHash: "bootstrap" } }), repositories: [], workEvents: [], advisories: [] });
const queue = createQueue();

const port = Number(process.env.PORT || 8787);
const secret = process.env.WEBHOOK_SECRET || "";

const server = createServer((req, res) => {
  if (req.method === "GET" && req.url === "/healthz") {
    res.writeHead(200, { "content-type": "application/json" });
    res.end(JSON.stringify({ ok: true, service: "rev", day: 1 }));
    return;
  }
  if (req.url === "/graphql" && (req.method === "POST" || req.method === "GET")) { gqlHandler(req, res); return; }
  if (req.method !== "POST" || req.url !== "/webhooks/github") {
    res.writeHead(404, { "content-type": "application/json" });
    res.end(JSON.stringify({ error: "not_found" }));
    return;
  }
  const chunks = []; let size = 0;
  req.on("data", (c) => { size += c.length; if (size > 1_000_000) { res.writeHead(413, { "content-type": "application/json" }); res.end(JSON.stringify({ error: "payload_too_large" })); req.destroy(); } else chunks.push(c); });
  req.on("end", () => {
    const raw = Buffer.concat(chunks);
    const sig = req.headers["x-hub-signature-256"];
    if (!verifySignature(secret, raw, sig)) {
      res.writeHead(401, { "content-type": "application/json" });
      res.end(JSON.stringify({ error: "bad_signature" }));
      return;
    }
    let payload = {};
    try { payload = JSON.parse(raw.toString("utf8")); } catch {
      res.writeHead(400, { "content-type": "application/json" });
      res.end(JSON.stringify({ error: "bad_json" }));
      return;
    }
    const out = handleWebhook({
      event: req.headers["x-github-event"],
      payload,
      deliveryId: req.headers["x-github-delivery"], queue,
    });
    res.writeHead(out.status, { "content-type": "application/json" });
    res.end(JSON.stringify(out.body));
  });
});
server.listen(port, () => console.log(`rev webhook listening on :${port}`));
