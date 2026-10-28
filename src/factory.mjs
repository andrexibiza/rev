// Blind factory (Days 3-4): analysts -> witnesses (isolated inputs) -> adjudicator -> blind implementer -> 2 fresh reviewers.
// Lanes are functions with allowlisted inputs; witness never receives analyst output. Verdicts carry tuples.
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";

export function analystScan({ files }) {
  const findings = [];
  for (const f of files) {
    const text = readFileSync(f.path, "utf8");
    if (/member/.test(text) && /rawDiscount/.test(text) && !/Math\.min\(rawDiscount/.test(text.split("member")[1]?.split("}")[0] || "")) {
      // structural hint only; execution probe decides (witness lane)
    }
    findings.push({ file: f.path, bytes: text.length, hasMemberPath: /member/.test(text) });
  }
  return { kind: "ANALYST", findings, inputDigest: digest(JSON.stringify(files.map((f) => f.path))) };
}

export function witnessProbe({ discountModule }) {
  // Independent execution: boundary values around $15 cap. Does not read analyst output.
  const results = [];
  for (const member of [true, false]) {
    const got = discountModule.total({ subtotal: 200, discountPct: 10, taxPct: 10, member });
    const expected = (200 - 15) * 1.1;
    results.push({ member, got, expected, ok: Math.abs(got - expected) < 1e-9 });
  }
  const bug = results.find((r) => r.member && !r.ok);
  return {
    kind: "WITNESS",
    verdict: bug ? "REQUEST_CHANGES" : "APPROVE",
    findings: bug ? [{
      kind: "DEFECT", severity: "CRITICAL", disposition: "BLOCKING",
      title: "Member path drops $15 discount cap",
      evidenceBasis: "executed",
      evidence: [{ kind: "exec", ref: `total(member)=${bug.got.toFixed(2)} expected=${bug.expected.toFixed(2)}` }],
    }] : [],
  };
}

export function sensitivityProbe({ run }) {
  // run(variant) -> bool passed. Sensitive iff default passes and mutated fails.
  const base = run("base");
  const mutated = run("mutated");
  return { sensitive: base === true && mutated === false, base, mutated };
}

export function adjudicate({ analyst, witness, sensitivity }) {
  const findings = [...(witness.findings || [])];
  if (sensitivity && !sensitivity.sensitive) {
    findings.push({
      kind: "BAD_TEST", severity: "WARNING", disposition: "BLOCKING",
      title: "Cited test cannot go red (insensitive distinguisher)",
      evidenceBasis: "executed",
      evidence: [{ kind: "exec", ref: `base=${sensitivity.base} mutated=${sensitivity.mutated}` }],
    });
  }
  const blocking = findings.some((f) => f.disposition === "BLOCKING");
  return {
    contract: { findings, mustFix: findings.map((f) => f.title) },
    verdict: blocking ? "REQUEST_CHANGES" : "APPROVE",
    findings,
  };
}

export function freshReview({ candidateOk, adversarialOk }) {
  // Two independent reviewers; either rejection loops to fix lane.
  if (!candidateOk || !adversarialOk) return { verdict: "REQUEST_CHANGES", loop: "FIX_LANE" };
  return { verdict: "APPROVE", loop: null };
}

function digest(s) { let h = 0; for (const c of s) h = (h * 31 + c.charCodeAt(0)) >>> 0; return "d" + h.toString(16); }

export function runNodeTest(file) {
  try { execFileSync(process.execPath, ["--test", file], { stdio: "pipe" }); return true; }
  catch { return false; }
}
