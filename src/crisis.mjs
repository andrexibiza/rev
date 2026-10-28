// Crisis lane: end-to-end advisory flow (references/vuln-response.md).
// advisory in -> match -> REACHES proof (graph) -> upgrade fix on a copied
// package.json -> simulated merge verification (ancestor check) -> MERGED
// receipt (src/types.mjs makeReceipt) with disclosure/triage/merge timestamps.
// Unreachable settles as a value-free NO_ACTION receipt with no repair.
// No network, no ambient authority: all inputs are explicit parameters.
import { createHash } from "node:crypto";
import { watchAdvisory, evaluateReachability, compareVersions } from "./watcher.mjs";
import { KnowledgeGraph, createKnowledgeGraph, makePin } from "./graph.mjs";
import { makeReceipt } from "./types.mjs";

// ---------------------------------------------------------------------------
// Simulated main history: simple array (ordered history) + Set (ancestors).
// A sha is "on main" iff it is an ancestor of (or equal to) main head, i.e.
// it appears in the history array. Set membership is the ancestor check.
// ---------------------------------------------------------------------------

export function createMainHistory(initialShas = []) {
  const history = [...initialShas].filter(Boolean).map(String);
  return { history, ancestors: new Set(history), head: history[history.length - 1] ?? null };
}

function historyArray(mainHistory) {
  if (mainHistory == null) return [];
  if (Array.isArray(mainHistory)) return [...mainHistory].map(String);
  if (mainHistory instanceof Set) return [...mainHistory].map(String);
  if (Array.isArray(mainHistory.history)) return [...mainHistory.history].map(String);
  if (mainHistory.ancestors instanceof Set) return [...mainHistory.ancestors].map(String);
  return [];
}

export function isAncestor(mainHistory, sha) {
  if (!sha) return false;
  if (mainHistory instanceof Set) return mainHistory.has(String(sha));
  return new Set(historyArray(mainHistory)).has(String(sha));
}
export const isMergeAncestor = isAncestor;
export const isOnMain = isAncestor;

export function verifyMergeOnMain({ mainHistory, mergeSha, history, sha } = {}) {
  const hist = historyArray(mainHistory ?? history);
  const target = String(mergeSha ?? sha ?? "");
  const verified = target ? new Set(hist).has(target) : false;
  return { verified, isAncestor: verified, mergeSha: target || null, mainHistory: hist, head: hist[hist.length - 1] ?? null };
}
export const verifyMerge = verifyMergeOnMain;
export const verifyMerged = verifyMergeOnMain;

// Simulate a merge: append mergeSha as the new main head (unless present),
// then verify by ancestor check against the resulting history.
export function simulateMerge({ mainHistory, mergeSha, baseHistory, sha } = {}) {
  const hist = historyArray(mainHistory ?? baseHistory);
  const target = String(mergeSha ?? sha ?? "");
  const newHistory = target && !hist.includes(target) ? [...hist, target] : hist;
  const check = verifyMergeOnMain({ mainHistory: newHistory, mergeSha: target });
  return { mergeSha: target || null, mainHistory: newHistory, ancestors: new Set(newHistory), head: newHistory[newHistory.length - 1] ?? null, verified: check.verified, isAncestor: check.verified };
}

// ---------------------------------------------------------------------------
// Fix strategy (rank 1 in vuln-response.md §6): upgrade to the fixed version.
// Operates on a copy; the caller's package.json content is never mutated.
// ---------------------------------------------------------------------------

const DEP_SECTIONS = ["dependencies", "devDependencies", "peerDependencies", "optionalDependencies"];

function specPrefix(spec) {
  const m = /^([~^><= ]*)/.exec(String(spec ?? ""));
  return m ? m[1] : "";
}

export function upgradeSpec(spec, fixedVersion) {
  const s = String(spec ?? "");
  const token = /\d+\.\d+\.\d+(?:[-+][0-9A-Za-z.-]+)?|\d+\.\d+|\d+/;
  if (token.test(s)) return s.replace(token, fixedVersion);
  return `${specPrefix(s)}${fixedVersion}`;
}

export function applyUpgradeFix({ packageJson, packageName, fixedVersion, installedVersion = null } = {}) {
  if (!packageJson || !packageName || !fixedVersion) return null;
  let parsed;
  if (typeof packageJson === "string") {
    try { parsed = JSON.parse(packageJson); } catch { return null; }
  } else if (typeof packageJson === "object") {
    parsed = packageJson;
  } else return null;
  // Deep copy: repair must never mutate the caller's manifest.
  const copy = JSON.parse(JSON.stringify(parsed));
  let changed = false;
  let fromSpec = null;
  let toSpec = null;
  for (const section of DEP_SECTIONS) {
    const deps = copy[section];
    if (!deps || typeof deps !== "object") continue;
    for (const key of Object.keys(deps)) {
      if (key.toLowerCase() !== String(packageName).toLowerCase()) continue;
      fromSpec = String(deps[key]);
      toSpec = upgradeSpec(fromSpec, fixedVersion);
      deps[key] = toSpec;
      changed = true;
    }
  }
  for (const bagName of ["overrides", "resolutions"]) {
    const bag = copy[bagName];
    if (!bag || typeof bag !== "object") continue;
    for (const key of Object.keys(bag)) {
      if (key.toLowerCase() !== String(packageName).toLowerCase() || typeof bag[key] !== "string") continue;
      fromSpec = fromSpec ?? String(bag[key]);
      toSpec = upgradeSpec(bag[key], fixedVersion);
      bag[key] = toSpec;
      changed = true;
    }
  }
  // The manifest package itself.
  if (!changed && copy.name && String(copy.name).toLowerCase() === String(packageName).toLowerCase() && copy.version) {
    fromSpec = String(copy.version);
    toSpec = upgradeSpec(fromSpec, fixedVersion);
    copy.version = toSpec;
    changed = true;
  }
  if (!changed) return null;
  const patchedPackageJson = JSON.stringify(copy, null, 2) + "\n";
  return {
    strategy: "upgrade",
    kind: "upgrade",
    packageName,
    installedVersion,
    fromVersion: installedVersion,
    fixedVersion,
    toVersion: fixedVersion,
    fromSpec,
    toSpec,
    patchedPackageJson,
    patchedContent: patchedPackageJson,
    patchedPackage: copy,
  };
}
export const buildUpgradeFix = applyUpgradeFix;
export const fixPackageJson = applyUpgradeFix;
export const upgradePackageJson = applyUpgradeFix;

// ---------------------------------------------------------------------------
// Time helpers: injectable clock via options.now (Date | string | number |
// function returning any of those). Defaults to wall clock.
// ---------------------------------------------------------------------------

function resolveNow(nowOpt, fallbackIso = null) {
  const raw = typeof nowOpt === "function" ? nowOpt() : nowOpt;
  if (raw == null) return fallbackIso ?? new Date().toISOString();
  if (raw instanceof Date) return raw.toISOString();
  if (typeof raw === "number") return new Date(raw).toISOString();
  const parsed = Date.parse(String(raw));
  return Number.isNaN(parsed) ? String(raw) : new Date(parsed).toISOString();
}

function secondsBetween(a, b) {
  if (!a || !b) return null;
  const d = (Date.parse(b) - Date.parse(a)) / 1000;
  return Number.isNaN(d) ? null : d;
}

function pickFixedVersion(match, triage) {
  const candidates = [
    ...(match?.fixedVersions ?? []),
    ...(triage?.inputs?.fixedVersions ?? []),
  ].filter(Boolean);
  if (!candidates.length) return null;
  return candidates.reduce((best, v) => (compareVersions(v, best) > 0 ? v : best), candidates[0]);
}

function graphEvidenceFor(reach) {
  const refs = [
    ...(reach?.importEvidence ?? []).map((ref) => ({ kind: "import-evidence", ref: String(ref) })),
    ...(reach?.callEvidence ?? []).map((ref) => ({ kind: "call-evidence", ref: String(ref) })),
    ...(reach?.paths ?? []).map((ref) => ({ kind: "reachability-path", ref: String(ref) })),
  ];
  // evaluateReachability proves REACHES only with non-empty proof artifacts;
  // fall back to a single proof ref if a caller supplied generic evidence.
  return refs;
}

// ---------------------------------------------------------------------------
// Main lane
// ---------------------------------------------------------------------------

export function runCrisisLane(input = {}, maybeOptions = {}) {
  // Positional overload: runCrisisLane(advisory, packageJson, evidence, opts)
  let opts;
  let advisoryInput;
  let packageJsonInput;
  let evidenceInput;
  if (input && typeof input === "object" && (input.advisory !== undefined || input.packageJson !== undefined
    || input.packageJsonContent !== undefined || input.artifacts !== undefined || input.evidence !== undefined
    || input.reachability !== undefined)) {
    opts = { ...maybeOptions, ...input };
    advisoryInput = input.advisory;
    packageJsonInput = input.packageJson ?? input.packageJsonContent ?? input.manifest ?? input.pkg
      ?? input.artifacts?.packageJson ?? input.artifacts?.packageJSON ?? input.artifacts?.manifest;
    evidenceInput = input.evidence ?? input.reachability ?? input.reachabilityEvidence ?? null;
  } else {
    // input is the advisory itself; maybeOptions may be pkg string or opts bag.
    advisoryInput = input;
    if (typeof maybeOptions === "string" || (maybeOptions && typeof maybeOptions === "object" && !Array.isArray(maybeOptions)
      && maybeOptions.dependencies === undefined && maybeOptions.name === undefined)) {
      opts = typeof maybeOptions === "string" ? {} : { ...maybeOptions };
    } else if (maybeOptions && typeof maybeOptions === "object") {
      opts = {};
      packageJsonInput = maybeOptions; // package.json object as 2nd positional arg
    } else {
      opts = {};
    }
    packageJsonInput = packageJsonInput ?? opts.packageJson ?? opts.packageJsonContent ?? opts.manifest ?? opts.pkg
      ?? (typeof maybeOptions === "string" ? maybeOptions : undefined);
    evidenceInput = opts.evidence ?? opts.reachability ?? null;
    // runCrisisLane(advisory, packageJsonString, evidence, options) form:
    if (arguments.length >= 3) evidenceInput = arguments[2] ?? evidenceInput;
    if (arguments.length >= 4 && arguments[3] && typeof arguments[3] === "object") opts = { ...opts, ...arguments[3] };
  }
  if (packageJsonInput === undefined && opts.artifacts) {
    packageJsonInput = opts.artifacts.packageJson ?? opts.artifacts.packageJSON ?? opts.artifacts.manifest;
  }

  const triageAt = resolveNow(opts.now ?? opts.triageAt);
  const artifacts = opts.artifacts ? { ...opts.artifacts } : {};
  if (packageJsonInput !== undefined && artifacts.packageJson === undefined
    && artifacts.packageJSON === undefined && artifacts.manifest === undefined) {
    artifacts.packageJson = packageJsonInput;
  }
  const triageOptions = {
    kev: opts.kev ?? opts.knownExploited,
    knownExploited: opts.knownExploited ?? opts.kev,
    epssScore: opts.epssScore, epssPercentile: opts.epssPercentile, epss: opts.epss,
    cvssScore: opts.cvssScore, severity: opts.severity,
    exposure: opts.exposure ?? opts.inputAuthority, inputAuthority: opts.inputAuthority ?? opts.exposure,
    blastRadius: opts.blastRadius,
  };

  // 1) advisory in -> match -> triage (watcher). Silence propagates.
  const watched = watchAdvisory(advisoryInput, artifacts, evidenceInput, triageOptions);
  const advisory = watched.advisory;
  const disclosureRaw = opts.disclosureAt ?? opts.disclosedAt ?? advisory?.published ?? advisory?.publishedAt ?? null;
  const disclosureIso = disclosureRaw && !Number.isNaN(Date.parse(String(disclosureRaw)))
    ? new Date(Date.parse(String(disclosureRaw))).toISOString() : triageAt;

  const baseTimeline = { disclosureAt: disclosureIso, triageAt, mergedAt: null };

  if (!watched.matched) {
    return {
      status: "NO_MATCH", disposition: "NO_MATCH", state: "NO_MATCH",
      silent: true, matched: false, affects: false, reaches: false,
      priority: null, advisory, advisoryId: advisory?.id ?? null,
      matches: [], triage: watched, reachability: watched.reachability,
      graph: null, graphProof: null, fix: null, repair: null,
      patchedPackageJson: null, patchedContent: null, merge: null, mergeSha: null,
      mainVerified: false, receipt: null,
      timeline: { ...baseTimeline }, timestamps: { disclosure: disclosureIso, triage: triageAt, merge: null },
      retriageTriggers: watched.retriageTriggers ?? [],
    };
  }

  // 2) graph: AFFECTS for the match; REACHES only with proven evidence.
  const pin = opts.pin ? makePin(opts.pin) : (opts.graph?.pin ?? makePin({}));
  const graph = opts.graph ?? createKnowledgeGraph({ pin });
  const advisoryNodeId = advisory.id;
  const match = watched.matches[0];
  const entityId = `rev:node:CodeEntity:${match.packageName}`;
  try {
    if (!graph.getNode(advisoryNodeId)) {
      graph.addNode({ id: advisoryNodeId, kind: "Advisory", osvId: advisory.id, aliases: advisory.aliases, ecosystem: match.ecosystem, packageName: match.packageName });
    }
    if (!graph.getNode(entityId)) {
      graph.addNode({ id: entityId, kind: "CodeEntity", path: match.artifact ?? "package.json", packageName: match.packageName, installedVersion: match.installedVersion });
    }
    if (!graph.listEdges({ fromId: advisoryNodeId, toId: entityId, kind: "AFFECTS" }).length) {
      graph.addEdge({ kind: "AFFECTS", fromId: advisoryNodeId, toId: entityId, evidence: [{ kind: "version-range", ref: `osv:${advisory.id}` }] });
    }
  } catch { /* graph recording is proof support; triage verdict stands */ }

  // 3) unreachable -> NO_ACTION receipt, no repair.
  if (watched.status === "NO_ACTION") {
    const receipt = watched.receipt
      ? { ...watched.receipt, disclosureAt: disclosureIso, triageAt, mergedAt: null }
      : null;
    return {
      status: "NO_ACTION", disposition: "NO_ACTION", state: "NO_ACTION",
      silent: false, matched: true, affects: true, reaches: false,
      priority: watched.priority, advisory, advisoryId: advisory.id,
      matches: watched.matches, triage: watched, reachability: watched.reachability,
      graph, graphProof: { reachable: false, entities: [], path: [] },
      fix: null, repair: null, patchedPackageJson: null, patchedContent: null,
      merge: null, mergeSha: null, mainVerified: false, receipt,
      timeline: { ...baseTimeline },
      timestamps: { disclosure: disclosureIso, triage: triageAt, merge: null },
      retriageTriggers: watched.retriageTriggers ?? [],
    };
  }

  // AFFECTS only (reachability unproven): investigate/monitor, never repair.
  if (!watched.reaches) {
    return {
      status: watched.status, disposition: watched.disposition ?? watched.status, state: watched.status,
      silent: false, matched: true, affects: true, reaches: false,
      priority: watched.priority, advisory, advisoryId: advisory.id,
      matches: watched.matches, triage: watched, reachability: watched.reachability,
      graph, graphProof: { reachable: false, entities: graph.reachableEntities(advisoryNodeId), path: [] },
      fix: null, repair: null, patchedPackageJson: null, patchedContent: null,
      merge: null, mergeSha: null, mainVerified: false, receipt: watched.receipt ?? null,
      timeline: { ...baseTimeline },
      timestamps: { disclosure: disclosureIso, triage: triageAt, merge: null },
      retriageTriggers: watched.retriageTriggers ?? [],
    };
  }

  // 4) REACHES proof via the knowledge graph (evidence-bearing edge only).
  const reach = watched.reachability ?? evaluateReachability(evidenceInput);
  const evidence = graphEvidenceFor(reach);
  let graphProof = { reachable: false, entities: [], path: [], evidence };
  try {
    if (evidence.length && !graph.listEdges({ fromId: advisoryNodeId, toId: entityId, kind: "REACHES" }).length) {
      graph.addEdge({ kind: "REACHES", fromId: advisoryNodeId, toId: entityId, evidence });
    }
    const entities = graph.reachableEntities(advisoryNodeId);
    const path = graph.reachabilityPath(advisoryNodeId, entityId);
    graphProof = { reachable: entities.length > 0 && path.length > 0, entities, path, evidence };
  } catch (err) {
    graphProof = { reachable: false, entities: [], path: [], evidence, error: String(err?.message ?? err) };
  }
  if (!graphProof.reachable) {
    // Watcher claimed REACHES but graph cannot prove it: do not repair.
    return {
      status: "AFFECTS", disposition: "AFFECTS", state: "AFFECTS",
      silent: false, matched: true, affects: true, reaches: false,
      priority: watched.priority, advisory, advisoryId: advisory.id,
      matches: watched.matches, triage: watched, reachability: watched.reachability,
      graph, graphProof, fix: null, repair: null,
      patchedPackageJson: null, patchedContent: null, merge: null, mergeSha: null,
      mainVerified: false, receipt: null,
      timeline: { ...baseTimeline },
      timestamps: { disclosure: disclosureIso, triage: triageAt, merge: null },
      retriageTriggers: watched.retriageTriggers ?? [],
    };
  }

  // 5) fix strategy: upgrade version string in a copied package.json.
  const fixedVersion = pickFixedVersion(match, watched);
  const fix = fixedVersion
    ? applyUpgradeFix({ packageJson: packageJsonInput, packageName: match.packageName, fixedVersion, installedVersion: match.installedVersion })
    : null;
  if (!fix) {
    return {
      status: "REACHES", disposition: "REACHES", state: "INDETERMINATE",
      silent: false, matched: true, affects: true, reaches: true,
      priority: watched.priority, advisory, advisoryId: advisory.id,
      matches: watched.matches, triage: watched, reachability: watched.reachability,
      graph, graphProof, fix: null, repair: null,
      patchedPackageJson: null, patchedContent: null, merge: null, mergeSha: null,
      mainVerified: false,
      receipt: makeReceipt({ state: "INDETERMINATE", reasonCode: "NO_FIXED_VERSION", outcomeDigest: `indeterminate:${advisory.id}:${match.packageName}:no-fixed-version`, pin, mergeSha: null }),
      timeline: { ...baseTimeline },
      timestamps: { disclosure: disclosureIso, triage: triageAt, merge: null },
      retriageTriggers: watched.retriageTriggers ?? [],
    };
  }

  // 6) simulated merge + verification (mergeSha must be ancestor of main).
  const mergedAt = resolveNow(opts.now ?? opts.mergedAt, triageAt);
  const mergeSha = String(opts.mergeSha ?? createHash("sha256")
    .update(`merge:${advisory.id}:${match.packageName}:${fix.fixedVersion}:${fix.patchedPackageJson}`)
    .digest("hex").slice(0, 40));
  const baseHistory = historyArray(opts.mainHistory ?? opts.baseHistory ?? [pin.sha]);
  const mergeFailed = opts.mergeSucceeds === false || opts.simulateMergeFailure === true;
  const merge = mergeFailed
    ? { mergeSha, mainHistory: baseHistory, ancestors: new Set(baseHistory), verified: false, isAncestor: isAncestor(baseHistory, mergeSha) }
    : simulateMerge({ mainHistory: baseHistory, mergeSha });
  const verified = !mergeFailed && merge.verified && isAncestor(merge.mainHistory, mergeSha);

  if (!verified) {
    const receipt = {
      ...makeReceipt({ state: "INDETERMINATE", reasonCode: "MERGE_NOT_ON_MAIN", outcomeDigest: `indeterminate:${advisory.id}:${match.packageName}:merge-not-on-main`, pin, mergeSha }),
      advisoryId: advisory.id, disclosureAt: disclosureIso, triageAt, mergedAt: null,
    };
    return {
      status: "INDETERMINATE", disposition: "INDETERMINATE", state: "INDETERMINATE",
      silent: false, matched: true, affects: true, reaches: true,
      priority: watched.priority, advisory, advisoryId: advisory.id,
      matches: watched.matches, triage: watched, reachability: watched.reachability,
      graph, graphProof, fix, repair: fix,
      patchedPackageJson: fix.patchedPackageJson, patchedContent: fix.patchedPackageJson,
      merge, mergeSha, mainVerified: false, receipt,
      timeline: { ...baseTimeline },
      timestamps: { disclosure: disclosureIso, triage: triageAt, merge: null },
      retriageTriggers: watched.retriageTriggers ?? [],
    };
  }

  // 7) MERGED receipt via makeReceipt, with disclosure/triage/merge times.
  const receipt = {
    ...makeReceipt({
      state: "MERGED",
      reasonCode: "MERGED",
      outcomeDigest: `merged:${advisory.id}:${match.packageName}@${fix.fixedVersion}:${mergeSha}`,
      pin,
      mergeSha,
    }),
    advisoryId: advisory.id,
    packageName: match.packageName,
    installedVersion: match.installedVersion,
    fixedVersion: fix.fixedVersion,
    mainVerified: true,
    disclosureAt: disclosureIso,
    triageAt,
    mergedAt,
    disclosureToMergedSeconds: secondsBetween(disclosureIso, mergedAt),
  };
  const timeline = { disclosureAt: disclosureIso, triageAt, mergedAt, disclosureToMergedSeconds: receipt.disclosureToMergedSeconds };
  return {
    status: "MERGED", disposition: "MERGED", state: "MERGED",
    silent: false, matched: true, affects: true, reaches: true,
    priority: watched.priority, advisory, advisoryId: advisory.id,
    matches: watched.matches, triage: watched, reachability: watched.reachability,
    graph, graphProof, fix, repair: fix,
    patchedPackageJson: fix.patchedPackageJson, patchedContent: fix.patchedPackageJson,
    patchedPackage: fix.patchedPackage,
    merge, mergeSha, mainVerified: true, receipt, timeline,
    timestamps: { disclosure: disclosureIso, triage: triageAt, merge: mergedAt },
    retriageTriggers: watched.retriageTriggers ?? [],
  };
}

export const runCrisis = runCrisisLane;
export const crisisLane = runCrisisLane;
export const handleAdvisory = runCrisisLane;
export const processAdvisory = runCrisisLane;
export const respondToAdvisory = runCrisisLane;
export const executeCrisisLane = runCrisisLane;
export const handleCrisisAdvisory = runCrisisLane;

export default runCrisisLane;
