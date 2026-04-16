"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { GraphPayload, GraphNode, NodeType, QueryMode, QueryResponse } from "@/lib/types";
import { GraphCanvas } from "./graph-canvas";
import { Toolbar } from "./toolbar";
import { NodePanel } from "./node-panel";
import { QueryBar } from "./query-bar";

const ALL_TYPES: NodeType[] = ["concept", "source", "entity", "analysis", "overview", "index"];

type QueryState = {
  isLoading: boolean;
  data: QueryResponse | null;
  error: string | null;
};

export function TrendsAtlas() {
  // Data state
  const [payload, setPayload] = useState<GraphPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  // Interaction state
  const [searchTerm, setSearchTerm] = useState("");
  const [activeTypes, setActiveTypes] = useState<NodeType[]>(ALL_TYPES);
  const [selectedNodeId, setSelectedNodeId] = useState<string | undefined>(undefined);

  // Query state
  const [query, setQuery] = useState("");
  const [queryMode, setQueryMode] = useState<QueryMode>("deterministic");
  const [queryState, setQueryState] = useState<QueryState>({
    isLoading: false,
    data: null,
    error: null
  });
  const [isQueryExpanded, setIsQueryExpanded] = useState(false);
  const [highlightedNodeIds, setHighlightedNodeIds] = useState<Set<string>>(new Set());

  // Viewport state
  const [viewportSize, setViewportSize] = useState({ width: 1200, height: 800 });
  const isPanelOpen = !!selectedNodeId;
  const panelWidth = Math.min(480, Math.max(360, viewportSize.width * 0.28));

  useEffect(() => {
    function handleResize() {
      setViewportSize({ width: window.innerWidth, height: window.innerHeight });
    }
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // Load graph data
  useEffect(() => {
    let isMounted = true;

    async function fetchGraphPayload(): Promise<GraphPayload> {
      const TIMEOUT_MS = 12000;

      async function fetchWithTimeout(url: string): Promise<Response> {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);
        try {
          return await fetch(url, { signal: controller.signal });
        } finally {
          clearTimeout(timeout);
        }
      }

      try {
        // Primary: static public asset
        const response = await fetchWithTimeout(`/data/graph.json?v=${Date.now()}`);
        if (!response.ok) throw new Error(`Failed to load graph (${response.status})`);
        return (await response.json()) as GraphPayload;
      } catch {
        // Fallback: API endpoint (helps if static asset fetch hangs in specific environments)
        const fallbackResponse = await fetchWithTimeout("/api/graph");
        if (!fallbackResponse.ok) throw new Error(`Failed to load graph fallback (${fallbackResponse.status})`);
        return (await fallbackResponse.json()) as GraphPayload;
      }
    }

    async function loadGraph() {
      try {
        const data = await fetchGraphPayload();
        if (!isMounted) return;

        setPayload(data);
        const defaultFocus = [...data.nodes]
          .sort((a, b) => b.degree - a.degree)
          .find((node) => node.type === "concept")?.id;
        setSelectedNodeId(defaultFocus || data.nodes[0]?.id);
      } catch (error) {
        if (!isMounted) return;
        const message = error instanceof Error ? error.message : "Unable to load graph data.";
        setLoadError(message);
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    void loadGraph();
    return () => { isMounted = false; };
  }, []);

  // Filtered data
  const visibleData = useMemo(() => {
    if (!payload) return { nodes: [], edges: [] };
    const term = searchTerm.trim().toLowerCase();
    const activeTypeSet = new Set(activeTypes);

    const filteredNodes = payload.nodes.filter((node) => {
      if (!activeTypeSet.has(node.type)) return false;
      if (!term) return true;
      return (
        node.title.toLowerCase().includes(term) ||
        node.summary.toLowerCase().includes(term) ||
        node.tags.some((tag) => tag.toLowerCase().includes(term))
      );
    });

    const allowedIds = new Set(filteredNodes.map((n) => n.id));
    const filteredEdges = payload.edges.filter(
      (edge) => allowedIds.has(edge.source) && allowedIds.has(edge.target)
    );

    return { nodes: filteredNodes, edges: filteredEdges };
  }, [activeTypes, payload, searchTerm]);

  // Keep selected node in sync with visible nodes
  useEffect(() => {
    if (!selectedNodeId) return;
    if (!visibleData.nodes.some((node) => node.id === selectedNodeId)) {
      setSelectedNodeId(undefined);
    }
  }, [selectedNodeId, visibleData.nodes]);

  // Node lookup
  const nodeById = useMemo(() => {
    const map = new Map<string, GraphNode>();
    payload?.nodes.forEach((node) => map.set(node.id, node));
    return map;
  }, [payload]);

  const selectedNode = selectedNodeId ? nodeById.get(selectedNodeId) : undefined;

  // Toggle type filter
  const handleToggleType = useCallback((type: NodeType) => {
    setActiveTypes((current) => {
      if (current.includes(type)) {
        const next = current.filter((t) => t !== type);
        return next.length ? next : current;
      }
      return [...current, type];
    });
  }, []);

  // Navigate to node (from query results or connections)
  const handleNavigateToNode = useCallback((nodeId: string) => {
    setSelectedNodeId(nodeId);
  }, []);

  // Close node panel
  const handleClosePanel = useCallback(() => {
    setSelectedNodeId(undefined);
  }, []);

  // Run query
  const handleRunQuery = useCallback(async (nextQuery: string) => {
    const trimmed = nextQuery.trim();
    if (!trimmed) return;

    setQueryState({ isLoading: true, data: null, error: null });

    try {
      const response = await fetch("/api/query", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          query: trimmed,
          selectedNodeId,
          filters: activeTypes,
          mode: queryMode
        })
      });

      const data = (await response.json()) as QueryResponse | { error: string };
      if (!response.ok || "error" in data) {
        throw new Error("error" in data ? data.error : "Query failed");
      }

      setQueryState({ isLoading: false, data, error: null });
      // Highlight evidence nodes on the graph
      setHighlightedNodeIds(new Set((data as QueryResponse).evidence.map((e) => e.id)));
    } catch (error) {
      setQueryState({
        isLoading: false,
        data: null,
        error: error instanceof Error ? error.message : "Query failed."
      });
    }
  }, [activeTypes, queryMode, selectedNodeId]);

  // Toggle query expansion
  const handleToggleQuery = useCallback(() => {
    setIsQueryExpanded((prev) => !prev);
    if (isQueryExpanded) {
      // Collapsing — clear highlights
      setHighlightedNodeIds(new Set());
    }
  }, [isQueryExpanded]);

  // Compute graph dimensions
  const isMobile = viewportSize.width < 1024;
  const graphWidth = isMobile
    ? viewportSize.width
    : isPanelOpen
      ? viewportSize.width - panelWidth
      : viewportSize.width;
  const graphHeight = viewportSize.height;

  if (loading) {
    return (
      <main className="atlas-viewport loading-state">
        <p>Mapping trend intelligence graph...</p>
      </main>
    );
  }

  if (loadError || !payload) {
    return (
      <main className="atlas-viewport error-state">
        <p>Unable to load graph: {loadError || "Unknown error"}</p>
      </main>
    );
  }

  return (
    <main className="atlas-viewport">
      <GraphCanvas
        nodes={visibleData.nodes}
        edges={visibleData.edges}
        selectedNodeId={selectedNodeId}
        highlightedNodeIds={highlightedNodeIds}
        searchTerm={searchTerm}
        graphWidth={graphWidth}
        graphHeight={graphHeight}
        onSelectNode={handleNavigateToNode}
      />

      <Toolbar
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
        activeTypes={activeTypes}
        onToggleType={handleToggleType}
        nodeCount={visibleData.nodes.length}
        edgeCount={visibleData.edges.length}
      />

      <NodePanel
        node={selectedNode}
        allNodes={nodeById}
        onClose={handleClosePanel}
        onNavigateToNode={handleNavigateToNode}
      />

      <QueryBar
        query={query}
        onQueryChange={setQuery}
        queryMode={queryMode}
        onQueryModeChange={setQueryMode}
        onSubmit={handleRunQuery}
        queryState={queryState}
        isExpanded={isQueryExpanded}
        onToggleExpand={handleToggleQuery}
        onNavigateToNode={handleNavigateToNode}
      />
    </main>
  );
}
