import { test } from "node:test";
import assert from "node:assert/strict";
import {
  normalizeAdvisory, compareVersions, isVersionAffected,
  matchPackageJson, matchLockfile, matchDockerfile, matchGithubActions,
  matchAdvisory, triageAdvisory, watchAdvisory, createNoActionReceipt,
} from "../src/watcher.mjs";

// Lodash-style OSV record: affected < 4.17.21, KEV-listed, high EPSS.
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

const PKG_VULN = JSON.stringify({ name: "app", version: "1.0.0", dependencies: { lodash: "4.17.20", react: "18.2.0" } });
const PKG_SAFE = JSON.stringify({ name: "app", version: "1.0.0", dependencies: { lodash: "4.17.21" } });
const PKG_ABSENT = JSON.stringify({ name: "app", version: "1.0.0", dependencies: { react: "18.2.0" } });

test("normalize: id/aliases/affected ranges + fixed versions extracted", () => {
  const adv = normalizeAdvisory(LODASH_OSV);
  assert.equal(adv.id, "CVE-2021-23337");
  assert.deepEqual(adv.aliases, ["GHSA-35jh-r3h4-6jhm"]);
  assert.deepEqual(adv.allIds, ["CVE-2021-23337", "GHSA-35jh-r3h4-6jhm"]);
  assert.equal(adv.affected[0].package.ecosystem, "NPM");
  assert.equal(adv.affected[0].package.name, "lodash");
  assert.deepEqual(adv.affected[0].fixedVersions, ["4.17.21"]);
  assert.equal(adv.withdrawn, false);
  // idempotent + version range semantics (introduced inclusive, fixed exclusive)
  assert.equal(normalizeAdvisory(adv), adv);
  assert.equal(isVersionAffected("4.17.20", adv.affected[0]), true);
  assert.equal(isVersionAffected("4.17.21", adv.affected[0]), false);
  assert.equal(compareVersions("4.17.20", "4.17.21"), -1);
  assert.equal(compareVersions("v1.2.3", "1.2.3"), 0);
});

test("match/no-match silence: no match emits no event, no receipt, priority null", () => {
  for (const pkg of [PKG_SAFE, PKG_ABSENT]) {
    const res = watchAdvisory(LODASH_OSV, { packageJson: pkg }, null, { kev: true, epssScore: 0.99 });
    assert.equal(res.matched, false);
    assert.equal(res.silent, true);
    assert.equal(res.status, "NO_MATCH");
    assert.equal(res.priority, null);
    assert.equal(res.receipt, null);
    assert.deepEqual(res.matches, []);
  }
  // Matcher-level silence as well, even with KEV/EPSS maxed (inputs, not triggers).
  assert.deepEqual(matchPackageJson(LODASH_OSV, PKG_ABSENT), []);
  const tri = triageAdvisory(LODASH_OSV, [], null, { kev: true, epssScore: 1 });
  assert.equal(tri.silent, true);
  assert.equal(tri.priority, null);
});

test("matchers: package.json, lockfile text, Dockerfile, Actions pins", () => {
  // package.json: caret spec resolves to its base version
  const m1 = matchPackageJson(LODASH_OSV, JSON.stringify({ dependencies: { lodash: "^4.17.20" } }));
  assert.equal(m1.length, 1);
  assert.equal(m1[0].installedVersion, "4.17.20");
  assert.equal(m1[0].artifact, "package.json");
  assert.deepEqual(matchPackageJson(LODASH_OSV, JSON.stringify({ dependencies: { lodash: "*" } })), []);

  // lockfile text: package-lock JSON, yarn, pnpm-style and name@version forms
  const lockJson = JSON.stringify({ lockfileVersion: 3, packages: { "": {}, "node_modules/lodash": { version: "4.17.20" } } });
  assert.equal(matchLockfile(LODASH_OSV, lockJson)[0].installedVersion, "4.17.20");
  assert.equal(matchLockfile(LODASH_OSV, 'lodash@^4.17.20:\n  version "4.17.20"\n')[0].installedVersion, "4.17.20");
  assert.equal(matchLockfile(LODASH_OSV, "dependencies:\n  lodash@4.17.20:\n")[0].installedVersion, "4.17.20");
  assert.deepEqual(matchLockfile(LODASH_OSV, 'lodash@^4.17.21:\n  version "4.17.21"\n'), []);

  // Dockerfile: DOCKER ecosystem image tag in affected range
  const dockerAdv = normalizeAdvisory({
    id: "CVE-DOCKER-1", aliases: [],
    affected: [{ package: { ecosystem: "Docker", name: "node" }, ranges: [{ type: "ECOSYSTEM", events: [{ introduced: "0" }, { fixed: "20.11.0" }] }] }],
  });
  assert.equal(matchDockerfile(dockerAdv, "FROM node:20.10.0 AS build\n")[0].installedVersion, "20.10.0");
  assert.deepEqual(matchDockerfile(dockerAdv, "FROM node:20.11.0\n"), []);
  assert.deepEqual(matchDockerfile(dockerAdv, "FROM node:latest\n"), []);
  // npm advisory must not match a Dockerfile by name coincidence
  assert.deepEqual(matchDockerfile(LODASH_OSV, "FROM lodash:4.17.20\n"), []);

  // GitHub Actions: mutable tag in range matches; SHA pin and fixed tag do not
  const actionsAdv = normalizeAdvisory({
    id: "GHSA-ACT-1", aliases: [],
    affected: [{ package: { ecosystem: "GitHub Actions", name: "actions/checkout" }, ranges: [{ type: "ECOSYSTEM", events: [{ introduced: "0" }, { fixed: "4.2.0" }] }] }],
  });
  const wf = (pin) => `jobs:\n  build:\n    steps:\n      - uses: actions/checkout@${pin}\n`;
  assert.equal(matchGithubActions(actionsAdv, wf("v4.1.1"))[0].installedVersion, "4.1.1");
  assert.deepEqual(matchGithubActions(actionsAdv, wf("v4.2.0")), []);
  assert.deepEqual(matchGithubActions(actionsAdv, wf("a".repeat(40))), []);
  assert.deepEqual(matchGithubActions(actionsAdv, wf("main")), []);

  // Dispatcher over heterogeneous artifacts
  const all = matchAdvisory(LODASH_OSV, { packageJson: PKG_VULN, lockfileText: lockJson, dockerfile: "FROM node:20\n" });
  assert.equal(all.matched, true);
  assert.ok(all.matches.some((m) => m.artifact === "package.json"));
});

test("triage: AFFECTS only — KEV/EPSS raise to STANDARD, never CRISIS alone", () => {
  const matches = matchPackageJson(LODASH_OSV, PKG_VULN);
  const noEvidence = triageAdvisory(LODASH_OSV, matches, null, { kev: true, epssScore: 0.99 });
  assert.equal(noEvidence.status, "AFFECTS");
  assert.equal(noEvidence.reaches, false);
  assert.equal(noEvidence.priority, "STANDARD");
  assert.notEqual(noEvidence.priority, "CRISIS");
  assert.equal(noEvidence.receipt, null);
  assert.ok(noEvidence.retriageTriggers.length > 0);
  // Bare assertions do not prove REACHES either.
  for (const fake of [true, "REACHES", { reachable: true }, { reaches: true }]) {
    const t = triageAdvisory(LODASH_OSV, matches, fake, { kev: true });
    assert.equal(t.status, "AFFECTS", `evidence ${JSON.stringify(fake)} must not prove REACHES`);
    assert.notEqual(t.priority, "CRISIS");
  }
  // Quiet advisory (low severity, no enrichment): MONITOR with re-triage triggers.
  const quietAdv = { ...LODASH_OSV, severity: [], database_specific: { severity: "LOW" } };
  const quiet = triageAdvisory(quietAdv, matches, null, {});
  assert.equal(quiet.priority, "MONITOR");
  assert.ok(quiet.retriageTriggers.includes("reachability-proof"));
});

test("unreachable NO_ACTION: receipt with stated scope, MONITOR, re-triage triggers", () => {
  const matches = matchPackageJson(LODASH_OSV, PKG_VULN);
  const evidence = { reachable: false, imports: [], calls: [], scope: "Searched src/** entry-point import/call graph; lodash never imported." };
  const res = triageAdvisory(LODASH_OSV, matches, evidence, { kev: true, epssScore: 0.99 });
  assert.equal(res.status, "NO_ACTION");
  assert.equal(res.matchStatus, "NO_ACTION");
  assert.equal(res.priority, "MONITOR");
  assert.equal(res.reaches, false);
  assert.ok(res.receipt);
  assert.equal(res.receipt.state, "NO_ACTION");
  assert.equal(res.receipt.reasonCode, "UNREACHABLE");
  assert.equal(res.receipt.advisoryId, "CVE-2021-23337");
  assert.equal(res.receipt.packageName, "lodash");
  assert.match(res.receipt.scope, /never imported/);
  assert.ok(res.retriageTriggers.includes("new-import-or-caller"));
  assert.ok(res.retriageTriggers.includes("kev-listing"));
  // End-to-end demo fixture shape: version-matched but never imported.
  const e2e = watchAdvisory(LODASH_OSV, { packageJson: PKG_VULN }, evidence, { kev: true });
  assert.equal(e2e.receipt.state, "NO_ACTION");
  // Standalone receipt factory is value-free (no secret-shaped payload).
  const rc = createNoActionReceipt({ advisory: LODASH_OSV, matches, reasonCode: "UNREACHABLE", scope: "src/** only" });
  assert.equal(rc.state, "NO_ACTION");
  assert.doesNotMatch(JSON.stringify(rc), /ghp_|github_pat_|-----BEGIN/);
});

test("reachable CRISIS: REACHES proven via import/call evidence + KEV/EPSS input", () => {
  const matches = matchPackageJson(LODASH_OSV, PKG_VULN);
  const evidence = {
    imports: ["src/render.mjs: import { template } from 'lodash'"],
    calls: ["src/render.mjs: template(userInput)"],
    inputAuthority: "internet-facing",
  };
  const crisis = triageAdvisory(LODASH_OSV, matches, evidence, { kev: true, epssPercentile: 98 });
  assert.equal(crisis.status, "REACHES");
  assert.equal(crisis.matchStatus, "REACHES");
  assert.equal(crisis.reaches, true);
  assert.equal(crisis.priority, "CRISIS");
  assert.equal(crisis.receipt, null);

  // Same reachability without any exploitability input is STANDARD, not CRISIS.
  const standard = triageAdvisory(LODASH_OSV, matches, evidence, {});
  assert.equal(standard.status, "REACHES");
  assert.equal(standard.priority, "STANDARD");

  // End-to-end: reachable + KEV through the watcher entry point.
  const e2e = watchAdvisory(LODASH_OSV, { packageJson: PKG_VULN }, evidence, { kev: true });
  assert.equal(e2e.priority, "CRISIS");
  assert.equal(e2e.advisory.id, "CVE-2021-23337");
});

test("triage: withdrawn advisory settles NO_ACTION regardless of match", () => {
  const withdrawn = { ...LODASH_OSV, withdrawn: "2024-01-01T00:00:00Z" };
  const res = watchAdvisory(withdrawn, { packageJson: PKG_VULN },
    { imports: ["src/x.mjs"] }, { kev: true });
  assert.equal(res.status, "NO_ACTION");
  assert.equal(res.receipt.reasonCode, "ADVISORY_WITHDRAWN");
  assert.equal(res.priority, "MONITOR");
  assert.ok(res.retriageTriggers.length > 0);
});
