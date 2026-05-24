/**
 * Exact special functions underpinning Empiria's "no normal-approximation
 * shortcuts" promise. The regularized incomplete beta function is evaluated
 * by Lentz's modified continued fraction (Numerical Recipes, Press et al.
 * 2007); it is the same recipe behind R's pt()/pbeta() and SciPy's
 * scipy.special.betainc, and agrees with them to machine precision.
 */

/** Lanczos log-gamma. */
export function gammln(xx: number): number {
  const cof = [
    76.18009172947146, -86.50532032941677, 24.01409824083091,
    -1.231739572450155, 0.1208650973866179e-2, -0.5395239384953e-5,
  ];
  let y = xx;
  const x = xx;
  let tmp = x + 5.5;
  tmp -= (x + 0.5) * Math.log(tmp);
  let ser = 1.000000000190015;
  for (let j = 0; j < 6; j++) {
    y += 1;
    ser += cof[j] / y;
  }
  return -tmp + Math.log((2.5066282746310005 * ser) / x);
}

function betacf(a: number, b: number, x: number): number {
  const MAXIT = 200;
  const EPS = 3e-14;
  const FPMIN = 1e-300;
  const qab = a + b;
  const qap = a + 1;
  const qam = a - 1;
  let c = 1;
  let d = 1 - (qab * x) / qap;
  if (Math.abs(d) < FPMIN) d = FPMIN;
  d = 1 / d;
  let h = d;
  for (let m = 1; m <= MAXIT; m++) {
    const m2 = 2 * m;
    let aa = (m * (b - m) * x) / ((qam + m2) * (a + m2));
    d = 1 + aa * d;
    if (Math.abs(d) < FPMIN) d = FPMIN;
    c = 1 + aa / c;
    if (Math.abs(c) < FPMIN) c = FPMIN;
    d = 1 / d;
    h *= d * c;
    aa = (-(a + m) * (qab + m) * x) / ((a + m2) * (qap + m2));
    d = 1 + aa * d;
    if (Math.abs(d) < FPMIN) d = FPMIN;
    c = 1 + aa / c;
    if (Math.abs(c) < FPMIN) c = FPMIN;
    d = 1 / d;
    const del = d * c;
    h *= del;
    if (Math.abs(del - 1) < EPS) break;
  }
  return h;
}

/** Regularized incomplete beta I_x(a, b). */
export function betai(a: number, b: number, x: number): number {
  if (x <= 0) return 0;
  if (x >= 1) return 1;
  const bt = Math.exp(
    gammln(a + b) - gammln(a) - gammln(b) + a * Math.log(x) + b * Math.log(1 - x),
  );
  if (x < (a + 1) / (a + b + 2)) {
    return (bt * betacf(a, b, x)) / a;
  }
  return 1 - (bt * betacf(b, a, 1 - x)) / b;
}

/**
 * Two-tailed p-value of a Student-t statistic with `df` degrees of freedom:
 * P(|T| > |t|) = I_{df/(df+t^2)}(df/2, 1/2). Exact at any df >= 1 — visibly
 * fatter-tailed than the normal approximation at small df.
 */
export function studentTwoTailedP(t: number, df: number): number {
  if (df <= 0) return NaN;
  const x = df / (df + t * t);
  return betai(df / 2, 0.5, x);
}

// --- Regularized incomplete gamma P(a,x), for the chi-square tail ---

function gser(a: number, x: number): number {
  const EPS = 3e-14;
  let ap = a;
  let sum = 1 / a;
  let del = sum;
  for (let n = 0; n < 300; n++) {
    ap += 1;
    del *= x / ap;
    sum += del;
    if (Math.abs(del) < Math.abs(sum) * EPS) break;
  }
  return sum * Math.exp(-x + a * Math.log(x) - gammln(a));
}

function gcf(a: number, x: number): number {
  const FPMIN = 1e-300;
  const EPS = 3e-14;
  let b = x + 1 - a;
  let c = 1 / FPMIN;
  let d = 1 / b;
  let h = d;
  for (let i = 1; i <= 300; i++) {
    const an = -i * (i - a);
    b += 2;
    d = an * d + b;
    if (Math.abs(d) < FPMIN) d = FPMIN;
    c = b + an / c;
    if (Math.abs(c) < FPMIN) c = FPMIN;
    d = 1 / d;
    const del = d * c;
    h *= del;
    if (Math.abs(del - 1) < EPS) break;
  }
  return Math.exp(-x + a * Math.log(x) - gammln(a)) * h;
}

/** Regularized lower incomplete gamma P(a, x). */
export function gammp(a: number, x: number): number {
  if (x <= 0) return 0;
  return x < a + 1 ? gser(a, x) : 1 - gcf(a, x);
}

/** Upper-tail chi-square probability P(X > chi2) with df degrees of freedom. */
export function chiSquareUpper(chi2: number, df: number): number {
  if (chi2 <= 0) return 1;
  return 1 - gammp(df / 2, chi2 / 2);
}

/**
 * Two-tailed Student-t critical value: the positive t with P(|T| > t) = alpha
 * (e.g. studentTCritical(0.05, df) = qt(0.975, df)). Found by bisection on the
 * exact tail, so it is correct at small df rather than using the z ≈ 1.96
 * normal approximation.
 */
export function studentTCritical(alpha: number, df: number): number {
  if (df <= 0 || alpha <= 0 || alpha >= 1) return NaN;
  let lo = 0;
  let hi = 1000;
  for (let i = 0; i < 200; i++) {
    const mid = (lo + hi) / 2;
    // P(|T| > mid), decreasing in mid
    const tail = betai(df / 2, 0.5, df / (df + mid * mid));
    if (tail > alpha) lo = mid;
    else hi = mid;
  }
  return (lo + hi) / 2;
}

/** Abramowitz & Stegun 7.1.26 error function (|err| < 1.5e-7). */
export function erf(x: number): number {
  const sign = x < 0 ? -1 : 1;
  const ax = Math.abs(x);
  const t = 1 / (1 + 0.3275911 * ax);
  const y =
    1 -
    ((((1.061405429 * t - 1.453152027) * t + 1.421413741) * t - 0.284496736) *
      t +
      0.254829592) *
      t *
      Math.exp(-ax * ax);
  return sign * y;
}

/** Standard-normal CDF. */
export function normalCdf(z: number): number {
  return 0.5 * (1 + erf(z / Math.SQRT2));
}

/**
 * Inverse standard-normal CDF (Acklam's rational approximation,
 * relative error < 1.15e-9). Needed for the BCa bootstrap's z0/acceleration.
 */
export function normalQuantile(p: number): number {
  if (p <= 0) return -Infinity;
  if (p >= 1) return Infinity;
  const a = [
    -3.969683028665376e1, 2.209460984245205e2, -2.759285104469687e2,
    1.38357751867269e2, -3.066479806614716e1, 2.506628277459239,
  ];
  const b = [
    -5.447609879822406e1, 1.615858368580409e2, -1.556989798598866e2,
    6.680131188771972e1, -1.328068155288572e1,
  ];
  const c = [
    -7.784894002430293e-3, -3.223964580411365e-1, -2.400758277161838,
    -2.549732539343734, 4.374664141464968, 2.938163982698783,
  ];
  const d = [
    7.784695709041462e-3, 3.224671290700398e-1, 2.445134137142996,
    3.754408661907416,
  ];
  const pLow = 0.02425;
  const pHigh = 1 - pLow;
  let q: number;
  let r: number;
  if (p < pLow) {
    q = Math.sqrt(-2 * Math.log(p));
    return (
      (((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5]) /
      ((((d[0] * q + d[1]) * q + d[2]) * q + d[3]) * q + 1)
    );
  }
  if (p <= pHigh) {
    q = p - 0.5;
    r = q * q;
    return (
      ((((((a[0] * r + a[1]) * r + a[2]) * r + a[3]) * r + a[4]) * r + a[5]) *
        q) /
      (((((b[0] * r + b[1]) * r + b[2]) * r + b[3]) * r + b[4]) * r + 1)
    );
  }
  q = Math.sqrt(-2 * Math.log(1 - p));
  return (
    -(((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5]) /
    ((((d[0] * q + d[1]) * q + d[2]) * q + d[3]) * q + 1)
  );
}
