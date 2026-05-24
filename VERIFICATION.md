# Verification & methodological audit

Empiria's pedagogical claim rests on its numbers being **exactly right**, not
"good enough for a demo". This document is the audit trail: for every
statistical routine it states the algorithm used, a citation, the reference
implementation it is checked against, the exact command that regenerates the
reference value, and the automated test that asserts it.

## How a reviewer verifies the whole thing (3 commands)

```sh
npm install
npm test                              # 41 automated checks, all green
node scripts/verify.ts                # same numerics, printed with R values side by side
node scripts/verify-engine.ts         # engine determinism + LLN + Test/Coverage/Power behaviour
```

To confirm the *reference values themselves* are correct (not merely that the
code matches our own expectations), run the independent R script and compare
its printout to the literals in `test/numerics.test.ts`:

```sh
Rscript verification/reference_values.R
```

Every numeric below is checked to the stated tolerance against R; agreement is
to **machine precision** unless a Monte-Carlo tolerance is noted.

## Numerical methods

| Quantity | Algorithm / recipe | Reference (R) | Test |
|---|---|---|---|
| Regularized incomplete beta `I_x(a,b)` | Lentz modified continued fraction (Press et al. 2007, *Numerical Recipes* §6.4) | `pbeta()` | numerics: incomplete beta |
| Student-*t* two-tailed *p* | `I_{df/(df+t²)}(df/2, ½)` (exact, fat-tailed at low df) | `2*pt(-|t|, df)` | numerics: student-t p |
| Student-*t* critical value | bisection on the exact tail | `qt(1-α/2, df)` | numerics: t critical |
| Regularized incomplete gamma / χ² tail | series + continued fraction switch (Numerical Recipes §6.2) | `pchisq(.., lower.tail=FALSE)` | numerics: chi-square tail |
| Normal CDF | Abramowitz & Stegun 7.1.26 `erf` | `pnorm()` | numerics: normal cdf |
| Normal quantile | Acklam rational approximation (rel. err < 1.15e-9) | `qnorm()` | numerics: normal quantile |
| One-sample *t*-test | `t=(x̄−µ₀)/(s/√n)`, exact *p* | `t.test(x, mu=µ₀)` | numerics: one-sample |
| Welch two-sample *t* | unequal-variance *t* with Welch–Satterthwaite df | `t.test(a, b)` | numerics: Welch |
| Simple OLS (β, α, R²) | closed-form least squares | `lm(y ~ x)` | numerics: OLS |
| Contingency χ² + Cramér's V | Pearson χ² (no Yates correction) | `chisq.test(m, correct=FALSE)` | numerics: contingency |
| Autocorrelation ρ(k) | n-divisor sample ACF | `acf(x)$acf` | numerics: autocorrelation |
| Quantiles | linear interpolation | `quantile()` **type 7** (R default) | numerics: summary |
| Skewness / excess kurtosis | moment estimators `m₃/m₂^{3/2}`, `m₄/m₂²−3` | `e1071::skewness/kurtosis(type=1)` | numerics: summary |
| BCa bootstrap interval | bias-correction *z₀* + jackknife acceleration (Efron 1987) | `boot::boot.ci(type="bca")` (to MC error) | engine: coverage behaviour |
| RNG | MT19937 (Matsumoto & Nishimura 1998) | canonical test vector | numerics: MT19937 |

## Behavioural / statistical-property checks (engine)

These assert that the *system* behaves correctly, not just individual formulas:

- **Determinism.** The same master seed produces a byte-identical signal stream; a different seed produces a different one. *(engine: same/different seed)*
- **MT19937 test vector.** Seed 5489 → first output `3499211612`, the documented reference output of the reference MT19937 implementation.
- **Law of Large Numbers.** A growing sample's mean → µ and SE → 0 (≈ 1/√n). *(engine: LLN)*
- **Node ≡ library.** The Test node's reported *t* equals a direct `oneSampleT()` on its own buffer to < 1e-9. *(engine: Test matches library)*
- **CI coverage.** Over ~500 repeated experiments, the 95% *t*-interval covers the true mean 90–99% of the time (nominal 95%). *(engine: coverage)*
- **Type-I error.** With two identical populations, the Power node's rejection rate sits near α (2–9% for α=0.05). *(engine: power under null)*
- **Every bundled lesson and guided-tour step** applies to a fresh graph and ticks without error. *(engine: lesson patches)*

## Reproducibility & cross-machine determinism

- All randomness flows from a seeded **MT19937** (`src/engine/rng.ts`); `Math.random()` is never used.
- A patch is plain JSON (parameters, wiring, master seed). Loading it on any machine reconstructs identical initial conditions, and the simulation is computed in IEEE-754 double precision with no platform-specific code paths.
- **Independent audit procedure for a worked result.** Open any patch, set the master seed, run it, and use a node's **⬇ CSV** to export its buffer. Load that CSV in R/Python and recompute the statistic (`t.test`, `lm`, `chisq.test`, …): it reproduces Empiria's on-screen value to six decimals, and the same seed on a different machine yields a byte-identical CSV.

## Known limitations (stated honestly)

- The BCa bootstrap is validated by its **coverage behaviour** and by exact tests of its components (`z₀` via the normal quantile, the jackknife acceleration), not by a value-for-value match to `boot::boot.ci`, because that would require reproducing R's resampling RNG stream. Its percentile/CI behaviour is checked in the engine tests.
- Confidence intervals use the **t** distribution (exact at small *n*); intervals for proportions use the normal/Wald form where applicable.

## References

- Press, Teukolsky, Vetterling, Flannery (2007). *Numerical Recipes*, 3rd ed.
- Efron (1987). Better Bootstrap Confidence Intervals. *JASA* 82(397).
- Matsumoto & Nishimura (1998). Mersenne Twister. *ACM TOMACS* 8(1).
- Abramowitz & Stegun (1964). *Handbook of Mathematical Functions*.
