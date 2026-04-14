import { promises as fs } from "node:fs";
import path from "node:path";
import type { GraphPayload } from "./types";

const GRAPH_PATH = path.join(process.cwd(), "public", "data", "graph.json");

export async function loadGraphPayload(): Promise<GraphPayload> {
  const raw = await fs.readFile(GRAPH_PATH, "utf8");
  return JSON.parse(raw) as GraphPayload;
}
