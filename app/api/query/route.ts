import { NextRequest, NextResponse } from "next/server";
import { loadGraphPayload } from "@/lib/graph-loader";
import { answerQuery } from "@/lib/query-engine";
import type { NodeType, QueryRequest } from "@/lib/types";

const VALID_TYPES: NodeType[] = ["source", "concept", "entity", "analysis", "overview", "index"];

function normalizeFilters(filters: unknown): NodeType[] {
  if (!Array.isArray(filters)) return [];

  return filters.filter((value): value is NodeType =>
    typeof value === "string" && VALID_TYPES.includes(value as NodeType)
  );
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as QueryRequest;
    const query = body.query?.trim();

    if (!query) {
      return NextResponse.json({ error: "Please provide a query." }, { status: 400 });
    }

    const payload = await loadGraphPayload();
    const response = answerQuery(payload, query, body.selectedNodeId, normalizeFilters(body.filters));

    return NextResponse.json(response);
  } catch (error) {
    console.error("Query API error", error);
    return NextResponse.json({ error: "Something went wrong while processing the query." }, { status: 500 });
  }
}
