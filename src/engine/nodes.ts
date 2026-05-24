import type { NodeRuntime, Signal } from "./graph.ts";
import { draw, standardNormal, type DistName } from "./distributions.ts";
import { oneSampleT, welchT } from "./stats/tTest.ts";
import { ols } from "./stats/ols.ts";
import { bcaBootstrap, type StatName } from "./stats/bootstrap.ts";
import { normalQuantile, studentTCritical } from "./stats/special.ts";
import { summarize } from "./stats/describe.ts";
import { chiSquareTest } from "./stats/contingency.ts";
import { autocorrelation } from "./stats/timeseries.ts";

/** Parse free-form numeric text (CSV / spaces / newlines) into numbers. */
function parseNums(text: string): number[] {
  return text
    .split(/[\s,;]+/)
    .map((t) => Number(t))
    .filter((v) => Number.isFinite(v));
}

export interface NodeDef {
  type: string;
  label: string;
  blurb: string;
  inputs: string[];
  outputs: string[];
  defaultParams: Record<string, number | string>;
  init(params: Record<string, number | string>): Record<string, unknown>;
  tick(node: NodeRuntime, inputs: Record<string, Signal>): Record<string, Signal>;
}

const num = (s: Signal | undefined, i = 0, d = 0) => (s && s.length > i ? s[i] : d);
const HIST_CAP = 600;

function ringPush(buf: number[], v: number, cap: number): void {
  buf.push(v);
  if (buf.length > cap) buf.shift();
}

function makeMatrix(rows: number, cols: number): number[][] {
  const R = Math.max(2, Math.round(rows));
  const C = Math.max(2, Math.round(cols));
  return Array.from({ length: R }, () => new Array(C).fill(0));
}

function clampIdx(i: number, n: number): number {
  return i < 0 ? 0 : i >= n ? n - 1 : i;
}

/** Transfer-function shapes for the Transform node (shared with its viz). */
export function shape(fn: string, x: number): number {
  switch (fn) {
    case "square":
      return x * x;
    case "sqrt":
      return Math.sqrt(Math.abs(x));
    case "log":
      return Math.log(Math.abs(x) + 1e-9);
    case "abs":
      return Math.abs(x);
    case "sigmoid":
      return 1 / (1 + Math.exp(-x));
    case "sin":
      return Math.sin(x);
    default:
      return x; // linear
  }
}

export const NODE_DEFS: Record<string, NodeDef> = {
  // ---- Seed: a reproducibility primitive (value source) ----
  seed: {
    type: "seed",
    label: "Seed",
    blurb:
      "The master seed. Every random node derives its stream from it, so the same seed reproduces the whole patch identically on any machine. No wiring needed — its effect is global.",
    inputs: [],
    outputs: [],
    defaultParams: { value: 42 },
    init: () => ({}),
    tick: () => ({}),
  },

  // ---- Note: an editable sticky note, saved with the patch ----
  note: {
    type: "note",
    label: "Note",
    blurb: "",
    inputs: [],
    outputs: [],
    defaultParams: { text: "Double-click to edit this note." },
    init: () => ({}),
    tick: () => ({}),
  },

  // ---- Data: stream an imported CSV column (persisted in the patch) ----
  data: {
    type: "data",
    label: "Data (CSV)",
    blurb:
      "Streams an imported dataset, one value per tick (looping). Brings real data into the patch — wire it where you'd use a Sample.",
    inputs: [],
    outputs: ["value"],
    defaultParams: { csv: "" },
    init: (params) => ({ values: parseNums(String(params.csv ?? "")), idx: 0 }),
    tick: (node) => {
      const st = node.state as { values: number[]; idx: number };
      if (st.values.length === 0) return { value: [] };
      const v = st.values[st.idx % st.values.length];
      st.idx += 1;
      return { value: [v] };
    },
  },

  // ---- Code: continuous -> ordinal Likert encoder ----
  code: {
    type: "code",
    label: "Code",
    blurb:
      "Collapses a continuous value into an ordinal K-point (Likert) category by slicing [low, high] into K equal bins.",
    inputs: ["sig"],
    outputs: ["cat"],
    defaultParams: { k: 5, low: -1, high: 1 },
    init: () => ({ counts: [] as number[], last: 1 }),
    tick: (node, inputs) => {
      const st = node.state as { counts: number[]; last: number };
      const k = Math.max(2, Math.round(Number(node.params.k)));
      const low = Number(node.params.low);
      const high = Number(node.params.high);
      if (st.counts.length !== k) st.counts = new Array(k).fill(0);
      const out: number[] = [];
      for (const x of inputs.sig ?? []) {
        let c = Math.floor(((x - low) / ((high - low) || 1)) * k);
        if (c < 0) c = 0;
        if (c >= k) c = k - 1;
        st.counts[c] += 1;
        st.last = c + 1;
        out.push(c + 1);
      }
      return { cat: out.length ? out : [st.last] };
    },
  },

  // ---- Tab: contingency table, chi-square, Cramér's V ----
  tab: {
    type: "tab",
    label: "Tab",
    blurb:
      "Cross-tabulates two categorical streams; reports χ², its exact p-value, and Cramér's V effect size.",
    inputs: ["row", "col"],
    outputs: ["chi2", "p", "v"],
    defaultParams: { rows: 2, cols: 2 },
    init: (params) => ({
      mat: makeMatrix(Number(params.rows), Number(params.cols)),
      n: 0,
      res: null as { chi2: number; p: number; v: number } | null,
    }),
    tick: (node, inputs) => {
      const st = node.state as {
        mat: number[][];
        n: number;
        res: { chi2: number; p: number; v: number } | null;
      };
      const R = Math.max(2, Math.round(Number(node.params.rows)));
      const C = Math.max(2, Math.round(Number(node.params.cols)));
      if (st.mat.length !== R || st.mat[0]?.length !== C) {
        st.mat = makeMatrix(R, C);
        st.n = 0;
      }
      const rows = inputs.row ?? [];
      const cols = inputs.col ?? [];
      const len = Math.min(rows.length, cols.length);
      for (let i = 0; i < len; i++) {
        const r = clampIdx(Math.round(rows[i]) - 1, R);
        const c = clampIdx(Math.round(cols[i]) - 1, C);
        st.mat[r][c] += 1;
        st.n += 1;
      }
      if (st.n > 0) {
        const r = chiSquareTest(st.mat);
        st.res = { chi2: r.chi2, p: r.p, v: r.cramersV };
      }
      const r = st.res;
      if (!r) return { chi2: [0], p: [1], v: [0] };
      return { chi2: [r.chi2], p: [r.p], v: [r.v] };
    },
  },

  // ---- Means: emit the mean of each batch of n draws (the CLT engine) ----
  means: {
    type: "means",
    label: "Means",
    blurb:
      "Emits the mean of each batch of n draws. The distribution of its output IS the sampling distribution of the mean — feed it to Frame, Boot or QQ to see the CLT directly.",
    inputs: ["sig"],
    outputs: ["mean"],
    defaultParams: { n: 25 },
    init: () => ({ buf: [] as number[], hist: [] as number[] }),
    tick: (node, inputs) => {
      const st = node.state as { buf: number[]; hist: number[] };
      const n = Math.max(2, Math.round(Number(node.params.n)));
      const out: number[] = [];
      for (const v of inputs.sig ?? []) {
        st.buf.push(v);
        if (st.buf.length >= n) {
          const m = st.buf.reduce((a, b) => a + b, 0) / n;
          out.push(m);
          ringPush(st.hist, m, HIST_CAP);
          st.buf = [];
        }
      }
      return { mean: out };
    },
  },

  // ---- Power: repeat a two-sample test, tally the rejection rate ----
  power: {
    type: "power",
    label: "Power",
    blurb:
      "Repeats a two-sample t-test on fresh batches and tracks the rejection rate. With equal means that rate is the Type-I error (≈ α); with a real difference it is the test's power.",
    inputs: ["a", "b"],
    outputs: ["rejrate", "experiments"],
    defaultParams: { n: 20, alpha: 0.05 },
    init: () => ({ ba: [] as number[], bb: [] as number[], rej: 0, total: 0 }),
    tick: (node, inputs) => {
      const st = node.state as { ba: number[]; bb: number[]; rej: number; total: number };
      const n = Math.max(2, Math.round(Number(node.params.n)));
      const alpha = Number(node.params.alpha);
      for (const v of inputs.a ?? []) st.ba.push(v);
      for (const v of inputs.b ?? []) st.bb.push(v);
      while (st.ba.length >= n && st.bb.length >= n) {
        const a = st.ba.splice(0, n);
        const b = st.bb.splice(0, n);
        const r = welchT(a, b, 0);
        st.total += 1;
        if (r.p < alpha) st.rej += 1;
      }
      const rate = st.total > 0 ? st.rej / st.total : 0;
      return { rejrate: [rate], experiments: [st.total] };
    },
  },

  // ---- QQ: normal quantile-quantile plot (a normality diagnostic) ----
  qq: {
    type: "qq",
    label: "QQ plot",
    blurb:
      "Plots sorted sample values against theoretical Normal quantiles. Points on a straight line ⇒ roughly Normal; curvature ⇒ skew or heavy tails.",
    inputs: ["sig"],
    outputs: [],
    defaultParams: { n: 128 },
    init: () => ({ buf: [] as number[] }),
    tick: (node, inputs) => {
      const st = node.state as { buf: number[] };
      const cap = Math.max(8, Math.round(Number(node.params.n)));
      for (const v of inputs.sig ?? []) ringPush(st.buf, v, cap);
      return {};
    },
  },

  // ---- Summary: descriptive statistics table ----
  summary: {
    type: "summary",
    label: "Summary",
    blurb:
      "Descriptive statistics for a stream — centre, spread, quartiles and shape (skew/kurtosis). The numeric companion to a histogram.",
    inputs: ["sig"],
    outputs: ["mean", "median", "sd", "iqr"],
    defaultParams: { n: 200 },
    init: () => ({ buf: [] as number[], s: summarize([]) }),
    tick: (node, inputs) => {
      const st = node.state as { buf: number[]; s: ReturnType<typeof summarize> };
      const cap = Math.max(2, Math.round(Number(node.params.n)));
      for (const v of inputs.sig ?? []) ringPush(st.buf, v, cap);
      st.s = summarize(st.buf);
      return { mean: [st.s.mean], median: [st.s.median], sd: [st.s.sd], iqr: [st.s.iqr] };
    },
  },

  // ---- Box: box-and-whisker (five-number summary + outliers) ----
  box: {
    type: "box",
    label: "Box plot",
    blurb:
      "A box-and-whisker of the sample: box = Q1–Q3, line = median, whiskers reach 1.5×IQR, points beyond are flagged outliers.",
    inputs: ["sig"],
    outputs: ["median", "iqr"],
    defaultParams: { n: 200 },
    init: () => ({ buf: [] as number[], s: summarize([]) }),
    tick: (node, inputs) => {
      const st = node.state as { buf: number[]; s: ReturnType<typeof summarize> };
      const cap = Math.max(2, Math.round(Number(node.params.n)));
      for (const v of inputs.sig ?? []) ringPush(st.buf, v, cap);
      st.s = summarize(st.buf);
      return { median: [st.s.median], iqr: [st.s.iqr] };
    },
  },

  // ---- ECDF: empirical cumulative distribution function ----
  ecdf: {
    type: "ecdf",
    label: "ECDF",
    blurb:
      "The empirical cumulative distribution function — the fraction of data ≤ x — with a Normal CDF overlaid for comparison.",
    inputs: ["sig"],
    outputs: [],
    defaultParams: { n: 200 },
    init: () => ({ buf: [] as number[] }),
    tick: (node, inputs) => {
      const st = node.state as { buf: number[] };
      const cap = Math.max(8, Math.round(Number(node.params.n)));
      for (const v of inputs.sig ?? []) ringPush(st.buf, v, cap);
      return {};
    },
  },

  // ---- Coverage: repeat the experiment, tally how often the CI covers μ ----
  coverage: {
    type: "coverage",
    label: "Coverage",
    blurb:
      "Repeats the experiment: each batch of n draws gives a confidence interval for the mean, and the node tallies how often it actually covers the true value.",
    inputs: ["sig"],
    outputs: ["coverage", "covered", "total"],
    defaultParams: { n: 30, mu0: 0, alpha: 0.05 },
    init: () => ({
      buf: [] as number[],
      covered: 0,
      total: 0,
      recent: [] as { lo: number; hi: number; ok: boolean }[],
    }),
    tick: (node, inputs) => {
      const st = node.state as {
        buf: number[];
        covered: number;
        total: number;
        recent: { lo: number; hi: number; ok: boolean }[];
      };
      const n = Math.max(2, Math.round(Number(node.params.n)));
      const mu0 = Number(node.params.mu0);
      // Exact t-interval (correct at small n), not the z ≈ 1.96 approximation.
      const tc = studentTCritical(Number(node.params.alpha), n - 1);
      for (const v of inputs.sig ?? []) {
        st.buf.push(v);
        if (st.buf.length >= n) {
          const mean = st.buf.reduce((a, b) => a + b, 0) / n;
          const variance = st.buf.reduce((a, b) => a + (b - mean) ** 2, 0) / (n - 1);
          const se = Math.sqrt(variance / n);
          const lo = mean - tc * se;
          const hi = mean + tc * se;
          const ok = mu0 >= lo && mu0 <= hi;
          st.total += 1;
          if (ok) st.covered += 1;
          st.recent.push({ lo, hi, ok });
          if (st.recent.length > 50) st.recent.shift();
          st.buf = [];
        }
      }
      const cov = st.total > 0 ? st.covered / st.total : 0;
      return { coverage: [cov], covered: [st.covered], total: [st.total] };
    },
  },

  // ---- Lag: autocorrelation with Bartlett bands ----
  lag: {
    type: "lag",
    label: "Lag",
    blurb:
      "Autocorrelation ρ(k) of a signal with ±1.96/√n Bartlett bands — the residual-diagnostic 'is it white noise?' check.",
    inputs: ["sig"],
    outputs: ["rho1", "white"],
    defaultParams: { maxlag: 16, n: 128 },
    init: () => ({ buf: [] as number[], rhos: [] as number[], band: 0 }),
    tick: (node, inputs) => {
      const st = node.state as { buf: number[]; rhos: number[]; band: number };
      const cap = Math.max(8, Math.round(Number(node.params.n)));
      for (const v of inputs.sig ?? []) ringPush(st.buf, v, cap);
      const n = st.buf.length;
      if (n > 4) {
        st.rhos = autocorrelation(st.buf, Number(node.params.maxlag));
        st.band = 1.96 / Math.sqrt(n);
      }
      const rho1 = st.rhos[0] ?? 0;
      const white = st.rhos.length && st.rhos.every((r) => Math.abs(r) < st.band) ? 1 : 0;
      return { rho1: [rho1], white: [white] };
    },
  },

  // ---- Mix: combine two streams into one (mixture / sum / mean) ----
  mix: {
    type: "mix",
    label: "Mix",
    blurb:
      "Combines two streams into one — a random mixture, their sum, or their mean. Wire two different Samples in to build a mixture distribution.",
    inputs: ["a", "b"],
    outputs: ["value"],
    defaultParams: { mode: "mixture", w: 0.5 },
    init: () => ({ hist: [] as number[] }),
    tick: (node, inputs) => {
      const st = node.state as { hist: number[] };
      const a = inputs.a ?? [];
      const b = inputs.b ?? [];
      const mode = node.params.mode as string;
      const w = Number(node.params.w);
      const len = Math.max(a.length, b.length);
      const out: number[] = [];
      for (let i = 0; i < len; i++) {
        const av = a[i] ?? a[0] ?? 0;
        const bv = b[i] ?? b[0] ?? 0;
        let v: number;
        if (mode === "sum") v = av + bv;
        else if (mode === "mean") v = (av + bv) / 2;
        else v = node.rng.random() < w ? av : bv; // mixture
        out.push(v);
        ringPush(st.hist, v, HIST_CAP);
      }
      return { value: out.length ? out : [0] };
    },
  },

  // ---- Scope: a chart-recorder, plotting a signal over time ----
  scope: {
    type: "scope",
    label: "Scope",
    blurb:
      "A chart-recorder: plots a signal over time, so you can watch its trajectory (trend, drift, oscillation) rather than just its distribution. Passes the signal through.",
    inputs: ["sig"],
    outputs: ["value"],
    defaultParams: { n: 200 },
    init: () => ({ buf: [] as number[] }),
    tick: (node, inputs) => {
      const st = node.state as { buf: number[] };
      const cap = Math.max(20, Math.round(Number(node.params.n)));
      const sig = inputs.sig ?? [];
      const v = sig.length ? sig[0] : st.buf[st.buf.length - 1] ?? 0;
      if (sig.length) ringPush(st.buf, v, cap);
      return { value: [v] };
    },
  },

  // ---- Transform: map a signal through y = a·f(x) + b ----
  transform: {
    type: "transform",
    label: "Transform",
    blurb:
      "Maps a signal: y = a·f(x) + b. A unit conversion, a dose–response curve, or the way to build a genuine X→Y relationship for regression.",
    inputs: ["x"],
    outputs: ["y"],
    defaultParams: { fn: "linear", a: 1, b: 0 },
    init: () => ({ lastX: 0, lastY: 0 }),
    tick: (node, inputs) => {
      const st = node.state as { lastX: number; lastY: number };
      const a = Number(node.params.a);
      const b = Number(node.params.b);
      const x = inputs.x?.[0] ?? st.lastX;
      const y = a * shape(node.params.fn as string, x) + b;
      st.lastX = x;
      st.lastY = y;
      return { y: [y] };
    },
  },

  // ---- Noise: add Gaussian measurement error ----
  noise: {
    type: "noise",
    label: "Noise",
    blurb:
      "Adds Gaussian measurement error: value = signal + N(0, σ). The everyday gap between a true quantity and what an instrument records.",
    inputs: ["sig"],
    outputs: ["value"],
    defaultParams: { sigma: 0.3 },
    init: () => ({ hist: [] as number[] }),
    tick: (node, inputs) => {
      const st = node.state as { hist: number[] };
      const sigma = Number(node.params.sigma);
      const out: number[] = [];
      for (const x of inputs.sig ?? []) {
        const v = x + sigma * standardNormal(node.rng);
        out.push(v);
        ringPush(st.hist, v, HIST_CAP);
      }
      return { value: out.length ? out : [0] };
    },
  },

  // ---- Gauge: a labelled real-world instrument readout ----
  gauge: {
    type: "gauge",
    label: "Gauge",
    blurb:
      "Reads the latest value as a real-world quantity — a labelled instrument readout (probability, percent, temperature, z-score).",
    inputs: ["sig"],
    outputs: [],
    defaultParams: { preset: "raw" },
    init: () => ({ v: 0 }),
    tick: (node, inputs) => {
      const st = node.state as { v: number };
      const sig = inputs.sig ?? [];
      if (sig.length) st.v = sig[0];
      return {};
    },
  },

  // ---- Sample: parametric data-generating process ----
  sample: {
    type: "sample",
    label: "Sample",
    blurb: "Draws an i.i.d. stream from a parametric distribution.",
    inputs: [],
    outputs: ["value", "mean", "sd"],
    defaultParams: { dist: "normal", p1: 0, p2: 1 },
    init: () => ({ n: 0, mean: 0, m2: 0, hist: [] as number[] }),
    tick: (node) => {
      const st = node.state as { n: number; mean: number; m2: number; hist: number[] };
      const x = draw(
        node.rng,
        node.params.dist as DistName,
        Number(node.params.p1),
        Number(node.params.p2),
      );
      st.n += 1;
      const delta = x - st.mean;
      st.mean += delta / st.n;
      st.m2 += delta * (x - st.mean);
      const sd = st.n > 1 ? Math.sqrt(st.m2 / (st.n - 1)) : 0;
      ringPush(st.hist, x, HIST_CAP);
      return { value: [x], mean: [st.mean], sd: [sd] };
    },
  },

  // ---- Frame: sampling window (mean / sd / SE) ----
  frame: {
    type: "frame",
    label: "Frame",
    blurb: "Collects a sample window and reports mean, SD and standard error.",
    inputs: ["sig"],
    outputs: ["mean", "sd", "se"],
    defaultParams: { mode: "growing", n: 64 },
    init: () => ({ buf: [] as number[], frozen: false }),
    tick: (node, inputs) => {
      const st = node.state as { buf: number[]; frozen: boolean };
      const mode = node.params.mode as string;
      const cap = Number(node.params.n);
      const sig = inputs.sig ?? [];
      if (!st.frozen) {
        for (const v of sig) {
          if (mode === "running") ringPush(st.buf, v, cap);
          else if (mode === "growing") {
            if (st.buf.length < 200000) st.buf.push(v);
          } else {
            // snapshot
            if (st.buf.length < cap) st.buf.push(v);
            if (st.buf.length >= cap) st.frozen = true;
          }
        }
      }
      const b = st.buf;
      const n = b.length;
      if (n === 0) return { mean: [0], sd: [0], se: [0] };
      const mean = b.reduce((a, c) => a + c, 0) / n;
      const v = n > 1 ? b.reduce((a, c) => a + (c - mean) ** 2, 0) / (n - 1) : 0;
      const sd = Math.sqrt(v);
      return { mean: [mean], sd: [sd], se: [sd / Math.sqrt(n)] };
    },
  },

  // ---- Test: exact-p t-test ----
  test: {
    type: "test",
    label: "Test",
    blurb: "One- or two-sample t-test with an exact (not normal-approx) p-value.",
    inputs: ["sig", "sig2"],
    outputs: ["t", "p", "reject", "d"],
    defaultParams: { mode: "one", n: 30, mu0: 0, alpha: 0.05 },
    init: () => ({ b1: [] as number[], b2: [] as number[], res: null as unknown }),
    tick: (node, inputs) => {
      const st = node.state as {
        b1: number[];
        b2: number[];
        res: ReturnType<typeof oneSampleT> | null;
      };
      const cap = Number(node.params.n);
      for (const v of inputs.sig ?? []) ringPush(st.b1, v, cap);
      for (const v of inputs.sig2 ?? []) ringPush(st.b2, v, cap);
      const two = node.params.mode === "two";
      const ready = two ? st.b1.length >= 2 && st.b2.length >= 2 : st.b1.length >= 2;
      if (ready) {
        st.res = two
          ? welchT(st.b1, st.b2, 0)
          : oneSampleT(st.b1, Number(node.params.mu0));
      }
      const r = st.res;
      if (!r) return { t: [0], p: [1], reject: [0], d: [0] };
      const reject = r.p < Number(node.params.alpha) ? 1 : 0;
      return { t: [r.t], p: [r.p], reject: [reject], d: [r.cohenD] };
    },
  },

  // ---- Boot: BCa bootstrap ----
  boot: {
    type: "boot",
    label: "Boot",
    blurb: "Non-parametric BCa bootstrap; the bootstrap distribution made visible.",
    inputs: ["sig"],
    outputs: ["est", "lo", "hi", "se"],
    defaultParams: { B: 800, n: 64, stat: "mean", refresh: 20 },
    init: () => ({ buf: [] as number[], res: null as unknown, k: 0 }),
    tick: (node, inputs) => {
      const st = node.state as {
        buf: number[];
        res: ReturnType<typeof bcaBootstrap> | null;
        k: number;
      };
      const cap = Number(node.params.n);
      for (const v of inputs.sig ?? []) ringPush(st.buf, v, cap);
      st.k += 1;
      const refresh = Math.max(1, Number(node.params.refresh));
      if (st.buf.length >= 4 && st.k % refresh === 0) {
        st.res = bcaBootstrap(st.buf, node.rng, {
          B: Number(node.params.B),
          stat: node.params.stat as StatName,
        });
      }
      const r = st.res;
      if (!r) return { est: [0], lo: [0], hi: [0], se: [0] };
      return { est: [r.estimate], lo: [r.lo], hi: [r.hi], se: [r.se] };
    },
  },

  // ---- Regress: online OLS ----
  regress: {
    type: "regress",
    label: "Regress",
    blurb: "Online OLS with a confidence band; emits slope, intercept, R².",
    inputs: ["x", "y"],
    outputs: ["slope", "intercept", "r2", "resid"],
    defaultParams: { n: 80 },
    init: () => ({ bx: [] as number[], by: [] as number[], fit: null as unknown }),
    tick: (node, inputs) => {
      const st = node.state as {
        bx: number[];
        by: number[];
        fit: ReturnType<typeof ols> | null;
      };
      const cap = Number(node.params.n);
      const x = num(inputs.x, 0, NaN);
      const y = num(inputs.y, 0, NaN);
      if (!Number.isNaN(x) && !Number.isNaN(y)) {
        ringPush(st.bx, x, cap);
        ringPush(st.by, y, cap);
      }
      if (st.bx.length >= 3) st.fit = ols(st.bx, st.by);
      const f = st.fit;
      if (!f) return { slope: [0], intercept: [0], r2: [0], resid: [0] };
      const resid = y - (f.intercept + f.slope * x);
      return { slope: [f.slope], intercept: [f.intercept], r2: [f.r2], resid: [resid] };
    },
  },
};
