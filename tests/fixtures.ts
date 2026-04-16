import type { GraphPayload } from "@/lib/types";

export const graphFixture: GraphPayload = {
  generatedAt: "2026-04-16T00:00:00Z",
  meta: {
    totalNodes: 3,
    totalEdges: 2,
    countsByType: {
      concept: 1,
      source: 1,
      entity: 1
    }
  },
  nodes: [
    {
      id: "wiki/concepts/searchless-discovery",
      type: "concept",
      slug: "searchless-discovery",
      title: "Searchless Discovery",
      tags: ["#ai", "#technology", "#emerging"],
      path: "wiki/concepts/searchless-discovery.md",
      summary: "AI agents and recommendation systems reduce traditional search behavior.",
      content: "## Definition\nSearch is shifting toward AI-mediated discovery and recommendation.",
      links: ["wiki/sources/2026-04-10-geo-report"],
      sourceMeta: {},
      inboundCount: 1,
      outboundCount: 1,
      degree: 2,
      searchText: "searchless discovery ai agents recommendation"
    },
    {
      id: "wiki/sources/2026-04-10-geo-report",
      type: "source",
      slug: "2026-04-10-geo-report",
      title: "GEO Market Report 2026",
      tags: ["#ai", "#economics", "#established"],
      path: "wiki/sources/2026-04-10-geo-report.md",
      summary: "Premium brands relying on SEO lose visibility as GEO channels grow.",
      content: "## Summary\nBrands need GEO content architecture and agent-readable positioning.",
      links: ["wiki/concepts/searchless-discovery", "wiki/entities/openai"],
      sourceMeta: {},
      inboundCount: 1,
      outboundCount: 2,
      degree: 2,
      searchText: "geo seo premium brands visibility"
    },
    {
      id: "wiki/entities/openai",
      type: "entity",
      slug: "openai",
      title: "OpenAI",
      tags: ["#ai", "#technology"],
      path: "wiki/entities/openai.md",
      summary: "Provider of frontier AI models used in assistant-driven discovery flows.",
      content: "## Overview\nOpenAI models mediate recommendation and browsing experiences.",
      links: ["wiki/concepts/searchless-discovery"],
      sourceMeta: {},
      inboundCount: 1,
      outboundCount: 1,
      degree: 1,
      searchText: "openai models assistant discovery"
    }
  ],
  edges: [
    {
      id: "e1",
      source: "wiki/concepts/searchless-discovery",
      target: "wiki/sources/2026-04-10-geo-report",
      weight: 1,
      relation: "wikilink"
    },
    {
      id: "e2",
      source: "wiki/sources/2026-04-10-geo-report",
      target: "wiki/entities/openai",
      weight: 1,
      relation: "wikilink"
    }
  ]
};
