"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { GraphPayload, GraphNode, NodeType, QueryResponse } from "@/lib/types";
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

    async function loadGraph() {
      try {
        const response = await fetch("/data/graph.json", { cache: "no-store" });
        if (!response.ok) throw new Error(`Failed to load graph (${response.status})`);

        const data = (await response.json()) as GraphPayload;
        if (!isMounted) return;

        setPayload(data);
        const defaultFocus = [...data.nodes]
          .sort((a, b) => b.degree - a.degree)
          .find((node) => node.type === "concept")?.id;
        setSelectedNodeId(defaultFocus || data.nodes[0]?.id);
      } catch (error) {
        if (!isMounted) return;
        setLoadError(error instanceof Error ? error.message : "Unable to load graph data.");
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
          filters: activeTypes
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
  }, [activeTypes, selectedNodeId]);

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
        onSubmit={handleRunQuery}
        queryState={queryState}
        isExpanded={isQueryExpanded}
        onToggleExpand={handleToggleQuery}
        onNavigateToNode={handleNavigateToNode}
      />
    </main>
  );
}
