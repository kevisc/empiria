import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import ReactFlow, {
  Background,
  Controls,
  MiniMap,
  addEdge,
  useNodesState,
  useEdgesState,
  type Connection,
  type Edge,
  type Node,
  type NodeTypes,
  type ReactFlowInstance,
} from "reactflow";
import "reactflow/dist/style.css";
import { Graph } from "./engine/graph.ts";
import { NODE_DEFS } from "./engine/nodes.ts";
import { EngineCtx } from "./engineCtx.ts";
import NodeView, { type NodeData } from "./NodeView.tsx";
import Welcome from "./Welcome.tsx";
import { applyPatch, buildPatch, type Patch } from "./patch.ts";
import { b64decode, b64encode, download } from "./io.ts";
import { LESSONS, type LessonStep } from "./lessons.ts";
import { setTheme } from "./theme.ts";

const PALETTE_GROUPS: { label: string; kinds: string[] }[] = [
  { label: "Sources", kinds: ["seed", "sample", "data"] },
  { label: "Transform", kinds: ["mix", "transform", "noise", "code"] },
  {
    label: "Statistics",
    kinds: ["frame", "summary", "test", "tab", "boot", "regress", "means", "power", "lag", "coverage"],
  },
  { label: "Display", kinds: ["scope", "box", "ecdf", "qq", "gauge"] },
  { label: "Annotate", kinds: ["note"] },
];

const AUTOSAVE_KEY = "empiria:autosave";

/** The default welcome patch: a Note + a live LLN and t-test pipeline. */
function starterPatch(): Patch {
  return {
    version: 1,
    seed: 42,
    nodes: [
      {
        id: "note-0",
        kind: "note",
        position: { x: 16, y: 16 },
        params: {
          text:
            "👋 Welcome to Empiria — a canvas for simulation-based statistics.\n\n• Press ▶ Run (top-left) to start the clock.\n• Drag from a node's right ● port to another's left ● to wire them.\n• Use the add: buttons to drop modules; ⓘ on a node explains it.\n• Pick a 📚 Lesson for a guided activity.\n\nThis starter wires Seed → Sample → Frame (watch the mean settle and SE shrink) and Sample → Test (a live t-test).",
        },
      },
      { id: "seed-1", kind: "seed", position: { x: 360, y: 20 }, params: { value: 42 } },
      {
        id: "sample-2",
        kind: "sample",
        position: { x: 360, y: 320 },
        params: { dist: "normal", p1: 0.4, p2: 1 },
      },
      {
        id: "frame-3",
        kind: "frame",
        position: { x: 720, y: 40 },
        params: { mode: "growing", n: 64 },
      },
      {
        id: "test-4",
        kind: "test",
        position: { x: 720, y: 360 },
        params: { mode: "one", n: 8, mu0: 0, alpha: 0.05 },
      },
    ],
    edges: [
      { from: "sample-2", fromPort: "value", to: "frame-3", toPort: "sig" },
      { from: "sample-2", fromPort: "value", to: "test-4", toPort: "sig" },
    ],
  };
}

export default function App() {
  const graphRef = useRef<Graph>(new Graph());
  const graph = graphRef.current;

  const [rfNodes, setRfNodes, onNodesChange] = useNodesState<NodeData>([]);
  const [rfEdges, setRfEdges, onEdgesChange] = useEdgesState([]);
  const rfNodesRef = useRef(rfNodes);
  rfNodesRef.current = rfNodes;
  const [frame, setFrame] = useState(0);
  const [running, setRunning] = useState(true);
  const [shareMsg, setShareMsg] = useState("");
  const [loadGen, setLoadGen] = useState(0);
  const [light, setLight] = useState(false);
  const [projector, setProjector] = useState(false);
  const [tour, setTour] = useState<{ steps: LessonStep[]; i: number } | null>(null);
  const [welcomeOpen, setWelcomeOpen] = useState(
    () => !localStorage.getItem("empiria:seen-welcome"),
  );

  const closeWelcome = useCallback(() => {
    localStorage.setItem("empiria:seen-welcome", "1");
    setWelcomeOpen(false);
  }, []);

  useEffect(() => {
    document.documentElement.dataset.theme = light ? "light" : "dark";
    setTheme(light ? "light" : "dark");
  }, [light]);

  useEffect(() => {
    document.documentElement.dataset.projector = projector ? "on" : "off";
  }, [projector]);
  const runningRef = useRef(true);
  const speedRef = useRef(2);
  const counter = useRef(0);
  const fileRef = useRef<HTMLInputElement>(null);
  const rfInstance = useRef<ReactFlowInstance | null>(null);
  const canvasRef = useRef<HTMLDivElement>(null);

  const nodeTypes = useMemo<NodeTypes>(() => ({ empiria: NodeView }), []);

  // Drop new nodes near the centre of the current viewport (with a little
  // jitter so repeated adds don't stack exactly).
  const centrePosition = useCallback(() => {
    const inst = rfInstance.current;
    const rect = canvasRef.current?.getBoundingClientRect();
    const jitter = () => (Math.random() - 0.5) * 80;
    if (inst && rect) {
      const p = inst.project({ x: rect.width / 2, y: rect.height / 2 });
      return { x: p.x - 130 + jitter(), y: p.y - 100 + jitter() };
    }
    return { x: 360 + jitter(), y: 360 + jitter() };
  }, []);

  const addNode = useCallback(
    (kind: string, position?: { x: number; y: number }) => {
      const id = `${kind}-${counter.current++}`;
      graph.addNode(kind, id);
      const rf: Node<NodeData> = {
        id,
        type: "empiria",
        position: position ?? centrePosition(),
        data: { id, kind },
      };
      setRfNodes((ns) => [...ns, rf]);
      return id;
    },
    [graph, setRfNodes, centrePosition],
  );

  const onConnect = useCallback(
    (c: Connection) => {
      if (c.source && c.target && c.sourceHandle && c.targetHandle) {
        graph.connect(c.source, c.sourceHandle, c.target, c.targetHandle);
      }
      setRfEdges((es) => addEdge({ ...c, animated: true }, es));
    },
    [graph, setRfEdges],
  );

  const onEdgesDelete = useCallback(
    (deleted: Edge[]) => {
      for (const e of deleted) {
        if (e.target && e.targetHandle) graph.disconnect(e.target, e.targetHandle);
      }
    },
    [graph],
  );

  const onNodesDelete = useCallback(
    (deleted: Node[]) => {
      for (const n of deleted) graph.removeNode(n.id);
    },
    [graph],
  );

  const deleteNode = useCallback(
    (id: string) => {
      graph.removeNode(id);
      setRfNodes((ns) => ns.filter((n) => n.id !== id));
      setRfEdges((es) => es.filter((e) => e.source !== id && e.target !== id));
    },
    [graph, setRfNodes, setRfEdges],
  );

  const duplicateNode = useCallback(
    (id: string) => {
      const src = graph.nodes.get(id);
      if (!src) return;
      const newId = `${src.type}-${counter.current++}`;
      const node = graph.addNode(src.type, newId);
      for (const [k, v] of Object.entries(src.params)) node.params[k] = v;
      node.state = NODE_DEFS[src.type].init(node.params); // re-derive (e.g. Data CSV)
      const pos = rfNodesRef.current.find((n) => n.id === id)?.position ?? { x: 0, y: 0 };
      setRfNodes((ns) => [
        ...ns,
        {
          id: newId,
          type: "empiria",
          position: { x: pos.x + 40, y: pos.y + 40 },
          data: { id: newId, kind: src.type },
        },
      ]);
    },
    [graph, setRfNodes],
  );

  const positionsOf = useCallback(() => {
    const pos: Record<string, { x: number; y: number }> = {};
    rfNodesRef.current.forEach((n) => (pos[n.id] = n.position));
    return pos;
  }, []);

  const loadPatchObj = useCallback(
    (patch: Patch) => {
      counter.current = applyPatch(graph, patch) + 1;
      setRfNodes(
        patch.nodes.map((n) => ({
          id: n.id,
          type: "empiria",
          position: n.position,
          data: { id: n.id, kind: n.kind },
        })),
      );
      setRfEdges(
        patch.edges.map((e, i) => ({
          id: `e${i}`,
          source: e.from,
          sourceHandle: e.fromPort,
          target: e.to,
          targetHandle: e.toPort,
          animated: true,
        })),
      );
      // Remount the canvas so node components (and their uncontrolled fields,
      // e.g. Note text) rebuild from the new patch, and fitView reframes it.
      setLoadGen((g) => g + 1);
    },
    [graph, setRfNodes, setRfEdges],
  );

  const savePatch = useCallback(() => {
    const patch = buildPatch(graph, positionsOf());
    download("patch.empiria.json", JSON.stringify(patch, null, 2), "application/json");
  }, [graph, positionsOf]);

  // Frame the whole patch, then snapshot it to a PNG figure (for slides/papers).
  const exportFigure = useCallback(async () => {
    const el = canvasRef.current;
    if (!el) return;
    rfInstance.current?.fitView({ padding: 0.12, duration: 250 });
    await new Promise((r) => setTimeout(r, 350));
    const { toPng } = await import("html-to-image");
    const bg =
      getComputedStyle(document.documentElement).getPropertyValue("--bg").trim() || "#10151b";
    const url = await toPng(el, {
      backgroundColor: bg,
      pixelRatio: 2,
      filter: (n) => {
        const cl = (n as HTMLElement).classList;
        return (
          !cl ||
          !(
            cl.contains("react-flow__minimap") ||
            cl.contains("react-flow__controls") ||
            cl.contains("lesson-bar")
          )
        );
      },
    });
    const a = document.createElement("a");
    a.href = url;
    a.download = "empiria-patch.png";
    a.click();
  }, []);

  const shareLink = useCallback(async () => {
    const patch = buildPatch(graph, positionsOf());
    const hash = `#p=${b64encode(JSON.stringify(patch))}`;
    history.replaceState(null, "", hash);
    try {
      await navigator.clipboard.writeText(location.href);
      setShareMsg("link copied ✓");
    } catch {
      setShareMsg("link in address bar");
    }
    setTimeout(() => setShareMsg(""), 2200);
  }, [graph, positionsOf]);

  const newPatch = useCallback(() => loadPatchObj(starterPatch()), [loadPatchObj]);

  const startTour = useCallback(() => {
    const t = LESSONS.find((l) => l.id === "tour");
    if (t?.steps?.length) {
      setTour({ steps: t.steps, i: 0 });
      loadPatchObj(structuredClone(t.steps[0].patch));
    }
    closeWelcome();
  }, [loadPatchObj, closeWelcome]);

  // First load: a shared #p= link wins, else the last autosaved session, else
  // the welcome starter patch.
  const initialized = useRef(false);
  useEffect(() => {
    if (initialized.current) return; // guard against StrictMode double-invoke
    initialized.current = true;
    if (location.hash.startsWith("#p=")) {
      try {
        loadPatchObj(JSON.parse(b64decode(location.hash.slice(3))) as Patch);
        return;
      } catch {
        /* fall through */
      }
    }
    const saved = localStorage.getItem(AUTOSAVE_KEY);
    if (saved) {
      try {
        loadPatchObj(JSON.parse(saved) as Patch);
        return;
      } catch {
        /* fall through */
      }
    }
    loadPatchObj(starterPatch());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Autosave the current patch to localStorage every few seconds.
  useEffect(() => {
    const id = setInterval(() => {
      if (graph.nodes.size === 0) return;
      try {
        localStorage.setItem(
          AUTOSAVE_KEY,
          JSON.stringify(buildPatch(graph, positionsOf())),
        );
      } catch {
        /* quota / privacy mode — ignore */
      }
    }, 3000);
    return () => clearInterval(id);
  }, [graph, positionsOf]);

  // The clock: tick the engine and force a redraw each animation frame.
  useEffect(() => {
    let raf = 0;
    const loop = () => {
      if (runningRef.current) graph.tick(speedRef.current);
      setFrame((f) => (f + 1) % 1_000_000);
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [graph]);

  const ctxValue = useMemo(
    () => ({ graph, frame, deleteNode, duplicateNode }),
    [graph, frame, deleteNode, duplicateNode],
  );

  return (
    <EngineCtx.Provider value={ctxValue}>
      {welcomeOpen && <Welcome onClose={closeWelcome} onStartTour={startTour} />}
      <div className="app">
        <header className="toolbar">
          <strong className="brand">Empiria</strong>
          <button onClick={() => setWelcomeOpen(true)} title="Welcome, tour & help">
            ? Help
          </button>
          <button
            onClick={() => {
              runningRef.current = !runningRef.current;
              setRunning(runningRef.current);
            }}
          >
            {running ? "❚❚ Pause" : "▶ Run"}
          </button>
          <button onClick={() => graph.reset()}>↺ Reset</button>
          <label className="speed">
            speed
            <input
              type="range"
              min={1}
              max={50}
              defaultValue={2}
              onChange={(e) => (speedRef.current = Number(e.target.value))}
            />
          </label>
          <span className="sep" />
          <select
            className="lessons-select"
            defaultValue=""
            onChange={(e) => {
              const lesson = LESSONS.find((l) => l.id === e.target.value);
              if (lesson) {
                if (lesson.steps && lesson.steps.length) {
                  setTour({ steps: lesson.steps, i: 0 });
                  loadPatchObj(structuredClone(lesson.steps[0].patch));
                } else {
                  setTour(null);
                  loadPatchObj(structuredClone(lesson.patch));
                }
              }
              e.target.selectedIndex = 0;
            }}
          >
            <option value="" disabled>
              📚 Lessons…
            </option>
            {LESSONS.map((l) => (
              <option key={l.id} value={l.id}>
                {l.title}
              </option>
            ))}
          </select>
          <span className="sep" />
          <button onClick={() => setLight((l) => !l)}>
            {light ? "🌙 Dark" : "☀ Light"}
          </button>
          <button onClick={() => setProjector((p) => !p)}>
            {projector ? "🔎 Normal" : "📽 Projector"}
          </button>
          <span className="sep" />
          <button onClick={newPatch}>✦ New</button>
          <button onClick={savePatch}>⬇ Save</button>
          <button onClick={() => fileRef.current?.click()}>⬆ Load</button>
          <button onClick={exportFigure}>🖼 Figure</button>
          <button onClick={shareLink}>🔗 Share</button>
          {shareMsg && <span className="sharemsg">{shareMsg}</span>}
          <input
            ref={fileRef}
            type="file"
            accept=".json,application/json"
            style={{ display: "none" }}
            onChange={async (e) => {
              const file = e.target.files?.[0];
              if (file) {
                try {
                  loadPatchObj(JSON.parse(await file.text()) as Patch);
                } catch {
                  /* ignore malformed file */
                }
              }
              e.target.value = "";
            }}
          />
          <span className="sep" />
          {PALETTE_GROUPS.map((g) => (
            <span className="palette-group" key={g.label}>
              <span className="addlabel">{g.label}</span>
              {g.kinds.map((k) => (
                <button key={k} className="addbtn" onClick={() => addNode(k)}>
                  {NODE_DEFS[k].label}
                </button>
              ))}
            </span>
          ))}
        </header>
        <div className="canvas" ref={canvasRef}>
          <ReactFlow
            key={loadGen}
            nodes={rfNodes}
            edges={rfEdges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            onEdgesDelete={onEdgesDelete}
            onNodesDelete={onNodesDelete}
            onInit={(inst) => (rfInstance.current = inst)}
            nodeTypes={nodeTypes}
            fitView
            proOptions={{ hideAttribution: true }}
          >
            <Background color="var(--border)" gap={20} />
            <MiniMap pannable zoomable nodeColor="var(--accent)" maskColor="rgba(0,0,0,0.45)" />
            <Controls />
          </ReactFlow>
          {tour && (
            <div className="lesson-bar">
              <button
                onClick={() => {
                  const i = Math.max(0, tour.i - 1);
                  setTour({ ...tour, i });
                  loadPatchObj(structuredClone(tour.steps[i].patch));
                }}
                disabled={tour.i === 0}
              >
                ◀ Prev
              </button>
              <span className="lesson-step">
                Step {tour.i + 1} / {tour.steps.length}
              </span>
              <p className="lesson-instruction">{tour.steps[tour.i].instruction}</p>
              <button
                onClick={() => {
                  const i = Math.min(tour.steps.length - 1, tour.i + 1);
                  setTour({ ...tour, i });
                  loadPatchObj(structuredClone(tour.steps[i].patch));
                }}
                disabled={tour.i === tour.steps.length - 1}
              >
                Next ▶
              </button>
              <button className="lesson-close" onClick={() => setTour(null)} title="Exit tour">
                ✕
              </button>
            </div>
          )}
        </div>
      </div>
    </EngineCtx.Provider>
  );
}
