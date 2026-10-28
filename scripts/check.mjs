#!/usr/bin/env node
// 2K Law ratchet (Day 1 stub): no code file over 2000 lines.
// Debt manifest lists pre-existing violations with frozen allowances.
// New violations or growth beyond allowance fail. Docs/fixtures excluded per law.
import { readdirSync, readFileSync, existsSync } from "node:fs";
import { join, extname } from "node:path";

import { fileURLToPath } from "node:url";
const ROOT = fileURLToPath(new URL("..", import.meta.url));
const CEILING = 2000;
const CODE_EXT = new Set([".js", ".mjs", ".ts", ".mts", ".py", ".go", ".rs", ".java", ".rb", ".php"]);
const SKIP_DIRS = new Set(["node_modules", ".git"]);
const MANIFEST_PATH = join(ROOT, ".rev-2k-manifest.json");

function walk(dir, out = []) {
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    if (SKIP_DIRS.has(e.name)) continue;
    const p = join(dir, e.name);
    if (e.isDirectory()) walk(p, out);
    else if (CODE_EXT.has(extname(e.name))) out.push(p);
  }
  return out;
}

const manifest = existsSync(MANIFEST_PATH)
  ? JSON.parse(readFileSync(MANIFEST_PATH, "utf8"))
  : { debt: {} };
const debt = manifest.debt || {};
let failed = false;
for (const f of walk(ROOT)) {
  const rel = f.slice(ROOT.length);
  const lines = readFileSync(f, "utf8").split("\n").length;
  const allowance = debt[rel];
  if (lines > CEILING && allowance === undefined) {
    console.error(`2K FAIL ${rel}: ${lines} lines, unmanifested (ceiling ${CEILING})`);
    failed = true;
  } else if (allowance !== undefined && lines > allowance) {
    console.error(`2K FAIL ${rel}: ${lines} lines exceeds frozen allowance ${allowance}`);
    failed = true;
  }
}
if (failed) process.exit(1);
console.log("2K OK: all code files within ceiling/manifest.");
