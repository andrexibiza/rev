# Reference: Nine Core Primitives (composer + adjudicator checklist)

Promise (object+lifetime stated) | State (representations + lifetimes traced) | Boundary (carriers explicit, nothing ambient) | Change (transformation class + invariants) | Evidence (tuple: claim/pin/kind/scope, sensitivity) | Authority (scoped grant, monotonic, generation-fenced, settled) | Time (ordering/expiry/freshness proven) | Identity (composite, incarnation-paired, supersession explicit) | Cost (budget declared, receipt settled, per-outcome).

Adjudicator gate: verdict must show which primitives were load-bearing and evidence per primitive. Missing primitive analysis on relevant dimension (e.g., Time on async change) = incomplete review -> COMMENT max, never APPROVE.

## Primitive interaction matrix (where defects breed)
Promise×Time: stale promise reviewed as current (requirement generation). Promise×Cost: gold-plated review of trivial promise (routing by radius). State×Identity: same logical session, new incarnation treated as continuous (ABA). Boundary×Evidence: log from side A used for claim on side B (kind mismatch). Change×Cost: full-geometry on leaf change (declared compression exists for this). Authority×Time: valid grant, expired at use (revalidation). Evidence×Cost: probes skipped for budget without GAP declaration (silent downgrade — forbidden; declare or refuse). Identity×Boundary: name resolves differently across hosts (composite IDs + federation alias edges).

Adjudicator prompt derived: for each load-bearing claim, name interacting primitive pair most likely to break it; probe that pair first. This orders witness work better than generic skepticism.
