# Federation Conformance Report

- Kind: federation-conformance (Rev reference implementation, self-hosting)
- Version: 0.1.0
- Pin: sha=`033617c937e8598cdb9c9e02cd8cea17092d7203` generation=`gen-conformance-1` policyHash=`policy-v1`
- Generated: 2026-10-28T13:15:26.844Z
- Result: **ALL PASS** — 6/6 witnesses passed

Badge is this report, not an image (references/federation-conformance.md).
Partial coverage = partial level, never rounded up.

## Witness summary

| Witness | Family | Result | Title |
|---|---|---|---|
| W-A1 | W-A | PASS | Widening grants refused (AUTHORITY_WIDENING) |
| W-A2 | W-A | PASS | Stale generation at use refused (PROOF_STALE_GENERATION) |
| W-S1 | W-S | PASS | Duplicate delivery replays (side-effect count 1) |
| W-E1 | W-E | PASS | Insensitive test cited as sole distinguisher collapses safety claim |
| W-P1 | W-P | PASS | Ambient spawn (no broker intent) fails gate; direct spawn outside broker fails gate |
| W-G1 | W-G | PASS | AFFECTS without reachability proof never renders as REACHES |

## Witness details

### W-A1 — PASS: Widening grants refused (AUTHORITY_WIDENING)

- Family: Authority
- Invariant: Inv3 (authority only narrows)
- Detail: validateProof refused widened grants [repo:read, repo:write] beyond parent [repo:read] with AUTHORITY_WIDENING; equal grants pass.
- Evidence: `{"wideningReasonCode":"AUTHORITY_WIDENING","narrowPassed":true,"source":"src/types.mjs:validateProof"}`

### W-A2 — PASS: Stale generation at use refused (PROOF_STALE_GENERATION)

- Family: Authority
- Invariant: Inv3/Inv8 (generation fencing, composite identity)
- Detail: validateProof refused generation gen-2 against parent gen-1 with PROOF_STALE_GENERATION; same-generation proof passes.
- Evidence: `{"staleReasonCode":"PROOF_STALE_GENERATION","freshPassed":true,"source":"src/types.mjs:validateProof"}`

### W-S1 — PASS: Duplicate delivery replays (side-effect count 1)

- Family: Settlement
- Invariant: Inv7 (settlement is typed and honest)
- Detail: DurableQueue replayed duplicate idempotencyKey with original event id and write-once receipt; queue size stayed 1 before and after ACK.
- Evidence: `{"eventId":"we_mvs50a9l_2d5a6ddc85d3","replayBeforeReusedId":true,"receiptId":"rc_mvs50a9o_a7odtq","replayAfterReceiptMatches":true,"queueSize":1,"sideEffectCount":1,"source":"src/queue.mjs:DurableQueue.enqueue/ack"}`

### W-E1 — PASS: Insensitive test cited as sole distinguisher collapses safety claim

- Family: Evidence
- Invariant: Inv6 (evidence must be able to fail)
- Detail: sensitivityProbe marked base-pass/mutant-fail as sensitive and always-pass as insensitive; adjudicate blocked the insensitive case with BAD_TEST (BLOCKING) and approved the sensitive case.
- Evidence: `{"sensitive":true,"insensitiveSensitive":false,"sensitiveVerdict":"APPROVE","insensitiveVerdict":"REQUEST_CHANGES","badTestKind":"BAD_TEST","badTestDisposition":"BLOCKING","source":"src/factory.mjs:sensitivityProbe/adjudicate"}`

### W-P1 — PASS: Ambient spawn (no broker intent) fails gate; direct spawn outside broker fails gate

- Family: Process
- Invariant: Inv2/Inv10 (nothing ambient survives; no rule counts until it executes)
- Detail: Scanned 20 src/*.mjs files; 2 spawn hit(s) confined to allowlisted broker/queue files, 0 violations.
- Evidence: `{"scannedFiles":["src/app.mjs","src/authority-map.mjs","src/crisis.mjs","src/demo.mjs","src/factory.mjs","src/fixlane.mjs","src/github.mjs","src/graph.mjs","src/graphql.mjs","src/ingest.mjs","src/model.mjs","src/projector.mjs","src/queue.mjs","src/review.mjs","src/traces.mjs","src/transparency.mjs","src/types.mjs","src/watcher.mjs","src/webhook.mjs","src/worker.mjs"],"allowlist":[{"path":"src/factory.mjs","role":"broker","rationale":"Test-execution broker: sole child_process site (runNodeTest) with fixed argv execFileSync(process.execPath, ['--test', file], { stdio: 'pipe' }), no shell."},{"path":"src/queue.mjs","role":"queue","rationale":"Durable settlement queue (broker boundary for admission/lease/settlement). No spawn primitive today; allowlisted as the queue broker boundary per task."}],"allowlistedHits":[{"file":"src/factory.mjs","line":3,"text":"import { execFileSync } from \"node:child_process\";"},{"file":"src/factory.mjs","line":73,"text":"try { execFileSync(process.execPath, [\"--test\", file], { stdio: \"pipe\" }); return true; }"}],"violations":[],"source":"conformance/run.mjs:scanAmbientSpawns (grep over src/*.mjs)"}`

### W-G1 — PASS: AFFECTS without reachability proof never renders as REACHES

- Family: Graph
- Invariant: Inv (schema §4: coordinates select, proof authorizes — AFFECTS != REACHES)
- Detail: REACHES without evidence refused at write (REACHES_EVIDENCE_REQUIRED); AFFECTS listed only via affectedEntities, REACHES only via reachableEntities after proven-path evidence.
- Evidence: `{"reachesWithoutEvidenceRefused":true,"refusalCode":"REACHES_EVIDENCE_REQUIRED","affected":["lib"],"reachable":["core"],"reachableAfterAffectsOnly":[],"source":"src/graph.mjs:KnowledgeGraph.addEdge/affectedEntities/reachableEntities"}`

## Invariant coverage

| Invariant | Witnesses |
|---|---|
| Inv2 | W-P1 |
| Inv3 | W-A1, W-A2 |
| Inv6 | W-E1 |
| Inv7 | W-S1 |
| Inv8 | W-A2 |
| Inv10 | W-P1 |
| schema §4 (AFFECTS/REACHES) | W-G1 |

## W-P allowlist (ambient spawn scan)

The W-P scan greps `src/*.mjs` for `node:child_process` imports and
spawn primitives (spawn/spawnSync/execFile/execFileSync/execSync/fork).
RegExp `.exec(...)` is not a spawn and is excluded. Hits outside the
allowlist fail W-P1/W-P2; allowlisted hits are listed as evidence in
`report.json`, not hidden.

| Path | Role | Rationale |
|---|---|---|
| `src/factory.mjs` | broker | Test-execution broker: sole child_process site (runNodeTest) with fixed argv execFileSync(process.execPath, ['--test', file], { stdio: 'pipe' }), no shell. |
| `src/queue.mjs` | queue | Durable settlement queue (broker boundary for admission/lease/settlement). No spawn primitive today; allowlisted as the queue broker boundary per task. |

## Reproduce

```bash
node conformance/run.mjs   # writes conformance/report.json + conformance/REPORT.md
npm test                   # includes tests/conformance.test.mjs (all-pass on current tree)
```
