import { chiSquareUpper } from "./special.ts";

export interface ChiSquareResult {
  chi2: number;
  df: number;
  p: number;
  cramersV: number;
  n: number;
}

/**
 * Pearson chi-square test of independence on an R×C contingency table, with
 * Cramér's V effect size. No Yates continuity correction — matches R's
 * chisq.test(..., correct = FALSE).
 */
export function chiSquareTest(table: number[][]): ChiSquareResult {
  const R = table.length;
  const C = table[0]?.length ?? 0;
  const rowSum = table.map((r) => r.reduce((a, b) => a + b, 0));
  const colSum = new Array(C).fill(0);
  let n = 0;
  for (let r = 0; r < R; r++) {
    for (let c = 0; c < C; c++) {
      colSum[c] += table[r][c];
      n += table[r][c];
    }
  }
  let chi2 = 0;
  if (n > 0) {
    for (let r = 0; r < R; r++) {
      for (let c = 0; c < C; c++) {
        const e = (rowSum[r] * colSum[c]) / n;
        if (e > 0) chi2 += (table[r][c] - e) ** 2 / e;
      }
    }
  }
  const df = (R - 1) * (C - 1);
  const cramersV = n > 0 ? Math.sqrt(chi2 / (n * Math.min(R - 1, C - 1))) : 0;
  return { chi2, df, p: chiSquareUpper(chi2, df), cramersV, n };
}
