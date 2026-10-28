// Model lane provider: deterministic executor by default; Muse via env when configured.
// Contract: completeLane({kind, brief}) -> {text, modelPin, usage}. Never fabricates model output:
// without credentials it returns DETERMINISTIC kind with explicit modelPin "deterministic-executor".
export async function completeLane({ kind, brief }) {
  const apiKey = process.env.MUSE_API_KEY || process.env.META_AI_API_KEY || "";
  const model = process.env.REV_MODEL || "";
  if (apiKey && model && process.env.REV_MODEL_ENDPOINT) {
    const res = await fetch(process.env.REV_MODEL_ENDPOINT, {
      method: "POST",
      headers: { "content-type": "application/json", authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({ model, messages: [{ role: "user", content: String(brief).slice(0, 20000) }] }),
    });
    if (!res.ok) return { refusal: { reasonCode: "MODEL_PROVIDER_ERROR", message: `Provider HTTP ${res.status}`, retryable: true }, kind };
    const data = await res.json().catch(() => ({}));
    const text = data?.choices?.[0]?.message?.content || data?.output_text || "";
    return { kind, text, modelPin: model, usage: data?.usage || null, provider: "muse-endpoint" };
  }
  return {
    kind,
    text: "",
    modelPin: "deterministic-executor",
    provider: "deterministic",
    note: "No REV_MODEL_ENDPOINT + API key configured; deterministic probes carry verdicts, model narrative empty by design.",
  };
}
export function modelConfigured() {
  return Boolean((process.env.MUSE_API_KEY || process.env.META_AI_API_KEY) && process.env.REV_MODEL && process.env.REV_MODEL_ENDPOINT);
}
