import type { Patch } from "./patch.ts";

/**
 * Ready-made session patches. Each ships a Note node explaining the activity,
 * the learning goal, and what to try — so a lesson loads as a self-contained,
 * explorable worksheet.
 */
export interface LessonStep {
  instruction: string;
  patch: Patch;
}

export interface Lesson {
  id: string;
  title: string;
  patch: Patch;
  /** Optional guided sequence; when present a Prev/Next lesson bar appears. */
  steps?: LessonStep[];
}

const examScores =
  "72, 68, 75, 80, 66, 90, 55, 77, 83, 61, 70, 88, 64, 79, 73, 58, 85, 69, 76, 81, 62, 74, 67, 91, 59, 78";

const baseLessons: Lesson[] = [
  {
    id: "lln",
    title: "1 · Law of Large Numbers",
    patch: {
      version: 1,
      seed: 42,
      nodes: [
        {
          id: "note-0",
          kind: "note",
          position: { x: 20, y: 20 },
          params: {
            text:
              "LAW OF LARGE NUMBERS\n\nPress ▶ Run. Sample draws from a Normal(μ=0.5). Frame is in GROWING mode, so it keeps every draw.\n\nWatch:\n• the mean settle onto 0.5\n• the standard error (SE) shrink like 1/√n\n\nTry:\n• change the Seed → a different random run, same convergence\n• lower Sample's σ → SE shrinks faster",
          },
        },
        { id: "seed-1", kind: "seed", position: { x: 360, y: 20 }, params: { value: 42 } },
        {
          id: "sample-2",
          kind: "sample",
          position: { x: 360, y: 320 },
          params: { dist: "normal", p1: 0.5, p2: 1 },
        },
        {
          id: "frame-3",
          kind: "frame",
          position: { x: 720, y: 180 },
          params: { mode: "growing", n: 64 },
        },
      ],
      edges: [{ from: "sample-2", fromPort: "value", to: "frame-3", toPort: "sig" }],
    },
  },
  {
    id: "bootstrap",
    title: "2 · Bootstrap sampling distribution",
    patch: {
      version: 1,
      seed: 7,
      nodes: [
        {
          id: "note-0",
          kind: "note",
          position: { x: 20, y: 20 },
          params: {
            text:
              "THE BOOTSTRAP\n\nBoot resamples the data WITH REPLACEMENT B times and plots the statistic each time. That histogram IS the sampling distribution — with no formula.\n\nGold line = estimate. Red lines = BCa 95% interval.\n\nTry:\n• switch Boot's statistic between mean / median / sd → same data, different sampling distribution\n• change the Seed and watch the interval move",
          },
        },
        { id: "seed-1", kind: "seed", position: { x: 360, y: 20 }, params: { value: 7 } },
        {
          id: "sample-2",
          kind: "sample",
          position: { x: 360, y: 320 },
          params: { dist: "exponential", p1: 0.5, p2: 0 },
        },
        {
          id: "boot-3",
          kind: "boot",
          position: { x: 720, y: 200 },
          params: { B: 800, n: 64, stat: "mean", refresh: 20 },
        },
      ],
      edges: [{ from: "sample-2", fromPort: "value", to: "boot-3", toPort: "sig" }],
    },
  },
  {
    id: "ttest",
    title: "3 · t-test with a small sample",
    patch: {
      version: 1,
      seed: 42,
      nodes: [
        {
          id: "note-0",
          kind: "note",
          position: { x: 20, y: 20 },
          params: {
            text:
              "HYPOTHESIS TESTING (small n)\n\nTest runs a one-sample t-test of H₀: μ=0 on just n=8 draws. The curve is the EXACT Student-t null (fatter tails than the normal at low df); the shaded tails are the p-value.\n\nTry:\n• nudge Sample's μ toward 0 → REJECT flips to n.s.\n• change the Seed → with n=8 the decision can flip run to run\n• Export CSV and check t.test() in R",
          },
        },
        { id: "seed-1", kind: "seed", position: { x: 360, y: 20 }, params: { value: 42 } },
        {
          id: "sample-2",
          kind: "sample",
          position: { x: 360, y: 320 },
          params: { dist: "normal", p1: 0.4, p2: 1 },
        },
        {
          id: "test-3",
          kind: "test",
          position: { x: 720, y: 180 },
          params: { mode: "one", n: 8, mu0: 0, alpha: 0.05 },
        },
      ],
      edges: [{ from: "sample-2", fromPort: "value", to: "test-3", toPort: "sig" }],
    },
  },
  {
    id: "regression",
    title: "4 · Regression — what no relationship looks like",
    patch: {
      version: 1,
      seed: 11,
      nodes: [
        {
          id: "note-0",
          kind: "note",
          position: { x: 20, y: 20 },
          params: {
            text:
              "REGRESSION & THE NULL\n\nX and Y here are INDEPENDENT, so the true slope is 0. Watch β̂ wobble around zero and R² stay tiny; the fitted line stays roughly flat.\n\nThis is what NO relationship looks like — see it before you trust a slope in real data.\n\nTry: feed two Data nodes (real paired data) into X and Y to see a genuine fit.",
          },
        },
        { id: "seed-1", kind: "seed", position: { x: 360, y: 20 }, params: { value: 11 } },
        {
          id: "sample-2",
          kind: "sample",
          position: { x: 360, y: 300 },
          params: { dist: "uniform", p1: 0, p2: 1 },
        },
        {
          id: "sample-3",
          kind: "sample",
          position: { x: 360, y: 560 },
          params: { dist: "normal", p1: 0, p2: 1 },
        },
        { id: "regress-4", kind: "regress", position: { x: 720, y: 360 }, params: { n: 80 } },
      ],
      edges: [
        { from: "sample-2", fromPort: "value", to: "regress-4", toPort: "x" },
        { from: "sample-3", fromPort: "value", to: "regress-4", toPort: "y" },
      ],
    },
  },
  {
    id: "survey",
    title: "5 · Survey responses (Likert coding)",
    patch: {
      version: 1,
      seed: 3,
      nodes: [
        {
          id: "note-0",
          kind: "note",
          position: { x: 20, y: 20 },
          params: {
            text:
              "SURVEY RESPONSES\n\nA continuous 'attitude' from Sample is collapsed by Code into a K=5 Likert scale. Code's bars show the response distribution; Frame measures the mean response.\n\nTry:\n• shift Sample's μ → responses pile toward higher categories\n• raise Code's K for a finer scale\n• note how coarse coding loses the absolute scale",
          },
        },
        { id: "seed-1", kind: "seed", position: { x: 360, y: 20 }, params: { value: 3 } },
        {
          id: "sample-2",
          kind: "sample",
          position: { x: 360, y: 300 },
          params: { dist: "normal", p1: 0.3, p2: 1 },
        },
        {
          id: "code-3",
          kind: "code",
          position: { x: 700, y: 120 },
          params: { k: 5, low: -1, high: 1 },
        },
        {
          id: "frame-4",
          kind: "frame",
          position: { x: 1020, y: 320 },
          params: { mode: "running", n: 200 },
        },
      ],
      edges: [
        { from: "sample-2", fromPort: "value", to: "code-3", toPort: "sig" },
        { from: "code-3", fromPort: "cat", to: "frame-4", toPort: "sig" },
      ],
    },
  },
  {
    id: "realdata",
    title: "6 · Bring your own data (CSV)",
    patch: {
      version: 1,
      seed: 1,
      nodes: [
        {
          id: "note-0",
          kind: "note",
          position: { x: 20, y: 20 },
          params: {
            text:
              "REAL DATA IN, RESULT OUT\n\nThe Data node streams a fixed dataset (n=26 exam scores) — no randomness. Frame summarises it; Test asks H₀: μ=65.\n\nTry:\n• replace the numbers in Data with your own (paste or load a .csv)\n• change Test's H₀ value and watch the decision\n• Export CSV from Frame and reproduce the t-test in R",
          },
        },
        {
          id: "data-1",
          kind: "data",
          position: { x: 360, y: 40 },
          params: { csv: examScores },
        },
        {
          id: "frame-2",
          kind: "frame",
          position: { x: 720, y: 20 },
          params: { mode: "running", n: 26 },
        },
        {
          id: "test-3",
          kind: "test",
          position: { x: 720, y: 320 },
          params: { mode: "one", n: 26, mu0: 65, alpha: 0.05 },
        },
      ],
      edges: [
        { from: "data-1", fromPort: "value", to: "frame-2", toPort: "sig" },
        { from: "data-1", fromPort: "value", to: "test-3", toPort: "sig" },
      ],
    },
  },
  {
    id: "mixture",
    title: "7 · Mixture of two distributions",
    patch: {
      version: 1,
      seed: 5,
      nodes: [
        {
          id: "note-0",
          kind: "note",
          position: { x: 20, y: 20 },
          params: {
            text:
              "MIXTURE DISTRIBUTIONS\n\nTwo Normal Samples (means −2 and +2) feed a Mix node in RANDOM MIXTURE mode. Mix flips a coin each tick to pick one — the result is a bimodal population, shown in Frame.\n\nNotice: the overall MEAN sits near 0, where almost no data actually is. A single summary number can describe a shape that doesn't exist.\n\nTry:\n• set Mix's P(pick A) to 0.8 → an asymmetric mixture\n• switch Mix to Sum or Mean\n• pull the two Sample means together until the humps merge",
          },
        },
        { id: "seed-1", kind: "seed", position: { x: 360, y: 20 }, params: { value: 5 } },
        {
          id: "sample-2",
          kind: "sample",
          position: { x: 360, y: 300 },
          params: { dist: "normal", p1: -2, p2: 0.7 },
        },
        {
          id: "sample-3",
          kind: "sample",
          position: { x: 360, y: 560 },
          params: { dist: "normal", p1: 2, p2: 0.7 },
        },
        {
          id: "mix-4",
          kind: "mix",
          position: { x: 720, y: 360 },
          params: { mode: "mixture", w: 0.5 },
        },
        {
          id: "frame-5",
          kind: "frame",
          position: { x: 1060, y: 360 },
          params: { mode: "running", n: 400 },
        },
      ],
      edges: [
        { from: "sample-2", fromPort: "value", to: "mix-4", toPort: "a" },
        { from: "sample-3", fromPort: "value", to: "mix-4", toPort: "b" },
        { from: "mix-4", fromPort: "value", to: "frame-5", toPort: "sig" },
      ],
    },
  },
  {
    id: "twogroups",
    title: "8 · Comparing two groups (Welch t)",
    patch: {
      version: 1,
      seed: 19,
      nodes: [
        {
          id: "note-0",
          kind: "note",
          position: { x: 20, y: 20 },
          params: {
            text:
              "TWO-SAMPLE COMPARISON\n\nGroup 1 ~ Normal(0, 1); Group 2 ~ Normal(0.6, 1.4) — different means AND different spreads. Both feed Test in TWO-SAMPLE mode, which uses Welch's t (it does NOT assume equal variances).\n\nTry:\n• drag Group 2's μ back to 0 → the difference vanishes (n.s.)\n• widen Group 2's σ → the standard error grows, harder to detect\n• raise Test's n → more power",
          },
        },
        { id: "seed-1", kind: "seed", position: { x: 360, y: 20 }, params: { value: 19 } },
        {
          id: "sample-2",
          kind: "sample",
          position: { x: 360, y: 300 },
          params: { dist: "normal", p1: 0, p2: 1 },
        },
        {
          id: "sample-3",
          kind: "sample",
          position: { x: 360, y: 560 },
          params: { dist: "normal", p1: 0.6, p2: 1.4 },
        },
        {
          id: "test-4",
          kind: "test",
          position: { x: 760, y: 360 },
          params: { mode: "two", n: 40, mu0: 0, alpha: 0.05 },
        },
      ],
      edges: [
        { from: "sample-2", fromPort: "value", to: "test-4", toPort: "sig" },
        { from: "sample-3", fromPort: "value", to: "test-4", toPort: "sig2" },
      ],
    },
  },
  {
    id: "clt",
    title: "9 · CLT from a skewed parent",
    patch: {
      version: 1,
      seed: 23,
      nodes: [
        {
          id: "note-0",
          kind: "note",
          position: { x: 20, y: 20 },
          params: {
            text:
              "THE CENTRAL LIMIT THEOREM\n\nSample is EXPONENTIAL — strongly right-skewed (look at the histogram). Yet Boot's bootstrap distribution of the MEAN is nearly symmetric and bell-shaped. That is the CLT: the sampling distribution of the mean tends to normal even when the parent is not.\n\nTry:\n• raise Boot's sample n → the bell gets tighter and more symmetric\n• switch Boot's statistic to 'median' or 'sd' → not as clean\n• compare the skewed Sample histogram with the symmetric Boot histogram side by side",
          },
        },
        { id: "seed-1", kind: "seed", position: { x: 360, y: 20 }, params: { value: 23 } },
        {
          id: "sample-2",
          kind: "sample",
          position: { x: 360, y: 320 },
          params: { dist: "exponential", p1: 1, p2: 0 },
        },
        {
          id: "boot-3",
          kind: "boot",
          position: { x: 720, y: 200 },
          params: { B: 800, n: 80, stat: "mean", refresh: 20 },
        },
      ],
      edges: [{ from: "sample-2", fromPort: "value", to: "boot-3", toPort: "sig" }],
    },
  },
  {
    id: "realfit",
    title: "10 · Build a real relationship (Transform + Noise)",
    patch: {
      version: 1,
      seed: 31,
      nodes: [
        {
          id: "note-0",
          kind: "note",
          position: { x: 20, y: 20 },
          params: {
            text:
              "BUILDING A DATA-GENERATING PROCESS\n\nThis patch wires a real relationship by hand:\n  X ~ Uniform(0,3)\n  Transform: y = 2·X + 1\n  Noise: Y = y + N(0, 1)\nRegress then fits Y on X — and recovers β ≈ 2, intercept ≈ 1.\n\nThis is the model behind every regression, made explicit. Compare with Lesson 4, where X and Y were independent (β ≈ 0).\n\nTry:\n• change Transform's scale a → β̂ tracks it\n• raise Noise σ → R² falls, the cloud fattens\n• switch Transform to 'square' → a curved relationship a line can't capture",
          },
        },
        { id: "seed-1", kind: "seed", position: { x: 320, y: 20 }, params: { value: 31 } },
        {
          id: "sample-2",
          kind: "sample",
          position: { x: 320, y: 300 },
          params: { dist: "uniform", p1: 0, p2: 3 },
        },
        {
          id: "transform-3",
          kind: "transform",
          position: { x: 640, y: 40 },
          params: { fn: "linear", a: 2, b: 1 },
        },
        {
          id: "noise-4",
          kind: "noise",
          position: { x: 940, y: 60 },
          params: { sigma: 1 },
        },
        { id: "regress-5", kind: "regress", position: { x: 940, y: 360 }, params: { n: 120 } },
      ],
      edges: [
        { from: "sample-2", fromPort: "value", to: "transform-3", toPort: "x" },
        { from: "transform-3", fromPort: "y", to: "noise-4", toPort: "sig" },
        { from: "sample-2", fromPort: "value", to: "regress-5", toPort: "x" },
        { from: "noise-4", fromPort: "value", to: "regress-5", toPort: "y" },
      ],
    },
  },
  {
    id: "coverage",
    title: "11 · What '95% confidence' means",
    patch: {
      version: 1,
      seed: 8,
      nodes: [
        {
          id: "note-0",
          kind: "note",
          position: { x: 20, y: 20 },
          params: {
            text:
              "CONFIDENCE-INTERVAL COVERAGE\n\nThe population mean is μ = 0 (gold line). Coverage repeatedly takes a fresh sample of n=30, builds a 95% CI, and stacks it: green if it covers μ, red if it misses.\n\nLet it run — the coverage % settles near 95, and roughly 1 in 20 intervals is red. THAT is what '95% confidence' means: not 'this interval has 95% probability', but '95% of such intervals cover the truth'.\n\nTry:\n• turn speed up to accumulate experiments fast\n• set α to 0.10 (90%) → more red misses\n• shrink n → wider intervals, same coverage",
          },
        },
        { id: "seed-1", kind: "seed", position: { x: 360, y: 20 }, params: { value: 8 } },
        {
          id: "sample-2",
          kind: "sample",
          position: { x: 360, y: 320 },
          params: { dist: "normal", p1: 0, p2: 1 },
        },
        {
          id: "coverage-3",
          kind: "coverage",
          position: { x: 720, y: 160 },
          params: { n: 30, mu0: 0, alpha: 0.05 },
        },
      ],
      edges: [{ from: "sample-2", fromPort: "value", to: "coverage-3", toPort: "sig" }],
    },
  },
  {
    id: "clt-direct",
    title: "12 · The CLT, directly (batch means)",
    patch: {
      version: 1,
      seed: 14,
      nodes: [
        {
          id: "note-0",
          kind: "note",
          position: { x: 20, y: 20 },
          params: {
            text:
              "CENTRAL LIMIT THEOREM — directly\n\nSample is EXPONENTIAL — strongly right-skewed. Means takes each batch of n=25 draws and emits its average; Frame collects those batch means.\n\nWatch: the parent is skewed, but the distribution of batch means is symmetric and bell-shaped, centred on the parent mean. That is the CLT — no bootstrap, no formula.\n\nTry:\n• raise Means' batch n → the bell narrows (SE = σ/√n)\n• add a QQ plot after Means → points fall on the line (Normal)",
          },
        },
        { id: "seed-1", kind: "seed", position: { x: 360, y: 20 }, params: { value: 14 } },
        {
          id: "sample-2",
          kind: "sample",
          position: { x: 360, y: 320 },
          params: { dist: "exponential", p1: 1, p2: 0 },
        },
        { id: "means-3", kind: "means", position: { x: 700, y: 60 }, params: { n: 25 } },
        {
          id: "frame-4",
          kind: "frame",
          position: { x: 1040, y: 320 },
          params: { mode: "running", n: 300 },
        },
      ],
      edges: [
        { from: "sample-2", fromPort: "value", to: "means-3", toPort: "sig" },
        { from: "means-3", fromPort: "mean", to: "frame-4", toPort: "sig" },
      ],
    },
  },
  {
    id: "power",
    title: "13 · Statistical power & sample size",
    patch: {
      version: 1,
      seed: 21,
      nodes: [
        {
          id: "note-0",
          kind: "note",
          position: { x: 20, y: 20 },
          params: {
            text:
              "STATISTICAL POWER\n\nTwo groups differ by half a standard deviation (μ = 0 vs 0.5). Power repeatedly runs a two-sample t-test on fresh batches of n=20 and reports the rejection rate — here, the power to detect that difference.\n\nTry:\n• raise Power's n / group → power climbs toward 1\n• drag Group 2's μ toward 0 → power falls to ≈ α (see next lesson)\n• the gold mark on the bar is α (the chance level)",
          },
        },
        { id: "seed-1", kind: "seed", position: { x: 360, y: 20 }, params: { value: 21 } },
        {
          id: "sample-2",
          kind: "sample",
          position: { x: 360, y: 300 },
          params: { dist: "normal", p1: 0, p2: 1 },
        },
        {
          id: "sample-3",
          kind: "sample",
          position: { x: 360, y: 560 },
          params: { dist: "normal", p1: 0.5, p2: 1 },
        },
        { id: "power-4", kind: "power", position: { x: 760, y: 360 }, params: { n: 20, alpha: 0.05 } },
      ],
      edges: [
        { from: "sample-2", fromPort: "value", to: "power-4", toPort: "a" },
        { from: "sample-3", fromPort: "value", to: "power-4", toPort: "b" },
      ],
    },
  },
  {
    id: "falsepos",
    title: "14 · False positives when nothing is going on",
    patch: {
      version: 1,
      seed: 99,
      nodes: [
        {
          id: "note-0",
          kind: "note",
          position: { x: 20, y: 20 },
          params: {
            text:
              "TYPE-I ERROR (the null is true)\n\nBoth groups are drawn from the SAME population (μ = 0). There is no real difference — yet Power's rejection rate settles near 5%.\n\nThat is the false-positive rate: run 20 honest tests on noise and about 1 comes back 'significant'. This is why running many tests (or p-hacking) manufactures findings, and why replication matters.\n\nTry:\n• set α to 0.10 → false positives rise to ≈ 10%\n• give Group 2 a real μ → it becomes genuine power (Lesson 13)",
          },
        },
        { id: "seed-1", kind: "seed", position: { x: 360, y: 20 }, params: { value: 99 } },
        {
          id: "sample-2",
          kind: "sample",
          position: { x: 360, y: 300 },
          params: { dist: "normal", p1: 0, p2: 1 },
        },
        {
          id: "sample-3",
          kind: "sample",
          position: { x: 360, y: 560 },
          params: { dist: "normal", p1: 0, p2: 1 },
        },
        { id: "power-4", kind: "power", position: { x: 760, y: 360 }, params: { n: 20, alpha: 0.05 } },
      ],
      edges: [
        { from: "sample-2", fromPort: "value", to: "power-4", toPort: "a" },
        { from: "sample-3", fromPort: "value", to: "power-4", toPort: "b" },
      ],
    },
  },
  {
    id: "qq",
    title: "15 · Is it Normal? (QQ plot)",
    patch: {
      version: 1,
      seed: 6,
      nodes: [
        {
          id: "note-0",
          kind: "note",
          position: { x: 20, y: 20 },
          params: {
            text:
              "CHECKING NORMALITY\n\nThe QQ plot ranks the sample and plots it against the quantiles a Normal distribution would predict. Straight line ⇒ roughly Normal.\n\nThis Sample is Normal, so the points hug the gold line.\n\nTry:\n• switch Sample to Exponential → the points bend into an S-curve (right skew)\n• switch to Uniform → short tails bend the other way\n• raise the window n for a cleaner picture",
          },
        },
        { id: "seed-1", kind: "seed", position: { x: 360, y: 20 }, params: { value: 6 } },
        {
          id: "sample-2",
          kind: "sample",
          position: { x: 360, y: 300 },
          params: { dist: "normal", p1: 0, p2: 1 },
        },
        { id: "qq-3", kind: "qq", position: { x: 720, y: 120 }, params: { n: 200 } },
      ],
      edges: [{ from: "sample-2", fromPort: "value", to: "qq-3", toPort: "sig" }],
    },
  },
  {
    id: "eda",
    title: "16 · Explore a dataset (EDA)",
    patch: {
      version: 1,
      seed: 1,
      nodes: [
        {
          id: "note-0",
          kind: "note",
          position: { x: 16, y: 16 },
          params: {
            text:
              "EXPLORATORY DATA ANALYSIS\n\nOne Data node (n=26 exam scores) fans out to four views of the SAME data:\n• Summary — the numbers (centre, spread, quartiles, skew)\n• Box plot — the five-number summary and any outliers\n• ECDF — the cumulative shape vs a Normal\n• QQ — a direct Normality check\n\nTry:\n• replace the numbers in Data with your own (paste or load a .csv)\n• read mean vs median in Summary, then see the same skew in the Box and QQ\n• use 🖼 Figure (top bar) to export the whole dashboard as one image",
          },
        },
        {
          id: "data-1",
          kind: "data",
          position: { x: 360, y: 40 },
          params: { csv: examScores },
        },
        {
          id: "summary-2",
          kind: "summary",
          position: { x: 720, y: 20 },
          params: { n: 26 },
        },
        { id: "box-3", kind: "box", position: { x: 720, y: 330 }, params: { n: 26 } },
        { id: "ecdf-4", kind: "ecdf", position: { x: 1080, y: 20 }, params: { n: 26 } },
        { id: "qq-5", kind: "qq", position: { x: 1080, y: 330 }, params: { n: 26 } },
      ],
      edges: [
        { from: "data-1", fromPort: "value", to: "summary-2", toPort: "sig" },
        { from: "data-1", fromPort: "value", to: "box-3", toPort: "sig" },
        { from: "data-1", fromPort: "value", to: "ecdf-4", toPort: "sig" },
        { from: "data-1", fromPort: "value", to: "qq-5", toPort: "sig" },
      ],
    },
  },
];

const byId = (id: string): Patch => structuredClone(baseLessons.find((l) => l.id === id)!.patch);

/** A guided tour that walks through four core ideas with Prev/Next. */
const guidedTour: Lesson = {
  id: "tour",
  title: "★ Guided tour (4 steps)",
  patch: byId("lln"),
  steps: [
    {
      instruction:
        "Step 1 — Law of Large Numbers. Press ▶ Run. As Frame keeps collecting, its mean settles on 0.4 and the standard error shrinks like 1/√n. More data ⇒ less wobble.",
      patch: byId("lln"),
    },
    {
      instruction:
        "Step 2 — The bootstrap. Boot resamples the data with replacement; the histogram it draws IS the sampling distribution of the statistic, built without any formula.",
      patch: byId("bootstrap"),
    },
    {
      instruction:
        "Step 3 — A hypothesis test. With only n=8, Test shows the exact Student-t null (solid) vs the normal approximation (dashed). Watch REJECT/n.s. flip as the sample changes.",
      patch: byId("ttest"),
    },
    {
      instruction:
        "Step 4 — What confidence means. Coverage repeats the experiment; ~95% of the intervals (green) cover the true mean, ~5% (red) miss. That is what '95% confidence' means.",
      patch: byId("coverage"),
    },
  ],
};

export const LESSONS: Lesson[] = [guidedTour, ...baseLessons];
