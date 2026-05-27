// Live mathematical notation for nodes. Each generator returns a MathML string
// (rendered natively by the browser — no MathJax/KaTeX dependency) showing the
// quantity a node computes as a chained equality: symbolic form → the current
// values substituted in → the result. Re-evaluated every tick, so the equation
// updates as the user manipulates the patch.
import type { NodeRuntime } from "./engine/graph.ts";

const out = (n: NodeRuntime, p: string): number | undefined => n.outputs[p]?.[0];

function fmt(v: number | undefined, d = 3): string {
  if (v === undefined || !Number.isFinite(v)) return "–"; // en dash
  if (v !== 0 && (Math.abs(v) >= 1e4 || Math.abs(v) < 1e-3)) return v.toExponential(1);
  return String(+v.toFixed(d));
}

// --- MathML element builders -------------------------------------------------
const mn = (v: number | string) => `<mn>${v}</mn>`;
const mi = (s: string) => `<mi>${s}</mi>`;
const mo = (s: string) => `<mo>${s}</mo>`;
const mtext = (s: string) => `<mtext>${s}</mtext>`;
const row = (...x: string[]) => `<mrow>${x.join("")}</mrow>`;
const frac = (a: string, b: string) => `<mfrac>${a}${b}</mfrac>`;
const sqrt = (a: string) => `<msqrt>${a}</msqrt>`;
const sup = (a: string, b: string) => `<msup>${a}${b}</msup>`;
const sub = (a: string, b: string) => `<msub>${a}${b}</msub>`;
const sp = `<mspace width="0.9em"/>`;
const mspaceThin = `<mspace width="0.15em"/>`;
const paren = (...x: string[]) => row(mo("("), ...x, mo(")"));
const num = (v: number | undefined, d = 3) => mn(fmt(v, d));
const math = (...x: string[]) =>
  `<math xmlns="http://www.w3.org/1998/Math/MathML" display="block">${x.join("")}</math>`;

// Sample mean / SD / n from a raw buffer (for substitution into formulas).
function stats(buf?: number[]): { m: number; s: number; k: number } {
  if (!buf || buf.length === 0) return { m: NaN, s: NaN, k: 0 };
  const k = buf.length;
  const m = buf.reduce((a, b) => a + b, 0) / k;
  const v = k > 1 ? buf.reduce((a, b) => a + (b - m) * (b - m), 0) / (k - 1) : 0;
  return { m, s: Math.sqrt(v), k };
}

// Compact MathML number for a parameter value (≤2 dp, trailing zeros trimmed).
const P = (v: number) => mn(String(+v.toFixed(2)));

// MathML for the chosen transform function f(x).
function fOfX(fn: string): string {
  switch (fn) {
    case "square": return sup(mi("x"), mn(2));
    case "sqrt": return sqrt(row(mo("|"), mi("x"), mo("|")));
    case "log": return row(mtext("ln"), mo("|"), mi("x"), mo("|"));
    case "abs": return row(mo("|"), mi("x"), mo("|"));
    case "sigmoid":
      return frac(mn(1), row(mn(1), mo("+"), sup(mi("e"), row(mo("−"), mi("x")))));
    case "sin": return row(mtext("sin"), mspaceThin, mi("x"));
    default: return mi("x"); // linear
  }
}

type FormulaFn = (n: NodeRuntime) => string | null;

export const FORMULAS: Record<string, FormulaFn> = {
  sample: (n) => {
    const dist = String(n.params.dist ?? "normal");
    const p1 = Number(n.params.p1), p2 = Number(n.params.p2);
    let dgp: string;
    if (dist === "uniform") {
      dgp = math(mi("X"), mo("∼"), mi("U"), paren(P(p1), mo(","), P(p2)));
    } else if (dist === "exponential") {
      dgp = math(mi("X"), mo("∼"), mtext("Exp"),
        paren(row(mi("λ"), mo("="), P(p1))));
    } else {
      dgp = math(mi("X"), mo("∼"), mi("N"),
        paren(row(mi("μ"), mo("="), P(p1)), mo(","), row(mi("σ"), mo("="), P(p2))));
    }
    const st = n.state as { n?: number };
    const est = math(
      mi("x̄"), mo("="), num(out(n, "mean")), sp,
      mi("s"), mo("="), num(out(n, "sd")), sp,
      mi("n"), mo("="), mn(st.n ?? 0),
    );
    return dgp + est;
  },

  frame: (n) => {
    const st = n.state as { buf?: number[] };
    const k = st.buf?.length ?? 0;
    return math(
      mtext("SE"), mo("="), frac(mi("s"), sqrt(mi("n"))), mo("="),
      frac(num(out(n, "sd")), sqrt(mn(k))), mo("="), num(out(n, "se"), 4),
    );
  },

  test: (n) => {
    const st = n.state as {
      b1?: number[]; b2?: number[];
      res?: { t: number; df: number } | null;
    };
    if (!st.res) return null; // still collecting the first sample
    const mode = String(n.params.mode ?? "one");
    const t = out(n, "t");
    const tail = math(
      mi("df"), mo("="), num(st.res.df, 1), sp,
      mi("p"), mo("="), num(out(n, "p"), 4),
    );
    if (mode === "welch") {
      const a = stats(st.b1), b = stats(st.b2);
      const head = math(
        mi("t"), mo("="),
        frac(
          row(sub(mi("x̄"), mn(1)), mo("−"), sub(mi("x̄"), mn(2))),
          sqrt(row(
            frac(sup(sub(mi("s"), mn(1)), mn(2)), sub(mi("n"), mn(1))),
            mo("+"),
            frac(sup(sub(mi("s"), mn(2)), mn(2)), sub(mi("n"), mn(2))),
          )),
        ),
        mo("="),
        frac(
          paren(num(a.m, 2), mo("−"), num(b.m, 2)),
          sqrt(row(
            frac(sup(num(a.s, 2), mn(2)), mn(a.k)), mo("+"),
            frac(sup(num(b.s, 2), mn(2)), mn(b.k)),
          )),
        ),
        mo("="), num(t, 2),
      );
      return head + tail;
    }
    const a = stats(st.b1);
    const mu0 = Number(n.params.mu0 ?? 0);
    const head = math(
      mi("t"), mo("="),
      frac(paren(mi("x̄"), mo("−"), sub(mi("μ"), mn(0))),
        row(mi("s"), mo("/"), sqrt(mi("n")))),
      mo("="),
      frac(paren(num(a.m, 2), mo("−"), num(mu0, 2)),
        row(num(a.s, 2), mo("/"), sqrt(mn(a.k)))),
      mo("="), num(t, 2),
    );
    return head + tail;
  },

  regress: (n) =>
    math(
      mi("ŷ"), mo("="), num(out(n, "intercept"), 2), mo("+"),
      num(out(n, "slope"), 3), mo("·"), mi("x"),
    ) +
    math(sup(mi("R"), mn(2)), mo("="), num(out(n, "r2"))),

  boot: (n) =>
    math(
      mi("θ̂"), mo("="), num(out(n, "est")), sp,
      sub(mtext("CI"), mn(95)), mo("="),
      mo("["), num(out(n, "lo")), mo(","), num(out(n, "hi")), mo("]"),
    ),

  summary: (n) =>
    math(
      mi("x̄"), mo("="), num(out(n, "mean")), sp,
      mtext("Md"), mo("="), num(out(n, "median")), sp,
      mi("s"), mo("="), num(out(n, "sd")), sp,
      mtext("IQR"), mo("="), num(out(n, "iqr")),
    ),

  coverage: (n) => {
    const c = out(n, "covered"), t = out(n, "total");
    return math(
      mtext("coverage"), mo("="), frac(mtext("covered"), mtext("total")), mo("="),
      frac(mn(fmt(c, 0)), mn(fmt(t, 0))), mo("="), num(out(n, "coverage")),
    );
  },

  power: (n) => {
    const r = out(n, "rejrate"), t = out(n, "experiments");
    return math(
      mtext("reject rate"), mo("="), frac(mtext("# reject"), mtext("# exp")), mo("="),
      frac(mn(fmt(r !== undefined && t !== undefined ? r * t : NaN, 0)), mn(fmt(t, 0))),
      mo("="), num(r),
    );
  },

  lag: (n) =>
    math(sub(mi("ρ"), mn(1)), mo("="), num(out(n, "rho1"))),

  tab: (n) =>
    math(
      sup(mi("χ"), mn(2)), mo("="), num(out(n, "chi2"), 2), sp,
      mi("p"), mo("="), num(out(n, "p"), 4), sp,
      mi("V"), mo("="), num(out(n, "v")),
    ),

  means: (n) =>
    math(sub(mi("x̄"), mtext("batch")), mo("="), num(out(n, "mean"))),

  transform: (n) => {
    const fn = String(n.params.fn ?? "linear");
    const a = Number(n.params.a), b = Number(n.params.b);
    const st = n.state as { lastX: number; lastY: number };
    return (
      math(mi("y"), mo("="), P(a), mo("·"), fOfX(fn), mo("+"), P(b)) +
      math(mi("y"), paren(num(st.lastX, 2)), mo("="), num(st.lastY, 3))
    );
  },

  noise: (n) => {
    const sigma = Number(n.params.sigma);
    return math(
      mi("y"), mo("="), mi("x"), mo("+"), mi("ε"), sp,
      mi("ε"), mo("∼"), mi("N"), paren(mn(0), mo(","), sup(mi("σ"), mn(2))), sp,
      mi("σ"), mo("="), P(sigma),
    );
  },

  mix: (n) => {
    const mode = String(n.params.mode ?? "mixture");
    if (mode === "sum") return math(mi("X"), mo("="), mi("A"), mo("+"), mi("B"));
    if (mode === "mean")
      return math(mi("X"), mo("="), frac(row(mi("A"), mo("+"), mi("B")), mn(2)));
    const w = Number(n.params.w);
    return math(
      mi("X"), mo("∼"), P(w), mo("·"), mi("A"), mo("+"),
      paren(mn(1), mo("−"), P(w)), mo("·"), mi("B"),
    );
  },

  box: (n) => {
    const st = n.state as { s: { median: number; q1: number; q3: number; iqr: number } };
    return (
      math(mtext("median"), mo("="), num(st.s.median)) +
      math(
        mtext("IQR"), mo("="), sub(mi("Q"), mn(3)), mo("−"), sub(mi("Q"), mn(1)),
        mo("="), num(st.s.q3, 2), mo("−"), num(st.s.q1, 2), mo("="), num(st.s.iqr),
      )
    );
  },

  ecdf: (n) => {
    const st = n.state as { buf?: number[] };
    return math(
      mi("F̂"), paren(mi("x")), mo("="),
      frac(row(mo("#"), mo("{"), sub(mi("x"), mi("i")), mo("≤"), mi("x"), mo("}")), mi("n")),
      sp, mi("n"), mo("="), mn(st.buf?.length ?? 0),
    );
  },

  code: (n) => {
    const st = n.state as { last?: number };
    const k = Math.max(2, Math.round(Number(n.params.k)));
    const low = Number(n.params.low), high = Number(n.params.high);
    return (
      math(
        mi("c"), mo("="), mo("⌊"),
        frac(row(mi("x"), mo("−"), P(low)), row(P(high), mo("−"), P(low))),
        mo("·"), mn(k), mo("⌋"), mo("+"), mn(1),
      ) +
      math(mtext("level"), mo("="), mn(st.last ?? "–"), mo("/"), mn(k))
    );
  },

  data: (n) => {
    const st = n.state as { values?: number[] };
    return math(
      mtext("value"), mo("="), sub(mi("x"), mi("i")), sp,
      mi("n"), mo("="), mn(st.values?.length ?? 0),
    );
  },

  qq: () =>
    math(
      mtext("point"), mo("="),
      paren(
        row(sup(mi("Φ"), row(mo("−"), mn(1))),
          paren(frac(row(mi("i"), mo("−"), mn("½")), mi("n")))),
        mo(","),
        sub(mi("x"), row(mo("("), mi("i"), mo(")"))),
      ),
    ),
};
