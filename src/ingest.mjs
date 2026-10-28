// Real ingestion: local directory -> KnowledgeGraph (schema.md §4).
// CodeEntity per source file, CONSUMES from imports, OWNS from CODEOWNERS.
// Inventory is regex-based (AST-ish), always labeled heuristic — never AST proof.
import { createHash } from "node:crypto";
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { basename, dirname, extname, join, relative, resolve, sep } from "node:path";
import { KnowledgeGraph } from "./graph.mjs";
import { resolveAuthorityMap, parseCodeowners, ownersForPath } from "./authority-map.mjs";

export const SOURCE_EXTENSIONS = new Set([".mjs", ".js", ".ts", ".py"]);
const LANGUAGE = { ".mjs": "javascript", ".js": "javascript", ".ts": "typescript", ".py": "python" };
const SKIP_DIRS = new Set(["node_modules", ".git", ".hg", "dist", "build", "coverage", "__pycache__", ".venv", "venv"]);

function posix(p) { return p.split(sep).join("/"); }
function hash(c) { return createHash("sha256").update(c).digest("hex"); }
export function entityId(relPosix) { return `rev:node:CodeEntity:${relPosix}`; }
export function holderId(p) { return `rev:node:AuthorityHolder:${p.replace(/^@/, "").replace(/[^A-Za-z0-9._-]+/g, "-")}`; }

// --- import extraction (regex, heuristic) ---
export function parseImports(source, language) {
  const specs = [];
  if (language === "python") {
    for (const m of source.matchAll(/^\s*import\s+([\w.]+(?:\s*,\s*[\w.]+)*)/gm))
      for (const s of m[1].split(",")) specs.push({ spec: s.trim(), kind: "import" });
    for (const m of source.matchAll(/^\s*from\s+(\.+[\w.]*|\.[\w.]+|[\w.]+)\s+import\s+/gm))
      specs.push({ spec: m[1], kind: "from-import" });
  } else {
    for (const m of source.matchAll(/\bimport\s+(?:[^'";]*?\sfrom\s*)?['"]([^'"]+)['"]/g)) specs.push({ spec: m[1], kind: "import" });
    for (const m of source.matchAll(/\bexport\s+[^'";]*?\sfrom\s*['"]([^'"]+)['"]/g)) specs.push({ spec: m[1], kind: "re-export" });
    for (const m of source.matchAll(/\brequire\(\s*['"]([^'"]+)['"]\s*\)/g)) specs.push({ spec: m[1], kind: "require" });
    for (const m of source.matchAll(/\bimport\(\s*['"]([^'"]+)['"]\s*\)/g)) specs.push({ spec: m[1], kind: "dynamic-import" });
  }
  return specs;
}
export const extractImports = parseImports;

// --- heuristic inventory: exported / top-level names ---
export function extractInventory(source, language) {
  const names = new Set(); const exported = new Set();
  if (language === "python") {
    for (const m of source.matchAll(/^(?:async\s+def|def|class)\s+([A-Za-z_]\w*)/gm)) names.add(m[1]);
    for (const m of source.matchAll(/^([A-Za-z_]\w*)\s*(?::[^=\n]*)?=/gm)) names.add(m[1]);
  } else {
    for (const m of source.matchAll(/^\s*export\s+(?:default\s+)?(?:async\s+)?(?:function\*?|class|const|let|var)\s+([A-Za-z_$][\w$]*)/gm)) { names.add(m[1]); exported.add(m[1]); }
    for (const m of source.matchAll(/^\s*export\s*\{([^}]+)\}/gm))
      for (const part of m[1].split(",")) { const n = part.trim().split(/\s+as\s+/).pop().trim(); if (n) { names.add(n); exported.add(n); } }
    for (const m of source.matchAll(/^(?:async\s+)?(?:function\*?|class)\s+([A-Za-z_$][\w$]*)/gm)) names.add(m[1]);
    for (const m of source.matchAll(/^(?:const|let|var)\s+([A-Za-z_$][\w$]*)/gm)) names.add(m[1]);
  }
  return { kind: "heuristic-inventory", heuristic: true, symbols: [...names].sort(), exports: [...exported].sort() };
}
export const inventoryOf = extractInventory;

function walk(dir, root, out) {
  for (const e of readdirSync(dir, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name))) {
    if (e.isDirectory()) { if (!SKIP_DIRS.has(e.name)) walk(join(dir, e.name), root, out); }
    else if (e.isFile() && SOURCE_EXTENSIONS.has(extname(e.name))) out.push(posix(relative(root, join(dir, e.name))));
  }
  return out;
}

function resolveJs(spec, fromRel, fileSet) {
  if (!spec.startsWith(".")) return null;
  const base = posix(join(dirname(fromRel), spec));
  const cands = [base, ...[".mjs", ".js", ".ts"].map((x) => base + x), ...[".mjs", ".js", ".ts"].map((x) => `${base}/index${x}`)];
  return cands.find((c) => fileSet.has(c)) ?? null;
}
function resolvePy(spec, fromRel, fileSet) {
  let modPath;
  if (spec.startsWith(".")) {
    const dots = spec.match(/^\.+/)[0].length; const rest = spec.slice(dots);
    let dir = dirname(fromRel);
    for (let i = 1; i < dots; i++) dir = dirname(dir);
    modPath = rest ? posix(join(dir === "." ? "" : dir, rest.replace(/\./g, "/"))) : dir;
  } else modPath = spec.replace(/\./g, "/");
  const dir = dirname(fromRel);
  const cands = [...((dir !== "." && !spec.startsWith("."))
    ? [`${dir}/${modPath}.py`, `${dir}/${modPath}/__init__.py`] : []),
    `${modPath}.py`, `${modPath}/__init__.py`];
  return cands.find((c) => fileSet.has(c)) ?? null;
}

export function ingestDirectory(rootDir, options = {}) {
  const root = resolve(rootDir);
  if (!existsSync(root) || !statSync(root).isDirectory()) throw new Error(`ingest: not a directory: ${rootDir}`);
  const graph = options.graph ?? new KnowledgeGraph({ pin: options.pin, ...(options.sha ? { sha: options.sha } : {}), ...(options.generation ? { generation: options.generation } : {}), ...(options.policyHash ? { policyHash: options.policyHash } : {}) });
  const relFiles = walk(root, root, []);
  const fileSet = new Set(relFiles);
  const contents = new Map(relFiles.map((r) => [r, readFileSync(join(root, r), "utf8")]));

  graph.addNode({ id: `rev:repo:local:${basename(root)}`, kind: "Repository", host: "local", owner: "local", name: basename(root), path: root });

  for (const rel of relFiles) {
    const src = contents.get(rel); const lang = LANGUAGE[extname(rel)];
    const inv = extractInventory(src, lang);
    graph.addNode({
      id: entityId(rel), kind: "CodeEntity", path: rel, language: lang, contentHash: hash(src),
      spanStart: 1, spanEnd: src.split("\n").length,
      symbols: inv.symbols, exports: inv.exports, inventory: inv,
      inventoryKind: "heuristic", heuristic: true,
      evidence: [{ kind: "heuristic-inventory", ref: rel }],
    });
  }

  let consumes = 0; const unresolved = [];
  for (const rel of relFiles) {
    const lang = LANGUAGE[extname(rel)];
    for (const { spec, kind } of parseImports(contents.get(rel), lang)) {
      const target = lang === "python" ? resolvePy(spec, rel, fileSet) : resolveJs(spec, rel, fileSet);
      if (!target) { if (spec.startsWith(".") || lang === "python") unresolved.push({ from: rel, spec }); continue; }
      if (target === rel) continue;
      graph.addEdge({ kind: "CONSUMES", fromId: entityId(rel), toId: entityId(target),
        evidence: [{ kind: "ast-import", ref: `${rel} -> ${spec}`, digest: hash(`${rel}:${spec}`) }] });
      consumes++;
    }
  }

  // Owners via authority-map (only when CODEOWNERS present & unambiguous).
  const authorityMap = resolveAuthorityMap(root);
  let owns = 0;
  if (authorityMap.codeownersPath) {
    const index = parseCodeowners(root, authorityMap.codeownersPath);
    const holders = new Map();
    for (const rel of relFiles) {
      for (const principalId of ownersForPath(authorityMap, index, rel)) {
        if (!holders.has(principalId)) {
          const h = authorityMap.holders.find((x) => x.principalId === principalId);
          graph.addNode({ id: holderId(principalId), kind: "AuthorityHolder", principalId, grants: h?.grants ?? ["REVIEW"] });
          holders.set(principalId, true);
        }
        graph.addEdge({ kind: "OWNS", fromId: holderId(principalId), toId: entityId(rel),
          evidence: [{ kind: "codeowners", ref: `${authorityMap.codeownersPath}:${rel}` }] });
        owns++;
      }
    }
  }

  const stats = { files: relFiles.length, consumesEdges: consumes, ownsEdges: owns, unresolved, authorityMap };
  graph.files = relFiles; graph.authorityMap = authorityMap; graph.stats = stats; graph.rootDir = root;
  graph.graph = graph; // destructure-friendly alias: const { graph } = ingest(...)
  return graph;
}

export const ingest = ingestDirectory;
export const buildGraph = ingestDirectory;
export const ingestProject = ingestDirectory;
export async function ingestDirectoryAsync(r, o) { return ingestDirectory(r, o); }
export default ingestDirectory;
