export type NodeType = "source" | "concept" | "entity" | "analysis" | "overview" | "index";
export type QueryMode = "deterministic" | "llm";

export type GraphNode = {
  id: string;
  type: NodeType;
  slug: string;
  title: string;
  tags: string[];
  path: string;
  summary: string;
  content: string;
  links: string[];
  sourceMeta: Record<string, unknown>;
  inboundCount: number;
  outboundCount: number;
  degree: number;
  searchText: string;
};

export type GraphEdge = {
  id: string;
  source: string;
  target: string;
  weight: number;
  relation: string;
};

export type GraphPayload = {
  generatedAt: string;
  meta: {
    totalNodes: number;
    totalEdges: number;
    countsByType: Partial<Record<NodeType, number>>;
  };
  nodes: GraphNode[];
  edges: GraphEdge[];
};

export type QueryRequest = {
  query: string;
  selectedNodeId?: string;
  filters?: NodeType[];
  mode?: QueryMode;
};

export type QueryInsight = {
  title: string;
  rationale: string;
};

export type QueryResponse = {
  query: string;
  modeUsed: QueryMode;
  answer: string;
  insights: QueryInsight[];
  evidence: Array<{
    id: string;
    title: string;
    type: NodeType;
    path: string;
    score: number;
    summary: string;
  }>;
  citations?: Array<{
    marker: string;
    index: number;
    evidenceId: string;
    evidenceTitle: string;
  }>;
  matchedTags: string[];
};
