import type { NodeRuntime } from "./engine/graph.ts";

/** Trigger a browser download of a text file. */
export function download(filename: string, text: string, mime = "text/plain"): void {
  const blob = new Blob([text], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

/** Parse free-form numeric text (CSV/TSV/newline) into a flat number array. */
export function parseNumbers(text: string): number[] {
  return text
    .split(/[\s,;]+/)
    .map((t) => Number(t))
    .filter((v) => Number.isFinite(v));
}

/** The exportable buffer of a node, if it has one. */
export function nodeColumns(
  node: NodeRuntime,
): { headers: string[]; rows: number[][] } | null {
  const s = node.state as Record<string, unknown>;
  switch (node.type) {
    case "sample":
      return col(["draw"], s.hist as number[]);
    case "data":
      return col(["value"], s.values as number[]);
    case "frame":
      return col(["x"], s.buf as number[]);
    default:
      // CSV export lives only on the dataset-bearing nodes (Sample, Data,
      // Frame). To export another node's data, route it through a Frame.
      return null;
  }
}

function col(headers: string[], values: number[] | undefined) {
  if (!values || values.length === 0) return null;
  return { headers, rows: values.map((v) => [v]) };
}

export function toCSV(headers: string[], rows: number[][]): string {
  const head = headers.join(",");
  const body = rows
    .map((r) => r.map((v) => (Number.isFinite(v) ? String(v) : "")).join(","))
    .join("\n");
  return `${head}\n${body}\n`;
}

/** URL-safe base64 of UTF-8 text (for ?-free #p= patch links). */
export function b64encode(text: string): string {
  return btoa(unescape(encodeURIComponent(text)))
    .replace(/\+/g, "-")
    .replace(/\//g, "_");
}

export function b64decode(s: string): string {
  return decodeURIComponent(
    escape(atob(s.replace(/-/g, "+").replace(/_/g, "/"))),
  );
}
