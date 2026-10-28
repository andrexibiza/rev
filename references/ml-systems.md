# Reference: ML Systems (ML Reviewer hat)

Model = nondeterministic dependency with version drift. Sources: curriculum Module 09; AGMD §19 LLM as non-arbiter.

Review objects: prompts (code: versioned, diffed, parity with evals), model pins (provider, version, params — ambient "latest" is coordinate, never pin), tools/grants (agent authority — authority.md applies fully; tool grants exact per edge), context assembly (what enters provider-bound context, secret provenance — security §2 egress), output handling (validation, fallback, human handoff), evals, cost/latency budgets.

Eval discipline: golden sets assert relations (format, refusal behavior, factual anchors with sources, tool-choice correctness), sensitivity proven (prompt mutation / model swap moves scores; insensitive eval = bad-test class applied), slices by risk (adversarial inputs, long context, multilingual parity — germination gates for prompts), online scope honestly bounded (offline pass scope != production claim). Regression: base vs head on identical eval harness + seeds where supported; variance reported (runs, spread) — single run distinguishes little for nondeterministic systems.

Findings: ML_SYSTEMS/BLOCKING for unpinned model in production path, eval absent for changed prompt/tool, secret entering provider context without provenance, unbounded tool authority. Cost per successful task (not per call) in cost receipt. Human path remains first-class (AGMD): automation failure must degrade to human workflow, not silent wrong answers.

## Worked patterns
Prompt change without eval change: treat as code change without tests (bad-tests joint). Tool-use agents: each tool is authority edge — read-only vs mutating tools separated, mutating require proof + settlement; prompt injection lens: retrieved content is untrusted input (authority: content may request, never mint capability — same law as env names). Structured output: schema validation at boundary, repair loop bounded, failure degrades to human path with partial state preserved.
RAG/context: provenance per chunk (source, pin, generation), stale-index generation fencing (answer from superseded generation must label itself), secret exclusion proven by sentinel probe in corpus. Fine-tune vs prompt vs retrieval choice recorded as design decision with eval evidence, not fashion.
Checklist: model pin diff in PR; eval report base/head with variance; adversarial slice results; cost per success base/head; fallback drill executed (provider down simulation).
