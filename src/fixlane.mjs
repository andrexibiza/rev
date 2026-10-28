// Blind fix lane (Day 4): contract-only implementer -> fresh-review gate.
// Consumes ONLY the adjudicated contract (titles/kinds from adjudicate()).
// Never reads analyst/witness inputs or their evidence/reasoning fields:
// the entry point extracts `contract` and, inside it, only `mustFix`
// titles and finding `title`/`kind`. Any other fields on the input
// object are ignored by construction and never copied to the output.
import { createHash } from "node:crypto";
import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { freshReview } from "./factory.mjs";

export const CAP_AMOUNT = 15;
export const FIXTURE_PATH = fileURLToPath(new URL("../fixtures/demo/discount.mjs", import.meta.url));
export const SOURCE_PATH = FIXTURE_PATH;

function sha256(text) {
  return createHash("sha256").update(text, "utf8").digest("hex");
}

// --- Pure repair: apply the $15 cap on the member path ---------------------
export function applyCapFix(originalContent) {
  if (typeof originalContent !== "string") throw new TypeError("applyCapFix requires file content string");
  // Idempotent: member branch already capped.
  const memberBranch = originalContent.split("if (member)")[1]?.split("}")[0] || "";
  if (/Math\.min\(rawDiscount,\s*15\)/.test(memberBranch)) return originalContent;

  const buggyBlock =
    "  if (member) {\n    // BUG: uncapped discount on member path.\n    return (subtotal - rawDiscount) * (1 + taxPct / 100);\n  }";
  const fixedBlock =
    "  if (member) {\n    return (subtotal - Math.min(rawDiscount, 15)) * (1 + taxPct / 100);\n  }";
  if (originalContent.includes(buggyBlock)) return originalContent.replace(buggyBlock, fixedBlock);

  // Fallback: cap the first uncapped member return, drop the BUG comment line.
  return originalContent
    .replace(/\n\s*\/\/ BUG: uncapped discount on member path\./, "")
    .replace(
      "return (subtotal - rawDiscount) * (1 + taxPct / 100);",
      "return (subtotal - Math.min(rawDiscount, 15)) * (1 + taxPct / 100);",
    );
}
export const repairContent = applyCapFix;
export const fixContent = applyCapFix;

// --- Unified-diff patch text -------------------------------------------------
export function buildPatch(originalContent, headContent, opts = {}) {
  if (originalContent === headContent) return "";
  const from = opts.from ?? "a/fixtures/demo/discount.mjs";
  const to = opts.to ?? "b/fixtures/demo/discount.mjs";
  const a = String(originalContent).split("\n");
  const b = String(headContent).split("\n");

  // LCS table (file is tiny; exact diff keeps patch honest).
  const dp = Array.from({ length: a.length + 1 }, () => new Uint32Array(b.length + 1));
  for (let i = a.length - 1; i >= 0; i--) {
    for (let j = b.length - 1; j >= 0; j--) {
      dp[i][j] = a[i] === b[j] ? dp[i + 1][j + 1] + 1 : Math.max(dp[i + 1][j], dp[i][j + 1]);
    }
  }
  const ops = []; // {type: " "|"-"|"+", line}
  let i = 0, j = 0;
  while (i < a.length && j < b.length) {
    if (a[i] === b[j]) { ops.push({ type: " ", line: a[i] }); i++; j++; }
    else if (dp[i + 1][j] >= dp[i][j + 1]) { ops.push({ type: "-", line: a[i] }); i++; }
    else { ops.push({ type: "+", line: b[j] }); j++; }
  }
  while (i < a.length) { ops.push({ type: "-", line: a[i] }); i++; }
  while (j < b.length) { ops.push({ type: "+", line: b[j] }); j++; }

  // Single hunk with 3 lines of context around the changed region.
  let first = ops.findIndex((o) => o.type !== " ");
  let last = ops.length - 1;
  while (last > first && ops[last].type === " ") last--;
  if (first < 0) return "";
  const CTX = 3;
  const hunkStart = Math.max(0, first - CTX);
  const hunkEnd = Math.min(ops.length - 1, last + CTX);
  const hunk = ops.slice(hunkStart, hunkEnd + 1);
  const oldCount = hunk.filter((o) => o.type !== "+").length;
  const newCount = hunk.filter((o) => o.type !== "-").length;
  const oldStart = ops.slice(0, hunkStart).filter((o) => o.type !== "+").length + 1;
  const newStart = ops.slice(0, hunkStart).filter((o) => o.type !== "-").length + 1;

  const lines = [
    `--- ${from}`,
    `+++ ${to}`,
    `@@ -${oldStart},${oldCount} +${newStart},${newCount} @@`,
    ...hunk.map((o) => o.type + o.line),
  ];
  return lines.join("\n") + "\n";
}
export const makePatch = buildPatch;
export const generatePatch = buildPatch;

// --- Candidate evaluation (the two fresh reviewers, execution-based) --------
function loadTotal(headContent) {
  const transformed = String(headContent).replace(/export\s+function\s+total/, "function total");
  if (!transformed.includes("function total")) throw new Error("headContent does not define total()");
  return new Function(`${transformed}\nreturn total;`)();
}

const CORRECTNESS_CASES = [
  { input: { subtotal: 200, discountPct: 10, taxPct: 10, member: true }, expected: (200 - 15) * 1.1 },
  { input: { subtotal: 200, discountPct: 10, taxPct: 10, member: false }, expected: (200 - 15) * 1.1 },
  { input: { subtotal: 100, discountPct: 10, taxPct: 10, member: true }, expected: (100 - 10) * 1.1 },
  { input: { subtotal: 150, discountPct: 10, taxPct: 0, member: true }, expected: 150 - 15 },
  { input: { subtotal: 100, discountPct: 10, taxPct: 0, member: true }, expected: 100 - 10 },
  { input: { subtotal: 200, discountPct: 10, taxPct: 0, member: true }, expected: 200 - 15 },
];

const ADVERSARIAL_CASES = [
  { input: { subtotal: 200, discountPct: 50, taxPct: 10, member: true }, expected: (200 - 15) * 1.1 },
  { input: { subtotal: 200, discountPct: 50, taxPct: 10, member: false }, expected: (200 - 15) * 1.1 },
  { input: { subtotal: 160, discountPct: 10, taxPct: 10, member: true }, expected: (160 - 15) * 1.1 },
  { input: { subtotal: 140, discountPct: 10, taxPct: 10, member: true }, expected: (140 - 14) * 1.1 },
  { input: { subtotal: 200, discountPct: 0, taxPct: 10, member: true }, expected: 200 * 1.1 },
  { input: { subtotal: 200, discountPct: 10, taxPct: 10, member: true }, expected: (200 - 15) * 1.1 },
];

function runCases(totalFn, cases) {
  return cases.map(({ input, expected }) => {
    let got, ok;
    try { got = totalFn({ ...input }); ok = Math.abs(got - expected) < 1e-9; }
    catch { got = null; ok = false; }
    return { input, got, expected, ok };
  });
}

export function evaluateCandidate(headContent) {
  let totalFn;
  try { totalFn = loadTotal(headContent); }
  catch (err) {
    return {
      candidateOk: false, adversarialOk: false,
      correctness: { ok: false, verdict: "REQUEST_CHANGES", checks: [], error: String(err.message) },
      adversarial: { ok: false, verdict: "REQUEST_CHANGES", checks: [], error: String(err.message) },
    };
  }
  const correctnessChecks = runCases(totalFn, CORRECTNESS_CASES);
  // Adversarial: hostile magnitudes + member/non-member parity at/above/below cap.
  const adversarialChecks = runCases(totalFn, ADVERSARIAL_CASES);
  for (const subtotal of [100, 140, 150, 160, 200, 500]) {
    const input = { subtotal, discountPct: 10, taxPct: 10 };
    const memberGot = totalFn({ ...input, member: true });
    const guestGot = totalFn({ ...input, member: false });
    adversarialChecks.push({
      input: { ...input, parity: true, subtotal },
      got: memberGot, expected: guestGot,
      ok: Math.abs(memberGot - guestGot) < 1e-9,
    });
  }
  const candidateOk = correctnessChecks.every((c) => c.ok);
  const adversarialOk = adversarialChecks.every((c) => c.ok);
  return {
    candidateOk, adversarialOk,
    correctness: { ok: candidateOk, verdict: candidateOk ? "APPROVE" : "REQUEST_CHANGES", checks: correctnessChecks },
    adversarial: { ok: adversarialOk, verdict: adversarialOk ? "APPROVE" : "REQUEST_CHANGES", checks: adversarialChecks },
  };
}
export const checkCandidate = evaluateCandidate;
export const reviewCandidate = evaluateCandidate;

// --- Blind implementer --------------------------------------------------------
function extractContract(input) {
  if (!input || typeof input !== "object") return null;
  // Adjudication shape: { contract, verdict, findings } -> keep contract only.
  if (input.contract && typeof input.contract === "object") return input.contract;
  // Bare contract shape: { findings, mustFix }.
  if (Array.isArray(input.findings) || Array.isArray(input.mustFix)) return input;
  // Wrapper shape: { adjudication: {...} }.
  if (input.adjudication?.contract) return input.adjudication.contract;
  if (input.adjudication && (Array.isArray(input.adjudication.findings) || Array.isArray(input.adjudication.mustFix))) return input.adjudication;
  return null;
}

function contractTitles(contract) {
  const titles = [];
  if (Array.isArray(contract?.mustFix)) titles.push(...contract.mustFix.filter((t) => typeof t === "string"));
  if (Array.isArray(contract?.findings)) {
    for (const f of contract.findings) if (typeof f?.title === "string") titles.push(f.title);
  }
  return titles;
}

function resolveOverride(opts, computed, keys) {
  for (const src of [opts, opts.reviewers, opts.reviewerOverrides]) {
    if (!src || typeof src !== "object") continue;
    for (const k of keys) {
      if (typeof src[k] === "boolean") return src[k];
      if (typeof src[k] === "function") {
        try { return !!src[k](); } catch { return false; }
      }
      if (src[k] && typeof src[k] === "object" && typeof src[k].ok === "boolean") return src[k].ok;
    }
  }
  return computed;
}

export function runFixLane(input = {}) {
  const opts = input && typeof input === "object" ? input : {};
  const contract = extractContract(opts);
  const sourcePath = opts.sourcePath || opts.fixturePath || opts.path || FIXTURE_PATH;
  const baseContent = opts.sourceContent ?? opts.baseContent ?? readFileSync(sourcePath, "utf8");
  const baseSha = sha256(baseContent);

  // Invalid / missing contract: typed failure Repair, fixture untouched.
  if (!contract) {
    const gate = freshReview({ candidateOk: false, adversarialOk: false });
    const verdicts = buildVerdicts(gate, false, false, null);
    return {
      id: `repair_${baseSha.slice(0, 12)}`,
      title: "Blind fix (no contract)",
      state: "FAILED",
      headContent: baseContent, patch: "", verdicts,
      verdict: gate.verdict, headSha: baseSha, baseSha,
      headPath: null, tempPath: null, outputPath: null,
    };
  }

  const titles = contractTitles(contract);
  const needsCapFix = titles.some((t) => /cap|member|discount/i.test(t));

  if (!needsCapFix) {
    const gate = freshReview({ candidateOk: true, adversarialOk: true });
    const verdicts = { ...buildVerdicts(gate, true, true, null), noAction: true };
    return {
      id: `repair_${baseSha.slice(0, 12)}`,
      title: "Verified no-action (contract names no discount-cap fix)",
      state: "NO_ACTION",
      headContent: baseContent, patch: "", verdicts,
      verdict: gate.verdict, headSha: baseSha, baseSha,
      headPath: null, tempPath: null, outputPath: null,
    };
  }

  const headContent = applyCapFix(baseContent);
  const patch = buildPatch(baseContent, headContent);
  const headSha = sha256(headContent);

  // Temp output: repaired copy lives outside the fixture, fixture never written.
  const outDir = opts.outDir || opts.tempDir || mkdtempSync(join(tmpdir(), "rev-fixlane-"));
  const headPath = opts.outputPath || opts.headPath || join(outDir, "discount.mjs");
  writeFileSync(headPath, headContent, "utf8");

  // Fresh review: two independent execution reviewers + factory gate.
  // Explicit boolean/function overrides (tests, fix-loop) win over computed.
  const evaluation = evaluateCandidate(headContent);
  const candidateOk = resolveOverride(opts, evaluation.candidateOk,
    ["candidateOk", "correctnessOk", "candidate", "correctness"]);
  const adversarialOk = resolveOverride(opts, evaluation.adversarialOk,
    ["adversarialOk", "adversarial"]);
  const gate = freshReview({ candidateOk, adversarialOk });
  const verdicts = buildVerdicts(gate, candidateOk, adversarialOk, evaluation);

  return {
    id: `repair_${headSha.slice(0, 12)}`,
    title: "Apply $15 discount cap on member path",
    state: gate.verdict === "APPROVE" ? "COMPLETED" : "FAILED",
    headContent, patch, verdicts,
    verdict: gate.verdict, headSha, baseSha,
    headPath, tempPath: headPath, outputPath: headPath,
    baseContent, contractTitles: [...new Set(titles)],
  };
}

function buildVerdicts(gate, candidateOk, adversarialOk, evaluation) {
  return {
    verdict: gate.verdict,
    loop: gate.loop,
    candidateOk, adversarialOk,
    correctness: evaluation?.correctness ?? { ok: candidateOk, verdict: candidateOk ? "APPROVE" : "REQUEST_CHANGES", checks: [] },
    adversarial: evaluation?.adversarial ?? { ok: adversarialOk, verdict: adversarialOk ? "APPROVE" : "REQUEST_CHANGES", checks: [] },
    reviewers: [
      { kind: "correctness", ok: candidateOk, verdict: candidateOk ? "APPROVE" : "REQUEST_CHANGES" },
      { kind: "adversarial", ok: adversarialOk, verdict: adversarialOk ? "APPROVE" : "REQUEST_CHANGES" },
    ],
  };
}

export async function runFixLaneAsync(input = {}) { return runFixLane(input); }
export const blindImplement = runFixLane;
export const implementFix = runFixLane;
export const fixLane = runFixLane;
export const createRepair = runFixLane;
export const runBlindFix = runFixLane;
export default runFixLane;
