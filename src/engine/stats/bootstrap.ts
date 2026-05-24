import type { MT19937 } from "../rng.ts";
import { normalCdf, normalQuantile } from "./special.ts";

export type StatName = "mean" | "median" | "sd" | "var";

export function statistic(xs: number[], stat: StatName): number {
  const n = xs.length;
  const m = xs.reduce((a, b) => a + b, 0) / n;
  switch (stat) {
    case "mean":
      return m;
    case "median": {
      const s = [...xs].sort((a, b) => a - b);
      const mid = n >> 1;
      return n % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2;
    }
    case "var":
      return xs.reduce((a, b) => a + (b - m) ** 2, 0) / (n - 1);
    case "sd":
      return Math.sqrt(xs.reduce((a, b) => a + (b - m) ** 2, 0) / (n - 1));
  }
}

function quantileSorted(sorted: number[], p: number): number {
  if (p <= 0) return sorted[0];
  if (p >= 1) return sorted[sorted.length - 1];
  const h = (sorted.length - 1) * p;
  const lo = Math.floor(h);
  return sorted[lo] + (h - lo) * (sorted[lo + 1] - sorted[lo]);
}

export interface BootResult {
  estimate: number;
  lo: number;
  hi: number;
  se: number;
  z0: number;
  accel: number;
  /** The bootstrap replicates, for the on-node histogram. */
  replicates: number[];
}

/**
 * Bias-corrected and accelerated (BCa) bootstrap interval (Efron 1987).
 * z0 is the median-bias correction; the acceleration is estimated from the
 * leave-one-out jackknife. Both are surfaced so a learner can watch the BCa
 * endpoints shift away from the naive percentile interval under skew.
 */
export function bcaBootstrap(
  data: number[],
  rng: MT19937,
  opts: { B?: number; stat?: StatName; alpha?: number } = {},
): BootResult {
  const B = opts.B ?? 1000;
  const stat = opts.stat ?? "mean";
  const alpha = opts.alpha ?? 0.05;
  const n = data.length;
  const thetaHat = statistic(data, stat);

  // Bootstrap replicates.
  const reps = new Array<number>(B);
  const resample = new Array<number>(n);
  let below = 0;
  for (let b = 0; b < B; b++) {
    for (let i = 0; i < n; i++) resample[i] = data[(rng.random() * n) | 0];
    const t = statistic(resample, stat);
    reps[b] = t;
    if (t < thetaHat) below++;
  }
  const sorted = [...reps].sort((a, b) => a - b);
  const repMean = reps.reduce((a, b) => a + b, 0) / B;
  const se = Math.sqrt(
    reps.reduce((a, b) => a + (b - repMean) ** 2, 0) / (B - 1),
  );

  // Bias correction.
  const prop = Math.min(Math.max(below / B, 0.5 / B), 1 - 0.5 / B);
  const z0 = normalQuantile(prop);

  // Acceleration via jackknife.
  const jack = new Array<number>(n);
  const loo = new Array<number>(n - 1);
  for (let i = 0; i < n; i++) {
    let k = 0;
    for (let j = 0; j < n; j++) if (j !== i) loo[k++] = data[j];
    jack[i] = statistic(loo, stat);
  }
  const jbar = jack.reduce((a, b) => a + b, 0) / n;
  let num = 0;
  let den = 0;
  for (let i = 0; i < n; i++) {
    const d = jbar - jack[i];
    num += d ** 3;
    den += d ** 2;
  }
  const accel = den === 0 ? 0 : num / (6 * den ** 1.5);

  const z = (a: number) => {
    const za = normalQuantile(a);
    const adj = z0 + (z0 + za) / (1 - accel * (z0 + za));
    return normalCdf(adj);
  };
  const lo = quantileSorted(sorted, z(alpha / 2));
  const hi = quantileSorted(sorted, z(1 - alpha / 2));

  return { estimate: thetaHat, lo, hi, se, z0, accel, replicates: reps };
}
