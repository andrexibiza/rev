# Module 02 — Authority: Who May Decide What

Primitives: Boundary, Authority. Executes: references/authority.md. Sources: #93943, #95028, #90142/#90144/#90145.

First principle: possession is not permission. Holding a value (env var, token in memory, open socket, merged PR, maintainer's ear) describes state, not grant. Grants are explicit, scoped (principal, operation, object set, generation, expiry), monotonic (derivation only narrows), revocable, and receipted.

Derivations: (1) Resolution once at boundary; qualification monotonic downstream (URL->guessed connection is lossy reconstruction, banned once qualified identity known). (2) Proof scope = mutation scope or revalidate (object/generation/topology/snapshot widening gallery in Module 01 §3). (3) Logical ID != incarnation: pair every ID with generation (pid+start marker, connection+epoch, session+lineage, job+claim). ABA drill: observe, pause, recreate, resume — proxy checks pass, generation check catches. (4) Settlement completes authority: start without typed terminal/indeterminate + receipt leaves authority dangling; duplicates replay, stale generations never settle successors, exit codes never settle alone.

Roles: investigator, implementer, reviewer (correctness), reviewer (adversarial), adjudicator, maintainer-authorizer, release-authorizer. Self-certification banned pairwise for producer/verifier. Community diligence compounds assessment trust only. Pre-authorization is a grant object (class, bounds, expiry, revocation) from actual maintainer — never inferred.

Exercises: map one deployment's grants vs possessions (every possession without grant is a finding); ABA-tabletop one cleanup job; rewrite one "admin can do X" statement into scoped grant tuples.

## Deep dive: the twelve-issue synthesis (#95028 method)
Filed in one week (2026-08-17 to 08-25): desktop route identity first, core laws next, completion/control-plane, capstone last. Titles themselves are laws (monotonic identity, scope equality, generation fencing, nothing ambient). Study method Rev reuses for incident synthesis: collect subsystem incidents, rebuild origin chains from bodies (excluding lookalike references like CI run numbers sharing #N shape), test single-defect hypothesis by expressing every break in one vocabulary (admission/projection/mutation/settlement), publish interlock with honest gaps (one core issue without verified binding, eleven unbound PRs — recorded, not smoothed). Learner exercise: replicate synthesis on 5 incidents from any repo history; single-vocabulary test fails -> keep separate defects honestly.

## Proof-carrying state (#90866) and exact-object completion (#91230, #90150)
Observable state must carry proof from source to side effect: dashboard "delivered," check "passed," artifact "built" each bind pin/generation/digest or they are coordinates. Completion claims name exact object (commit, artifact hash, merge SHA, published version) — "done" without object is unsettled. Built artifact + real protocol peers as system under test closes source-vs-artifact gap (dev-green packaged-broken is the canonical wrong green).

## Bot Mode control plane (#91911) as integration exam
One control plane for identity/capability/delivery/cancellation: bot identity inferred from mutable coordinates fails admission; capability, delivery, cancellation each consume same qualified identity. Shadow control planes (second policy source) forbidden — durable transport never authorizes parallel policy. Exam: trace one bot message admission->settlement naming every identity transformation; any re-resolution from ambient state fails exam.

## Desktop route identity (#88680/#90149)
(Connection, profile) route immutable, generation-bound, resource-owned. Renderer ownership of socket is coordinate. Route change = new generation + explicit handoff receipt; stale renderer cannot settle successor route work. Generalized: any UI selection (workspace, profile, repo in plugin) is coordinate until proof binds it to WorkEvent.
