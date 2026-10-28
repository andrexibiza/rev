# Reference: Contributor Guide (getting Rev reviews that help you merge)

For PR authors in Rev-enabled repos. Write promise sentence (object + lifetime) in PR body — lanes map from it; vague PRs get QUESTIONs, precise PRs get verdicts. Keep PRs radius-small (stack if large — systems §10); single purpose (template attestation: tests run, check green, cross-platform considered — Hermes PR template pattern generalized). Tests: add distinguishers that can go red; lanes sensitivity-probe sole safety tests (bad-tests) — save a round trip by self-probing (revert source, confirm symptom red).

Responding: repair (new pin — prior approvals void honestly), evidence (new artifact), or requirement appeal (tag owner). Dismiss lane findings with coded reasons in UI (wrong/stale/scope/preference/duplicate) — your dismissal trains references (calibration loop) and is credited, never punished. Credit: salvage preserves your authorship; Rev fix PRs building on your work cherry-pick, never reimplement (accounting).

Advisory PRs from watcher: treat as maintainer-assist; your review focuses on capability preservation + business context lanes lack.

## Worked author loop (demo PR shape)
Open PR with promise + boundary totals test failing on member path -> @Rev review returns blocking cap finding + bad-test finding with probes -> tag @Rev fix OR push own repair addressing obligations (cap relation + isolated test) -> re-review at new pin (range-diff shown, prior findings updated, not erased) -> maintainer merges at fresh generation -> receipt chain viewable in plugin registry. Author time spent on promise + one repair; census/probes/bookkeeping absorbed by lanes (Cost primitive: human attention protected).
