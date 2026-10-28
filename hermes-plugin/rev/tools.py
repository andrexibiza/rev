"""Handlers. Explicit endpoint argument only — no ambient env authority (Nothing Ambient Survives).
Uses stdlib urllib only. All failures return typed JSON refusals, never raise into host."""
import json
import urllib.request
import urllib.error

DEFAULT = "http://localhost:8787"


def _post(url, payload, timeout=10):
    req = urllib.request.Request(url, data=json.dumps(payload).encode(), headers={"content-type": "application/json"}, method="POST")
    try:
        with urllib.request.urlopen(req, timeout=timeout) as r:
            return {"ok": True, "status": r.status, "body": r.read().decode()[:8000]}
    except Exception as e:  # host must never crash on Rev downtime
        return {"ok": False, "refusal": {"reasonCode": "REV_UNREACHABLE", "message": str(e)[:300], "retryable": True}}


def rev_demo_review(endpoint=None, **kw):
    # Demo verdict is produced server-side factory; plugin fetches registry as liveness + returns guidance with endpoint proof.
    base = (endpoint or DEFAULT).rstrip("/")
    health = _post(base + "/graphql", {"query": "{ registry { id state } }"})
    if not health.get("ok"):
        return json.dumps({"refusal": health.get("refusal"), "next": "Start Rev: PORT=8787 WEBHOOK_SECRET=devsecret npm start (in Meta-Code-Review), then retry."})
    return json.dumps({"ok": True, "endpoint": base, "graphql": health["body"][:1000], "next": "Run `node src/demo.mjs` in Rev repo for full verdict markdown (deterministic executor)."})


def rev_registry(endpoint=None, query=None, **kw):
    base = (endpoint or DEFAULT).rstrip("/")
    q = query or "{ repositories { id } registry { id state } }"
    out = _post(base + "/graphql", {"query": q})
    return json.dumps(out if out.get("ok") else out)


def rev_triage(osv_id, endpoint=None, **kw):
    base = (endpoint or DEFAULT).rstrip("/")
    q = '{ advisory(osvId: "%s") { id aliases } }' % osv_id.replace('"', "")
    out = _post(base + "/graphql", {"query": q})
    return json.dumps(out if out.get("ok") else out)
