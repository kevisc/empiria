/**
 * Dependency-free correctness check: every Empiria numeric is compared to a
 * value computed in R, to demonstrate the "exact, not approximate" claim.
 * Run with:  node scripts/verify.ts
 */
import { MT19937 } from "../src/engine/rng.ts";
import { normal } from "../src/engine/distributions.ts";
import {
  betai,
  studentTwoTailedP,
  normalCdf,
  normalQuantile,
  chiSquareUpper,
} from "../src/engine/stats/special.ts";
import { oneSampleT } from "../src/engine/stats/tTest.ts";
import { ols } from "../src/engine/stats/ols.ts";
import { bcaBootstrap } from "../src/engine/stats/bootstrap.ts";

let failures = 0;
function check(label: string, got: number, want: number, tol: number): void {
  const ok = Math.abs(got - want) <= tol;
  if (!ok) failures++;
  const status = ok ? "PASS" : "FAIL";
  console.log(
    `[${status}] ${label.padEnd(46)} got=${got.toPrecision(10)}  R=${want}`,
  );
}

// --- Regularized incomplete beta vs R's pbeta() ---
check("pbeta(0.5, 2, 3)", betai(2, 3, 0.5), 0.6875, 1e-10);
check("pbeta(0.3, 0.5, 0.5)", betai(0.5, 0.5, 0.3), 0.3690101, 1e-6);

// --- Student-t two-tailed p vs R's 2*pt(-|t|, df) ---
check("t two-tailed: t=2.0, df=7", studentTwoTailedP(2.0, 7), 0.0856193, 1e-6);
check("t two-tailed: t=2.0, df=30", studentTwoTailedP(2.0, 30), 0.0546250, 1e-6);
check("t two-tailed: t=1.7, df=8", studentTwoTailedP(1.7, 8), 0.1275529, 1e-6);

// --- One-sample t-test vs R's t.test(x, mu=0) ---
// x <- c(2.1, 3.4, 1.9, 2.8, 3.1, 2.2, 2.9, 3.3); t.test(x, mu=0)
// -> t = 13.359, df = 7, p = 3.086e-06, mean = 2.7125
const x = [2.1, 3.4, 1.9, 2.8, 3.1, 2.2, 2.9, 3.3];
const r = oneSampleT(x, 0);
check("t.test x: t statistic", r.t, 13.3590, 1e-3);
check("t.test x: df", r.df, 7, 0);
check("t.test x: p-value", r.p, 3.0856e-6, 1e-9);
check("t.test x: mean", r.mean, 2.7125, 1e-4);

// --- RNG reproducibility: same seed -> identical stream, any machine ---
const a = new MT19937(42);
const b = new MT19937(42);
const sameStream = [0, 1, 2, 3, 4].every(() => a.u32() === b.u32());
console.log(
  `[${sameStream ? "PASS" : "FAIL"}] MT19937 seed=42 reproducible`.padEnd(60),
);
if (!sameStream) failures++;

// MT19937 reference: with seed 5489, the 1st output is the canonical 3499211612.
const ref = new MT19937(5489);
check("MT19937 seed=5489 first u32", ref.u32(), 3499211612, 0);

// --- Normal CDF / quantile vs R's pnorm() / qnorm() ---
check("pnorm(1.96)", normalCdf(1.96), 0.9750021, 1e-6);
check("qnorm(0.975)", normalQuantile(0.975), 1.959964, 1e-5);
check("qnorm(0.025)", normalQuantile(0.025), -1.959964, 1e-5);

// --- Chi-square upper tail vs R's pchisq(x, df, lower.tail=FALSE) ---
check("pchisq>(3.841459, 1)", chiSquareUpper(3.841459, 1), 0.05, 1e-6);
check("pchisq>(9.487729, 4)", chiSquareUpper(9.487729, 4), 0.05, 1e-6);
check("pchisq>(6.634897, 1)", chiSquareUpper(6.634897, 1), 0.01, 1e-6);

// --- OLS vs R's lm(y ~ x) ---
// x <- 1:6; y <- c(2.1, 3.9, 6.1, 7.8, 10.2, 11.9); coef -> 0.04 + 1.98857*x, R^2 0.998302
const ox = [1, 2, 3, 4, 5, 6];
const oy = [2.1, 3.9, 6.1, 7.8, 10.2, 11.9];
const f = ols(ox, oy);
check("lm slope", f.slope, 1.988571, 1e-5);
check("lm intercept", f.intercept, 0.04, 1e-4);
check("lm R^2", f.r2, 0.998302, 1e-5);

// --- BCa bootstrap: estimate ~ data mean, interval brackets it ---
const bootRng = new MT19937(7);
const bdata = [4, 5, 6, 6, 7, 8, 9, 12, 13, 20];
const bc = bcaBootstrap(bdata, bootRng, { B: 4000, stat: "mean" });
check("BCa estimate = sample mean", bc.estimate, 9.0, 1e-9);
console.log(
  `[${bc.lo < 9 && bc.hi > 9 ? "PASS" : "FAIL"}] BCa 95% CI brackets the mean`.padEnd(
    52,
  ) + `  [${bc.lo.toFixed(2)}, ${bc.hi.toFixed(2)}]  z0=${bc.z0.toFixed(3)} a=${bc.accel.toFixed(3)}`,
);
if (!(bc.lo < 9 && bc.hi > 9)) failures++;

// --- Seeded sampling sanity: mean of 100k N(0.5, 1) draws ~ 0.5 ---
const rng = new MT19937(123);
let s = 0;
const N = 100000;
for (let i = 0; i < N; i++) s += normal(rng, 0.5, 1);
check("mean of 100k N(0.5,1) draws", s / N, 0.5, 0.02);

console.log(
  failures === 0
    ? "\nAll numeric checks passed — engine agrees with R."
    : `\n${failures} check(s) FAILED.`,
);
process.exit(failures === 0 ? 0 : 1);
