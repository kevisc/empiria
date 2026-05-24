import { createContext, useContext } from "react";
import type { Graph } from "./engine/graph.ts";

export interface EngineContextValue {
  graph: Graph;
  frame: number;
  deleteNode: (id: string) => void;
  duplicateNode: (id: string) => void;
}

export const EngineCtx = createContext<EngineContextValue | null>(null);

export function useEngine(): EngineContextValue {
  const ctx = useContext(EngineCtx);
  if (!ctx) throw new Error("EngineCtx not provided");
  return ctx;
}
