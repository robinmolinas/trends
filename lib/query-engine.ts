import type { GraphNode, GraphPayload, NodeType, QueryResponse } from "./types";

type RankedNode = GraphNode & { score: number };

const STOP_WORDS = new Set([
  "a",
  "an",
  "the",
  "and",
  "or",
  "to",
  "for",
  "of",
  "in",
  "on",
  "at",
  "with",
  "is",
  "are",
  "be",
  "what",
  "how",
  "why",
  "when",
  "does",
  "do",
  "about",
  "from",
  "by",
  "i",
  "we",
  "you",
  "our"
]);

function tokenize(input: string): string[] {
  return input
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .map((part) => part.trim())
    .filter((part) => part.length > 1 && !STOP_WORDS.has(part));
}

function buildAdjacency(payload: GraphPayload): Map<string, Set<string>> {
  const adjacency = new Map<string, Set<string>>();

  for (const edge of payload.edges) {
    if (!adjacency.has(edge.source)) adjacency.set(edge.source, new Set());
    if (!adjacency.has(edge.target)) adjacency.set(edge.target, new Set());
    adjacency.get(edge.source)?.add(edge.target);
    adjacency.get(edge.target)?.add(edge.source);
  }

  return adjacency;
}

function scoreNode(node: GraphNode, terms: string[], selectedNodeId?: string, adjacency?: Map<string, Set<string>>) {
  let score = 0;
  const title = node.title.toLowerCase();
  const summary = node.summary.toLowerCase();
  const tags = node.tags.map((tag) => tag.toLowerCase());

  for (const term of terms) {
    if (title.includes(term)) score += 10;
    if (summary.includes(term)) score += 5;
    if (tags.some((tag) => tag.includes(term))) score += 7;
    if (node.type.includes(term as NodeType)) score += 3;
  }

  score += Math.min(node.degree, 12) * 0.25;

  if (selectedNodeId && adjacency?.get(selectedNodeId)?.has(node.id)) {
    score += 5;
  }

  if (selectedNodeId && node.id === selectedNodeId) {
    score += 8;
  }

  return score;
}

function generateAnswer(query: string, ranked: RankedNode[], matchedTags: string[]) {
  const concepts = ranked.filter((node) => node.type === "concept").slice(0, 3);
  const sources = ranked.filter((node) => node.type === "source").slice(0, 4);

  const conceptLine = concepts.length
    ? `The strongest trend vectors for this question are ${concepts.map((c) => c.title).join(", ")}.`
    : "The graph points to a mixed signal set rather than one dominant trend.";

  const implicationLine = sources.length
    ? `Recent evidence emphasizes ${sources
        .map((s) => s.summary || s.title)
        .slice(0, 2)
        .join("; ")}.`
    : "There is limited directly linked evidence for this query in the current wiki.";

  const tagsLine = matchedTags.length
    ? `Most aligned tags: ${matchedTags.slice(0, 6).join(", ")}.`
    : "No dominant tag cluster emerged from this query.";

  return `${conceptLine} ${implicationLine} ${tagsLine} Use this as a directional hypothesis, then inspect the cited pages before making commitments.`;
}

function generateInsights(ranked: RankedNode[]) {
  const concepts = ranked.filter((node) => node.type === "concept").slice(0, 3);
  const entities = ranked.filter((node) => node.type === "entity").slice(0, 2);
  const sources = ranked.filter((node) => node.type === "source").slice(0, 3);

  const insights = [];

  if (concepts.length) {
    insights.push({
      title: "Primary trend direction",
      rationale: concepts.map((concept) => concept.title).join(" + ")
    });
  }

  if (entities.length) {
    insights.push({
      title: "Players to watch",
      rationale: entities.map((entity) => entity.title).join(", ")
    });
  }

  if (sources.length) {
    insights.push({
      title: "Evidence concentration",
      rationale: sources.map((source) => source.title).join("; ")
    });
  }

  return insights.slice(0, 3);
}

export function answerQuery(payload: GraphPayload, query: string, selectedNodeId?: string, filters?: NodeType[]): QueryResponse {
  const terms = tokenize(query);
  const activeTypes = filters?.length ? new Set(filters) : null;
  const adjacency = buildAdjacency(payload);

  const ranked = payload.nodes
    .filter((node) => (activeTypes ? activeTypes.has(node.type) : true))
    .map((node) => ({
      ...node,
      score: scoreNode(node, terms, selectedNodeId, adjacency)
    }))
    .filter((node) => node.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 8);

  const tagFrequency = new Map<string, number>();
  for (const node of ranked) {
    for (const tag of node.tags) {
      tagFrequency.set(tag, (tagFrequency.get(tag) || 0) + 1);
    }
  }

  const matchedTags = [...tagFrequency.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([tag]) => tag)
    .slice(0, 8);

  const answer = ranked.length
    ? generateAnswer(query, ranked, matchedTags)
    : "No strong matches yet. Try a more specific query (for example: 'How will agentic AI reshape SMB operations in 2026?').";

  return {
    query,
    answer,
    insights: generateInsights(ranked),
    evidence: ranked.map((node) => ({
      id: node.id,
      title: node.title,
      type: node.type,
      path: node.path,
      score: Number(node.score.toFixed(2)),
      summary: node.summary
    })),
    matchedTags
  };
}
