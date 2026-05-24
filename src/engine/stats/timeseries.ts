/**
 * Sample autocorrelation ρ(k) for k = 1..maxlag, using the n-divisor
 * convention (the same as R's acf(..., type = "correlation")).
 */
export function autocorrelation(xs: number[], maxlag: number): number[] {
  const n = xs.length;
  const k = Math.min(Math.max(0, Math.round(maxlag)), n - 1);
  if (n < 2) return [];
  const mean = xs.reduce((a, b) => a + b, 0) / n;
  let c0 = 0;
  for (const x of xs) c0 += (x - mean) ** 2;
  c0 /= n;
  const rhos: number[] = [];
  for (let lag = 1; lag <= k; lag++) {
    let ck = 0;
    for (let t = 0; t < n - lag; t++) ck += (xs[t] - mean) * (xs[t + lag] - mean);
    ck /= n;
    rhos.push(c0 > 0 ? ck / c0 : 0);
  }
  return rhos;
}
