import { describe, expect, it, vi } from "vitest";
import { answerQuery, answerQueryDeterministic, rankRelevantNodes } from "@/lib/query-engine";
import { graphFixture } from "./fixtures";

describe("query engine", () => {
  it("keeps deterministic retrieval/ranking behavior", () => {
    const ranked = rankRelevantNodes(graphFixture, "How does GEO affect premium brands?", undefined, ["concept", "source"]);

    expect(ranked.length).toBeGreaterThan(0);
    expect(ranked[0].id).toBe("wiki/sources/2026-04-10-geo-report");

    const response = answerQueryDeterministic(graphFixture, "How does GEO affect premium brands?");
    expect(response.modeUsed).toBe("deterministic");
    expect(response.evidence[0]?.id).toBe("wiki/sources/2026-04-10-geo-report");
    expect(response.citations).toBeUndefined();
  });

  it("maps inline citations to evidence in llm mode", async () => {
    const llm = vi.fn(async () => "Premium brands should prioritize GEO-ready content [1] while validating model visibility shifts [2].");

    const response = await answerQuery(
      graphFixture,
      "What should premium brands do for GEO?",
      undefined,
      undefined,
      "llm",
      llm
    );

    expect(response.modeUsed).toBe("llm");
    expect(response.citations?.map((item) => item.index)).toEqual([1, 2]);
    expect(response.citations?.[0]?.evidenceId).toBe(response.evidence[0].id);
    expect(response.citations?.[1]?.evidenceId).toBe(response.evidence[1].id);
  });

  it("auto-anchors citations when llm output is uncited", async () => {
    const llm = vi.fn(async () => "This answer has no citations and should fallback.");

    const response = await answerQuery(
      graphFixture,
      "What should premium brands do for GEO?",
      undefined,
      undefined,
      "llm",
      llm
    );

    expect(response.modeUsed).toBe("llm");
    expect(response.answer).toContain("[1]");
    expect(response.citations?.[0]?.index).toBe(1);
  });
});
