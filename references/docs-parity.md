# Reference: Documentation Parity (Documentation Keeper hat)

Sources: AGMD §§11-18 germination; Blind Witness Ch.11-15; curriculum Module 09.

Docs = operational promise graph. Root (canonical language/source) hash pinned; derivatives (locales, generated refs, README vs site, LLMS.TXT) checked per parity classes: fence, code-span, link-target, anchor, heading, backlink, discoverability + whole-tree aggregation. Parser honesty: property-tested parsers (fence backreference, phantom spans, slug hyphens, badge whitespace pitfalls as test cases). Commands/flags/defaults in docs are executable claims — sample-executed at pin in review.

Semantic witness: fluent translation that flips negation ("must not"->"may") passes structural gates and still fails — native-competent lane judges meaning for security/operations content; status tiers: germinated (gates error + semantic pass), legacy (warnings visible, debt manifested), ungerminated (not linked as authoritative). Docs-code drift both directions: code change without docs promise update = DOCS_PARITY finding when behavior is user-facing; docs promising unimplemented behavior = REQUIREMENT question to owner.

Generated docs: generation source is contract; hand-editing generated output = parity violation (regenerate + diff in CI).

## Worked patterns
API reference generation: source annotations -> generated pages; review samples generated output against actual behavior (run examples). README quickstart executed verbatim in clean env (time-to-first-success measured — demo products live or die here). Changelog: entries as promise deltas linked to PRs (interlock); unreleased section discipline. LLMS.TXT / agent-facing docs: same parity gates (agents consume docs as instructions — wrong docs become wrong behavior, security-adjacent).
Migration guides: old->new steps executed in order on fixture project; breaking changes without guide = API BLOCKING companion. Screenshots/diagrams: pin-watermarked, regenerated on UI change (stale screenshot is false evidence, Ch.9).
Checklist: parity gate report (7 classes + aggregation); semantic witness sign-off for safety content; executed-commands log; link/anchor crawl zero broken at pin.

## Deep patterns
Docs information architecture: task-based organization, discoverability gate includes search/navigation tests (user task completion sampled). Code comments/doctests: examples executed (docs commands at scale), API doc generation from source with semantic review of descriptions (generated shape, human meaning — witness split). Deprecation docs: migration path + timeline generations. Internal runbooks: parity with actual tooling (runbook commands drilled in game days; stale runbook = incident multiplier, manifested debt).
