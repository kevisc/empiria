// Reproducible engine-throughput benchmark (Node, single-threaded — comparable
// to the browser's JS engine). Measures sustained ticks/second for a typical
// patch and how throughput scales with the number of nodes on the canvas.
import { Graph } from "../src/engine/graph.ts";

function timeTicks(build: () => Graph, ticks: number) {
  const g = build();
  g.tick(2000); // warm up JIT
  const t0 = process.hrtime.bigint();
  g.tick(ticks);
  const t1 = process.hrtime.bigint();
  const sec = Number(t1 - t0) / 1e9;
  return { tps: ticks / sec, usPerTick: (sec / ticks) * 1e6 };
}

// A typical small patch: one sampler feeding a live t-test (bounded buffers).
function typical(): Graph {
  const g = new Graph();
  g.setSeed(42);
  g.addNode("sample", "s");
  g.addNode("test", "t");
  g.setParam("s", "dist", "normal");
  g.setParam("s", "p1", 0.5);
  g.setParam("s", "p2", 1);
  g.setParam("t", "mode", "one");
  g.setParam("t", "n", 30);
  g.connect("s", "value", "t", "sig");
  g.reset();
  return g;
}

// A busy canvas: N independent sampler -> test pairs (2N nodes).
function stress(n: number): () => Graph {
  return () => {
    const g = new Graph();
    g.setSeed(1);
    for (let i = 0; i < n; i++) {
      g.addNode("sample", "s" + i);
      g.addNode("test", "t" + i);
      g.setParam("s" + i, "dist", "normal");
      g.setParam("t" + i, "mode", "one");
      g.setParam("t" + i, "n", 30);
      g.connect("s" + i, "value", "t" + i, "sig");
    }
    g.reset();
    return g;
  };
}

const fmt = (x: number) => Math.round(x).toLocaleString("en-US");
const r = timeTicks(typical, 200000);
console.log(`typical patch (2 nodes):        ${fmt(r.tps)} ticks/s   (${r.usPerTick.toFixed(2)} us/tick)`);
for (const n of [8, 32, 128, 512]) {
  const rr = timeTicks(stress(n), 20000);
  console.log(`busy canvas (${String(2 * n).padStart(4)} nodes):        ${fmt(rr.tps)} ticks/s   (${rr.usPerTick.toFixed(1)} us/tick)`);
}
const mb = (process.memoryUsage().heapUsed / 1048576).toFixed(0);
console.log(`heap after 1024-node run: ~${mb} MB`);
