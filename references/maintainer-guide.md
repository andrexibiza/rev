# Reference: Maintainer Guide (adopting Rev without surrendering authority)

For actual maintainers evaluating/adopting Rev. Rev produces evidence; you keep decisions.

Install tiers: Review-only (comments/checks, no push), Review+Fix (fix branches PRs), Crisis-enabled (watcher + respond) — each tier explicit grant, upgrade = re-consent + policy generation bump. Configure: CODEOWNERS accuracy first (Rev fails closed otherwise — fix declaration, don't ask Rev to guess), required checks (add rev/* only after trial period on non-required), pre-authorization policies optional per fix class (bounds, expiry, revocation in one click), cost ceilings, geometry defaults by radius, digest cadence.

Trial protocol (2 weeks suggested): shadow mode (lanes run, output private to maintainers) -> measure acted/dismissed with reasons -> tune check files -> public mode. Dismissal coding is product feedback; maintainers owe coded reasons, Rev owes reference fixes for repeated classes (bilateral contract).

What Rev will never do (invariants as adoption assurance): merge without your grant/policy, widen its permissions silently, hide INDETERMINATE, count SHIPPED as merged, learn your private code into shared models beyond declared policy (graph export grants scoped, federation file §8). Exit: uninstall revokes tokens; exported receipts remain verifiable offline (signed, portable) — evidence outlives subscription by design.

## Reading Rev output in 60 seconds (maintainer UX promise)
Header pins + verdict + who may merge. Findings sorted blocking-first with obligations. One-click: view receipts (GraphQL), view graph radius, dismiss-with-reason (coded, feeds calibration), request fix (same WorkEvent lineage), merge when your authority + generation still hold (UI shows generation freshness; stale = revalidate button, never silent). If you read nothing else, read Remaining Boundaries — Rev guarantees gaps live there, not buried.
