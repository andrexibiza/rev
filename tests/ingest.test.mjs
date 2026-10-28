import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { ingestDirectory, entityId } from "../src/ingest.mjs";

function fixture() {
  const dir = mkdtempSync(join(tmpdir(), "rev-ingest-"));
  mkdirSync(join(dir, "src")); mkdirSync(join(dir, "lib"));
  writeFileSync(join(dir, "CODEOWNERS"), "src/ @alice\nlib/ @acme/team\n");
  writeFileSync(join(dir, "src/core.mjs"), "export function coreFn() {}\nexport const VERSION = 1;\n");
  writeFileSync(join(dir, "src/lib.mjs"), "import { coreFn } from './core.mjs';\nexport function libFn() { return coreFn(); }\n");
  writeFileSync(join(dir, "src/app.mjs"), "import { libFn } from './lib.mjs';\nimport './side.mjs';\nconst x = require('./core.mjs');\nexport const appName = 'app';\n");
  writeFileSync(join(dir, "src/side.mjs"), "export const side = true;\n");
  writeFileSync(join(dir, "src/util.ts"), "export class Helper {}\n");
  writeFileSync(join(dir, "lib/tool.py"), "import os\nfrom src_helper import thing\ndef tool_fn():\n    pass\n");
  writeFileSync(join(dir, "lib/src_helper.py"), "def thing():\n    return 1\n");
  writeFileSync(join(dir, "lib/main.py"), "from tool import tool_fn\nimport src_helper\n");
  writeFileSync(join(dir, "README.md"), "# not source\n");
  return dir;
}

test("ingest: CodeEntity per source file only, heuristic inventory", () => {
  const g = ingestDirectory(fixture());
  const paths = g.listNodes({ kind: "CodeEntity" }).map((n) => n.path).sort();
  assert.deepEqual(paths, ["lib/main.py", "lib/src_helper.py", "lib/tool.py", "src/app.mjs", "src/core.mjs", "src/lib.mjs", "src/side.mjs", "src/util.ts"]);
  const core = g.getNode(entityId("src/core.mjs"));
  assert.equal(core.language, "javascript");
  assert.match(core.contentHash, /^[a-f0-9]{64}$/);
  assert.equal(core.inventoryKind, "heuristic");
  assert.deepEqual(core.inventory, { kind: "heuristic-inventory", heuristic: true, symbols: ["VERSION", "coreFn"], exports: ["VERSION", "coreFn"] });
  assert.ok(g.getNode(entityId("src/util.ts")).exports.includes("Helper"));
  assert.ok(g.getNode(entityId("lib/tool.py")).symbols.includes("tool_fn"));
});

test("ingest: CONSUMES from import/require (JS) + import (Py)", () => {
  const g = ingestDirectory(fixture());
  const pairs = g.listEdges({ kind: "CONSUMES" }).map((e) => `${e.fromId}->${e.toId}`).sort();
  const has = (a, b) => pairs.includes(`${entityId(a)}->${entityId(b)}`);
  assert.ok(has("src/lib.mjs", "src/core.mjs"), JSON.stringify(pairs));
  assert.ok(has("src/app.mjs", "src/lib.mjs") && has("src/app.mjs", "src/side.mjs") && has("src/app.mjs", "src/core.mjs")); // import, side-effect, require
  assert.ok(has("lib/main.py", "lib/tool.py") && has("lib/main.py", "lib/src_helper.py"));
  // bare specifiers (os) create no phantom nodes/edges
  assert.equal(g.getNode(entityId("os")), null);
});

test("ingest: owners via CODEOWNERS + blast radius", () => {
  const g = ingestDirectory(fixture());
  const owns = g.listEdges({ kind: "OWNS" });
  assert.ok(owns.length >= 2);
  const ownersOf = (p) => owns.filter((e) => e.toId === entityId(p)).map((e) => g.getNode(e.fromId).principalId);
  assert.deepEqual(ownersOf("src/core.mjs"), ["@alice"]);
  assert.deepEqual(ownersOf("lib/tool.py"), ["@acme/team"]);
  assert.ok(owns.every((e) => e.evidence[0].kind === "codeowners"));
  // blast radius: changing core blasts lib then app (transitive)
  const blast = g.blastRadius(entityId("src/core.mjs")).map((n) => n.path ?? n.id).sort();
  assert.deepEqual(blast, ["src/app.mjs", "src/lib.mjs"]);
  assert.deepEqual(g.blastRadius(entityId("src/core.mjs"), { depth: 1 }).map((n) => n.path).sort(), ["src/app.mjs", "src/lib.mjs"]); // app requires core directly
  assert.deepEqual(g.consumersOf(entityId("src/core.mjs")).map((n) => n.path).sort(), ["src/app.mjs", "src/lib.mjs"]);
});

test("ingest: no CODEOWNERS -> no OWNS, fail closed", () => {
  const dir = mkdtempSync(join(tmpdir(), "rev-ingest-noco-"));
  writeFileSync(join(dir, "a.mjs"), "export const a = 1;\n");
  const g = ingestDirectory(dir);
  assert.deepEqual(g.listEdges({ kind: "OWNS" }), []);
  assert.equal(g.authorityMap.ambiguous, true);
});
