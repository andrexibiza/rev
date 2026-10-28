// Review composer: findings -> Conventional Comments + anatomy skeleton (references/anatomy-of-a-rev-review.md).
export function composeReview({ pin, promise, findings, sound = [], gaps = [], verdict, cost = null }) {
  const lines = [];
  lines.push(`<!-- rev pin head=${pin.head} base=${pin.base} gen=${pin.generation} policy=${pin.policyHash} -->`);
  lines.push(`**Promise:** ${promise}`);
  lines.push("");
  for (const f of findings) {
    const label = f.kind === "BAD_TEST" ? "issue" : f.disposition === "QUESTION" ? "question" : "issue";
    const dec = f.disposition === "BLOCKING" ? "blocking" : "non-blocking";
    lines.push(`**${label} (${dec}${f.kind === "BAD_TEST" ? ", bad-test" : ""}):** ${f.title}`);
    lines.push(`- Severity: ${f.severity} | Basis: ${f.evidenceBasis} | Evidence: ${(f.evidence || []).map((e) => e.ref).join("; ") || "none"}`);
    lines.push("");
  }
  if (sound.length) { lines.push("**Verified sound:**"); for (const s of sound) lines.push(`- ${s}`); lines.push(""); }
  if (gaps.length) { lines.push("**Remaining boundaries:**"); for (const g of gaps) lines.push(`- ${g}`); lines.push(""); }
  lines.push(`**Verdict: ${verdict}** (assessment only; merge requires actual maintainer at current generation)`);
  if (cost) lines.push(`Cost: lanes ${cost.laneSeconds ?? "?"}s, tokens ${cost.tokens ?? "?"}, CI ${cost.ciMinutes ?? "?"}m`);
  return lines.join("\n");
}
