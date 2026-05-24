import type { Graph } from "./engine/graph.ts";
import { gammln, studentTCritical, normalQuantile, normalCdf } from "./engine/stats/special.ts";
import { summarize, quantileSorted } from "./engine/stats/describe.ts";
import { shape } from "./engine/nodes.ts";
import { THEME, alpha } from "./theme.ts";

function clear(ctx: CanvasRenderingContext2D, w: number, h: number) {
  ctx.fillStyle = THEME.bg;
  ctx.fillRect(0, 0, w, h);
}

function histogram(values: number[], bins: number, lo: number, hi: number) {
  const counts = new Array(bins).fill(0);
  const span = hi - lo || 1;
  for (const v of values) {
    let b = Math.floor(((v - lo) / span) * bins);
    if (b < 0) b = 0;
    if (b >= bins) b = bins - 1;
    counts[b]++;
  }
  return counts;
}

function extent(values: number[]): [number, number] {
  let lo = Infinity;
  let hi = -Infinity;
  for (const v of values) {
    if (v < lo) lo = v;
    if (v > hi) hi = v;
  }
  if (!isFinite(lo)) return [-1, 1];
  if (lo === hi) return [lo - 1, hi + 1];
  const pad = (hi - lo) * 0.05;
  return [lo - pad, hi + pad];
}

function fmtTick(v: number): string {
  if (v === 0) return "0";
  const a = Math.abs(v);
  if (a >= 10000 || a < 0.01) return v.toExponential(0);
  if (a >= 100) return v.toFixed(0);
  if (a >= 10) return v.toFixed(1);
  if (a >= 1) return v.toFixed(1);
  return v.toFixed(2);
}

interface Plot {
  x0: number;
  y0: number;
  w: number;
  h: number;
  px: (v: number) => number;
  py: (v: number) => number;
}

/** Draw labelled x/y axes and return the inner plot rect + coord mappers. */
function axes(
  ctx: CanvasRenderingContext2D,
  W: number,
  H: number,
  xlo: number,
  xhi: number,
  ylo: number,
  yhi: number,
  opts: {
    xticks?: number;
    yticks?: number;
    xtickFmt?: (v: number) => string;
    xtickVals?: number[];
  } = {},
): Plot {
  const left = 30;
  const bottom = 14;
  const top = 6;
  const right = 8;
  const pw = W - left - right;
  const ph = H - top - bottom;
  const xspan = xhi - xlo || 1;
  const yspan = yhi - ylo || 1;
  const px = (v: number) => left + ((v - xlo) / xspan) * pw;
  const py = (v: number) => top + ph - ((v - ylo) / yspan) * ph;

  ctx.strokeStyle = THEME.grid;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(left, top);
  ctx.lineTo(left, top + ph);
  ctx.lineTo(left + pw, top + ph);
  ctx.stroke();

  ctx.fillStyle = THEME.muted;
  ctx.font = "8px ui-monospace, monospace";
  const ny = opts.yticks ?? 4;
  ctx.textAlign = "right";
  ctx.textBaseline = "middle";
  for (let i = 0; i <= ny; i++) {
    const v = ylo + (i / ny) * yspan;
    const y = py(v);
    ctx.fillText(fmtTick(v), left - 3, y);
  }
  const xf = opts.xtickFmt ?? fmtTick;
  ctx.textAlign = "center";
  ctx.textBaseline = "top";
  if (opts.xtickVals) {
    for (const v of opts.xtickVals) ctx.fillText(xf(v), px(v), top + ph + 2);
  } else {
    const nx = opts.xticks ?? 4;
    for (let i = 0; i <= nx; i++) {
      const v = xlo + (i / nx) * xspan;
      ctx.fillText(xf(v), px(v), top + ph + 2);
    }
  }
  ctx.textBaseline = "alphabetic";
  ctx.textAlign = "left";
  return { x0: left, y0: top, w: pw, h: ph, px, py };
}

function drawHist(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  values: number[],
  color: string,
  marks: { x: number; color: string; label?: string }[] = [],
  band?: { lo: number; hi: number },
) {
  if (values.length === 0) return;
  const [lo, hi] = extent(values);
  const bins = Math.min(40, Math.max(8, Math.round(Math.sqrt(values.length))));
  const counts = histogram(values, bins, lo, hi);
  const max = Math.max(...counts, 1);
  const p = axes(ctx, w, h, lo, hi, 0, max);

  if (band) {
    ctx.fillStyle = alpha(THEME.accent, 0.18);
    ctx.fillRect(p.px(band.lo), p.y0, p.px(band.hi) - p.px(band.lo), p.h);
  }
  const bw = p.w / bins;
  ctx.fillStyle = color;
  for (let i = 0; i < bins; i++) {
    const y = p.py(counts[i]);
    ctx.fillRect(p.x0 + i * bw + 0.5, y, bw - 1, p.y0 + p.h - y);
  }
  for (const m of marks) {
    ctx.strokeStyle = m.color;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(p.px(m.x), p.y0);
    ctx.lineTo(p.px(m.x), p.y0 + p.h);
    ctx.stroke();
  }
}

/** Theoretical density for the Sample node's distribution. */
function densityFn(dist: string, p1: number, p2: number): (x: number) => number {
  if (dist === "uniform") {
    const a = Math.min(p1, p2);
    const b = Math.max(p1, p2);
    const d = 1 / Math.max(1e-9, b - a);
    return (x) => (x >= a && x <= b ? d : 0);
  }
  if (dist === "exponential") {
    const l = Math.max(1e-9, p1);
    return (x) => (x >= 0 ? l * Math.exp(-l * x) : 0);
  }
  const s = Math.max(1e-9, p2); // normal
  return (x) => Math.exp(-((x - p1) ** 2) / (2 * s * s)) / (s * Math.SQRT2 * Math.sqrt(Math.PI));
}

/** Empirical histogram (as a density) with the theoretical PDF overlaid. */
function drawSample(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  values: number[],
  dist: string,
  p1: number,
  p2: number,
  mean: number,
) {
  const [lo, hi] = extent(values);
  const span = hi - lo || 1;
  const bins = Math.min(44, Math.max(8, Math.round(Math.sqrt(values.length))));
  const counts = histogram(values, bins, lo, hi);
  const binW = span / bins;
  const n = values.length;
  const dens = counts.map((c) => c / (n * binW));
  const f = densityFn(dist, p1, p2);

  let yMax = Math.max(...dens, 1e-9);
  for (let i = 0; i <= bins; i++) yMax = Math.max(yMax, f(lo + (i / bins) * span));

  const p = axes(ctx, w, h, lo, hi, 0, yMax);
  const bw = p.w / bins;
  ctx.fillStyle = THEME.accent;
  for (let i = 0; i < bins; i++) {
    const y = p.py(dens[i]);
    ctx.fillRect(p.x0 + i * bw + 0.5, y, bw - 1, p.y0 + p.h - y);
  }
  // theoretical curve
  ctx.strokeStyle = THEME.gold;
  ctx.lineWidth = 2;
  ctx.beginPath();
  for (let i = 0; i <= p.w; i++) {
    const xv = lo + (i / p.w) * span;
    const y = p.py(f(xv));
    if (i === 0) ctx.moveTo(p.x0 + i, y);
    else ctx.lineTo(p.x0 + i, y);
  }
  ctx.stroke();
  // running mean
  ctx.strokeStyle = THEME.bad;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(p.px(mean), p.y0);
  ctx.lineTo(p.px(mean), p.y0 + p.h);
  ctx.stroke();

  ctx.fillStyle = THEME.muted;
  ctx.font = "9px ui-monospace, monospace";
  ctx.fillText(`n=${n}  bars: empirical · curve: theory`, p.x0 + 2, p.y0 + 8);
}

function tPdf(x: number, df: number): number {
  const c = Math.exp(
    gammln((df + 1) / 2) - gammln(df / 2) - 0.5 * Math.log(df * Math.PI),
  );
  return c * Math.pow(1 + (x * x) / df, -(df + 1) / 2);
}

/** Draw the visualization for one node onto its canvas. */
export function drawNode(canvas: HTMLCanvasElement, graph: Graph, id: string) {
  const node = graph.nodes.get(id);
  if (!node) return;
  const ctx = canvas.getContext("2d")!;
  const w = canvas.width;
  const h = canvas.height;
  clear(ctx, w, h);

  switch (node.type) {
    case "seed": {
      ctx.fillStyle = THEME.gold;
      ctx.font = "bold 42px ui-monospace, monospace";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(String(node.params.value), w / 2, h / 2 - 10);
      ctx.fillStyle = THEME.muted;
      ctx.font = "10.5px ui-sans-serif, system-ui, sans-serif";
      ctx.fillText("master seed · reproduces the whole patch", w / 2, h - 16);
      ctx.textAlign = "left";
      ctx.textBaseline = "alphabetic";
      break;
    }
    case "sample": {
      const st = node.state as { hist: number[]; mean: number };
      if (st.hist.length === 0) break;
      drawSample(
        ctx,
        w,
        h,
        st.hist,
        node.params.dist as string,
        Number(node.params.p1),
        Number(node.params.p2),
        st.mean,
      );
      break;
    }
    case "mix": {
      const st = node.state as { hist: number[] };
      if (st.hist.length === 0) break;
      drawHist(ctx, w, h, st.hist, THEME.accent);
      ctx.fillStyle = THEME.muted;
      ctx.font = "10px ui-monospace, monospace";
      ctx.fillText(`combined · n=${st.hist.length}`, 32, 14);
      break;
    }
    case "scope": {
      const st = node.state as { buf: number[] };
      const buf = st.buf ?? [];
      if (buf.length < 2) break;
      const [lo, hi] = extent(buf);
      const p = axes(ctx, w, h, 0, buf.length - 1, lo, hi, {
        xtickFmt: (v) => v.toFixed(0),
      });
      ctx.strokeStyle = THEME.accent;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      for (let i = 0; i < buf.length; i++) {
        const x = p.px(i);
        const y = p.py(buf[i]);
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();
      ctx.fillStyle = THEME.muted;
      ctx.font = "9px ui-monospace, monospace";
      ctx.fillText(`latest=${buf[buf.length - 1].toFixed(2)}  (time →)`, p.x0 + 2, p.y0 + 8);
      break;
    }
    case "transform": {
      const st = node.state as { lastX: number; lastY: number };
      const a = Number(node.params.a);
      const b = Number(node.params.b);
      const fn = node.params.fn as string;
      const xlo = -3;
      const xhi = 3;
      const ys: number[] = [];
      for (let i = 0; i <= 64; i++) ys.push(a * shape(fn, xlo + (i / 64) * (xhi - xlo)) + b);
      const ylo = Math.min(...ys);
      const yhi = Math.max(...ys);
      const p = axes(ctx, w, h, xlo, xhi, ylo, yhi);
      ctx.strokeStyle = THEME.gold;
      ctx.lineWidth = 2;
      ctx.beginPath();
      for (let i = 0; i <= 64; i++) {
        const x = xlo + (i / 64) * (xhi - xlo);
        const y = p.py(ys[i]);
        if (i === 0) ctx.moveTo(p.px(x), y);
        else ctx.lineTo(p.px(x), y);
      }
      ctx.stroke();
      ctx.fillStyle = THEME.bad;
      ctx.beginPath();
      ctx.arc(p.px(Math.max(xlo, Math.min(xhi, st.lastX))), p.py(st.lastY), 3, 0, 2 * Math.PI);
      ctx.fill();
      ctx.fillStyle = THEME.muted;
      ctx.font = "9px ui-monospace, monospace";
      ctx.fillText("y = a·f(x) + b", p.x0 + 2, p.y0 + 8);
      break;
    }
    case "noise": {
      const st = node.state as { hist: number[] };
      if (st.hist.length === 0) break;
      drawHist(ctx, w, h, st.hist, THEME.accent);
      ctx.fillStyle = THEME.muted;
      ctx.font = "10px ui-monospace, monospace";
      ctx.fillText(`+ N(0, ${Number(node.params.sigma).toFixed(2)})`, 32, 14);
      break;
    }
    case "gauge": {
      const st = node.state as { v: number };
      const preset = node.params.preset as string;
      let text: string;
      let unit: string;
      switch (preset) {
        case "probability":
          text = Math.max(0, Math.min(1, st.v)).toFixed(3);
          unit = "probability";
          break;
        case "percent":
          text = `${(st.v * 100).toFixed(1)}%`;
          unit = "percent";
          break;
        case "temperature":
          text = `${st.v.toFixed(1)}°C`;
          unit = "temperature";
          break;
        case "zscore":
          text = `z = ${st.v.toFixed(2)}`;
          unit = "standard score";
          break;
        default:
          text = st.v.toFixed(3);
          unit = "raw value";
      }
      ctx.fillStyle = THEME.ok;
      ctx.font = "bold 30px ui-monospace, monospace";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(text, w / 2, h / 2 - 8);
      ctx.fillStyle = THEME.muted;
      ctx.font = "11px ui-sans-serif, system-ui, sans-serif";
      ctx.fillText(unit, w / 2, h - 16);
      ctx.textAlign = "left";
      ctx.textBaseline = "alphabetic";
      break;
    }
    case "data": {
      const st = node.state as { values: number[] };
      if (st.values.length === 0) {
        ctx.fillStyle = THEME.muted;
        ctx.font = "12px ui-sans-serif, system-ui, sans-serif";
        ctx.fillText("no data loaded", 8, h / 2);
        break;
      }
      drawHist(ctx, w, h, st.values, THEME.series2);
      ctx.fillStyle = THEME.muted;
      ctx.font = "11px ui-monospace, monospace";
      ctx.fillText(`n=${st.values.length}`, 32, 14);
      break;
    }
    case "frame": {
      const st = node.state as { buf: number[] };
      const out = node.outputs;
      const mean = out.mean?.[0] ?? 0;
      const se = out.se?.[0] ?? 0;
      const tc = st.buf.length > 1 ? studentTCritical(0.05, st.buf.length - 1) : 1.96;
      drawHist(ctx, w, h, st.buf, THEME.accent, [{ x: mean, color: THEME.gold }], {
        lo: mean - tc * se,
        hi: mean + tc * se,
      });
      ctx.fillStyle = THEME.muted;
      ctx.font = "11px ui-monospace, monospace";
      ctx.fillText(`n=${st.buf.length}  se=${se.toFixed(4)}`, 32, 14);
      break;
    }
    case "test": {
      const st = node.state as { res: { t: number; df: number } | null };
      const r = st.res;
      const xmax = 5;
      const df = r ? Math.max(1, r.df) : 8;
      const pdfMax = tPdf(0, df);
      const p = axes(ctx, w, h, -xmax, xmax, 0, pdfMax);
      const curve = (g: (x: number) => number) => {
        ctx.beginPath();
        for (let i = 0; i <= p.w; i++) {
          const x = -xmax + (i / p.w) * 2 * xmax;
          const y = p.py(g(x));
          if (i === 0) ctx.moveTo(p.x0 + i, y);
          else ctx.lineTo(p.x0 + i, y);
        }
        ctx.stroke();
      };
      // shaded rejection region beyond ±|t|
      if (r) {
        const tAbs = Math.min(Math.abs(r.t), xmax);
        ctx.fillStyle = alpha(THEME.bad, 0.3);
        for (let i = 0; i <= p.w; i++) {
          const x = -xmax + (i / p.w) * 2 * xmax;
          if (Math.abs(x) >= tAbs) {
            const y = p.py(tPdf(x, df));
            ctx.fillRect(p.x0 + i, y, 1, p.y0 + p.h - y);
          }
        }
      }
      // normal-approximation overlay (dashed) vs the exact t (solid)
      ctx.strokeStyle = THEME.series2;
      ctx.lineWidth = 1;
      ctx.setLineDash([3, 3]);
      curve((x) => Math.exp((-x * x) / 2) / Math.sqrt(2 * Math.PI));
      ctx.setLineDash([]);
      ctx.strokeStyle = THEME.ink;
      ctx.lineWidth = 1.5;
      curve((x) => tPdf(x, df));
      if (r) {
        const xt = p.px(Math.max(-xmax, Math.min(xmax, r.t)));
        ctx.strokeStyle = THEME.bad;
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(xt, p.y0);
        ctx.lineTo(xt, p.y0 + p.h);
        ctx.stroke();
        const pv = node.outputs.p?.[0] ?? 1;
        const rej = node.outputs.reject?.[0] === 1;
        ctx.fillStyle = THEME.ink;
        ctx.font = "bold 11px ui-monospace, monospace";
        ctx.fillText(
          `t=${r.t.toFixed(2)} p=${pv < 1e-3 ? pv.toExponential(1) : pv.toFixed(3)}`,
          p.x0 + 2,
          p.y0 + 9,
        );
        ctx.fillStyle = rej ? THEME.bad : THEME.ok;
        ctx.font = "bold 10px ui-monospace, monospace";
        ctx.fillText(rej ? "● REJECT H₀" : "● n.s.", p.x0 + 2, p.y0 + 21);
      }
      ctx.fillStyle = THEME.muted;
      ctx.font = "8px ui-monospace, monospace";
      ctx.fillText("solid: exact t · dashed: normal", p.x0 + 2, p.y0 + p.h - 3);
      break;
    }
    case "boot": {
      const st = node.state as { res: { replicates: number[]; lo: number; hi: number; estimate: number } | null };
      const r = st.res;
      if (r) {
        drawHist(ctx, w, h, r.replicates, THEME.series2, [
          { x: r.estimate, color: THEME.gold },
          { x: r.lo, color: THEME.bad },
          { x: r.hi, color: THEME.bad },
        ]);
        ctx.fillStyle = THEME.muted;
        ctx.font = "11px ui-monospace, monospace";
        ctx.fillText(`[${r.lo.toFixed(2)}, ${r.hi.toFixed(2)}]`, 32, 14);
      } else {
        ctx.fillStyle = THEME.muted;
        ctx.font = "12px ui-monospace, monospace";
        ctx.fillText("filling buffer…", 8, h / 2);
      }
      break;
    }
    case "regress": {
      const st = node.state as {
        bx: number[];
        by: number[];
        fit: { slope: number; intercept: number; r2: number } | null;
      };
      if (st.bx.length < 2) break;
      const [xlo, xhi] = extent(st.bx);
      const [ylo, yhi] = extent(st.by);
      const p = axes(ctx, w, h, xlo, xhi, ylo, yhi);
      ctx.fillStyle = THEME.accent;
      for (let i = 0; i < st.bx.length; i++) {
        ctx.beginPath();
        ctx.arc(p.px(st.bx[i]), p.py(st.by[i]), 1.8, 0, 2 * Math.PI);
        ctx.fill();
      }
      const f = st.fit;
      if (f) {
        ctx.strokeStyle = THEME.gold;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(p.px(xlo), p.py(f.intercept + f.slope * xlo));
        ctx.lineTo(p.px(xhi), p.py(f.intercept + f.slope * xhi));
        ctx.stroke();
        ctx.fillStyle = THEME.muted;
        ctx.font = "9px ui-monospace, monospace";
        ctx.fillText(`β=${f.slope.toFixed(3)}  R²=${f.r2.toFixed(3)}`, p.x0 + 2, p.y0 + 8);
      }
      break;
    }
    case "code": {
      const st = node.state as { counts: number[] };
      const counts = st.counts ?? [];
      const k = counts.length || 1;
      const max = Math.max(...counts, 1);
      const p = axes(ctx, w, h, 0.5, k + 0.5, 0, max, {
        xtickVals: Array.from({ length: k }, (_, i) => i + 1),
        xtickFmt: (v) => String(Math.round(v)),
      });
      const bw = p.w / k;
      ctx.fillStyle = THEME.series2;
      for (let i = 0; i < k; i++) {
        const y = p.py(counts[i]);
        ctx.fillRect(p.x0 + i * bw + 3, y, bw - 6, p.y0 + p.h - y);
      }
      break;
    }
    case "tab": {
      const st = node.state as {
        mat: number[][];
        res: { chi2: number; p: number; v: number } | null;
      };
      const mat = st.mat ?? [];
      const R = mat.length;
      const C = mat[0]?.length ?? 0;
      if (R && C) {
        let max = 1;
        for (const row of mat) for (const v of row) max = Math.max(max, v);
        const gw = (w - 12) / C;
        const gh = (h - 34) / R;
        for (let r = 0; r < R; r++) {
          for (let c = 0; c < C; c++) {
            const a = mat[r][c] / max;
            ctx.fillStyle = alpha(THEME.accent, 0.12 + 0.8 * a);
            ctx.fillRect(6 + c * gw, 6 + r * gh, gw - 2, gh - 2);
            ctx.fillStyle = THEME.ink;
            ctx.font = "10px ui-monospace, monospace";
            ctx.fillText(String(mat[r][c]), 6 + c * gw + 4, 6 + r * gh + 13);
          }
        }
      }
      const res = st.res;
      ctx.fillStyle = THEME.muted;
      ctx.font = "11px ui-monospace, monospace";
      if (res) {
        ctx.fillText(
          `χ²=${res.chi2.toFixed(1)}  p=${res.p < 1e-3 ? res.p.toExponential(1) : res.p.toFixed(3)}  V=${res.v.toFixed(2)}`,
          6,
          h - 6,
        );
      }
      break;
    }
    case "means": {
      const st = node.state as { hist: number[] };
      if (st.hist.length === 0) {
        ctx.fillStyle = THEME.muted;
        ctx.font = "11px ui-sans-serif, system-ui, sans-serif";
        ctx.fillText("collecting batches…", 8, h / 2);
        break;
      }
      drawHist(ctx, w, h, st.hist, THEME.series2);
      ctx.fillStyle = THEME.muted;
      ctx.font = "9px ui-monospace, monospace";
      ctx.fillText(`${st.hist.length} batch means · n=${Number(node.params.n)}`, 32, 14);
      break;
    }
    case "power": {
      const st = node.state as { rej: number; total: number };
      const rate = st.total > 0 ? st.rej / st.total : 0;
      const al = Number(node.params.alpha);
      ctx.fillStyle = THEME.ink;
      ctx.font = "bold 30px ui-monospace, monospace";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(`${(rate * 100).toFixed(0)}%`, w / 2, h / 2 - 16);
      ctx.fillStyle = THEME.muted;
      ctx.font = "10px ui-sans-serif, system-ui, sans-serif";
      ctx.fillText(`rejection rate · ${st.total} experiments`, w / 2, h / 2 + 6);
      ctx.textAlign = "left";
      ctx.textBaseline = "alphabetic";
      const bx = 20;
      const bw = w - 40;
      const by = h - 24;
      const bh = 10;
      ctx.strokeStyle = THEME.grid;
      ctx.strokeRect(bx, by, bw, bh);
      ctx.fillStyle = THEME.accent;
      ctx.fillRect(bx, by, bw * Math.min(1, Math.max(0, rate)), bh);
      ctx.strokeStyle = THEME.gold;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(bx + bw * al, by - 3);
      ctx.lineTo(bx + bw * al, by + bh + 3);
      ctx.stroke();
      ctx.fillStyle = THEME.muted;
      ctx.font = "8px ui-monospace, monospace";
      ctx.fillText(`α=${al}`, bx + bw * al + 2, by - 5);
      break;
    }
    case "qq": {
      const st = node.state as { buf: number[] };
      const b = st.buf ?? [];
      if (b.length < 8) {
        ctx.fillStyle = THEME.muted;
        ctx.font = "11px ui-sans-serif, system-ui, sans-serif";
        ctx.fillText("collecting data…", 8, h / 2);
        break;
      }
      const sorted = [...b].sort((x, y) => x - y);
      const n = sorted.length;
      const mean = sorted.reduce((a, c) => a + c, 0) / n;
      const sd = Math.sqrt(sorted.reduce((a, c) => a + (c - mean) ** 2, 0) / (n - 1));
      const tq = (i: number) => normalQuantile((i + 0.5) / n);
      const xlo = tq(0);
      const xhi = tq(n - 1);
      const [ylo, yhi] = extent(sorted);
      const p = axes(ctx, w, h, xlo, xhi, ylo, yhi);
      ctx.strokeStyle = THEME.gold;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(p.px(xlo), p.py(mean + sd * xlo));
      ctx.lineTo(p.px(xhi), p.py(mean + sd * xhi));
      ctx.stroke();
      ctx.fillStyle = THEME.accent;
      for (let i = 0; i < n; i++) {
        ctx.beginPath();
        ctx.arc(p.px(tq(i)), p.py(sorted[i]), 1.6, 0, 2 * Math.PI);
        ctx.fill();
      }
      ctx.fillStyle = THEME.muted;
      ctx.font = "9px ui-monospace, monospace";
      ctx.fillText("sample vs Normal q", p.x0 + 2, p.y0 + 8);
      break;
    }
    case "summary": {
      const st = node.state as { s: ReturnType<typeof summarize> };
      const s = st.s;
      if (!s || s.n === 0) {
        ctx.fillStyle = THEME.muted;
        ctx.font = "11px ui-sans-serif, system-ui, sans-serif";
        ctx.fillText("collecting data…", 8, h / 2);
        break;
      }
      const rows: [string, string][] = [
        ["n", String(s.n)],
        ["mean", s.mean.toFixed(3)],
        ["SD", s.sd.toFixed(3)],
        ["SE", s.se.toFixed(3)],
        ["min", s.min.toFixed(2)],
        ["Q1", s.q1.toFixed(2)],
        ["median", s.median.toFixed(2)],
        ["Q3", s.q3.toFixed(2)],
        ["max", s.max.toFixed(2)],
        ["IQR", s.iqr.toFixed(2)],
        ["skew", s.skew.toFixed(2)],
        ["kurt", s.kurt.toFixed(2)],
      ];
      ctx.font = "11px ui-monospace, monospace";
      ctx.textBaseline = "alphabetic";
      const colW = w / 2;
      const rowH = (h - 8) / 6;
      for (let i = 0; i < rows.length; i++) {
        const col = Math.floor(i / 6);
        const r = i % 6;
        const x = 8 + col * colW;
        const y = 16 + r * rowH;
        ctx.fillStyle = THEME.muted;
        ctx.fillText(rows[i][0], x, y);
        ctx.fillStyle = THEME.ink;
        ctx.textAlign = "right";
        ctx.fillText(rows[i][1], x + colW - 14, y);
        ctx.textAlign = "left";
      }
      break;
    }
    case "box": {
      const st = node.state as { buf: number[] };
      const b = st.buf ?? [];
      if (b.length < 4) {
        ctx.fillStyle = THEME.muted;
        ctx.font = "11px ui-sans-serif, system-ui, sans-serif";
        ctx.fillText("collecting data…", 8, h / 2);
        break;
      }
      const sorted = [...b].sort((x, y) => x - y);
      const q1 = quantileSorted(sorted, 0.25);
      const med = quantileSorted(sorted, 0.5);
      const q3 = quantileSorted(sorted, 0.75);
      const iqr = q3 - q1;
      const loFence = q1 - 1.5 * iqr;
      const hiFence = q3 + 1.5 * iqr;
      const inliers = sorted.filter((v) => v >= loFence && v <= hiFence);
      const wLo = inliers[0];
      const wHi = inliers[inliers.length - 1];
      const outliers = sorted.filter((v) => v < loFence || v > hiFence);
      const p = axes(ctx, w, h, sorted[0], sorted[sorted.length - 1], 0, 1, { yticks: 1 });
      const cy = p.y0 + p.h * 0.5;
      const bh = p.h * 0.42;
      // whiskers
      ctx.strokeStyle = THEME.muted;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(p.px(wLo), cy);
      ctx.lineTo(p.px(q1), cy);
      ctx.moveTo(p.px(q3), cy);
      ctx.lineTo(p.px(wHi), cy);
      ctx.moveTo(p.px(wLo), cy - bh / 2);
      ctx.lineTo(p.px(wLo), cy + bh / 2);
      ctx.moveTo(p.px(wHi), cy - bh / 2);
      ctx.lineTo(p.px(wHi), cy + bh / 2);
      ctx.stroke();
      // box
      ctx.fillStyle = alpha(THEME.accent, 0.3);
      ctx.fillRect(p.px(q1), cy - bh / 2, p.px(q3) - p.px(q1), bh);
      ctx.strokeStyle = THEME.accent;
      ctx.strokeRect(p.px(q1), cy - bh / 2, p.px(q3) - p.px(q1), bh);
      // median
      ctx.strokeStyle = THEME.gold;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(p.px(med), cy - bh / 2);
      ctx.lineTo(p.px(med), cy + bh / 2);
      ctx.stroke();
      // outliers
      ctx.fillStyle = THEME.bad;
      for (const v of outliers) {
        ctx.beginPath();
        ctx.arc(p.px(v), cy, 2, 0, 2 * Math.PI);
        ctx.fill();
      }
      ctx.fillStyle = THEME.muted;
      ctx.font = "9px ui-monospace, monospace";
      ctx.fillText(`median ${med.toFixed(2)} · IQR ${iqr.toFixed(2)}`, p.x0 + 2, p.y0 + 9);
      break;
    }
    case "ecdf": {
      const st = node.state as { buf: number[] };
      const b = st.buf ?? [];
      if (b.length < 4) {
        ctx.fillStyle = THEME.muted;
        ctx.font = "11px ui-sans-serif, system-ui, sans-serif";
        ctx.fillText("collecting data…", 8, h / 2);
        break;
      }
      const sorted = [...b].sort((x, y) => x - y);
      const n = sorted.length;
      const [lo, hi] = extent(sorted);
      const mean = sorted.reduce((a, c) => a + c, 0) / n;
      const sd = Math.sqrt(sorted.reduce((a, c) => a + (c - mean) ** 2, 0) / (n - 1));
      const p = axes(ctx, w, h, lo, hi, 0, 1);
      // Normal CDF overlay (dashed)
      ctx.strokeStyle = THEME.series2;
      ctx.lineWidth = 1;
      ctx.setLineDash([3, 3]);
      ctx.beginPath();
      for (let i = 0; i <= p.w; i++) {
        const x = lo + (i / p.w) * (hi - lo);
        const y = p.py(sd > 0 ? normalCdf((x - mean) / sd) : 0);
        if (i === 0) ctx.moveTo(p.x0 + i, y);
        else ctx.lineTo(p.x0 + i, y);
      }
      ctx.stroke();
      ctx.setLineDash([]);
      // empirical step function
      ctx.strokeStyle = THEME.accent;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      let prevY = p.py(0);
      ctx.moveTo(p.px(sorted[0]), prevY);
      for (let i = 0; i < n; i++) {
        const x = p.px(sorted[i]);
        ctx.lineTo(x, prevY); // horizontal to this value
        const y = p.py((i + 1) / n);
        ctx.lineTo(x, y); // step up by 1/n
        prevY = y;
      }
      ctx.stroke();
      ctx.fillStyle = THEME.muted;
      ctx.font = "9px ui-monospace, monospace";
      ctx.fillText("solid: empirical · dashed: Normal", p.x0 + 2, p.y0 + 9);
      break;
    }
    case "coverage": {
      const st = node.state as {
        recent: { lo: number; hi: number; ok: boolean }[];
        covered: number;
        total: number;
      };
      const rec = st.recent ?? [];
      const mu0 = Number(node.params.mu0);
      if (rec.length === 0) {
        ctx.fillStyle = THEME.muted;
        ctx.font = "11px ui-sans-serif, system-ui, sans-serif";
        ctx.fillText("running experiments…", 8, h / 2);
        break;
      }
      let lo = mu0;
      let hi = mu0;
      for (const r of rec) {
        lo = Math.min(lo, r.lo);
        hi = Math.max(hi, r.hi);
      }
      const pad = (hi - lo) * 0.05 || 1;
      lo -= pad;
      hi += pad;
      const left = 6;
      const topM = 20;
      const botM = 12;
      const pw = w - left - 6;
      const ph = h - topM - botM;
      const px = (v: number) => left + ((v - lo) / (hi - lo || 1)) * pw;
      // true-mean line
      ctx.strokeStyle = THEME.gold;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(px(mu0), topM - 2);
      ctx.lineTo(px(mu0), topM + ph);
      ctx.stroke();
      // stacked intervals, newest on top
      const m = rec.length;
      const rowH = Math.min(7, ph / m);
      for (let i = 0; i < m; i++) {
        const r = rec[m - 1 - i];
        const y = topM + i * rowH + rowH / 2;
        ctx.strokeStyle = r.ok ? THEME.ok : THEME.bad;
        ctx.lineWidth = Math.max(1, rowH - 1.5);
        ctx.beginPath();
        ctx.moveTo(px(r.lo), y);
        ctx.lineTo(px(r.hi), y);
        ctx.stroke();
      }
      ctx.fillStyle = THEME.muted;
      ctx.font = "8px ui-monospace, monospace";
      ctx.textAlign = "center";
      ctx.textBaseline = "top";
      for (const t of [lo, (lo + hi) / 2, hi]) ctx.fillText(fmtTick(t), px(t), topM + ph + 1);
      ctx.textAlign = "left";
      ctx.textBaseline = "alphabetic";
      const cov = st.total > 0 ? st.covered / st.total : 0;
      ctx.fillStyle = THEME.ink;
      ctx.font = "bold 11px ui-monospace, monospace";
      ctx.fillText(`coverage ${(cov * 100).toFixed(0)}% (${st.covered}/${st.total})`, left + 2, 12);
      break;
    }
    case "lag": {
      const st = node.state as { rhos: number[]; band: number };
      const rhos = st.rhos ?? [];
      const k = rhos.length || 1;
      const xt = [1, Math.ceil(k / 2), k].filter((v, i, arr) => arr.indexOf(v) === i);
      const p = axes(ctx, w, h, 0.5, k + 0.5, -1, 1, {
        xtickVals: xt,
        xtickFmt: (v) => String(Math.round(v)),
        yticks: 4,
      });
      const bw = p.w / k;
      const mid = p.py(0);
      // Bartlett ±1.96/√n bands
      ctx.strokeStyle = alpha(THEME.gold, 0.6);
      ctx.lineWidth = 1;
      ctx.setLineDash([2, 2]);
      for (const sgn of [-1, 1]) {
        const y = p.py(sgn * st.band);
        ctx.beginPath();
        ctx.moveTo(p.x0, y);
        ctx.lineTo(p.x0 + p.w, y);
        ctx.stroke();
      }
      ctx.setLineDash([]);
      for (let i = 0; i < k; i++) {
        const y = p.py(rhos[i]);
        ctx.fillStyle = Math.abs(rhos[i]) > st.band ? THEME.bad : THEME.accent;
        ctx.fillRect(p.x0 + i * bw + 2, Math.min(y, mid), bw - 4, Math.abs(y - mid));
      }
      ctx.fillStyle = THEME.muted;
      ctx.font = "9px ui-monospace, monospace";
      ctx.fillText(`ρ(1)=${(rhos[0] ?? 0).toFixed(2)}  (lag →)`, p.x0 + 2, p.y0 + 8);
      break;
    }
  }
}
