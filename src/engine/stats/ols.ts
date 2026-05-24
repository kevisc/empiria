export interface OLSResult {
  slope: number;
  intercept: number;
  r2: number;
  /** Residual standard error, s = sqrt(SSres / (n-2)). */
  s: number;
  n: number;
  xbar: number;
  sxx: number;
}

/** Ordinary least squares for simple linear regression Y = a + b*X. */
export function ols(xs: number[], ys: number[]): OLSResult {
  const n = Math.min(xs.length, ys.length);
  let sx = 0;
  let sy = 0;
  for (let i = 0; i < n; i++) {
    sx += xs[i];
    sy += ys[i];
  }
  const xbar = sx / n;
  const ybar = sy / n;
  let sxx = 0;
  let sxy = 0;
  let syy = 0;
  for (let i = 0; i < n; i++) {
    const dx = xs[i] - xbar;
    const dy = ys[i] - ybar;
    sxx += dx * dx;
    sxy += dx * dy;
    syy += dy * dy;
  }
  const slope = sxy / sxx;
  const intercept = ybar - slope * xbar;
  let ssres = 0;
  for (let i = 0; i < n; i++) {
    const r = ys[i] - (intercept + slope * xs[i]);
    ssres += r * r;
  }
  const r2 = 1 - ssres / syy;
  const s = n > 2 ? Math.sqrt(ssres / (n - 2)) : 0;
  return { slope, intercept, r2, s, n, xbar, sxx };
}

/**
 * Half-width of the 95% confidence band for the mean response at x0 — the
 * classic "trumpet" that narrows at xbar and flares at the extremes.
 * (Uses 1.96; for small n the t-multiplier would be larger.)
 */
export function ciBandHalfWidth(fit: OLSResult, x0: number): number {
  return (
    1.96 *
    fit.s *
    Math.sqrt(1 / fit.n + (x0 - fit.xbar) ** 2 / fit.sxx)
  );
}
