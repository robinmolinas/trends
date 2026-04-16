import { NextRequest, NextResponse } from "next/server";
import { loadGraphPayload } from "@/lib/graph-loader";
import { answerQuery } from "@/lib/query-engine";
import { createOpenRouterGroundedAnswerer } from "@/lib/llm-query";
import type { NodeType, QueryMode, QueryRequest } from "@/lib/types";

const VALID_TYPES: NodeType[] = ["source", "concept", "entity", "analysis", "overview", "index"];
const VALID_MODES: QueryMode[] = ["deterministic", "llm"];

function normalizeFilters(filters: unknown): NodeType[] {
  if (!Array.isArray(filters)) return [];

  return filters.filter((value): value is NodeType =>
    typeof value === "string" && VALID_TYPES.includes(value as NodeType)
  );
}

function normalizeMode(mode: unknown): QueryMode {
  if (typeof mode === "string" && VALID_MODES.includes(mode as QueryMode)) {
    return mode as QueryMode;
  }
  return "deterministic";
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as QueryRequest;
    const query = body.query?.trim();

    if (!query) {
      return NextResponse.json({ error: "Please provide a query." }, { status: 400 });
    }

    const payload = await loadGraphPayload();
    const mode = normalizeMode(body.mode);
    const llmAnswerer = mode === "llm"
      ? createOpenRouterGroundedAnswerer({
          referer: request.nextUrl.origin,
          appName: "2026 Trends Atlas"
        })
      : undefined;
    const response = await answerQuery(
      payload,
      query,
      body.selectedNodeId,
      normalizeFilters(body.filters),
      mode,
      llmAnswerer
    );

    return NextResponse.json(response);
  } catch (error) {
    console.error("Query API error", error);
    return NextResponse.json({ error: "Something went wrong while processing the query." }, { status: 500 });
  }
}
