# Operations

## Daily (build phase)

Run `npm run check && npm run check:refs && npm test` before claiming any milestone; record exact head SHA with results (plan Validation). Update `CHANGELOG.md` [Unreleased] in the same change. Docs touched by behavior changes updated in the same PR (parity gate, human-enforced until Day-6 automation).

## Refusal troubleshooting (Day-1 codes)

- `bad_signature` (401): webhook secret mismatch; payload never processed (by design).
- `LANES_NOT_READY`: only when server started without queue (app.mjs always configures one; custom embeddings may not).
- `AUTHORITY_AMBIGUOUS` (Day 2+): declare CODEOWNERS/fallback; Rev will not guess.
- `PROOF_STALE_GENERATION` / `POLICY_HASH_MISMATCH`: revalidate at current generation; never retry with old proof.
- `INDETERMINATE`: reconcile against main/event store before any continuation (see `references/authority.md` §7).

## Demo runbook (freeze Day 7; rehearsed twice)

Pre-flight: App installed on demo repo, fixtures pinned, advisory fixture locked, plugin build current, fallback video hash matches script (plan Day 7). Live failure fallback: play recording, state plainly that it is the rehearsed identical run (honesty is part of demo — typed refusals demo well too).

## Incidents

Rev-on-Rev incidents follow `references/costs-incidents.md`: freeze pins, implicated merges, distinguishing test, check-file + curriculum delta, changelog entry.
