#!/usr/bin/env node
// Federation conformance runner — Rev reference implementation self-hosting.
// Executes executable witnesses (not vocabulary checks) against this repo's
// src/ modules and emits a JSON report + REPORT.md summary.
//
// Witnesses:
//   W-A  Authority    — widening refused + stale generation refused (src/types.mjs validateProof)
//   W-S  Settlement   — queue duplicate replay, side-effect count 1 (src/queue.mjs DurableQueue)
//   W-E  Evidence     — factory sensitivity: insensitive distinguisher collapses claim (src/factory.mjs)
//   W-P  Process      — grep-based ambient spawn scan of src/ (broker/queue allowlist below)
//   W-G  Graph        — AFFECTS != REACHES, REACHES requires evidence (src/graph.mjs KnowledgeGraph)
//
// Usage:
//   node conformance/run.mjs           # writes conformance/report.json + conformance/REPORT.md, exit 0 iff all pass
//   import { runConformance } from "./run.mjs"  # programmatic, no file writes
//
// Spec: references/federation-conformance.md (witness suite + invariant map),
//       references/authority.md §11 (federation levels), references/invariants.md.
// Do not edit src/ to make witnesses pass — witnesses prove src/ as-is.

import { existsSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { join, relative } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const HERE = fileURLToPath(new URL(".", import.meta.url));
const DEFAULT_ROOT = fileURLToPath(new URL("..", import.meta.url));

// ---------------------------------------------------------------------------
// W-P allowlist (documented, normative for this runner)
//
// Ambient spawn = child creation without an explicit broker intent
// (no fixed argv / env / stdin policy, or direct spawn outside the broker).
// Only broker/queue boundary files may contain child_process primitives;
// every other src/ file that imports child_process or calls a spawn
// primitive is a W-P violation (W-P1/W-P2 in federation-conformance.md).
//
// Allowlisted files (path relative to repo root):
//   src/factory.mjs — broker. Sole child_process site in src/ today:
//     `runNodeTest` wraps `execFileSync(process.execPath, ["--test", file],
//     { stdio: "pipe" })` with fixed argv (interpreter + --test + caller
//     file), no shell, no caller-supplied command string. This is the
//     test-execution broker; lanes call runNodeTest, never spawn directly.
//   src/queue.mjs — queue. DurableQueue is the settlement broker boundary
//     (admission / fenced lease / ACK-NACK). It currently contains no
//     spawn primitive; it is allowlisted so a future brokered spawn
//     introduced *inside* the queue/broker boundary is reviewed against
//     broker-intent shape rather than flagged as ambient, while any
//     spawn in non-allowlisted lanes remains a violation.
//
// Any other src/*.mjs importing `node:child_process` or calling
// spawn/spawnSync/execFile/execFileSync/execSync/fork fails W-P.
// RegExp `.exec(...)` calls (e.g. in src/watcher.mjs, src/graphql.mjs)
// are not child-process spawns and are explicitly excluded.
// Allowlisted hits are reported as evidence, not silently hidden.
// ---------------------------------------------------------------------------
export const SPAWN_ALLOWLIST = [
  {
    path: "src/factory.mjs",
    role: "broker",
    rationale:
      "Test-execution broker: sole child_process site (runNodeTest) with fixed argv execFileSync(process.execPath, ['--test', file], { stdio: 'pipe' }), no shell.",
  },
  {
    path: "src/queue.mjs",
    role: "queue",
    rationale:
      "Durable settlement queue (broker boundary for admission/lease/settlement). No spawn primitive today; allowlisted as the queue broker boundary per task.",
  },
];
const ALLOWLIST_SET = new Set(SPAWN_ALLOWLIST.map((e) => e.path));

// Spawn primitives that create a child process. `.exec(` on a RegExp is
// excluded separately (see scanAmbientSpawns).
const SPAWN_CALL_RE = /\b(?:spawn|spawnSync|execFile|execFileSync|execSync|fork)\s*\(/;
const CHILD_IMPORT_RE = /node:child_process|from\s+["']child_process["']|require\(["'](?:node:)?child_process["']\)/;

function resolveRoot(rootOpt) {
  return rootOpt ? fileURLToPath(new URL(`file://${rootOpt.replace(/\/?$/, "/")}`)) && rootOpt : DEFAULT_ROOT;
}

function readPackageVersion(root) {
  try {
    const pkg = JSON.parse(readFileSync(join(root, "package.json"), "utf8"));
    return pkg.version ?? "0.0.0";
  } catch {
    return "0.0.0";
  }
}

// Pin: (sha, generation, policyHash). SHA from .git without spawning a child
// (this runner must not itself become an ambient spawn).
function resolvePin(root) {
  let sha = "0".repeat(40);
  try {
    const headPath = join(root, ".git", "HEAD");
    if (existsSync(headPath)) {
      const head = readFileSync(headPath, "utf8").trim();
      if (head.startsWith("ref:")) {
        const ref = head.slice(4).trim();
        const refPath = join(root, ".git", ref);
        if (existsSync(refPath)) sha = readFileSync(refPath, "utf8").trim().slice(0, 40);
      } else if (/^[0-9a-f]{40}$/i.test(head)) {
        sha = head;
      }
    }
  } catch {
    // Pin stays zero-sha; witnesses do not depend on the git SHA.
  }
  return { sha, generation: "gen-conformance-1", policyHash: "policy-v1" };
}

async function importSrc(root, rel) {
  // Cache-bust so a mutated src/ file is re-read within the same process
  // (gate-sensitivity: removing a check must turn its witness red, W-P3/Inv10).
  return import(`${pathToFileURL(join(root, rel)).href}?conformance=${Date.now()}-${Math.random().toString(36).slice(2)}`);
}

// --- W-A: Authority (src/types.mjs validateProof) ---------------------------

async function checkWA(root) {
  const { validateProof } = await importSrc(root, "src/types.mjs");
  const parent = {
    authorityId: "auth-parent",
    principalId: "principal-1",
    operation: "REVIEW",
    policyHash: "policy-v1",
    generation: "gen-1",
    payloadDigest: "digest-parent",
    grants: ["repo:read"],
  };

  // W-A1: widening grants refused (AUTHORITY_WIDENING), narrow child passes.
  const widened = { ...parent, authorityId: "auth-child-widened", grants: ["repo:read", "repo:write"] };
  const wideningResult = validateProof(widened, parent);
  const narrow = { ...parent, authorityId: "auth-child-narrow", grants: ["repo:read"] };
  const narrowResult = validateProof(narrow, parent);
  const wa1Pass =
    wideningResult?.refusal?.reasonCode === "AUTHORITY_WIDENING" && !!narrowResult?.proof;

  // W-A2: stale generation at use refused (PROOF_STALE_GENERATION).
  const stale = { ...parent, authorityId: "auth-child-stale", generation: "gen-2", grants: ["repo:read"] };
  const staleResult = validateProof(stale, parent);
  const freshResult = validateProof({ ...parent, authorityId: "auth-child-fresh" }, parent);
  const wa2Pass =
    staleResult?.refusal?.reasonCode === "PROOF_STALE_GENERATION" && !!freshResult?.proof;

  return [
    {
      id: "W-A1",
      category: "W-A",
      family: "Authority",
      title: "Widening grants refused (AUTHORITY_WIDENING)",
      invariant: "Inv3 (authority only narrows)",
      pass: wa1Pass,
      detail: wa1Pass
        ? "validateProof refused widened grants [repo:read, repo:write] beyond parent [repo:read] with AUTHORITY_WIDENING; equal grants pass."
        : `Expected AUTHORITY_WIDENING for widened child and pass for narrow child; got widening=${JSON.stringify(wideningResult)} narrow=${JSON.stringify(narrowResult)}`,
      evidence: {
        wideningReasonCode: wideningResult?.refusal?.reasonCode ?? null,
        narrowPassed: !!narrowResult?.proof,
        source: "src/types.mjs:validateProof",
      },
    },
    {
      id: "W-A2",
      category: "W-A",
      family: "Authority",
      title: "Stale generation at use refused (PROOF_STALE_GENERATION)",
      invariant: "Inv3/Inv8 (generation fencing, composite identity)",
      pass: wa2Pass,
      detail: wa2Pass
        ? "validateProof refused generation gen-2 against parent gen-1 with PROOF_STALE_GENERATION; same-generation proof passes."
        : `Expected PROOF_STALE_GENERATION for stale child; got ${JSON.stringify(staleResult)}`,
      evidence: {
        staleReasonCode: staleResult?.refusal?.reasonCode ?? null,
        freshPassed: !!freshResult?.proof,
        source: "src/types.mjs:validateProof",
      },
    },
  ];
}

// --- W-S: Settlement (src/queue.mjs DurableQueue) ---------------------------

async function checkWS(root) {
  const { DurableQueue } = await importSrc(root, "src/queue.mjs");
  const q = new DurableQueue();
  const payload = { repoId: "rev:repo:github:o/r", headSha: "a".repeat(40), n: 1 };
  const key = "conformance-ws1-duplicate";

  const first = q.enqueue({ idempotencyKey: key, payload, operation: "REVIEW" });
  const replayBefore = q.enqueue({ idempotencyKey: key, payload, operation: "REVIEW" });
  const sizeAfterReplay = q.size;

  let ackReceiptId = null;
  let replayAfter = null;
  let claimOk = false;
  if (first?.event?.id) {
    const claimed = q.claim({ owner: "conformance-courier" });
    if (claimed?.lease) {
      claimOk = true;
      const acked = q.ack({
        eventId: first.event.id,
        owner: "conformance-courier",
        token: claimed.lease.token,
        generation: claimed.lease.generation,
        outcomeDigest: "conformance-done-1",
      });
      ackReceiptId = acked?.receipt?.id ?? null;
    }
    replayAfter = q.enqueue({ idempotencyKey: key, payload, operation: "REVIEW" });
  }

  const pass =
    first?.replayed === false &&
    replayBefore?.replayed === true &&
    replayBefore?.duplicate === true &&
    replayBefore?.event?.id === first?.event?.id &&
    sizeAfterReplay === 1 &&
    claimOk &&
    !!ackReceiptId &&
    replayAfter?.replayed === true &&
    replayAfter?.event?.id === first?.event?.id &&
    replayAfter?.receipt?.id === ackReceiptId &&
    q.size === 1;

  return [
    {
      id: "W-S1",
      category: "W-S",
      family: "Settlement",
      title: "Duplicate delivery replays (side-effect count 1)",
      invariant: "Inv7 (settlement is typed and honest)",
      pass,
      detail: pass
        ? "DurableQueue replayed duplicate idempotencyKey with original event id and write-once receipt; queue size stayed 1 before and after ACK."
        : `Duplicate replay contract broken: first=${JSON.stringify(first)} replayBefore=${JSON.stringify(replayBefore)} replayAfter=${JSON.stringify(replayAfter)} size=${q.size}`,
      evidence: {
        eventId: first?.event?.id ?? null,
        replayBeforeReusedId: replayBefore?.event?.id === first?.event?.id,
        receiptId: ackReceiptId,
        replayAfterReceiptMatches: replayAfter?.receipt?.id === ackReceiptId,
        queueSize: q.size,
        sideEffectCount: q.size,
        source: "src/queue.mjs:DurableQueue.enqueue/ack",
      },
    },
  ];
}

// --- W-E: Evidence (src/factory.mjs sensitivity) -----------------------------

async function checkWE(root) {
  const { sensitivityProbe, adjudicate } = await importSrc(root, "src/factory.mjs");

  // Sensitive apparatus: base passes, mutated fails -> claim survives.
  const sensitive = sensitivityProbe({ run: (v) => v === "base" });
  // Insensitive apparatus (wrong supplier): always passes -> cannot go red.
  const insensitive = sensitivityProbe({ run: () => true });

  const adjSensitive = adjudicate({ analyst: {}, witness: { findings: [] }, sensitivity: sensitive });
  const adjInsensitive = adjudicate({ analyst: {}, witness: { findings: [] }, sensitivity: insensitive });

  const badTest = (adjInsensitive.findings || []).find((f) => f.kind === "BAD_TEST");
  const pass =
    sensitive.sensitive === true &&
    insensitive.sensitive === false &&
    adjSensitive.verdict === "APPROVE" &&
    adjInsensitive.verdict === "REQUEST_CHANGES" &&
    !!badTest &&
    badTest.disposition === "BLOCKING";

  return [
    {
      id: "W-E1",
      category: "W-E",
      family: "Evidence",
      title: "Insensitive test cited as sole distinguisher collapses safety claim",
      invariant: "Inv6 (evidence must be able to fail)",
      pass,
      detail: pass
        ? "sensitivityProbe marked base-pass/mutant-fail as sensitive and always-pass as insensitive; adjudicate blocked the insensitive case with BAD_TEST (BLOCKING) and approved the sensitive case."
        : `Sensitivity contract broken: sensitive=${JSON.stringify(sensitive)} insensitive=${JSON.stringify(insensitive)} adjSensitive=${adjSensitive?.verdict} adjInsensitive=${adjInsensitive?.verdict}`,
      evidence: {
        sensitive: sensitive.sensitive,
        insensitiveSensitive: insensitive.sensitive,
        sensitiveVerdict: adjSensitive.verdict,
        insensitiveVerdict: adjInsensitive.verdict,
        badTestKind: badTest?.kind ?? null,
        badTestDisposition: badTest?.disposition ?? null,
        source: "src/factory.mjs:sensitivityProbe/adjudicate",
      },
    },
  ];
}

// --- W-P: Process (grep-based ambient spawn scan of src/) --------------------

function scanAmbientSpawns(root) {
  const srcDir = join(root, "src");
  const files = existsSync(srcDir)
    ? readdirSync(srcDir).filter((f) => f.endsWith(".mjs")).sort()
    : [];
  const scannedFiles = [];
  const allowlistedHits = [];
  const violations = [];

  for (const file of files) {
    const relPath = `src/${file}`;
    const content = readFileSync(join(srcDir, file), "utf8");
    const lines = content.split("\n");
    const hasChildImport = CHILD_IMPORT_RE.test(content);
    scannedFiles.push(relPath);

    lines.forEach((line, idx) => {
      const lineNo = idx + 1;
      // RegExp .exec(...) is not a child-process spawn.
      const isRegexExec = /\.exec\s*\(/.test(line) && !hasChildImport;
      if (isRegexExec) return;
      const hasSpawnCall = SPAWN_CALL_RE.test(line);
      if (!hasChildImport && !hasSpawnCall) return;
      if (!hasSpawnCall && !hasChildImport) return;
      // Only record lines that actually import child_process or call a primitive.
      if (!hasSpawnCall && !CHILD_IMPORT_RE.test(line)) return;

      const hit = { file: relPath, line: lineNo, text: line.trim().slice(0, 160) };
      if (ALLOWLIST_SET.has(relPath)) {
        allowlistedHits.push(hit);
      } else if (hasChildImport || hasSpawnCall) {
        violations.push({ ...hit, reason: hasChildImport && idx === lines.findIndex((l) => CHILD_IMPORT_RE.test(l)) ? "child_process import outside broker/queue allowlist" : "spawn primitive outside broker/queue allowlist" });
      }
    });

    // A file importing child_process with no per-line call captured still counts.
    if (hasChildImport && !ALLOWLIST_SET.has(relPath)) {
      const already = violations.some((v) => v.file === relPath);
      if (!already) {
        const lineNo = lines.findIndex((l) => CHILD_IMPORT_RE.test(l)) + 1;
        violations.push({ file: relPath, line: lineNo, text: lines[lineNo - 1]?.trim().slice(0, 160) ?? "", reason: "child_process import outside broker/queue allowlist" });
      }
    }
  }

  return { scannedFiles, allowlistedHits, violations };
}

async function checkWP(root) {
  const { scannedFiles, allowlistedHits, violations } = scanAmbientSpawns(root);
  const pass = violations.length === 0;
  return [
    {
      id: "W-P1",
      category: "W-P",
      family: "Process",
      title: "Ambient spawn (no broker intent) fails gate; direct spawn outside broker fails gate",
      invariant: "Inv2/Inv10 (nothing ambient survives; no rule counts until it executes)",
      pass,
      detail: pass
        ? `Scanned ${scannedFiles.length} src/*.mjs files; ${allowlistedHits.length} spawn hit(s) confined to allowlisted broker/queue files, 0 violations.`
        : `Ambient spawn outside allowlist: ${violations.map((v) => `${v.file}:${v.line} ${v.text}`).join("; ")}`,
      evidence: {
        scannedFiles,
        allowlist: SPAWN_ALLOWLIST,
        allowlistedHits,
        violations,
        source: "conformance/run.mjs:scanAmbientSpawns (grep over src/*.mjs)",
      },
    },
  ];
}

// --- W-G: Graph (src/graph.mjs KnowledgeGraph) -------------------------------

async function checkWG(root) {
  const { createKnowledgeGraph } = await importSrc(root, "src/graph.mjs");
  const pin = { sha: "a".repeat(40), generation: "gen-1", policyHash: "policy-v1" };
  const g = createKnowledgeGraph({ pin });
  g.addNode({ id: "adv-1", kind: "Advisory" });
  g.addNode({ id: "lib", kind: "CodeEntity", path: "src/lib.mjs" });
  g.addNode({ id: "core", kind: "CodeEntity", path: "src/core.mjs" });

  let reachesWithoutEvidenceRefused = false;
  let refusalCode = null;
  try {
    g.addEdge({ kind: "REACHES", fromId: "adv-1", toId: "lib" });
  } catch (err) {
    reachesWithoutEvidenceRefused = /REACHES requires evidence/.test(String(err?.message ?? err));
    refusalCode = err?.code ?? err?.reasonCode ?? null;
  }

  g.addEdge({ kind: "AFFECTS", fromId: "adv-1", toId: "lib", evidence: [{ kind: "version-range", ref: "osv:1" }] });
  const affectedAfterAffects = g.affectedEntities("adv-1").map((n) => n.id);
  const reachableAfterAffects = g.reachableEntities("adv-1").map((n) => n.id);

  g.addEdge({
    kind: "REACHES",
    fromId: "adv-1",
    toId: "core",
    evidence: [{ kind: "reachability-proof", ref: "artifact://path/1", digest: "d1" }],
  });
  const affectedFinal = g.affectedEntities("adv-1").map((n) => n.id);
  const reachableFinal = g.reachableEntities("adv-1").map((n) => n.id);

  const pass =
    reachesWithoutEvidenceRefused &&
    JSON.stringify(affectedAfterAffects) === JSON.stringify(["lib"]) &&
    reachableAfterAffects.length === 0 &&
    JSON.stringify(affectedFinal) === JSON.stringify(["lib"]) &&
    JSON.stringify(reachableFinal) === JSON.stringify(["core"]);

  return [
    {
      id: "W-G1",
      category: "W-G",
      family: "Graph",
      title: "AFFECTS without reachability proof never renders as REACHES",
      invariant: "Inv (schema §4: coordinates select, proof authorizes — AFFECTS != REACHES)",
      pass,
      detail: pass
        ? "REACHES without evidence refused at write (REACHES_EVIDENCE_REQUIRED); AFFECTS listed only via affectedEntities, REACHES only via reachableEntities after proven-path evidence."
        : `AFFECTS/REACHES distinction broken: refused=${reachesWithoutEvidenceRefused} affected=${JSON.stringify(affectedFinal)} reachable=${JSON.stringify(reachableFinal)}`,
      evidence: {
        reachesWithoutEvidenceRefused,
        refusalCode,
        affected: affectedFinal,
        reachable: reachableFinal,
        reachableAfterAffectsOnly: reachableAfterAffects,
        source: "src/graph.mjs:KnowledgeGraph.addEdge/affectedEntities/reachableEntities",
      },
    },
  ];
}

// --- Runner ------------------------------------------------------------------

export async function runConformance({ root = DEFAULT_ROOT } = {}) {
  const version = readPackageVersion(root);
  const pin = resolvePin(root);
  const groups = await Promise.all([
    checkWA(root).catch((err) => [
      { id: "W-A1", category: "W-A", family: "Authority", title: "Widening grants refused (AUTHORITY_WIDENING)", invariant: "Inv3", pass: false, detail: `W-A threw: ${err?.message ?? err}`, evidence: { error: String(err) } },
      { id: "W-A2", category: "W-A", family: "Authority", title: "Stale generation at use refused (PROOF_STALE_GENERATION)", invariant: "Inv3/Inv8", pass: false, detail: `W-A threw: ${err?.message ?? err}`, evidence: { error: String(err) } },
    ]),
    checkWS(root).catch((err) => [
      { id: "W-S1", category: "W-S", family: "Settlement", title: "Duplicate delivery replays (side-effect count 1)", invariant: "Inv7", pass: false, detail: `W-S threw: ${err?.message ?? err}`, evidence: { error: String(err) } },
    ]),
    checkWE(root).catch((err) => [
      { id: "W-E1", category: "W-E", family: "Evidence", title: "Insensitive test cited as sole distinguisher collapses safety claim", invariant: "Inv6", pass: false, detail: `W-E threw: ${err?.message ?? err}`, evidence: { error: String(err) } },
    ]),
    checkWP(root).catch((err) => [
      { id: "W-P1", category: "W-P", family: "Process", title: "Ambient spawn (no broker intent) fails gate; direct spawn outside broker fails gate", invariant: "Inv2/Inv10", pass: false, detail: `W-P threw: ${err?.message ?? err}`, evidence: { error: String(err) } },
    ]),
    checkWG(root).catch((err) => [
      { id: "W-G1", category: "W-G", family: "Graph", title: "AFFECTS without reachability proof never renders as REACHES", invariant: "schema §4", pass: false, detail: `W-G threw: ${err?.message ?? err}`, evidence: { error: String(err) } },
    ]),
  ]);
  const witnesses = groups.flat();
  const passed = witnesses.filter((w) => w.pass).length;
  const report = {
    kind: "federation-conformance",
    version,
    pin,
    generatedAt: new Date().toISOString(),
    root: relative(process.cwd(), root) || ".",
    witnesses,
    summary: { total: witnesses.length, passed, failed: witnesses.length - passed, allPass: passed === witnesses.length },
    invariantCoverage: [
      { invariant: "Inv2", witnesses: ["W-P1"] },
      { invariant: "Inv3", witnesses: ["W-A1", "W-A2"] },
      { invariant: "Inv6", witnesses: ["W-E1"] },
      { invariant: "Inv7", witnesses: ["W-S1"] },
      { invariant: "Inv8", witnesses: ["W-A2"] },
      { invariant: "Inv10", witnesses: ["W-P1"] },
      { invariant: "schema §4 (AFFECTS/REACHES)", witnesses: ["W-G1"] },
    ],
    allowlist: SPAWN_ALLOWLIST,
  };
  return report;
}

export function renderMarkdown(report) {
  const { summary, witnesses } = report;
  const status = summary.allPass ? "ALL PASS" : "FAILURES PRESENT";
  const rows = witnesses
    .map((w) => `| ${w.id} | ${w.category} | ${w.pass ? "PASS" : "FAIL"} | ${w.title} |`)
    .join("\n");
  const details = witnesses
    .map(
      (w) =>
        `### ${w.id} — ${w.pass ? "PASS" : "FAIL"}: ${w.title}\n\n- Family: ${w.family}\n- Invariant: ${w.invariant}\n- Detail: ${w.detail}\n- Evidence: \`${JSON.stringify(w.evidence)}\`\n`,
    )
    .join("\n");
  const allowRows = SPAWN_ALLOWLIST.map((e) => `| \`${e.path}\` | ${e.role} | ${e.rationale} |`).join("\n");
  const coverageRows = report.invariantCoverage
    .map((c) => `| ${c.invariant} | ${c.witnesses.join(", ")} |`)
    .join("\n");

  return `# Federation Conformance Report

- Kind: federation-conformance (Rev reference implementation, self-hosting)
- Version: ${report.version}
- Pin: sha=\`${report.pin.sha}\` generation=\`${report.pin.generation}\` policyHash=\`${report.pin.policyHash}\`
- Generated: ${report.generatedAt}
- Result: **${status}** — ${summary.passed}/${summary.total} witnesses passed

Badge is this report, not an image (references/federation-conformance.md).
Partial coverage = partial level, never rounded up.

## Witness summary

| Witness | Family | Result | Title |
|---|---|---|---|
${rows}

## Witness details

${details}
## Invariant coverage

| Invariant | Witnesses |
|---|---|
${coverageRows}

## W-P allowlist (ambient spawn scan)

The W-P scan greps \`src/*.mjs\` for \`node:child_process\` imports and
spawn primitives (spawn/spawnSync/execFile/execFileSync/execSync/fork).
RegExp \`.exec(...)\` is not a spawn and is excluded. Hits outside the
allowlist fail W-P1/W-P2; allowlisted hits are listed as evidence in
\`report.json\`, not hidden.

| Path | Role | Rationale |
|---|---|---|
${allowRows}

## Reproduce

\`\`\`bash
node conformance/run.mjs   # writes conformance/report.json + conformance/REPORT.md
npm test                   # includes tests/conformance.test.mjs (all-pass on current tree)
\`\`\`
`;
}

// --- CLI entry ---------------------------------------------------------------

const isMain = process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;
if (isMain) {
  const report = await runConformance();
  const jsonPath = join(HERE, "report.json");
  const mdPath = join(HERE, "REPORT.md");
  writeFileSync(jsonPath, JSON.stringify(report, null, 2) + "\n", "utf8");
  writeFileSync(mdPath, renderMarkdown(report), "utf8");
  console.log(JSON.stringify(report, null, 2));
  console.error(`conformance: ${report.summary.passed}/${report.summary.total} passed — wrote ${relative(process.cwd(), jsonPath)} + ${relative(process.cwd(), mdPath)}`);
  process.exit(report.summary.allPass ? 0 : 1);
}
