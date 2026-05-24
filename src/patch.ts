import type { Graph } from "./engine/graph.ts";
import { NODE_DEFS } from "./engine/nodes.ts";

export interface PatchNode {
  id: string;
  kind: string;
  position: { x: number; y: number };
  params: Record<string, number | string>;
}

export interface Patch {
  version: number;
  seed: number;
  nodes: PatchNode[];
  edges: { from: string; fromPort: string; to: string; toPort: string }[];
}

export const PATCH_VERSION = 1;

/** Serialize the live graph plus the React Flow node positions. */
export function buildPatch(
  graph: Graph,
  positions: Record<string, { x: number; y: number }>,
): Patch {
  const nodes: PatchNode[] = [];
  for (const node of graph.nodes.values()) {
    nodes.push({
      id: node.id,
      kind: node.type,
      position: positions[node.id] ?? { x: 0, y: 0 },
      params: { ...node.params },
    });
  }
  return { version: PATCH_VERSION, seed: graph.globalSeed, nodes, edges: graph.edges.map((e) => ({ ...e })) };
}

/**
 * Rebuild the graph in place from a patch. Returns the highest numeric id
 * suffix seen, so the caller can keep new-node ids from colliding.
 */
export function applyPatch(graph: Graph, patch: Patch): number {
  graph.clear();
  graph.globalSeed = patch.seed >>> 0;
  let maxIdx = 0;
  for (const n of patch.nodes) {
    if (!NODE_DEFS[n.kind]) continue;
    const node = graph.addNode(n.kind, n.id);
    for (const [k, v] of Object.entries(n.params)) node.params[k] = v;
    const m = /-(\d+)$/.exec(n.id);
    if (m) maxIdx = Math.max(maxIdx, Number(m[1]));
  }
  for (const e of patch.edges) {
    if (graph.nodes.has(e.from) && graph.nodes.has(e.to)) {
      graph.connect(e.from, e.fromPort, e.to, e.toPort);
    }
  }
  graph.reset();
  return maxIdx;
}
