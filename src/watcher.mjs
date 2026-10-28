// Advisory watcher: OSV normalization, ecosystem matchers, reachability triage.
// Doctrine (references/vuln-response.md, schema.md §4-5, checks/advisories.md):
//   - Coordinates select: a version match only creates AFFECTS, never REACHES.
//   - REACHES requires proven import/call evidence supplied by the caller.
//   - No match is silence (no event, no receipt).
//   - Unproven/unreachable settles as a value-free NO_ACTION receipt whose
//     scope states exactly what was searched, never "safe" beyond that scope.
//   - KEV / EPSS are triage inputs, never sole triggers: they cannot create
//     CRISIS (or any action) without a match, and cannot create CRISIS from
//     AFFECTS alone. CRISIS requires REACHES + exploitability/severity input.
//   - MONITOR always carries re-triage triggers; monitor without a trigger
//     is forgetting.
// No network, no ambient authority: all inputs are explicit parameters.

// ---------------------------------------------------------------------------
// Ecosystems & versions
// ---------------------------------------------------------------------------

const ECOSYSTEM_ALIASES = new Map([
  ["npm", "NPM"], ["node", "NPM"], ["nodejs", "NPM"],
  ["pypi", "PYPI"], ["pip", "PYPI"], ["python", "PYPI"],
  ["crates.io", "CRATES"], ["crates", "CRATES"], ["cargo", "CRATES"], ["rust", "CRATES"],
  ["go", "GO"], ["golang", "GO"],
  ["rubygems", "RUBYGEMS"], ["ruby", "RUBYGEMS"], ["gem", "RUBYGEMS"],
  ["maven", "MAVEN"], ["java", "MAVEN"],
  ["nuget", "NUGET"], [".net", "NUGET"], ["dotnet", "NUGET"],
  ["packagist", "PACKAGIST"], ["composer", "PACKAGIST"], ["php", "PACKAGIST"],
  ["hex", "HEX"], ["erlang", "HEX"], ["elixir", "HEX"],
  ["docker", "DOCKER"], ["oci", "DOCKER"], ["container", "DOCKER"], ["image", "DOCKER"],
  ["github actions", "GITHUB_ACTIONS"], ["github_actions", "GITHUB_ACTIONS"],
  ["github-actions", "GITHUB_ACTIONS"], ["githubactions", "GITHUB_ACTIONS"],
  ["actions", "GITHUB_ACTIONS"], ["github", "GITHUB_ACTIONS"],
  ["distro", "DISTRO"], ["debian", "DISTRO"], ["ubuntu", "DISTRO"],
  ["alpine", "DISTRO"], ["red hat", "DISTRO"], ["rhel", "DISTRO"], ["linux", "DISTRO"],
]);

export function normalizeEcosystem(raw) {
  if (raw == null) return null;
  const s = String(raw).trim();
  if (!s) return null;
  const hit = ECOSYSTEM_ALIASES.get(s.toLowerCase());
  if (hit) return hit;
  return s.toUpperCase().replace(/[\s-]+/g, "_");
}

export function cleanVersion(raw) {
  if (raw == null) return null;
  let s = String(raw).trim().replace(/^["']|["']$/g, "");
  s = s.replace(/^[=<>~^]+/, "").trim().replace(/[:;,]+$/, "").trim();
  if (/^v\d/i.test(s)) s = s.slice(1);
  return s || null;
}

// Split into numeric/string segments. Handles 1.2, 1.2.3-alpha.1, 22.04, 1.0.0a1 loosely.
export function parseVersion(raw) {
  const s = cleanVersion(raw);
  if (s == null) return [];
  const [core, ...preParts] = s.split("-");
  const coreSegs = core.split(/[._]/).flatMap((seg) => {
    const m = /^(\d+)([a-zA-Z].*)?$/.exec(seg);
    if (m) return m[2] ? [{ n: Number(m[1]) }, { s: m[2].toLowerCase() }] : [{ n: Number(m[1]) }];
    return [{ s: seg.toLowerCase() }];
  });
  const preSegs = preParts.join("-").split(/[._-]/).filter(Boolean).map((seg) =>
    /^\d+$/.test(seg) ? { n: Number(seg) } : { s: seg.toLowerCase() });
  return { core: coreSegs, pre: preParts.length ? preSegs : null, raw: s };
}

function cmpSeg(a, b) {
  if (a?.n !== undefined && b?.n !== undefined) return a.n === b.n ? 0 : a.n < b.n ? -1 : 1;
  if (a?.n !== undefined) return -1; // numeric segment sorts before string segment
  if (b?.n !== undefined) return 1;
  const as = a?.s ?? "", bs = b?.s ?? "";
  return as === bs ? 0 : as < bs ? -1 : 1;
}

export function compareVersions(a, b) {
  if (a == null || b == null) return NaN;
  // OSV sentinel: introduced "0" is below every real version.
  if (String(a).trim() === "0") return String(b).trim() === "0" ? 0 : -1;
  if (String(b).trim() === "0") return 1;
  const pa = parseVersion(a), pb = parseVersion(b);
  const len = Math.max(pa.core.length, pb.core.length);
  for (let i = 0; i < len; i++) {
    const c = cmpSeg(pa.core[i] ?? { n: 0 }, pb.core[i] ?? { n: 0 });
    if (c !== 0) return c;
  }
  // A release outranks any prerelease of the same core.
  if (pa.pre == null && pb.pre != null) return 1;
  if (pa.pre != null && pb.pre == null) return -1;
  if (pa.pre && pb.pre) {
    const n = Math.max(pa.pre.length, pb.pre.length);
    for (let i = 0; i < n; i++) {
      if (pa.pre[i] === undefined) return -1;
      if (pb.pre[i] === undefined) return 1;
      const c = cmpSeg(pa.pre[i], pb.pre[i]);
      if (c !== 0) return c;
    }
  }
  return 0;
}

export function versionEquals(a, b) {
  if (a == null || b == null) return false;
  return compareVersions(a, b) === 0;
}

// Intervals from one OSV range's ordered events: [introduced, fixed) etc.
function rangeIntervals(range) {
  const intervals = [];
  let start = null;
  for (const ev of range?.events ?? []) {
    if (ev.introduced !== undefined) start = ev.introduced;
    else if (ev.fixed !== undefined && start !== null) { intervals.push({ start, end: ev.fixed, endInclusive: false }); start = null; }
    else if (ev.last_affected !== undefined && start !== null) { intervals.push({ start, end: ev.last_affected, endInclusive: true }); start = null; }
    else if (ev.limit !== undefined && start !== null) { intervals.push({ start, end: ev.limit, endInclusive: false }); start = null; }
  }
  if (start !== null) intervals.push({ start, end: null, endInclusive: false });
  return intervals;
}

export function versionInRange(version, range) {
  const v = cleanVersion(version);
  if (v == null || !range) return false;
  for (const iv of rangeIntervals(range)) {
    if (compareVersions(v, iv.start) < 0) continue;
    if (iv.end == null) return true;
    const c = compareVersions(v, iv.end);
    if (iv.endInclusive ? c <= 0 : c < 0) return true;
  }
  return false;
}

// True when `version` is affected by one normalized affected-entry.
export function isVersionAffected(version, affectedEntry) {
  const v = cleanVersion(version);
  if (v == null || !affectedEntry) return false;
  for (const listed of affectedEntry.versions ?? []) {
    if (versionEquals(v, listed)) return true;
  }
  for (const range of affectedEntry.ranges ?? []) {
    if (String(range.type).toUpperCase() === "GIT") continue; // commits are not versions
    if (versionInRange(v, range)) return true;
  }
  return false;
}
// Aliases (same implementation, parallel names).
export const versionSatisfiesRange = versionInRange;
export const isAffectedVersion = isVersionAffected;
export const versionInAffectedRange = isVersionAffected;

export function extractFixedVersions(affectedEntry) {
  const out = [];
  for (const range of affectedEntry?.ranges ?? []) {
    for (const ev of range.events ?? []) if (ev.fixed !== undefined) out.push(cleanVersion(ev.fixed));
  }
  return [...new Set(out.filter(Boolean))];
}

// ---------------------------------------------------------------------------
// OSV normalization
// ---------------------------------------------------------------------------

function normalizeRange(r) {
  const events = (r?.events ?? []).map((ev) => {
    const out = {};
    if (ev.introduced !== undefined) out.introduced = String(ev.introduced);
    if (ev.fixed !== undefined) out.fixed = String(ev.fixed);
    if (ev.last_affected !== undefined) out.last_affected = String(ev.last_affected);
    if (ev.lastAffected !== undefined) out.last_affected = String(ev.lastAffected);
    if (ev.limit !== undefined) out.limit = String(ev.limit);
    return out;
  });
  return { type: r?.type ?? "ECOSYSTEM", ...(r?.repo ? { repo: r.repo } : {}), events };
}

function parseCvss(advisoryRaw, severityArr) {
  let score = null, label = null;
  for (const s of severityArr ?? []) {
    const text = s?.score ?? "";
    // CVSS vector: crude base-score extraction is not attempted from vector;
    // numeric scores appear in some exports as database_specific / cvss fields.
    if (typeof text === "number") score = text;
    if (s?.type) label = label ?? String(s.type);
  }
  const ds = advisoryRaw?.database_specific ?? {};
  const cand = advisoryRaw?.cvssScore ?? advisoryRaw?.cvss?.score ?? ds.cvssScore ?? ds.cvss?.score
    ?? advisoryRaw?.severityScore;
  if (typeof cand === "number") score = cand;
  else if (cand != null && !Number.isNaN(Number(cand))) score = Number(cand);
  const sevText = String(ds.severity ?? advisoryRaw?.severityLevel ?? "").toUpperCase();
  if (["CRITICAL", "HIGH", "MODERATE", "MEDIUM", "LOW"].includes(sevText)) {
    label = sevText === "MODERATE" ? "MEDIUM" : sevText;
  }
  if (label == null && score != null) {
    label = score >= 9 ? "CRITICAL" : score >= 7 ? "HIGH" : score >= 4 ? "MEDIUM" : "LOW";
  }
  return { cvssScore: score, severityLabel: label };
}

function extractEnrichment(raw) {
  const ds = raw?.database_specific ?? {};
  const kevRaw = raw?.kev ?? raw?.knownExploited ?? raw?.known_exploited ?? ds.kev ?? ds.knownExploited
    ?? ds.cisaKev ?? raw?.cisaKev;
  const knownExploited = kevRaw === true || kevRaw === "true" || !!kevRaw?.listed || !!kevRaw?.dateAdded;
  let epssScore = null, epssPercentile = null;
  const epss = raw?.epss ?? ds.epss;
  if (typeof epss === "number") epssScore = epss;
  else if (epss && typeof epss === "object") {
    if (epss.score != null) epssScore = Number(epss.score);
    if (epss.percentile != null) epssPercentile = Number(epss.percentile);
    if (epss.probability != null) epssScore = Number(epss.probability);
  }
  if (raw?.epssScore != null) epssScore = Number(raw.epssScore);
  if (raw?.epssPercentile != null) epssPercentile = Number(raw.epssPercentile);
  if (epssScore != null && epssScore > 1 && epssScore <= 100) { epssPercentile = epssPercentile ?? epssScore; epssScore = epssScore / 100; }
  if (epssPercentile != null && epssPercentile <= 1) epssPercentile = epssPercentile * 100;
  return { knownExploited, kev: knownExploited, epssScore, epssPercentile };
}

export function normalizeAdvisory(raw) {
  if (!raw || typeof raw !== "object") throw new TypeError("normalizeAdvisory: OSV record must be an object");
  if (raw.normalized === true && raw.id && Array.isArray(raw.affected)) return raw; // idempotent
  const id = String(raw.id ?? raw.osvId ?? raw.osv_id ?? "").trim();
  if (!id) throw new TypeError("normalizeAdvisory: OSV record missing id");
  const aliasSet = new Set();
  for (const a of raw.aliases ?? []) if (a && String(a) !== id) aliasSet.add(String(a));
  // Some exports nest CVE/GHSA under related / references-adjacent fields.
  for (const a of raw.related ?? []) if (a && String(a) !== id) aliasSet.add(String(a));
  const aliases = [...aliasSet];

  const affected = (raw.affected ?? []).map((entry) => {
    const pkg = entry?.package ?? {};
    const ranges = (entry?.ranges ?? []).map(normalizeRange);
    const norm = {
      package: {
        name: String(pkg.name ?? entry?.packageName ?? "").trim(),
        ecosystem: normalizeEcosystem(pkg.ecosystem ?? entry?.ecosystem),
        ecosystemRaw: pkg.ecosystem ?? entry?.ecosystem ?? null,
        ...(pkg.purl ? { purl: String(pkg.purl) } : {}),
      },
      ranges,
      versions: [...new Set((entry?.versions ?? []).map((v) => cleanVersion(v)).filter(Boolean))],
      fixedVersions: [],
      ...(entry?.ecosystem_specific ? { ecosystemSpecific: entry.ecosystem_specific } : {}),
      ...(entry?.database_specific ? { databaseSpecific: entry.database_specific } : {}),
    };
    norm.fixedVersions = extractFixedVersions(norm);
    return norm;
  });

  // Top-level shorthand (single package/ecosystem/version fields on some feeds).
  if (affected.length === 0 && (raw.packageName || raw.package?.name || raw.ecosystem)) {
    const entry = {
      package: {
        name: String(raw.packageName ?? raw.package?.name ?? ""),
        ecosystem: normalizeEcosystem(raw.ecosystem ?? raw.package?.ecosystem),
        ecosystemRaw: raw.ecosystem ?? raw.package?.ecosystem ?? null,
      },
      ranges: (raw.ranges ?? []).map(normalizeRange),
      versions: [...new Set((raw.versions ?? []).map((v) => cleanVersion(v)).filter(Boolean))],
      fixedVersions: [],
    };
    entry.fixedVersions = extractFixedVersions(entry);
    if (entry.package.name) affected.push(entry);
  }

  const severity = (raw.severity ?? []).map((s) => ({ type: s?.type ?? null, score: s?.score ?? null }));
  const { cvssScore, severityLabel } = parseCvss(raw, severity);
  const enrichment = extractEnrichment(raw);
  const withdrawnAt = raw.withdrawn ?? raw.withdrawnAt ?? null;

  return {
    normalized: true,
    id,
    osvId: id,
    aliases,
    allIds: [id, ...aliases],
    summary: raw.summary ?? "",
    details: raw.details ?? "",
    affected,
    severity,
    cvssScore,
    severityLabel,
    references: (raw.references ?? []).map((r) => (typeof r === "string" ? r : r?.url)).filter(Boolean),
    published: raw.published ?? raw.publishedAt ?? null,
    modified: raw.modified ?? raw.modifiedAt ?? null,
    withdrawn: Boolean(withdrawnAt),
    withdrawnAt,
    knownExploited: enrichment.knownExploited,
    kev: enrichment.kev,
    epssScore: enrichment.epssScore,
    epssPercentile: enrichment.epssPercentile,
    databaseSpecific: raw.database_specific ?? {},
    source: raw.source ?? null,
  };
}
export const normalizeOsvRecord = normalizeAdvisory;
export const normalizeOSV = normalizeAdvisory;

function ensureNormalized(advisory) {
  if (!advisory) return null;
  if (advisory.normalized === true && Array.isArray(advisory.affected)) return advisory;
  return normalizeAdvisory(advisory);
}

function fixedVersionsOf(advisory) {
  return [...new Set((advisory?.affected ?? []).flatMap((e) => e.fixedVersions ?? extractFixedVersions(e)))];
}

// ---------------------------------------------------------------------------
// Matchers. Every matcher returns an array; [] means no match (silence).
// Match: { artifact, ecosystem, packageName, installedVersion, spec?, advisoryId, affectedEntry }
// ---------------------------------------------------------------------------

function makeMatch(advisory, entry, fields) {
  return {
    matched: true,
    advisoryId: advisory.id,
    aliases: advisory.aliases,
    ecosystem: entry.package.ecosystem,
    packageName: entry.package.name,
    fixedVersions: entry.fixedVersions ?? extractFixedVersions(entry),
    ...fields,
  };
}

const VERSION_TOKEN = /\d+\.\d+\.\d+(?:[-+][0-9A-Za-z.-]+)?|\d+\.\d+|\d+/g;
function versionTokens(spec) {
  if (spec == null) return [];
  return (String(spec).match(VERSION_TOKEN) ?? []).map((t) => cleanVersion(t)).filter(Boolean);
}
function affectedCandidate(spec, entry) {
  for (const cand of versionTokens(spec)) if (isVersionAffected(cand, entry)) return cand;
  return null;
}

// --- package.json -----------------------------------------------------------

const DEP_SECTIONS = ["dependencies", "devDependencies", "peerDependencies", "optionalDependencies"];
function collectManifestDeps(pkg) {
  const deps = new Map(); // lowerName -> {name, spec, section}
  const add = (name, spec, section) => {
    if (typeof spec !== "string" && typeof spec !== "number") return;
    const key = String(name).toLowerCase();
    if (!deps.has(key)) deps.set(key, { name: String(name), spec: String(spec), section });
  };
  for (const section of DEP_SECTIONS) {
    for (const [n, s] of Object.entries(pkg?.[section] ?? {})) add(n, s, section);
  }
  for (const bag of [pkg?.overrides, pkg?.resolutions]) {
    if (bag && typeof bag === "object") for (const [n, s] of Object.entries(bag)) {
      if (typeof s === "string") add(n, s, "overrides");
    }
  }
  return deps;
}

export function matchPackageJson(advisoryInput, pkgInput) {
  const advisory = ensureNormalized(advisoryInput);
  if (!advisory) return [];
  let pkg = pkgInput;
  if (typeof pkgInput === "string") {
    try { pkg = JSON.parse(pkgInput); } catch { return []; }
  }
  if (!pkg || typeof pkg !== "object") return [];
  const deps = collectManifestDeps(pkg);
  const matches = [];
  for (const entry of advisory.affected) {
    if (entry.package.ecosystem !== "NPM") continue;
    const name = entry.package.name;
    if (!name) continue;
    const found = deps.get(name.toLowerCase());
    if (found) {
      const hit = affectedCandidate(found.spec, entry);
      // Wildcard specs ("*", "latest") prove nothing: stay silent.
      if (hit) matches.push(makeMatch(advisory, entry, {
        artifact: "package.json", installedVersion: hit, spec: found.spec, section: found.section,
      }));
      continue;
    }
    // The manifest package itself.
    if (pkg.name && String(pkg.name).toLowerCase() === name.toLowerCase() && pkg.version) {
      const hit = affectedCandidate(pkg.version, entry);
      if (hit) matches.push(makeMatch(advisory, entry, {
        artifact: "package.json", installedVersion: hit, spec: String(pkg.version), section: "(self)",
      }));
    }
  }
  return matches;
}

// --- Lockfile text ------------------------------------------------------------

function lockfileJsonEntries(text) {
  const entries = [];
  let obj = null;
  try { obj = JSON.parse(text); } catch { return entries; }
  if (!obj || typeof obj !== "object") return entries;
  // package-lock v2/v3: "packages": { "node_modules/<name>": {version} }
  for (const [key, val] of Object.entries(obj.packages ?? {})) {
    if (!val?.version) continue;
    const idx = key.lastIndexOf("node_modules/");
    const name = idx >= 0 ? key.slice(idx + "node_modules/".length) : key;
    if (name) entries.push({ name, version: String(val.version) });
  }
  // package-lock v1 / generic nested "dependencies"
  const walk = (deps) => {
    for (const [name, val] of Object.entries(deps ?? {})) {
      if (val?.version) entries.push({ name, version: String(val.version) });
      if (val?.dependencies) walk(val.dependencies);
    }
  };
  walk(obj.dependencies);
  // Cargo.lock / uv.lock style JSON-ish arrays are not JSON; text scan covers them.
  if (Array.isArray(obj.package)) {
    for (const p of obj.package) if (p?.name && p?.version) entries.push({ name: String(p.name), version: String(p.version) });
  }
  return entries;
}

function candidateVersionsFor(name, text, jsonEntries) {
  const out = new Set();
  for (const e of jsonEntries) if (e.name.toLowerCase() === name.toLowerCase()) out.add(cleanVersion(e.version));
  const esc = name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const patterns = [
    new RegExp(`["']?${esc}["']?\\s*@\\s*["']?v?(\\d[^\\s"'\\],}]*)`, "g"),           // name@1.2.3
    new RegExp(`["']${esc}["']\\s*:\\s*["']v?(\\d[^"']*)["']`, "g"),                    // "name": "1.2.3"
    new RegExp(`/${esc}/v?(\\d[^/\\s:]+)`, "g"),                                         // /name/1.2.3 (pnpm)
    new RegExp(`^\\s*["']?${esc}["']?\\s*[:=]\\s*["']?v?(\\d[^\\s"'\\],}]*)`, "gm"),     // name: 1.2.3 / name = "1.2.3"
    new RegExp(`${esc}[@\\s]+v?(\\d+\\.\\d+[^\\s"'\\],}]*)`, "g"),                      // name 1.2.3 (go.sum-ish)
  ];
  for (const re of patterns) {
    let m; while ((m = re.exec(text)) !== null) { const v = cleanVersion(m[1]); if (v) out.add(v); }
  }
  // yarn.lock: `name@spec:` block followed by `version "x"`; Cargo: name=/version= pair.
  const blockRe = new RegExp(`["']?${esc}@[^:\\n]*["']?:\\s*\\n(?:[^\\n]*\\n){0,4}?\\s*version\\s+["']?v?([\\d][^"'\\s]*)`, "g");
  let m; while ((m = blockRe.exec(text)) !== null) out.add(cleanVersion(m[1]));
  const cargoRe = new RegExp(`name\\s*=\\s*["']${esc}["']\\s*\\nversion\\s*=\\s*["']v?([\\d][^"']*)["']`, "g");
  while ((m = cargoRe.exec(text)) !== null) out.add(cleanVersion(m[1]));
  return [...out].filter(Boolean);
}

export function matchLockfile(advisoryInput, lockfileText, filename = null) {
  const advisory = ensureNormalized(advisoryInput);
  if (!advisory || typeof lockfileText !== "string" || !lockfileText) return [];
  const jsonEntries = lockfileJsonEntries(lockfileText);
  const matches = [];
  for (const entry of advisory.affected) {
    const name = entry.package.name;
    if (!name) continue;
    for (const cand of candidateVersionsFor(name, lockfileText, jsonEntries)) {
      if (isVersionAffected(cand, entry)) {
        matches.push(makeMatch(advisory, entry, {
          artifact: filename ?? "lockfile", installedVersion: cand,
        }));
        break; // one proven version per package is enough
      }
    }
  }
  return matches;
}
export const matchLockfileText = matchLockfile;

// --- Dockerfile ---------------------------------------------------------------

function parseImageRef(ref, argDefaults) {
  let s = String(ref).trim().replace(/^\$\{?([A-Z_][A-Z0-9_]*)\}?$/i, (_, k) => argDefaults.get(k) ?? ref);
  s = s.replace(/\$\{([A-Z_][A-Z0-9_]*)(?::-([^}]*))?\}/gi, (_, k, dflt) => argDefaults.get(k) ?? dflt ?? _);
  s = s.replace(/\$([A-Z_][A-Z0-9_]*)/gi, (whole, k) => argDefaults.get(k) ?? whole);
  const noDigest = s.split("@")[0];
  const lastSlash = noDigest.lastIndexOf("/");
  const lastColon = noDigest.lastIndexOf(":");
  let image = noDigest, tag = null;
  if (lastColon > lastSlash) { image = noDigest.slice(0, lastColon); tag = noDigest.slice(lastColon + 1); }
  const parts = image.split("/").filter(Boolean);
  if (parts.length > 1 && (/[.:]/.test(parts[0]) || parts[0] === "localhost")) parts.shift();
  if (parts.length > 1 && parts[0] === "library") parts.shift();
  return { image: parts.join("/").toLowerCase(), tag: tag && tag !== "latest" ? cleanVersion(tag) : null, digestPinned: s.includes("@sha256:") };
}

function dockerImageName(pkgName) {
  const parts = String(pkgName).toLowerCase().split("/").filter(Boolean);
  if (parts.length > 1 && (/[.:]/.test(parts[0]) || parts[0] === "localhost")) parts.shift();
  if (parts.length > 1 && parts[0] === "library") parts.shift();
  return parts.join("/");
}

export function matchDockerfile(advisoryInput, dockerfileText) {
  const advisory = ensureNormalized(advisoryInput);
  if (!advisory || typeof dockerfileText !== "string" || !dockerfileText) return [];
  const text = dockerfileText.replace(/\\\r?\n/g, " ");
  const argDefaults = new Map();
  for (const m of text.matchAll(/^\s*ARG\s+([A-Z_][A-Z0-9_]*)=([^\s#]+)/gim)) argDefaults.set(m[1], m[2]);
  const images = [];
  for (const m of text.matchAll(/^\s*FROM\s+(?:--platform=\S+\s+)?(\S+)/gim)) images.push(parseImageRef(m[1], argDefaults));
  const matches = [];
  for (const entry of advisory.affected) {
    if (!["DOCKER", "DISTRO"].includes(entry.package.ecosystem)) continue;
    const want = dockerImageName(entry.package.name);
    if (!want) continue;
    for (const img of images) {
      if (img.image !== want || !img.tag) continue;
      // Tag "20" pads to 20.0.0 for range checks; enumerated versions also
      // accept an exact tag match only (a moving minor tag proves no patch).
      if (isVersionAffected(img.tag, entry)) {
        matches.push(makeMatch(advisory, entry, {
          artifact: "Dockerfile", installedVersion: img.tag, image: img.image,
        }));
      }
    }
  }
  return matches;
}

// --- GitHub Actions workflow pins ----------------------------------------------

function normalizeActionName(name) {
  let s = String(name).trim().toLowerCase();
  s = s.replace(/^https?:\/\/github\.com\//, "").replace(/\.git$/, "");
  if (s.startsWith("docker://")) s = s.slice("docker://".length);
  return s.split("@")[0];
}

export function matchGithubActions(advisoryInput, workflowText) {
  const advisory = ensureNormalized(advisoryInput);
  if (!advisory || typeof workflowText !== "string" || !workflowText) return [];
  const uses = [];
  for (const m of workflowText.matchAll(/uses:\s*['"]?([^\s'"]+)['"]?/g)) uses.push(m[1]);
  const matches = [];
  for (const entry of advisory.affected) {
    if (entry.package.ecosystem !== "GITHUB_ACTIONS") continue;
    const want = normalizeActionName(entry.package.name);
    if (!want) continue;
    for (const u of uses) {
      const at = u.lastIndexOf("@");
      if (at < 0) continue;
      const repo = normalizeActionName(u.slice(0, at));
      // Advisory names the action repo; a sub-path use (repo/path@ref) still consumes it.
      if (repo !== want && !repo.startsWith(want + "/")) continue;
      const ref = u.slice(at + 1);
      if (/^[0-9a-f]{40}$/i.test(ref) || /^[0-9a-f]{64}$/i.test(ref)) continue; // SHA pin: not version-provable
      if (!/\d/.test(ref)) continue; // branch pin (main/master): not version-provable
      const ver = cleanVersion(ref);
      if (ver && isVersionAffected(ver, entry)) {
        matches.push(makeMatch(advisory, entry, {
          artifact: "workflow", installedVersion: ver, spec: u, pin: ref,
        }));
      }
    }
  }
  return matches;
}
export const matchGitHubActions = matchGithubActions;
export const matchWorkflow = matchGithubActions;
export const matchActions = matchGithubActions;

// --- Dispatcher -----------------------------------------------------------------

function asArray(x) {
  if (x == null) return [];
  return Array.isArray(x) ? x : [x];
}

// artifacts: { packageJson, lockfileText|lockfile|lockfiles[], dockerfile|dockerfiles[],
//              workflow|workflows[]|githubActions[] , files: [{path, content}] }
export function matchAdvisory(advisoryInput, artifacts = {}) {
  const advisory = ensureNormalized(advisoryInput);
  if (!advisory) return { matched: false, silent: true, matches: [], advisoryId: null };
  const matches = [];
  const pkgInputs = [
    ...asArray(artifacts.packageJson), ...asArray(artifacts.packageJSON),
    ...asArray(artifacts.manifest),
  ];
  if (artifacts.files) {
    for (const f of artifacts.files) {
      const p = String(f?.path ?? "");
      if (/(^|\/)package\.json$/.test(p)) pkgInputs.push(f.content);
    }
  }
  for (const p of pkgInputs) matches.push(...matchPackageJson(advisory, p));

  const lockInputs = [
    ...asArray(artifacts.lockfileText), ...asArray(artifacts.lockfile),
    ...asArray(artifacts.lockfiles),
  ];
  if (artifacts.files) {
    for (const f of artifacts.files) {
      const p = String(f?.path ?? "");
      if (/(lock|go\.sum|Gemfile\.lock|composer\.lock|poetry\.lock|uv\.lock|Cargo\.lock|pnpm-lock|yarn\.lock|package-lock)/i.test(p)) {
        lockInputs.push({ text: f.content, name: p });
      }
    }
  }
  for (const l of lockInputs) {
    if (typeof l === "string") matches.push(...matchLockfile(advisory, l));
    else if (l && typeof l === "object") matches.push(...matchLockfile(advisory, l.text ?? l.content ?? "", l.name ?? l.path ?? null));
  }

  const dockerInputs = [...asArray(artifacts.dockerfile), ...asArray(artifacts.dockerfiles), ...asArray(artifacts.Dockerfile)];
  if (artifacts.files) for (const f of artifacts.files) if (/(^|\/)Dockerfile/.test(String(f?.path ?? ""))) dockerInputs.push(f.content);
  for (const d of dockerInputs) if (typeof d === "string") matches.push(...matchDockerfile(advisory, d));

  const wfInputs = [
    ...asArray(artifacts.workflow), ...asArray(artifacts.workflows),
    ...asArray(artifacts.githubActions), ...asArray(artifacts.actions),
  ];
  if (artifacts.files) for (const f of artifacts.files) if (/\.github\/workflows\//.test(String(f?.path ?? ""))) wfInputs.push(f.content);
  for (const w of wfInputs) if (typeof w === "string") matches.push(...matchGithubActions(advisory, w));

  // De-duplicate identical (artifact, package, version) hits.
  const seen = new Set();
  const unique = matches.filter((m) => {
    const k = `${m.artifact}|${m.packageName}|${m.installedVersion}`;
    return seen.has(k) ? false : (seen.add(k), true);
  });
  return {
    matched: unique.length > 0,
    silent: unique.length === 0,
    matches: unique,
    advisoryId: advisory.id,
    aliases: advisory.aliases,
    affectedPackages: [...new Set(unique.map((m) => m.packageName))],
  };
}
export const findMatches = matchAdvisory;
export const matchAll = matchAdvisory;

// ---------------------------------------------------------------------------
// Reachability: REACHES only from import/call evidence, never from a match.
// evidence shapes accepted:
//   boolean | "REACHES"|"UNREACHABLE"|"AFFECTS" |
//   { reachable, imports[], importEvidence, calls[], callSites[], callEvidence,
//     paths[]/reachablePaths[]/graphPath[], entryPoints[], files[], symbols[],
//     scope/searchedScope, inputAuthority/exposure, fidelity }
// ---------------------------------------------------------------------------

function nonEmptyArr(x) { return Array.isArray(x) ? x.filter((v) => v != null && String(v).trim() !== "") : []; }
function firstNonEmpty(obj, keys) {
  for (const k of keys) { const v = nonEmptyArr(obj?.[k]); if (v.length) return v; }
  return [];
}

export function evaluateReachability(evidence) {
  if (evidence == null) return { status: "UNKNOWN", reaches: false, proven: false, importEvidence: [], callEvidence: [], paths: [], scope: null, fidelity: null };
  if (typeof evidence === "boolean") {
    // A bare boolean asserts but does not prove: no artifact, no REACHES.
    return { status: "UNKNOWN", reaches: false, proven: false, asserted: evidence, importEvidence: [], callEvidence: [], paths: [], scope: null, fidelity: null };
  }
  if (typeof evidence === "string") {
    const s = evidence.trim().toUpperCase();
    if (s === "UNREACHABLE" || s === "NO_ACTION" || s === "NOT_REACHABLE") {
      return { status: "UNREACHABLE", reaches: false, proven: true, importEvidence: [], callEvidence: [], paths: [], scope: null, fidelity: null };
    }
    // A bare "REACHES" label is a claim, not an artifact: stays unproven.
    return { status: "UNKNOWN", reaches: false, proven: false, asserted: s, importEvidence: [], callEvidence: [], paths: [], scope: null, fidelity: null };
  }
  const importEvidence = firstNonEmpty(evidence, ["imports", "importEvidence", "importedBy", "importers", "importPaths"]);
  const callEvidence = firstNonEmpty(evidence, ["calls", "callSites", "callEvidence", "callers", "callGraph", "invocations"]);
  const paths = firstNonEmpty(evidence, ["paths", "reachablePaths", "graphPath", "reachabilityPath", "path"]);
  const generic = firstNonEmpty(evidence, ["evidence", "artifacts", "proof"]);
  const allProof = [...importEvidence, ...callEvidence, ...paths, ...generic];
  const scope = evidence.scope ?? evidence.searchedScope ?? evidence.proofScope ?? null;
  const fidelity = evidence.fidelity ?? evidence.reachabilityFidelity ?? (callEvidence.length || paths.length ? "symbol-level" : importEvidence.length ? "package-level" : null);

  if (evidence.unreachable === true || evidence.reachable === false || evidence.reaches === false
    || ["UNREACHABLE", "NO_ACTION", "NOT_REACHABLE"].includes(String(evidence.status ?? evidence.disposition ?? "").toUpperCase())) {
    return { status: "UNREACHABLE", reaches: false, proven: true, importEvidence, callEvidence, paths, scope, fidelity };
  }
  if (allProof.length > 0) {
    return { status: "REACHES", reaches: true, proven: true, importEvidence, callEvidence, paths, scope, fidelity };
  }
  if (evidence.reachable === true || evidence.reaches === true
    || ["REACHES", "REACHABLE"].includes(String(evidence.status ?? evidence.disposition ?? "").toUpperCase())) {
    // Claimed reachability with no import/call artifact does not prove REACHES.
    return { status: "UNKNOWN", reaches: false, proven: false, asserted: true, importEvidence, callEvidence, paths, scope, fidelity };
  }
  if (scope && importEvidence.length === 0 && callEvidence.length === 0) {
    // Caller searched a stated scope and found no path: absence proof for that scope.
    return { status: "UNREACHABLE", reaches: false, proven: true, importEvidence, callEvidence, paths, scope, fidelity };
  }
  return { status: "UNKNOWN", reaches: false, proven: false, importEvidence, callEvidence, paths, scope, fidelity };
}
export const assessReachability = evaluateReachability;

// ---------------------------------------------------------------------------
// NO_ACTION receipt (value-free: ids, versions, reason codes, scope only)
// ---------------------------------------------------------------------------

export function createNoActionReceipt({ advisory: advisoryInput, matches = [], reasonCode = "UNREACHABLE", scope = null, reachability = null } = {}) {
  const advisory = advisoryInput ? ensureNormalized(advisoryInput) : null;
  const first = asArray(matches)[0] ?? {};
  const pkg = first.packageName ?? advisory?.affected?.[0]?.package?.name ?? null;
  const version = first.installedVersion ?? null;
  const provenScope = scope ?? reachability?.scope
    ?? "Searched repo entry-point import/call graph for the affected package; no import or call path found within that searched scope.";
  return {
    id: `rc_watcher_${(advisory?.id ?? "unknown").replace(/[^A-Za-z0-9]+/g, "_")}_${String(pkg ?? "pkg").replace(/[^A-Za-z0-9]+/g, "_")}`,
    state: "NO_ACTION",
    reasonCode,
    advisoryId: advisory?.id ?? null,
    aliases: advisory?.aliases ?? [],
    ecosystem: first.ecosystem ?? advisory?.affected?.[0]?.package?.ecosystem ?? null,
    packageName: pkg,
    installedVersion: version,
    scope: provenScope,
    reachabilityFidelity: reachability?.fidelity ?? null,
    outcomeDigest: `no_action:${advisory?.id ?? "unknown"}:${pkg ?? "unknown"}@${version ?? "unknown"}:${reasonCode}`,
    createdAt: new Date().toISOString(),
  };
}
export const makeNoActionReceipt = createNoActionReceipt;

// ---------------------------------------------------------------------------
// Triage
// ---------------------------------------------------------------------------

export const PRIORITIES = ["CRISIS", "STANDARD", "MONITOR"];
export const MATCH_STATUSES = ["REACHES", "AFFECTS", "NO_ACTION", "NO_MATCH"];

const TRIGGERS_BY_STATUS = {
  NO_ACTION: ["new-import-or-caller", "dependency-version-change", "exploit-publication", "kev-listing", "epss-sharp-increase", "reachability-change"],
  MONITOR: ["reachability-proof", "new-import-or-caller", "exploit-publication", "kev-listing", "epss-sharp-increase", "dependency-version-change", "fixed-version-release"],
  STANDARD: ["reachability-proof", "exploit-publication", "kev-listing", "epss-sharp-increase"],
  CRISIS: ["fix-pr-unmerged-timeout", "exploit-publication", "reachability-expansion"],
  NO_MATCH: ["dependency-change", "advisory-update"],
  WITHDRAWN: ["advisory-republished", "dependency-version-change"],
};

function numOrNull(x) { const n = Number(x); return x == null || Number.isNaN(n) ? null : n; }

export function triageAdvisory(advisoryInput, matchInput = null, evidence = null, options = {}) {
  // Single-object overload: triageAdvisory({ advisory, matches, evidence, ...opts })
  if (advisoryInput && typeof advisoryInput === "object" && !advisoryInput.id && !advisoryInput.osvId
    && (advisoryInput.advisory || advisoryInput.matches !== undefined)) {
    const o = advisoryInput;
    return triageAdvisory(o.advisory, o.matches ?? o.match ?? null, o.evidence ?? o.reachability ?? null, o);
  }
  const advisory = ensureNormalized(advisoryInput);
  const opts = options && typeof options === "object" ? options : {};
  const ev = evidence ?? opts.evidence ?? opts.reachability ?? null;

  // Normalize matchInput: array | {matches} | {matched,matches} | single match | null
  let matches = [];
  if (Array.isArray(matchInput)) matches = matchInput;
  else if (matchInput?.matches) matches = matchInput.matches;
  else if (matchInput?.matched && matchInput?.packageName) matches = [matchInput];
  else if (matchInput?.packageName && matchInput?.installedVersion) matches = [matchInput];
  const matched = matches.length > 0;

  const reach = evaluateReachability(ev);
  const fixedVersions = fixedVersionsOf(advisory);

  // Enrichment: inputs only. A KEV/EPSS value never creates a match or REACHES.
  const knownExploited = Boolean(opts.kev ?? opts.knownExploited ?? opts.known_exploited ?? advisory?.knownExploited ?? false);
  let epssScore = numOrNull(opts.epssScore ?? opts.epss?.score ?? opts.epss ?? advisory?.epssScore);
  let epssPercentile = numOrNull(opts.epssPercentile ?? opts.epss?.percentile ?? advisory?.epssPercentile);
  if (epssScore != null && epssScore > 1 && epssScore <= 100) { epssPercentile = epssPercentile ?? epssScore; epssScore = epssScore / 100; }
  if (epssPercentile != null && epssPercentile <= 1) epssPercentile = epssPercentile * 100;
  const epssHigh = (epssScore != null && epssScore >= 0.7) || (epssPercentile != null && epssPercentile >= 90);
  const cvssScore = numOrNull(opts.cvssScore ?? opts.cvss?.score ?? advisory?.cvssScore);
  const severityLabel = String(opts.severity ?? advisory?.severityLabel ?? "").toUpperCase() || null;
  const fixAvailable = opts.fixAvailable ?? opts.fixedVersionAvailable ?? (fixedVersions.length > 0);
  const inputs = {
    kev: knownExploited, knownExploited, epssScore, epssPercentile,
    cvssScore, severity: severityLabel,
    blastRadius: opts.blastRadius ?? opts.radius ?? null,
    exposure: opts.exposure ?? opts.inputAuthority ?? ev?.inputAuthority ?? ev?.exposure ?? null,
    fixAvailable: Boolean(fixAvailable),
    fixedVersions,
  };
  const base = {
    advisoryId: advisory?.id ?? null,
    aliases: advisory?.aliases ?? [],
    knownExploited, epssScore, epssPercentile,
    inputs,
    matches,
    reachability: reach,
  };

  if (advisory?.withdrawn) {
    const receipt = createNoActionReceipt({ advisory, matches, reasonCode: "ADVISORY_WITHDRAWN", reachability: reach });
    return {
      ...base, status: "NO_ACTION", disposition: "NO_ACTION", matchStatus: "NO_ACTION",
      priority: "MONITOR", silent: false, affects: matched, reaches: false,
      receipt, retriageTriggers: [...TRIGGERS_BY_STATUS.WITHDRAWN],
      reTriageTriggers: [...TRIGGERS_BY_STATUS.WITHDRAWN],
      reasons: ["Advisory withdrawn by source; open candidates settle NO_ACTION."],
    };
  }

  if (!matched) {
    // Silence: watcher emits no event and no receipt for non-matching repos.
    return {
      ...base, status: "NO_MATCH", disposition: "NO_MATCH", matchStatus: "NO_MATCH",
      priority: null, silent: true, affects: false, reaches: false,
      receipt: null, retriageTriggers: [...TRIGGERS_BY_STATUS.NO_MATCH],
      reTriageTriggers: [...TRIGGERS_BY_STATUS.NO_MATCH],
      reasons: ["No installed version falls in an affected range; watcher stays silent."],
    };
  }

  if (reach.status === "UNREACHABLE") {
    const receipt = createNoActionReceipt({ advisory, matches, reasonCode: "UNREACHABLE", reachability: reach });
    return {
      ...base, status: "NO_ACTION", disposition: "NO_ACTION", matchStatus: "NO_ACTION",
      priority: "MONITOR", silent: false, affects: true, reaches: false,
      receipt, retriageTriggers: [...TRIGGERS_BY_STATUS.NO_ACTION],
      reTriageTriggers: [...TRIGGERS_BY_STATUS.NO_ACTION],
      reasons: ["Version match (AFFECTS) but reachability search proved no import/call path within stated scope; NO_ACTION, not 'safe' beyond that scope."],
    };
  }

  if (reach.reaches && reach.proven) {
    // CRISIS gate: REACHES is necessary; KEV/EPSS/severity then set geometry.
    const crisis = knownExploited || epssHigh || (cvssScore != null && cvssScore >= 9)
      || severityLabel === "CRITICAL"
      || (cvssScore != null && cvssScore >= 7 && String(inputs.exposure).toLowerCase().includes("internet"));
    const priority = crisis ? "CRISIS" : "STANDARD";
    return {
      ...base, status: "REACHES", disposition: "REACHES", matchStatus: "REACHES",
      priority, silent: false, affects: true, reaches: true,
      receipt: null,
      retriageTriggers: [...TRIGGERS_BY_STATUS[priority]], reTriageTriggers: [...TRIGGERS_BY_STATUS[priority]],
      reasons: [crisis
        ? "REACHES proven by import/call evidence plus exploitability/severity input (KEV, EPSS, or CVSS) meets CRISIS gate."
        : "REACHES proven by import/call evidence; no crisis exploitability input, queued as STANDARD fix."],
    };
  }

  // AFFECTS only: version matched, reachability unproven. KEV/EPSS can raise
  // this to STANDARD (investigate) but never to CRISIS on their own.
  const investigate = knownExploited || epssHigh || (cvssScore != null && cvssScore >= 7)
    || severityLabel === "HIGH" || severityLabel === "CRITICAL";
  const priority = investigate ? "STANDARD" : "MONITOR";
  return {
    ...base, status: "AFFECTS", disposition: "AFFECTS", matchStatus: "AFFECTS",
    priority, silent: false, affects: true, reaches: false,
    receipt: null,
    retriageTriggers: [...TRIGGERS_BY_STATUS[priority]], reTriageTriggers: [...TRIGGERS_BY_STATUS[priority]],
    reasons: [investigate
      ? "AFFECTS only (reachability unproven); KEV/EPSS/severity raise to STANDARD investigation, never CRISIS without REACHES."
      : "AFFECTS only (reachability unproven); MONITOR with re-triage triggers until reachability is proven or disproven."],
  };
}
export const triage = triageAdvisory;
export const assessAdvisory = triageAdvisory;

// End-to-end: normalize -> match -> triage. Silence propagates (no receipt).
export function watchAdvisory(advisoryInput, artifacts = {}, evidence = null, options = {}) {
  const advisory = ensureNormalized(advisoryInput);
  const matchResult = matchAdvisory(advisory, artifacts);
  const decision = triageAdvisory(advisory, matchResult, evidence, options);
  return { advisory, ...matchResult, ...decision, matches: decision.matches };
}
export const evaluateAdvisory = watchAdvisory;
export const runWatcher = watchAdvisory;

export const DEFAULT_RETRIAGE_TRIGGERS = TRIGGERS_BY_STATUS;
