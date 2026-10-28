import { test } from "node:test";
import assert from "node:assert/strict";
import { runConformance, SPAWN_ALLOWLIST } from "../conformance/run.mjs";

test("conformance: runner returns all-pass on current tree", async () => {
  const report = await runConformance();

  assert.equal(report.kind, "federation-conformance");
  assert.ok(report.version, "report carries package version");
  assert.ok(report.pin?.sha, "report carries pin sha");
  assert.ok(Array.isArray(report.witnesses) && report.witnesses.length >= 5, "at least 5 witnesses");

  // Every witness family from the task is present.
  const categories = new Set(report.witnesses.map((w) => w.category));
  for (const cat of ["W-A", "W-S", "W-E", "W-P", "W-G"]) {
    assert.ok(categories.has(cat), `missing witness family ${cat}`);
  }

  // All-pass is the contract on the current tree; name the failures if any.
  const failures = report.witnesses.filter((w) => !w.pass);
  assert.deepEqual(
    failures.map((w) => `${w.id}: ${w.detail}`),
    [],
    "conformance witnesses must all pass on current tree",
  );
  assert.equal(report.summary.allPass, true);
  assert.equal(report.summary.failed, 0);
  assert.equal(report.summary.passed, report.summary.total);

  // Spot-check each witness exercised the real src/ contract, not a stub.
  const byId = new Map(report.witnesses.map((w) => [w.id, w]));
  assert.equal(byId.get("W-A1")?.evidence?.wideningReasonCode, "AUTHORITY_WIDENING");
  assert.equal(byId.get("W-A2")?.evidence?.staleReasonCode, "PROOF_STALE_GENERATION");
  assert.equal(byId.get("W-S1")?.evidence?.sideEffectCount, 1);
  assert.equal(byId.get("W-S1")?.evidence?.replayAfterReceiptMatches, true);
  assert.equal(byId.get("W-E1")?.evidence?.sensitive, true);
  assert.equal(byId.get("W-E1")?.evidence?.insensitiveSensitive, false);
  assert.equal(byId.get("W-E1")?.evidence?.badTestKind, "BAD_TEST");
  assert.equal(byId.get("W-G1")?.evidence?.reachesWithoutEvidenceRefused, true);
  assert.deepEqual(byId.get("W-G1")?.evidence?.affected, ["lib"]);
  assert.deepEqual(byId.get("W-G1")?.evidence?.reachable, ["core"]);

  // W-P: allowlist is documented and names broker + queue boundary files.
  assert.ok(SPAWN_ALLOWLIST.length >= 2);
  assert.ok(SPAWN_ALLOWLIST.some((e) => e.role === "broker"));
  assert.ok(SPAWN_ALLOWLIST.some((e) => e.role === "queue"));
  const wp = byId.get("W-P1");
  assert.ok(wp, "W-P1 present");
  assert.deepEqual(wp.evidence.violations, []);
  assert.ok(wp.evidence.scannedFiles.length >= 10, "scan covered src/*.mjs");
  assert.ok(wp.evidence.scannedFiles.includes("src/types.mjs"));
  assert.ok(wp.evidence.scannedFiles.includes("src/queue.mjs"));
  assert.ok(wp.evidence.scannedFiles.includes("src/factory.mjs"));

  // Invariant coverage is explicit (partial coverage never rounded up).
  assert.ok(Array.isArray(report.invariantCoverage) && report.invariantCoverage.length >= 5);
});
