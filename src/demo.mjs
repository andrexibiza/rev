// Demo orchestration (Acts 1-2 offline core): review fixture PR -> adjudicated contract. No network, no GitHub writes.
import { witnessProbe, sensitivityProbe, adjudicate, analystScan } from "./factory.mjs";
import { composeReview } from "./review.mjs";
import * as discount from "../fixtures/demo/discount.mjs";

export function runDemoReview() {
  const analyst = analystScan({ files: [{ path: new URL("../fixtures/demo/discount.mjs", import.meta.url).pathname }] });
  const witness = witnessProbe({ discountModule: discount });
  const sensitivity = sensitivityProbe({ run: () => true }); // planted bad test: always passes (wrong supplier)
  const adj = adjudicate({ analyst, witness, sensitivity });
  const markdown = composeReview({
    pin: { head: "demo-head", base: "demo-base", generation: "gen-demo-1", policyHash: "policy-demo" },
    promise: "Discount capped at $15 applies before tax on all buyer kinds.",
    findings: adj.findings,
    sound: ["Non-member totals verified at cap boundary (executed)."],
    gaps: ["Desktop/native platform paths unexecuted in demo core."],
    verdict: adj.verdict,
    cost: { laneSeconds: 1, tokens: 0, ciMinutes: 0 },
  });
  return { analyst, witness, sensitivity, adjudication: adj, markdown };
}
if (import.meta.url === `file://${process.argv[1]}`) console.log(runDemoReview().markdown);
