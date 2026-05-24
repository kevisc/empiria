export interface Control {
  key: string;
  label: string;
  kind: "number" | "select";
  step?: number;
  options?: { value: string; label: string }[];
}

/** Editable parameters surfaced on each node's panel. */
export const CONTROLS: Record<string, Control[]> = {
  seed: [{ key: "value", label: "seed", kind: "number", step: 1 }],
  sample: [
    {
      key: "dist",
      label: "dist",
      kind: "select",
      options: [
        { value: "normal", label: "Normal" },
        { value: "uniform", label: "Uniform" },
        { value: "exponential", label: "Exponential" },
      ],
    },
    { key: "p1", label: "μ / a / λ", kind: "number", step: 0.1 },
    { key: "p2", label: "σ / b", kind: "number", step: 0.1 },
  ],
  frame: [
    {
      key: "mode",
      label: "mode",
      kind: "select",
      options: [
        { value: "growing", label: "Growing" },
        { value: "running", label: "Running" },
        { value: "snapshot", label: "Snapshot" },
      ],
    },
    { key: "n", label: "window n", kind: "number", step: 1 },
  ],
  test: [
    {
      key: "mode",
      label: "mode",
      kind: "select",
      options: [
        { value: "one", label: "One-sample" },
        { value: "two", label: "Two-sample (Welch)" },
      ],
    },
    { key: "n", label: "n", kind: "number", step: 1 },
    { key: "mu0", label: "H₀: μ =", kind: "number", step: 0.1 },
    {
      key: "alpha",
      label: "α",
      kind: "select",
      options: [
        { value: "0.01", label: "0.01" },
        { value: "0.05", label: "0.05" },
        { value: "0.1", label: "0.10" },
      ],
    },
  ],
  boot: [
    {
      key: "stat",
      label: "statistic",
      kind: "select",
      options: [
        { value: "mean", label: "mean" },
        { value: "median", label: "median" },
        { value: "sd", label: "sd" },
        { value: "var", label: "var" },
      ],
    },
    { key: "n", label: "sample n", kind: "number", step: 1 },
    { key: "B", label: "resamples B", kind: "number", step: 100 },
  ],
  regress: [{ key: "n", label: "window n", kind: "number", step: 1 }],
  code: [
    { key: "k", label: "K levels", kind: "number", step: 1 },
    { key: "low", label: "low", kind: "number", step: 0.1 },
    { key: "high", label: "high", kind: "number", step: 0.1 },
  ],
  tab: [
    { key: "rows", label: "rows", kind: "number", step: 1 },
    { key: "cols", label: "cols", kind: "number", step: 1 },
  ],
  lag: [
    { key: "maxlag", label: "max lag", kind: "number", step: 1 },
    { key: "n", label: "window n", kind: "number", step: 1 },
  ],
  coverage: [
    { key: "n", label: "n / experiment", kind: "number", step: 1 },
    { key: "mu0", label: "true μ", kind: "number", step: 0.1 },
    {
      key: "alpha",
      label: "α",
      kind: "select",
      options: [
        { value: "0.01", label: "0.01 (99%)" },
        { value: "0.05", label: "0.05 (95%)" },
        { value: "0.1", label: "0.10 (90%)" },
      ],
    },
  ],
  means: [{ key: "n", label: "batch n", kind: "number", step: 1 }],
  summary: [{ key: "n", label: "window n", kind: "number", step: 10 }],
  box: [{ key: "n", label: "window n", kind: "number", step: 10 }],
  ecdf: [{ key: "n", label: "window n", kind: "number", step: 10 }],
  power: [
    { key: "n", label: "n / group", kind: "number", step: 1 },
    {
      key: "alpha",
      label: "α",
      kind: "select",
      options: [
        { value: "0.01", label: "0.01" },
        { value: "0.05", label: "0.05" },
        { value: "0.1", label: "0.10" },
      ],
    },
  ],
  qq: [{ key: "n", label: "window n", kind: "number", step: 1 }],
  mix: [
    {
      key: "mode",
      label: "mode",
      kind: "select",
      options: [
        { value: "mixture", label: "Random mixture" },
        { value: "sum", label: "Sum (A + B)" },
        { value: "mean", label: "Mean (A + B)/2" },
      ],
    },
    { key: "w", label: "P(pick A)", kind: "number", step: 0.05 },
  ],
  scope: [{ key: "n", label: "window", kind: "number", step: 10 }],
  transform: [
    {
      key: "fn",
      label: "f(x)",
      kind: "select",
      options: [
        { value: "linear", label: "linear  x" },
        { value: "square", label: "square  x²" },
        { value: "sqrt", label: "root  √|x|" },
        { value: "log", label: "log |x|" },
        { value: "abs", label: "abs |x|" },
        { value: "sigmoid", label: "sigmoid" },
        { value: "sin", label: "sine" },
      ],
    },
    { key: "a", label: "scale a", kind: "number", step: 0.1 },
    { key: "b", label: "offset b", kind: "number", step: 0.1 },
  ],
  noise: [{ key: "sigma", label: "σ noise", kind: "number", step: 0.05 }],
  gauge: [
    {
      key: "preset",
      label: "units",
      kind: "select",
      options: [
        { value: "raw", label: "raw value" },
        { value: "probability", label: "probability (0–1)" },
        { value: "percent", label: "percent" },
        { value: "temperature", label: "temperature °C" },
        { value: "zscore", label: "z-score" },
      ],
    },
  ],
};

/** Right-click-style presets that relabel Sample as a real-world quantity. */
export interface SamplePreset {
  label: string;
  dist: string;
  p1: number;
  p2: number;
}

export const SAMPLE_PRESETS: SamplePreset[] = [
  { label: "Standard normal Z", dist: "normal", p1: 0, p2: 1 },
  { label: "Adult height (cm)", dist: "normal", p1: 171, p2: 7 },
  { label: "IQ score", dist: "normal", p1: 100, p2: 15 },
  { label: "Exam score (%)", dist: "normal", p1: 68, p2: 12 },
  { label: "Reaction time (s)", dist: "exponential", p1: 3, p2: 0 },
  { label: "Income (right-skew)", dist: "exponential", p1: 0.5, p2: 0 },
  { label: "Coin / uniform 0–1", dist: "uniform", p1: 0, p2: 1 },
];
