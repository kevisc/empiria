import type { NodeRuntime } from "./engine/graph.ts";

export interface NodeInfo {
  concept: string;
  look: string;
  /** A live formula line with current values plugged in. */
  formula?: (n: NodeRuntime) => string;
}

const f = (v: number | undefined, d = 3) =>
  v === undefined || !Number.isFinite(v) ? "–" : v.toFixed(d);

const o = (n: NodeRuntime, port: string) => n.outputs[port]?.[0];

export const NODE_INFO: Record<string, NodeInfo> = {
  seed: {
    concept: "The master seed. Every random node derives its stream from it.",
    look: "Change it for a different — but equally reproducible — run.",
  },
  sample: {
    concept:
      "Draws i.i.d. values from a parametric distribution: the data-generating process.",
    look: "The bars (empirical) converge onto the gold curve (theoretical) as n grows.",
    formula: (n) => `running  x̄ = ${f(o(n, "mean"))}   sd = ${f(o(n, "sd"))}`,
  },
  data: {
    concept: "Streams a fixed dataset you import — real data, no randomness.",
    look: "Loops through your numbers one per tick; export keeps them reproducible.",
  },
  mix: {
    concept: "Combines two streams: random mixture, sum, or mean.",
    look: "A mixture of two Normals is bimodal — the mean lands between the humps.",
  },
  transform: {
    concept: "Maps a signal through y = a·f(x) + b.",
    look: "The gold curve is the function; the dot is the current input.",
    formula: (n) =>
      `y = ${f(Number(n.params.a), 2)}·f(x) + ${f(Number(n.params.b), 2)}  →  ${f(o(n, "y"))}`,
  },
  noise: {
    concept: "Adds Gaussian measurement error: value = signal + N(0, σ).",
    look: "A larger σ widens the spread around the true value.",
  },
  code: {
    concept: "Bins a continuous value into K ordinal (Likert) categories.",
    look: "Shifting the input mean piles responses toward higher categories.",
  },
  frame: {
    concept: "Collects a sample window and reports mean, SD and standard error.",
    look: "In Growing mode the SE shrinks like 1/√n — the Law of Large Numbers.",
    formula: (n) => {
      const st = n.state as { buf: number[] };
      const sd = o(n, "sd");
      const se = o(n, "se");
      return `SE = sd/√n = ${f(sd)}/√${st.buf?.length ?? 0} = ${f(se, 4)}`;
    },
  },
  test: {
    concept: "One- or two-sample t-test with an exact (not normal-approx) p-value.",
    look: "Solid curve = exact t (fat tails at low df); dashed = the normal approximation.",
    formula: (n) => {
      const st = n.state as { res: { t: number; df: number } | null };
      if (!st.res) return "collecting sample…";
      return `t = ${f(st.res.t, 2)}   df = ${f(st.res.df, 1)}   p = ${f(o(n, "p"), 4)}`;
    },
  },
  tab: {
    concept: "Cross-tabulates two categorical streams; χ², exact p, Cramér's V.",
    look: "Independent inputs → V ≈ 0 and χ² fails to reject.",
    formula: (n) => `χ² = ${f(o(n, "chi2"), 1)}   p = ${f(o(n, "p"), 3)}   V = ${f(o(n, "v"), 2)}`,
  },
  boot: {
    concept: "Bootstraps the sampling distribution; reports a BCa interval.",
    look: "The histogram IS the sampling distribution — built, not assumed.",
    formula: (n) =>
      `θ̂ = ${f(o(n, "est"))}   95% BCa = [${f(o(n, "lo"))}, ${f(o(n, "hi"))}]`,
  },
  regress: {
    concept: "Fits the OLS line Y = a + b·X by least squares.",
    look: "Independent X,Y → slope ≈ 0; a real relationship → a non-zero slope.",
    formula: (n) =>
      `ŷ = ${f(o(n, "intercept"), 2)} + ${f(o(n, "slope"), 3)}·x   R² = ${f(o(n, "r2"))}`,
  },
  lag: {
    concept: "Autocorrelation ρ(k) with ±1.96/√n Bartlett bands.",
    look: "Bars within the dashed bands ≈ white noise; spikes outside ⇒ structure.",
    formula: (n) => `ρ(1) = ${f(o(n, "rho1"), 2)}`,
  },
  means: {
    concept:
      "Emits the mean of each batch of n draws — the sampling distribution of the mean, built directly.",
    look: "Even from a skewed parent, these batch means look Normal (the CLT) and bunch tighter as n grows.",
  },
  power: {
    concept:
      "Repeats a two-sample test on fresh data and tracks the rejection rate.",
    look: "Equal means → rate ≈ α (Type-I error / false positives); a real difference → rate = power.",
    formula: (n) =>
      `rejected ${(((o(n, "rejrate") ?? 0) * 100)).toFixed(0)}% of ${f(o(n, "experiments"), 0)} experiments`,
  },
  qq: {
    concept:
      "Plots sorted sample values against theoretical Normal quantiles.",
    look: "Points on the line ⇒ roughly Normal; an S-curve ⇒ skew or heavy tails.",
  },
  summary: {
    concept:
      "The numbers behind the picture: centre (mean/median), spread (SD/IQR), the five-number summary, and shape (skew/kurtosis).",
    look: "Mean ≠ median ⇒ skew; |skew|>1 is strongly skewed; positive kurtosis ⇒ heavy tails.",
    formula: (n) =>
      `mean ${f(o(n, "mean"))}  median ${f(o(n, "median"))}  SD ${f(o(n, "sd"))}  IQR ${f(o(n, "iqr"))}`,
  },
  box: {
    concept: "A box-and-whisker: the middle 50% (Q1–Q3), the median, and outliers.",
    look: "A long whisker or many outliers on one side signals skew; the box width is the IQR.",
  },
  ecdf: {
    concept: "The empirical CDF: for each x, the fraction of the data that is ≤ x.",
    look: "If the solid steps track the dashed Normal curve, the data are roughly Normal.",
  },
  coverage: {
    concept:
      "Repeats the experiment many times: each batch of n draws yields a CI for the mean, which either covers the true μ or misses.",
    look: "About α of the intervals (red) miss — that's exactly what '95% confidence' means.",
    formula: (n) =>
      `coverage = ${f(o(n, "covered"), 0)}/${f(o(n, "total"), 0)} = ${f((o(n, "coverage") ?? 0) * 100, 1)}%`,
  },
  scope: {
    concept: "Plots a signal over time — a chart recorder.",
    look: "Watch the trajectory: trend, drift, oscillation, convergence.",
  },
  gauge: {
    concept: "Reads the latest value as a labelled real-world quantity.",
    look: "Pick the units that match what the signal represents.",
  },
};
