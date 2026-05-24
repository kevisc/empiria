/**
 * Headless graph-engine checks: determinism and correct statistical behavior.
 * Run with:  node scripts/verify-engine.ts
 */
import { Graph } from "../src/engine/graph.ts";
import { oneSampleT } from "../src/engine/stats/tTest.ts";

let failures = 0;
function ok(label: string, cond: boolean, detail = ""): void {
  if (!cond) failures++;
  console.log(`[${cond ? "PASS" : "FAIL"}] ${label.padEnd(48)} ${detail}`);
}

// Build Sample -> Frame (growing). Same seed must give identical streams.
function buildLLN(seed: number): Graph {
  const g = new Graph();
  g.setSeed(seed);
  g.addNode("sample", "s");
  g.addNode("frame", "f");
  g.setParam("s", "dist", "normal");
  g.setParam("s", "p1", 0.5); // true mean
  g.setParam("s", "p2", 1);
  g.setParam("f", "mode", "growing");
  g.connect("s", "value", "f", "sig");
  g.reset();
  return g;
}

const g1 = buildLLN(123);
const g2 = buildLLN(123);
g1.tick(5000);
g2.tick(5000);
const m1 = g1.nodes.get("f")!.outputs.mean[0];
const m2 = g2.nodes.get("f")!.outputs.mean[0];
ok("same seed -> identical Frame mean", m1 === m2, `(${m1.toPrecision(8)})`);

// Law of large numbers: after 5000 draws the mean is near 0.5 and SE is tiny.
ok("LLN: Frame mean -> 0.5", Math.abs(m1 - 0.5) < 0.05, `mean=${m1.toFixed(4)}`);
const se = g1.nodes.get("f")!.outputs.se[0];
ok("LLN: SE collapsed ~ 1/sqrt(n)", se < 0.02, `se=${se.toFixed(4)}`);

// Different seed -> different realisation.
const g3 = buildLLN(999);
g3.tick(5000);
ok(
  "different seed -> different mean",
  g3.nodes.get("f")!.outputs.mean[0] !== m1,
);

// Sample -> Test (one-sample, mu0=0) against a large-mean population: reject.
const gt = new Graph();
gt.setSeed(7);
gt.addNode("sample", "s");
gt.addNode("test", "t");
gt.setParam("s", "p1", 1.0); // mean well above mu0 = 0
gt.setParam("s", "p2", 1);
gt.setParam("t", "mode", "one");
gt.setParam("t", "n", 30);
gt.connect("s", "value", "t", "sig");
gt.reset();
gt.tick(200);
const tn = gt.nodes.get("t")!;
ok("Test rejects H0 when mu != mu0", tn.outputs.reject[0] === 1, `p=${tn.outputs.p[0].toExponential(2)}`);

// The node's t/p must match a direct t-test on its own buffer.
const buf = (gt.nodes.get("t")!.state as { b1: number[] }).b1;
const direct = oneSampleT(buf, 0);
ok(
  "Test node t matches oneSampleT(buffer)",
  Math.abs(direct.t - tn.outputs.t[0]) < 1e-9,
  `t=${tn.outputs.t[0].toFixed(4)}`,
);

console.log(
  failures === 0 ? "\nEngine checks passed." : `\n${failures} check(s) FAILED.`,
);
process.exit(failures === 0 ? 0 : 1);
