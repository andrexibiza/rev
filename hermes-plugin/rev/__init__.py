"""Rev Hermes plugin — register(ctx) wiring. Native plugin contract (plugin.yaml + register)."""
try:
    from .schemas import REV_DEMO_REVIEW, REV_REGISTRY, REV_TRIAGE
    from .tools import rev_demo_review, rev_registry, rev_triage
except ImportError:  # direct import fallback for doctor/harness loading
    from schemas import REV_DEMO_REVIEW, REV_REGISTRY, REV_TRIAGE
    from tools import rev_demo_review, rev_registry, rev_triage


def register(ctx):
    ctx.register_tool(name="rev_demo_review", schema=REV_DEMO_REVIEW, handler=rev_demo_review)
    ctx.register_tool(name="rev_registry", schema=REV_REGISTRY, handler=rev_registry)
    ctx.register_tool(name="rev_triage", schema=REV_TRIAGE, handler=rev_triage)
    try:
        ctx.register_skill("skills/rev/SKILL.md")
    except Exception:
        pass  # skill bundling optional; tools are the contract
