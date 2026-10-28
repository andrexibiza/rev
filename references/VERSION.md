# Reference Library Version

Library: 0.1.0 (2026-10-27 build-out). Primitives: 9 (Promise, State, Boundary, Change, Evidence, Authority, Time, Identity, Cost). Invariants: 10 (invariants.md). Files: see INDEX.md (all indexed, >=100w gate via scripts/check-refs.mjs).

Change rule: curriculum delta -> reference recompile in same PR -> check-refs + seeded gallery run. Breaking invariant changes require federation RFC (federation-conformance.md). Reason codes + glossary additive-only within 0.x.
Counts at 0.1.0 build-out: 48 reference files, ~24k words references + ~6k curriculum (14 files), 4 check seeds (checks/), core SKILL.md. Gates: scripts/check.mjs (2K), scripts/check-refs.mjs (index + anti-stub), tests/day1.test.mjs (5 tests). Primitives 9 / Invariants 10 adopted 2026-10-27 in-build (curriculum/00 extension + references/primitives.md, invariants.md).
