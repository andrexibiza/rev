#!/usr/bin/env node
// Reference library gate: every references/*.md indexed, every file >= 100 words (no stubs),
// curriculum modules listed in curriculum/README exist. Fails CI on stub regression.
import { readdirSync, readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
const ROOT = fileURLToPath(new URL("..", import.meta.url));
const refDir = join(ROOT, "references");
const index = readFileSync(join(refDir, "INDEX.md"), "utf8")
  + readFileSync(join(refDir, "disciplines.md"), "utf8")
  + readFileSync(join(ROOT, "SKILL.md"), "utf8");
let failed = false;
for (const f of readdirSync(refDir).filter((x) => x.endsWith(".md")).sort()) {
  const words = readFileSync(join(refDir, f), "utf8").split(/\s+/).filter(Boolean).length;
  if (!index.includes(f)) { console.error(`REF FAIL ${f}: not indexed`); failed = true; }
  if (words < 100) { console.error(`REF FAIL ${f}: stub (${words} words < 100)`); failed = true; }
  console.log(`ref ok ${f} ${words}w`);
}
for (let i = 0; i <= 12; i++) {
  const hits = readdirSync(join(ROOT, "curriculum")).filter((x) => x.startsWith(String(i).padStart(2, "0")));
  if (!hits.length) { console.error(`CURR FAIL module ${i} missing`); failed = true; }
}
if (!existsSync(join(ROOT, "curriculum/README.md"))) { console.error("CURR FAIL README missing"); failed = true; }
if (failed) process.exit(1);
console.log("REFS OK: library indexed, no stubs, curriculum complete.");
