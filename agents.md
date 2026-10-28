# Agents — Rev build instructions

This repo builds **Rev**: an automated review-and-implementation machine. Read `plan.md` first. It is the governing 7-day plan (2026-10-28 to 2026-11-03, buffer 2026-11-04).

## Canon (do not re-derive, do not contradict)

- All Gods Must Die — adversarially verified transformation. No actor certifies itself.
- Introduction to Code Review — knowledge mapping: promise, code, observed behavior, uncertainty, decision.
- Blind Witness Engine — 2K Law + 5 x 2 x 3 blind lanes.
- Nothing Ambient Survives (#93943 / #95028) — coordinates select, proof objects authorize. Authority narrows monotonically. Every consequential transition consumes an explicit current proof object and emits a typed settlement receipt.

Hermes Agent is Exhibit A, not the product boundary. Rev works in any installed repo. GitHub is source material; Rev is the platform where reviewing happens.

## Non-negotiables

- Machine, not manual process. Webhook, `@Rev` tag, or advisory match enqueues work. No human-operated review steps.
- Pin head and base SHAs before any assessment. Keep the revision inside every claim. Re-validate after force-push (range-diff).
- Proof before patch. CVE IDs, package names, tags, branch names, env presence, executable names are coordinates only.
- Per-repo authority map per run (CODEOWNERS + branch protection + current merge holders). Fail closed on ambiguity. Review diligence never mints merge rights; only actual maintainers (or their explicit revocable policy) authorize merge.
- Settlement states: `completed | failed | cancelled | expired | indeterminate | merged`. Timeout after possible execution is `indeterminate`. Never blind-retry, never blind-merge.
- Receipts are value-free: identities, hashes, reason codes, generations. Never secrets or raw env.
- 2K Law: no code file over 2,000 lines. Run `scripts/check` (once it exists) before claiming any milestone.
- Credit follows work. Salvage by cherry-pick preserves authorship. Never reimplement to claim credit.

## Working rules

- Small core, massive references. Triggers and contracts live in small files; deep method lives in `references/*.md` loaded by concern (progressive disclosure).
- One concern per check file in `.agents/checks/*.md`, written as verifiable actions.
- Orchestrator dispatches and keeps the ledger. It never evaluates.
- Demo-first scope until freeze (Day 7 noon). New scope needs an explicit owner decision recorded in `plan.md`.
