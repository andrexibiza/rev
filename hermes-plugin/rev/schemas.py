"""Tool schemas the LLM reads. Handlers in tools.py."""
REV_DEMO_REVIEW = {
    "name": "rev_demo_review",
    "description": "Run Rev's deterministic demo review (cap bug + bad test) via the Rev server /graphql-less demo path. Returns verdict markdown. Requires Rev server running (npm start).",
    "parameters": {"type": "object", "properties": {"endpoint": {"type": "string", "description": "Rev base URL, default http://localhost:8787"}}, "required": []},
}
REV_REGISTRY = {
    "name": "rev_registry",
    "description": "Query Rev registry via GraphQL (repositories/workEvents). Returns raw GraphQL JSON. Endpoint param explicit — never ambient.",
    "parameters": {"type": "object", "properties": {"endpoint": {"type": "string"}, "query": {"type": "string", "description": "GraphQL query, default registry query"}}, "required": []},
}
REV_TRIAGE = {
    "name": "rev_triage",
    "description": "Explain Rev advisory triage for an OSV id against this workspace package.json by calling Rev GraphQL advisory query. Read-only.",
    "parameters": {"type": "object", "properties": {"endpoint": {"type": "string"}, "osv_id": {"type": "string"}}, "required": ["osv_id"]},
}
