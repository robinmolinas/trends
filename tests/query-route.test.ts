import { describe, expect, it, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

import { graphFixture } from "./fixtures";

vi.mock("@/lib/graph-loader", () => ({
  loadGraphPayload: vi.fn(async () => graphFixture)
}));

const mockAnswererFactory = vi.fn();
vi.mock("@/lib/llm-query", () => ({
  createOpenRouterGroundedAnswerer: (...args: unknown[]) => mockAnswererFactory(...args)
}));

import { POST } from "@/app/api/query/route";

function makeRequest(body: Record<string, unknown>) {
  return new NextRequest("http://localhost:3000/api/query", {
    method: "POST",
    body: JSON.stringify(body),
    headers: { "content-type": "application/json" }
  });
}

describe("POST /api/query", () => {
  beforeEach(() => {
    mockAnswererFactory.mockReset();
  });

  it("uses deterministic mode by default", async () => {
    const response = await POST(makeRequest({ query: "GEO strategy for premium brands" }));
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json.modeUsed).toBe("deterministic");
  });

  it("returns llm-mode answers when an answerer is available", async () => {
    mockAnswererFactory.mockReturnValue(async () => "Use GEO-specific content infrastructure [1] and test discoverability loops [2].");

    const response = await POST(makeRequest({
      query: "How should premium brands adapt to GEO?",
      mode: "llm"
    }));
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json.modeUsed).toBe("llm");
    expect(json.answer).toContain("[1]");
    expect(json.citations).toHaveLength(2);
  });

  it("falls back to deterministic when llm answerer is unavailable", async () => {
    mockAnswererFactory.mockReturnValue(undefined);

    const response = await POST(makeRequest({
      query: "How should premium brands adapt to GEO?",
      mode: "llm"
    }));
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json.modeUsed).toBe("deterministic");
  });
});
