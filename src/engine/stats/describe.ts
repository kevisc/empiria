export interface Summary {
  n: number;
  mean: number;
  sd: number; // sample SD (n-1)
  se: number;
  min: number;
  q1: number;
  median: number;
  q3: number;
  max: number;
  iqr: number;
  skew: number; // moment skewness  m3 / m2^1.5
  kurt: number; // excess kurtosis  m4 / m2^2 − 3
}

/** Linear-interpolation quantile on a sorted array (R's default type 7). */
export function quantileSorted(sorted: number[], p: number): number {
  const n = sorted.length;
  if (n === 0) return NaN;
  if (n === 1) return sorted[0];
  const h = (n - 1) * p;
  const lo = Math.floor(h);
  return sorted[lo] + (h - lo) * (sorted[lo + 1] - sorted[lo]);
}

const EMPTY: Summary = {
  n: 0,
  mean: NaN,
  sd: NaN,
  se: NaN,
  min: NaN,
  q1: NaN,
  median: NaN,
  q3: NaN,
  max: NaN,
  iqr: NaN,
  skew: NaN,
  kurt: NaN,
};

/** Full descriptive summary of a sample. */
export function summarize(xs: number[]): Summary {
  const n = xs.length;
  if (n === 0) return { ...EMPTY };
  const mean = xs.reduce((a, b) => a + b, 0) / n;
  let m2 = 0;
  let m3 = 0;
  let m4 = 0;
  for (const x of xs) {
    const d = x - mean;
    m2 += d * d;
    m3 += d * d * d;
    m4 += d * d * d * d;
  }
  m2 /= n;
  m3 /= n;
  m4 /= n;
  const sd = n > 1 ? Math.sqrt((m2 * n) / (n - 1)) : 0;
  const sorted = [...xs].sort((a, b) => a - b);
  const q1 = quantileSorted(sorted, 0.25);
  const q3 = quantileSorted(sorted, 0.75);
  return {
    n,
    mean,
    sd,
    se: n > 1 ? sd / Math.sqrt(n) : 0,
    min: sorted[0],
    q1,
    median: quantileSorted(sorted, 0.5),
    q3,
    max: sorted[n - 1],
    iqr: q3 - q1,
    skew: m2 > 0 ? m3 / m2 ** 1.5 : 0,
    kurt: m2 > 0 ? m4 / (m2 * m2) - 3 : 0,
  };
}
