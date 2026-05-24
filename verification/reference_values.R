# Empiria — independent reference values
# =======================================
# Run this in R to regenerate every reference constant that Empiria's test
# suite (test/numerics.test.ts) asserts against. A reviewer can compare the
# printed values here with the literals in the test file: they must match.
#
#   Rscript verification/reference_values.R
#
# Only base R is needed except for skewness/kurtosis, which use {e1071}
# (install.packages("e1071")). Each block notes the Empiria routine it checks.

cat("== regularized incomplete beta  (special.ts: betai) ==\n")
print(pbeta(0.5, 2, 3))        # 0.6875
print(pbeta(0.3, 0.5, 0.5))    # 0.3690101

cat("\n== Student-t two-tailed p  (special.ts: studentTwoTailedP) ==\n")
print(2 * pt(-2.0, 7))         # 0.0856193
print(2 * pt(-2.0, 30))        # 0.0546250
print(2 * pt(-1.7, 8))         # 0.1275529

cat("\n== Student-t critical values  (special.ts: studentTCritical) ==\n")
print(qt(0.975, 1))            # 12.7062
print(qt(0.975, 10))           # 2.228139
print(qt(0.975, 30))           # 2.042272
print(qt(0.995, 20))           # 2.845340

cat("\n== normal CDF / quantile  (special.ts: normalCdf / normalQuantile) ==\n")
print(pnorm(1.96))             # 0.9750021
print(qnorm(0.975))            # 1.959964

cat("\n== chi-square upper tail  (special.ts: chiSquareUpper) ==\n")
print(pchisq(3.841459, 1, lower.tail = FALSE))  # 0.05
print(pchisq(9.487729, 4, lower.tail = FALSE))  # 0.05
print(pchisq(6.634897, 1, lower.tail = FALSE))  # 0.01

cat("\n== one-sample t-test  (tTest.ts: oneSampleT) ==\n")
x <- c(2.1, 3.4, 1.9, 2.8, 3.1, 2.2, 2.9, 3.3)
print(t.test(x, mu = 0))       # t = 13.359, df = 7, p = 3.086e-06, mean = 2.7125

cat("\n== Welch two-sample t-test  (tTest.ts: welchT) ==\n")
print(t.test(c(1, 2, 3, 4, 5), c(2, 4, 6, 8, 10)))  # t=-1.8974, df=5.8824, p=0.1077

cat("\n== simple OLS  (ols.ts: ols) ==\n")
print(coef(lm(c(2.1, 3.9, 6.1, 7.8, 10.2, 11.9) ~ I(1:6))))  # 0.04 + 1.988571 x
print(summary(lm(c(2.1, 3.9, 6.1, 7.8, 10.2, 11.9) ~ I(1:6)))$r.squared)  # 0.998302

cat("\n== contingency chi-square  (contingency.ts: chiSquareTest) ==\n")
# correct = FALSE: Empiria uses Pearson's chi-square without Yates correction
print(chisq.test(matrix(c(10, 30, 20, 40), 2), correct = FALSE)$statistic)  # 0.79365
m <- matrix(c(10, 20, 30, 30, 20, 10), nrow = 2, byrow = TRUE)
print(chisq.test(m, correct = FALSE)$statistic)  # 20, df = 2

cat("\n== autocorrelation  (timeseries.ts: autocorrelation) ==\n")
print(acf(c(1, 2, 3, 4, 5), plot = FALSE)$acf[2:3])  # 0.4, -0.1

cat("\n== descriptive summary  (describe.ts: summarize) ==\n")
print(quantile(1:10))          # type 7: Q1=3.25, median=5.5, Q3=7.75
# skewness / kurtosis use the moment definition (e1071 type 1):
if (requireNamespace("e1071", quietly = TRUE)) {
  y <- c(2, 4, 4, 4, 5, 5, 7, 9)
  print(e1071::skewness(y, type = 1))  # 0.65625  (m3 / m2^1.5)
  print(e1071::kurtosis(y, type = 1))  # -0.21875 (m4 / m2^2 - 3)
} else {
  cat("install.packages('e1071') for skewness/kurtosis (type=1): expect 0.65625, -0.21875\n")
}

cat("\n== MT19937 RNG  (rng.ts: MT19937) ==\n")
cat("seed 5489, first 32-bit output should be 3499211612 (canonical MT test vector)\n")
