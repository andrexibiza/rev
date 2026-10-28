import { test } from "node:test";
import assert from "node:assert/strict";
import {
  runCrisisLane, applyUpgradeFix, isAncestor, verifyMergeOnMain, simulateMerge,
} from "../src/crisis.mjs";
import { matchPackageJson } from "../src/watcher.mjs";

const LODASH_OSV = {
  id: "CVE-2021-23337",
  aliases: ["GHSA-35jh-r3h4-6jhm"],
  summary: "Command injection via template",
  affected: [{
    package: { ecosystem: "npm", name: "lodash" },
    ranges: [{ type: "ECOSYSTEM", events: [{ introduced: "0" }, { fixed: "4.17.21" }] }],
  }],
  severity: [{ type: "CVSS_V3", score: "CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:H/A:H" }],
  database_specific: { severity: "HIGH" },
  published: "2021-02-20T00:00:00Z",
  modified: "2021-02-20T00:00:00Z",
};

const PKG_VULN = JSON.stringify({ name: "app", version: "1.0.0", dependencies: { lodash: "^4.17.20", react: "18.2.0" } }, null, 2);
const REACHABLE = {
  imports: ["src/render.mjs: import { template } from 'lodash'"],
  calls: ["src/render.mjs: template(userInput)"],
  inputAuthority: "internet-facing",
};
const UNREACHABLE = {
  reachable: false, imports: [], calls: [],
  scope: "Searched src/** entry-point import/call graph; lodash never imported.",
};
const NOW = "2026-11-01T12:00:00.000Z";

test("crisis reachable: match -> REACHES proof -> upgrade fix -> MERGED receipt", () => {
  const res = runCrisisLane({ advisory: LODASH_OSV, packageJson: PKG_VULN, evidence: REACHABLE, kev: true, epssPercentile: 98, now: NOW });

  // Triage + graph proof.
  assert.equal(res.status, "MERGED");
  assert.equal(res.state, "MERGED");
  assert.equal(res.priority, "CRISIS");
  assert.equal(res.reaches, true);
  assert.equal(res.matched, true);
  assert.equal(res.advisoryId, "CVE-2021-23337");
  assert.equal(res.graphProof.reachable, true);
  assert.equal(res.graphProof.path.length, 1);
  assert.equal(res.graphProof.path[0].kind, "REACHES");
  assert.ok(res.graph.reachableEntities("CVE-2021-23337").length >= 1);

  // Fix: upgrade version string in a copied package.json; original untouched.
  assert.equal(res.fix.strategy, "upgrade");
  assert.equal(res.fix.fixedVersion, "4.17.21");
  assert.equal(res.fix.installedVersion, "4.17.20");
  const patched = JSON.parse(res.patchedPackageJson);
  assert.equal(patched.dependencies.lodash, "^4.17.21");
  assert.equal(patched.dependencies.react, "18.2.0");
  assert.equal(JSON.parse(PKG_VULN).dependencies.lodash, "^4.17.20");
  // Patched manifest no longer matches the advisory.
  assert.deepEqual(matchPackageJson(LODASH_OSV, res.patchedPackageJson), []);

  // Simulated merge verification: mergeSha is ancestor of main.
  assert.ok(res.mergeSha);
  assert.equal(res.mainVerified, true);
  assert.equal(res.merge.verified, true);
  assert.equal(isAncestor(res.merge.mainHistory, res.mergeSha), true);
  assert.equal(verifyMergeOnMain({ mainHistory: res.merge.mainHistory, mergeSha: res.mergeSha }).verified, true);
  assert.equal(isAncestor(res.merge.mainHistory, "f".repeat(40)), false);

  // MERGED receipt via makeReceipt with disclosure/triage/merge timestamps.
  assert.equal(res.receipt.state, "MERGED");
  assert.equal(res.receipt.mergeSha, res.mergeSha);
  assert.equal(res.receipt.mainVerified, true);
  assert.equal(res.receipt.disclosureAt, "2021-02-20T00:00:00.000Z");
  assert.equal(res.receipt.triageAt, NOW);
  assert.equal(res.receipt.mergedAt, NOW);
  assert.ok(res.receipt.disclosureToMergedSeconds >= 0);
  assert.equal(res.timeline.disclosureAt, res.receipt.disclosureAt);
  assert.equal(res.timeline.mergedAt, res.receipt.mergedAt);
  assert.doesNotMatch(JSON.stringify(res.receipt), /ghp_|github_pat_|-----BEGIN/);
});

test("crisis unreachable: NO_ACTION receipt, no repair, no merge", () => {
  const res = runCrisisLane({ advisory: LODASH_OSV, packageJson: PKG_VULN, evidence: UNREACHABLE, kev: true, epssScore: 0.99, now: NOW });

  assert.equal(res.status, "NO_ACTION");
  assert.equal(res.state, "NO_ACTION");
  assert.equal(res.reaches, false);
  assert.equal(res.priority, "MONITOR");
  assert.equal(res.fix, null);
  assert.equal(res.repair, null);
  assert.equal(res.patchedPackageJson, null);
  assert.equal(res.patchedContent, null);
  assert.equal(res.merge, null);
  assert.equal(res.mergeSha, null);
  assert.equal(res.mainVerified, false);
  assert.ok(res.receipt);
  assert.equal(res.receipt.state, "NO_ACTION");
  assert.equal(res.receipt.reasonCode, "UNREACHABLE");
  assert.equal(res.receipt.packageName, "lodash");
  assert.match(res.receipt.scope, /never imported/);
  assert.equal(res.receipt.triageAt, NOW);
  assert.equal(res.receipt.mergedAt, null);
  assert.equal(res.timeline.mergedAt, null);
  assert.ok(res.retriageTriggers.includes("new-import-or-caller"));
});

test("crisis: AFFECTS-only and no-match never repair", () => {
  const affects = runCrisisLane({ advisory: LODASH_OSV, packageJson: PKG_VULN, evidence: null, kev: true, now: NOW });
  assert.equal(affects.status, "AFFECTS");
  assert.equal(affects.fix, null);
  assert.equal(affects.patchedPackageJson, null);
  assert.equal(affects.receipt, null);

  const safePkg = JSON.stringify({ dependencies: { lodash: "4.17.21" } });
  const noMatch = runCrisisLane({ advisory: LODASH_OSV, packageJson: safePkg, evidence: REACHABLE, kev: true, now: NOW });
  assert.equal(noMatch.status, "NO_MATCH");
  assert.equal(noMatch.silent, true);
  assert.equal(noMatch.receipt, null);
  assert.equal(noMatch.fix, null);
});

test("crisis helpers: upgrade copies + preserves prefix; ancestor model", () => {
  const original = { dependencies: { lodash: "^4.17.20" } };
  const fix = applyUpgradeFix({ packageJson: original, packageName: "lodash", fixedVersion: "4.17.21", installedVersion: "4.17.20" });
  assert.equal(JSON.parse(fix.patchedPackageJson).dependencies.lodash, "^4.17.21");
  assert.equal(original.dependencies.lodash, "^4.17.20", "caller manifest must not be mutated");
  assert.equal(applyUpgradeFix({ packageJson: original, packageName: "absent", fixedVersion: "1.0.0" }), null);

  const sim = simulateMerge({ mainHistory: ["a".repeat(40)], mergeSha: "b".repeat(40) });
  assert.equal(sim.verified, true);
  assert.equal(isAncestor(sim.mainHistory, "b".repeat(40)), true);
  assert.equal(isAncestor(new Set(sim.mainHistory), "b".repeat(40)), true);
  assert.equal(verifyMergeOnMain({ mainHistory: ["a".repeat(40)], mergeSha: "b".repeat(40) }).verified, false);
});
