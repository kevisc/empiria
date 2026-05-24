import { MT19937 } from "./rng.ts";
import { NODE_DEFS } from "./nodes.ts";

/** A signal is a vector of channels (mono = length 1), supporting polyphony. */
export type Signal = number[];

export interface NodeRuntime {
  id: string;
  type: string;
  params: Record<string, number | string>;
  state: Record<string, unknown>;
  rng: MT19937;
  outputs: Record<string, Signal>;
}

export interface Edge {
  from: string;
  fromPort: string;
  to: string;
  toPort: string;
}

/** Stable per-node seed: same (globalSeed, id) -> same stream, any order. */
function nodeSeed(globalSeed: number, id: string): number {
  let h = globalSeed >>> 0;
  for (let i = 0; i < id.length; i++) {
    h = Math.imul(h ^ id.charCodeAt(i), 2654435761) >>> 0;
  }
  return (h >>> 0) || 1;
}

export class Graph {
  nodes = new Map<string, NodeRuntime>();
  edges: Edge[] = [];
  globalSeed = 1;
  tickIndex = 0;
  private order: string[] = [];

  addNode(type: string, id: string): NodeRuntime {
    const def = NODE_DEFS[type];
    if (!def) throw new Error(`Unknown node type: ${type}`);
    const params = { ...def.defaultParams };
    const node: NodeRuntime = {
      id,
      type,
      params,
      state: def.init(params),
      rng: new MT19937(nodeSeed(this.globalSeed, id)),
      outputs: {},
    };
    this.nodes.set(id, node);
    this.recomputeOrder();
    return node;
  }

  removeNode(id: string): void {
    this.nodes.delete(id);
    this.edges = this.edges.filter((e) => e.from !== id && e.to !== id);
    this.recomputeOrder();
  }

  connect(from: string, fromPort: string, to: string, toPort: string): void {
    this.edges.push({ from, fromPort, to, toPort });
    this.recomputeOrder();
  }

  disconnect(to: string, toPort: string): void {
    this.edges = this.edges.filter(
      (e) => !(e.to === to && e.toPort === toPort),
    );
    this.recomputeOrder();
  }

  setParam(id: string, key: string, value: number | string): void {
    const node = this.nodes.get(id);
    if (!node) return;
    node.params[key] = value;
  }

  setSeed(seed: number): void {
    this.globalSeed = seed >>> 0;
    this.reset();
  }

  /** Remove every node and edge (used when loading a patch). */
  clear(): void {
    this.nodes.clear();
    this.edges = [];
    this.order = [];
    this.tickIndex = 0;
  }

  /** Re-seed and re-initialise every node; restart the clock. */
  reset(): void {
    this.tickIndex = 0;
    for (const node of this.nodes.values()) {
      const def = NODE_DEFS[node.type];
      node.rng = new MT19937(nodeSeed(this.globalSeed, node.id));
      node.state = def.init(node.params);
      node.outputs = {};
    }
  }

  /** Kahn topological sort; falls back to insertion order if a cycle exists. */
  private recomputeOrder(): void {
    const indeg = new Map<string, number>();
    for (const id of this.nodes.keys()) indeg.set(id, 0);
    for (const e of this.edges) {
      if (this.nodes.has(e.to)) indeg.set(e.to, (indeg.get(e.to) ?? 0) + 1);
    }
    const queue = [...indeg.entries()].filter(([, d]) => d === 0).map(([id]) => id);
    const out: string[] = [];
    while (queue.length) {
      const id = queue.shift()!;
      out.push(id);
      for (const e of this.edges) {
        if (e.from === id && this.nodes.has(e.to)) {
          const d = (indeg.get(e.to) ?? 1) - 1;
          indeg.set(e.to, d);
          if (d === 0) queue.push(e.to);
        }
      }
    }
    this.order = out.length === this.nodes.size ? out : [...this.nodes.keys()];
  }

  private gatherInputs(id: string): Record<string, Signal> {
    const inputs: Record<string, Signal> = {};
    for (const e of this.edges) {
      if (e.to !== id) continue;
      const src = this.nodes.get(e.from);
      const sig = src?.outputs[e.fromPort];
      if (!sig) continue;
      // Multiple cables into one port concatenate channels (polyphonic merge).
      inputs[e.toPort] = inputs[e.toPort] ? [...inputs[e.toPort], ...sig] : sig;
    }
    return inputs;
  }

  /** Advance the global clock by `steps` ticks. */
  tick(steps = 1): void {
    for (let s = 0; s < steps; s++) {
      for (const id of this.order) {
        const node = this.nodes.get(id)!;
        const def = NODE_DEFS[node.type];
        node.outputs = def.tick(node, this.gatherInputs(id));
      }
      this.tickIndex++;
    }
  }
}
