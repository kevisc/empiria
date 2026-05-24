import { describe, it, expect } from "vitest";
import { MT19937 } from "../src/engine/rng.ts";
import {
  betai,
  studentTwoTailedP,
  normalCdf,
  normalQuantile,
  chiSquareUpper,
  studentTCritical,
} from "../src/engine/stats/special.ts";
import { oneSampleT, welchT } from "../src/engine/stats/tTest.ts";
import { ols } from "../src/engine/stats/ols.ts";
import { summarize } from "../src/engine/stats/describe.ts";
import { chiSquareTest } from "../src/engine/stats/contingency.ts";
import { autocorrelation } from "../src/engine/stats/timeseries.ts";

const near = (a: number, b: number, tol = 1e-6) =>
  expect(Math.abs(a - b)).toBeLessThan(tol);

describe("special functions agree with R", () => {
  it("regularized incomplete beta (pbeta)", () => {
    near(betai(2, 3, 0.5), 0.6875, 1e-10); // exact binomial sum
    near(betai(0.5, 0.5, 0.3), 0.3690101, 1e-6); // arcsine closed form
  });

  it("Student-t two-tailed p (2*pt)", () => {
    near(studentTwoTailedP(2, 7), 0.0856193, 1e-6);
    near(studentTwoTailedP(2, 30), 0.054625, 1e-6);
    near(studentTwoTailedP(1.7, 8), 0.1275529, 1e-6);
  });

  it("Student-t critical values (qt)", () => {
    near(studentTCritical(0.05, 1), 12.7062, 1e-3);
    near(studentTCritical(0.05, 10), 2.228139, 1e-3);
    near(studentTCritical(0.05, 30), 2.042272, 1e-3);
    near(studentTCritical(0.01, 20), 2.84534, 1e-3);
  });

  it("normal CDF / quantile (pnorm / qnorm)", () => {
    near(normalCdf(1.96), 0.9750021, 1e-6);
    near(normalQuantile(0.975), 1.959964, 1e-5);
    near(normalQuantile(0.025), -1.959964, 1e-5);
  });

  it("chi-square upper tail (pchisq, lower=FALSE)", () => {
    near(chiSquareUpper(3.841459, 1), 0.05, 1e-6);
    near(chiSquareUpper(9.487729, 4), 0.05, 1e-6);
    near(chiSquareUpper(6.634897, 1), 0.01, 1e-6);
  });
});

describe("t-test agrees with R t.test()", () => {
  it("one-sample", () => {
    const x = [2.1, 3.4, 1.9, 2.8, 3.1, 2.2, 2.9, 3.3];
    const r = oneSampleT(x, 0);
    expect(r.df).toBe(7);
    near(r.t, 13.3590, 1e-3);
    near(r.p, 3.0856e-6, 1e-9);
    near(r.mean, 2.7125, 1e-4);
  });
});

describe("Welch two-sample t agrees with R t.test()", () => {
  it("unequal variances", () => {
    // R: t.test(c(1,2,3,4,5), c(2,4,6,8,10)) -> t=-1.8974, df=5.8824, p=0.1077
    const r = welchT([1, 2, 3, 4, 5], [2, 4, 6, 8, 10], 0);
    near(r.t, -1.897367, 1e-5);
    near(r.df, 5.882353, 1e-5);
    near(r.p, 0.1077, 3e-3);
  });
});

describe("contingency chi-square agrees with R chisq.test(correct=FALSE)", () => {
  it("2x2 table", () => {
    // R: chisq.test(matrix(c(10,30,20,40),2), correct=FALSE) -> X²=0.79365, df=1
    const r = chiSquareTest([
      [10, 20],
      [30, 40],
    ]);
    near(r.chi2, 0.79365, 1e-4);
    expect(r.df).toBe(1);
    near(r.cramersV, 0.089087, 1e-5); // sqrt(X²/n)
  });
  it("2x3 table", () => {
    // R: chisq.test(matrix(c(10,20,30,30,20,10),2,byrow=TRUE), correct=FALSE) -> X²=20, df=2
    const r = chiSquareTest([
      [10, 20, 30],
      [30, 20, 10],
    ]);
    near(r.chi2, 20, 1e-9);
    expect(r.df).toBe(2);
    near(r.p, 4.5400e-5, 1e-7);
    near(r.cramersV, 0.40825, 1e-4);
  });
});

describe("autocorrelation agrees with R acf()", () => {
  it("ρ(1), ρ(2) of 1..5", () => {
    // R: acf(c(1,2,3,4,5), plot=FALSE)$acf[2:3] -> 0.4, -0.1
    const r = autocorrelation([1, 2, 3, 4, 5], 2);
    near(r[0], 0.4, 1e-9);
    near(r[1], -0.1, 1e-9);
  });
});

describe("OLS agrees with R lm()", () => {
  it("simple regression", () => {
    const f = ols([1, 2, 3, 4, 5, 6], [2.1, 3.9, 6.1, 7.8, 10.2, 11.9]);
    near(f.slope, 1.988571, 1e-5);
    near(f.intercept, 0.04, 1e-4);
    near(f.r2, 0.998302, 1e-5);
  });
});

describe("descriptive summary", () => {
  it("quantiles match R quantile() type 7", () => {
    const s = summarize([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
    expect(s.min).toBe(1);
    near(s.q1, 3.25, 1e-9);
    near(s.median, 5.5, 1e-9);
    near(s.q3, 7.75, 1e-9);
    expect(s.max).toBe(10);
    near(s.iqr, 4.5, 1e-9);
  });
  it("moments (skewness, excess kurtosis) hand-checked", () => {
    const s = summarize([2, 4, 4, 4, 5, 5, 7, 9]);
    near(s.mean, 5, 1e-9);
    near(s.sd, Math.sqrt(32 / 7), 1e-9); // sample SD
    near(s.skew, 0.65625, 1e-9);
    near(s.kurt, -0.21875, 1e-9);
  });
});

describe("MT19937 RNG", () => {
  it("matches the canonical seed=5489 test vector", () => {
    expect(new MT19937(5489).u32()).toBe(3499211612);
  });
  it("is reproducible for a given seed", () => {
    const a = new MT19937(42);
    const b = new MT19937(42);
    for (let i = 0; i < 8; i++) expect(a.u32()).toBe(b.u32());
  });
});
