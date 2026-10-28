// Per-repo AuthorityMap resolver v1 (schema.md §5.4, plan Day 1).
// CODEOWNERS search order per GitHub docs: root, .github/, docs/ — first found wins.
// No CODEOWNERS and no explicit fallback => ambiguous=true, fail closed. Never guess owners.
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

const CANDIDATES = ["CODEOWNERS", ".github/CODEOWNERS", "docs/CODEOWNERS"];

export function resolveAuthorityMap(repoRoot, { requiredApprovals = 1, mergeHolders = [] } = {}) {
  let found = null;
  for (const rel of CANDIDATES) {
    if (existsSync(join(repoRoot, rel))) { found = rel; break; }
  }
  if (!found) {
    return {
      codeownersPath: null, holders: [], requiredApprovals, mergeHolders,
      ambiguous: true,
      refusalReason: "AUTHORITY_AMBIGUOUS: no CODEOWNERS in root/.github/docs and no declared fallback. Declare authority; Rev will not guess.",
    };
  }
  const text = readFileSync(join(repoRoot, found), "utf8");
  const holders = [];
  const seen = new Set();
  for (const raw of text.split("\n")) {
    const line = raw.trim();
    if (!line || line.startsWith("#")) continue;
    const parts = line.split(/\s+/);
    for (const owner of parts.slice(1)) {
      if (owner.startsWith("@") && !seen.has(owner)) {
        seen.add(owner);
        holders.push({ principalId: owner, kind: owner.includes("/") ? "TEAM" : "USER", grants: ["REVIEW"] });
      }
    }
  }
  return {
    codeownersPath: found, holders, requiredApprovals, mergeHolders,
    ambiguous: holders.length === 0,
    refusalReason: holders.length === 0 ? "AUTHORITY_AMBIGUOUS: CODEOWNERS present but declares no owners." : null,
  };
}

// Owners for a path: last matching pattern wins (GitHub semantics, simplified glob).
export function ownersForPath(map, ownersIndex, filePath) {
  if (!map || map.ambiguous || !ownersIndex) return [];
  let result = [];
  for (const { pattern, owners } of ownersIndex) {
    if (matchPattern(pattern, filePath)) result = owners;
  }
  return result;
}

export function parseCodeowners(repoRoot, codeownersPath) {
  const text = readFileSync(join(repoRoot, codeownersPath), "utf8");
  const index = [];
  for (const raw of text.split("\n")) {
    const line = raw.trim();
    if (!line || line.startsWith("#")) continue;
    const parts = line.split(/\s+/);
    if (parts.length >= 2) index.push({ pattern: parts[0], owners: parts.slice(1) });
  }
  return index;
}

function matchPattern(pattern, filePath) {
  // GitHub CODEOWNERS semantics (simplified fnmatch): last match wins (caller loop).
  // Supports *, **, ?, leading-/ anchoring, trailing-/ directory prefix.
  let pat = pattern;
  if (pat.endsWith("/")) return filePath.startsWith(pat);
  const anchored = pat.startsWith("/");
  if (anchored) pat = pat.slice(1);
  if (!pat.includes("/")) { // basename pattern matches at any depth
    const base = filePath.split("/").pop();
    const bre = new RegExp("^" + pat.replace(/[.+^${}()|[\]\\]/g, "\\$&").replace(/\*/g, "[^/]*").replace(/\?/g, "[^/]") + "$");
    return bre.test(base);
  }
  const re = new RegExp("^" + pat.split("**").map((seg) =>
    seg.replace(/[.+^${}()|[\]\\]/g, "\\$&").replace(/\*/g, "[^/]*").replace(/\?/g, "[^/]")
  ).join(".*") + "$");
  return re.test(filePath);
}
