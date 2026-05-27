import { useEffect, useRef, useState } from "react";
import { Handle, Position, type NodeProps } from "reactflow";
import { NODE_DEFS } from "./engine/nodes.ts";
import { CONTROLS, SAMPLE_PRESETS } from "./controls.ts";
import { useEngine } from "./engineCtx.ts";
import { drawNode } from "./viz.ts";
import { download, nodeColumns, parseNumbers, toCSV } from "./io.ts";
import { NODE_INFO } from "./info.ts";
import { FORMULAS } from "./formulas.ts";

export interface NodeData {
  id: string;
  kind: string;
}

/** Human-readable names for the signal ports. */
const PORT_LABELS: Record<string, string> = {
  value: "draw",
  mean: "mean",
  sd: "sd",
  se: "SE",
  sig: "in",
  sig2: "in 2",
  t: "t",
  p: "p",
  reject: "reject?",
  d: "Cohen d",
  est: "estimate",
  lo: "CI lo",
  hi: "CI hi",
  slope: "slope",
  intercept: "intercept",
  r2: "R²",
  resid: "residual",
  x: "X",
  y: "Y",
  cat: "category",
  row: "row",
  col: "col",
  chi2: "χ²",
  v: "Cramér V",
  rho1: "ρ(1)",
  white: "white?",
  a: "A",
  b: "B",
  coverage: "coverage",
  covered: "covered",
  total: "# exp",
  rejrate: "reject %",
  experiments: "# exp",
  median: "median",
  iqr: "IQR",
};
const label = (port: string) => PORT_LABELS[port] ?? port;

/** Compact live readout of a signal's first channel. */
function fmtVal(sig: number[] | undefined): string {
  if (!sig || sig.length === 0) return "–";
  const v = sig[0];
  if (!Number.isFinite(v)) return "–";
  if (v !== 0 && (Math.abs(v) >= 1e4 || Math.abs(v) < 1e-3)) return v.toExponential(1);
  return v.toFixed(3);
}

export default function NodeView({ data }: NodeProps<NodeData>) {
  const { graph, frame, showFormulas, deleteNode, duplicateNode } = useEngine();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [seedVer, setSeedVer] = useState(0);
  const [ctrlVer, setCtrlVer] = useState(0);
  const [showInfo, setShowInfo] = useState(false);
  const def = NODE_DEFS[data.kind];
  const node = graph.nodes.get(data.id);

  useEffect(() => {
    if (canvasRef.current && node && data.kind !== "note") {
      drawNode(canvasRef.current, graph, data.id);
    }
  }, [frame, graph, data.id, node]);

  if (!def || !node) return null;

  // Note: an editable sticky note, persisted in the patch via its `text` param.
  if (data.kind === "note") {
    return (
      <div className="enode enode-note">
        <span className="enode-actions note-actions">
          <button title="Duplicate" onClick={() => duplicateNode(data.id)}>
            ⧉
          </button>
          <button title="Delete" onClick={() => deleteNode(data.id)}>
            ✕
          </button>
        </span>
        <textarea
          className="note-text nodrag"
          defaultValue={String(node.params.text ?? "")}
          onChange={(e) => graph.setParam(data.id, "text", e.target.value)}
        />
      </div>
    );
  }

  const exportPNG = () => {
    const c = canvasRef.current;
    if (!c) return;
    const a = document.createElement("a");
    a.href = c.toDataURL("image/png");
    a.download = `${data.id}.png`;
    a.click();
  };
  const info = NODE_INFO[data.kind];

  const controls = CONTROLS[data.kind] ?? [];

  // The Seed node's value IS the master seed: changing it reseeds the patch.
  const applySeed = (v: number) => {
    if (Number.isNaN(v)) return;
    graph.setParam(data.id, "value", v);
    graph.setSeed(v);
  };

  // Load parsed numbers into a Data node: persist raw text in the patch and
  // refresh the live buffer.
  const loadData = (text: string, values: number[]) => {
    graph.setParam(data.id, "csv", text);
    const st = node.state as { values: number[]; idx: number };
    st.values = values;
    st.idx = 0;
  };

  // Apply a Sample preset (sets dist + params) and re-mount the controls.
  const applyPreset = (label: string) => {
    const p = SAMPLE_PRESETS.find((x) => x.label === label);
    if (!p) return;
    graph.setParam(data.id, "dist", p.dist);
    graph.setParam(data.id, "p1", p.p1);
    graph.setParam(data.id, "p2", p.p2);
    setCtrlVer((x) => x + 1);
  };

  const exportCSV = () => {
    const cols = nodeColumns(node);
    if (!cols) return;
    download(`${data.id}.csv`, toCSV(cols.headers, cols.rows), "text/csv");
  };
  const canExport = nodeColumns(node) !== null;

  return (
    <div className="enode">
      <div className="enode-head">
        <span className="enode-title">{def.label}</span>
        <span className="enode-actions">
          {info && (
            <button title="What is this?" onClick={() => setShowInfo((s) => !s)}>
              ⓘ
            </button>
          )}
          <button title="Save image (PNG)" onClick={exportPNG}>
            ⤓
          </button>
          <button title="Duplicate" onClick={() => duplicateNode(data.id)}>
            ⧉
          </button>
          <button title="Delete" onClick={() => deleteNode(data.id)}>
            ✕
          </button>
        </span>
      </div>

      {showInfo && info && (
        <div className="enode-info nodrag">
          <p>{info.concept}</p>
          {info.formula && <code>{info.formula(node)}</code>}
          <p className="enode-look">👁 {info.look}</p>
        </div>
      )}

      <canvas ref={canvasRef} width={264} height={150} className="enode-canvas" />
      {showFormulas && data.kind !== "note" && (() => {
        const ml = FORMULAS[data.kind]?.(node);
        return ml ? (
          <div
            className="enode-formula nodrag"
            // MathML rendered natively by the browser; re-evaluated each `frame`.
            dangerouslySetInnerHTML={{ __html: ml }}
          />
        ) : null;
      })()}
      <div className="enode-blurb">{def.blurb}</div>

      {data.kind === "seed" ? (
        <div className="enode-controls">
          <label className="ectrl ectrl--wide">
            <span>master seed</span>
            <input
              key={seedVer}
              type="number"
              step={1}
              defaultValue={String(node.params.value)}
              onChange={(e) => applySeed(Number(e.target.value))}
            />
          </label>
          <button
            className="seed-rand ectrl--wide"
            onClick={() => {
              applySeed(Math.floor(Math.random() * 100000));
              setSeedVer((x) => x + 1);
            }}
          >
            🎲 Randomize
          </button>
        </div>
      ) : data.kind === "data" ? (
        <div className="data-load">
          <textarea
            className="data-text nodrag"
            placeholder="paste numbers — CSV, spaces, or one per line"
            defaultValue={String(node.params.csv ?? "")}
            onChange={(e) => loadData(e.target.value, parseNumbers(e.target.value))}
          />
          <label className="data-file">
            ⬆ load .csv / .txt
            <input
              type="file"
              accept=".csv,.txt,text/*"
              style={{ display: "none" }}
              onChange={async (e) => {
                const file = e.target.files?.[0];
                if (file) {
                  const text = await file.text();
                  loadData(text, parseNumbers(text));
                }
              }}
            />
          </label>
        </div>
      ) : (
        <>
          {data.kind === "sample" && (
            <select
              className="preset-select"
              defaultValue=""
              onChange={(e) => {
                applyPreset(e.target.value);
                e.target.selectedIndex = 0;
              }}
            >
              <option value="" disabled>
                ▾ presets…
              </option>
              {SAMPLE_PRESETS.map((p) => (
                <option key={p.label} value={p.label}>
                  {p.label}
                </option>
              ))}
            </select>
          )}
        <div className="enode-controls" key={ctrlVer}>
          {controls.map((c) => (
          <label
            key={c.key}
            className={`ectrl${c.kind === "select" ? " ectrl--wide" : ""}`}
          >
            <span>{c.label}</span>
            {c.kind === "select" ? (
              <select
                defaultValue={String(node.params[c.key])}
                onChange={(e) => {
                  if (data.kind === "seed") graph.setSeed(Number(e.target.value));
                  else graph.setParam(data.id, c.key, e.target.value);
                }}
              >
                {c.options!.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            ) : (
              <input
                type="number"
                step={c.step ?? 1}
                defaultValue={String(node.params[c.key])}
                onChange={(e) => {
                  const v = Number(e.target.value);
                  if (Number.isNaN(v)) return;
                  if (data.kind === "seed") graph.setSeed(v);
                  else graph.setParam(data.id, c.key, v);
                }}
              />
            )}
          </label>
          ))}
        </div>
        </>
      )}

      {canExport && (
        <button className="csv-btn" onClick={exportCSV}>
          ⬇ export CSV
        </button>
      )}

      {(def.inputs.length > 0 || def.outputs.length > 0) && (
        <div className="enode-io">
          <div className="io-col io-in">
            {def.inputs.map((port) => (
              <div className="port" key={`in-${port}`}>
                <Handle
                  id={port}
                  type="target"
                  position={Position.Left}
                  className="ehandle"
                />
                <span className="port-label">{label(port)}</span>
              </div>
            ))}
          </div>
          <div className="io-col io-out">
            {def.outputs.map((port) => (
              <div className="port port-out" key={`out-${port}`}>
                <span className="port-label">{label(port)}</span>
                <span className="port-val">{fmtVal(node.outputs[port])}</span>
                <Handle
                  id={port}
                  type="source"
                  position={Position.Right}
                  className="ehandle"
                />
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
