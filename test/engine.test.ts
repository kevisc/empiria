import { describe, it, expect } from "vitest";
import { Graph } from "../src/engine/graph.ts";
import { applyPatch } from "../src/patch.ts";
import { LESSONS } from "../src/lessons.ts";
import { oneSampleT } from "../src/engine/stats/tTest.ts";

function lln(seed: number): Graph {
  const g = new Graph();
  g.setSeed(seed);
  g.addNode("sample", "s");
  g.addNode("frame", "f");
  g.setParam("s", "dist", "normal");
  g.setParam("s", "p1", 0.5);
  g.setParam("s", "p2", 1);
  g.setParam("f", "mode", "growing");
  g.connect("s", "value", "f", "sig");
  g.reset();
  return g;
}

describe("graph engine", () => {
  it("same seed → byte-identical stream", () => {
    const a = lln(123);
    const b = lln(123);
    a.tick(4000);
    b.tick(4000);
    expect(a.nodes.get("f")!.outputs.mean[0]).toBe(b.nodes.get("f")!.outputs.mean[0]);
  });

  it("different seed → different realisation", () => {
    const a = lln(123);
    const b = lln(999);
    a.tick(4000);
    b.tick(4000);
    expect(a.nodes.get("f")!.outputs.mean[0]).not.toBe(b.nodes.get("f")!.outputs.mean[0]);
  });

  it("Law of Large Numbers: mean → μ, SE → small", () => {
    const g = lln(123);
    g.tick(5000);
    const f = g.nodes.get("f")!.outputs;
    expect(Math.abs(f.mean[0] - 0.5)).toBeLessThan(0.05);
    expect(f.se[0]).toBeLessThan(0.02);
  });

  it("Test node t equals a direct one-sample t-test on its buffer", () => {
    const g = new Graph();
    g.setSeed(7);
    g.addNode("sample", "s");
    g.addNode("test", "t");
    g.setParam("s", "p1", 1);
    g.setParam("t", "n", 30);
    g.connect("s", "value", "t", "sig");
    g.reset();
    g.tick(200);
    const buf = (g.nodes.get("t")!.state as { b1: number[] }).b1;
    const direct = oneSampleT(buf, 0);
    expect(Math.abs(direct.t - g.nodes.get("t")!.outputs.t[0])).toBeLessThan(1e-9);
  });

  it("Coverage node attains ≈ 95% nominal coverage", () => {
    const g = new Graph();
    g.setSeed(8);
    g.addNode("sample", "s");
    g.addNode("coverage", "c");
    g.setParam("c", "n", 30);
    g.setParam("c", "mu0", 0);
    g.connect("s", "value", "c", "sig");
    g.reset();
    g.tick(30 * 500);
    const cov = g.nodes.get("c")!.outputs.coverage[0];
    expect(cov).toBeGreaterThan(0.9);
    expect(cov).toBeLessThan(0.99);
  });

  it("Power node: false-positive rate ≈ α under the null", () => {
    const g = new Graph();
    g.setSeed(99);
    g.addNode("sample", "a");
    g.addNode("sample", "b");
    g.addNode("power", "p");
    g.setParam("a", "p1", 0);
    g.setParam("b", "p1", 0); // identical populations
    g.setParam("p", "n", 20);
    g.connect("a", "value", "p", "a");
    g.connect("b", "value", "p", "b");
    g.reset();
    g.tick(20 * 800);
    const rate = g.nodes.get("p")!.outputs.rejrate[0];
    expect(rate).toBeGreaterThan(0.02);
    expect(rate).toBeLessThan(0.09);
  });
});

describe("every lesson and tour-step patch applies and ticks", () => {
  for (const l of LESSONS) {
    const patches = l.steps ? l.steps.map((s) => s.patch) : [l.patch];
    patches.forEach((p, i) => {
      it(`${l.id} #${i}`, () => {
        const g = new Graph();
        expect(() => {
          applyPatch(g, structuredClone(p));
          g.tick(100);
        }).not.toThrow();
        expect(g.nodes.size).toBeGreaterThan(0);
      });
    });
  }
});
