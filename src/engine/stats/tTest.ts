import { studentTwoTailedP } from "./special.ts";

export interface TTestResult {
  t: number;
  df: number;
  p: number;
  mean: number;
  se: number;
  cohenD: number;
}

function mean(xs: number[]): number {
  return xs.reduce((a, b) => a + b, 0) / xs.length;
}

function sampleVar(xs: number[], m: number): number {
  return xs.reduce((a, b) => a + (b - m) ** 2, 0) / (xs.length - 1);
}

/** One-sample t-test of H0: mu = mu0. */
export function oneSampleT(data: number[], mu0 = 0): TTestResult {
  const n = data.length;
  const m = mean(data);
  const v = sampleVar(data, m);
  const sd = Math.sqrt(v);
  const se = sd / Math.sqrt(n);
  const t = (m - mu0) / se;
  const df = n - 1;
  return { t, df, p: studentTwoTailedP(t, df), mean: m, se, cohenD: (m - mu0) / sd };
}

/** Two-sample Welch t-test of H0: mu1 - mu2 = delta0 (unequal variances). */
export function welchT(a: number[], b: number[], delta0 = 0): TTestResult {
  const na = a.length;
  const nb = b.length;
  const ma = mean(a);
  const mb = mean(b);
  const va = sampleVar(a, ma);
  const vb = sampleVar(b, mb);
  const se = Math.sqrt(va / na + vb / nb);
  const t = (ma - mb - delta0) / se;
  // Welch–Satterthwaite degrees of freedom.
  const df =
    (va / na + vb / nb) ** 2 /
    ((va / na) ** 2 / (na - 1) + (vb / nb) ** 2 / (nb - 1));
  const pooledSd = Math.sqrt(((na - 1) * va + (nb - 1) * vb) / (na + nb - 2));
  return {
    t,
    df,
    p: studentTwoTailedP(t, df),
    mean: ma - mb,
    se,
    cohenD: (ma - mb - delta0) / pooledSd,
  };
}
