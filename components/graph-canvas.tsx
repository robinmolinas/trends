"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import dynamic from "next/dynamic";
import type { GraphNode, GraphEdge, NodeType } from "@/lib/types";

const ForceGraph2D = dynamic(() => import("react-force-graph-2d"), { ssr: false });

const NODE_COLORS: Record<NodeType, string> = {
  source: "oklch(0.52 0.06 240)",
  concept: "oklch(0.60 0.10 75)",
  entity: "oklch(0.58 0.08 155)",
  analysis: "oklch(0.55 0.09 60)",
  overview: "oklch(0.48 0.06 200)",
  index: "oklch(0.44 0.04 220)"
};

type GraphNodeVisual = GraphNode & {
  x?: number;
  y?: number;
  vx?: number;
  vy?: number;
  fx?: number;
  fy?: number;
};

type GraphCanvasProps = {
  nodes: GraphNode[];
  edges: GraphEdge[];
  selectedNodeId?: string;
  highlightedNodeIds: Set<string>;
  searchTerm: string;
  graphWidth: number;
  graphHeight: number;
  onSelectNode: (nodeId: string) => void;
};

export function GraphCanvas({
  nodes,
  edges,
  selectedNodeId,
  highlightedNodeIds,
  searchTerm,
  graphWidth,
  graphHeight,
  onSelectNode
}: GraphCanvasProps) {
  const graphRef = useRef<any>(null);
  const [hoveredNodeId, setHoveredNodeId] = useState<string | null>(null);

  const connectedIds = useMemo(() => {
    const set = new Set<string>();
    if (!selectedNodeId) return set;
    set.add(selectedNodeId);
    edges.forEach((edge) => {
      const src = typeof edge.source === "object" ? (edge.source as any).id : edge.source;
      const tgt = typeof edge.target === "object" ? (edge.target as any).id : edge.target;
      if (src === selectedNodeId) set.add(tgt);
      if (tgt === selectedNodeId) set.add(src);
    });
    return set;
  }, [edges, selectedNodeId]);

  const graphData = useMemo(() => {
    return {
      nodes: nodes.map((node) => ({ ...node })) as GraphNodeVisual[],
      links: edges.map((edge) => ({ ...edge }))
    };
  }, [edges, nodes]);

  useEffect(() => {
    const fg = graphRef.current;
    if (!fg || typeof fg.d3AlphaDecay !== "function") return;
    fg.d3AlphaDecay(0.028);
    fg.d3VelocityDecay(0.24);
  }, [graphData]);

  useEffect(() => {
    if (!selectedNodeId || !graphRef.current) return;
    const selectedNode = graphData.nodes.find((node) => node.id === selectedNodeId);
    if (!selectedNode || typeof selectedNode.x !== "number" || typeof selectedNode.y !== "number") return;
    graphRef.current.centerAt(selectedNode.x, selectedNode.y, 600);
    graphRef.current.zoom(1.8, 600);
  }, [graphData.nodes, selectedNodeId]);

  const search = searchTerm.trim().toLowerCase();

  // Pulsing animation for highlighted nodes
  const [pulsePhase, setPulsePhase] = useState(0);
  useEffect(() => {
    if (highlightedNodeIds.size === 0) return;
    const interval = setInterval(() => {
      setPulsePhase((p) => (p + 1) % 60);
    }, 50);
    return () => clearInterval(interval);
  }, [highlightedNodeIds.size]);

  const pulseScale = 1 + Math.sin((pulsePhase / 60) * Math.PI * 2) * 0.3;

  return (
    <div className="graph-layer" aria-label="Knowledge graph visualization">
      <ForceGraph2D
        ref={graphRef}
        width={graphWidth}
        height={graphHeight}
        graphData={graphData}
        backgroundColor="transparent"
        nodeRelSize={6}
        linkColor={(link: any) => {
          const source = typeof link.source === "object" ? link.source.id : link.source;
          const target = typeof link.target === "object" ? link.target.id : link.target;
          const isConnected = connectedIds.has(String(source)) && connectedIds.has(String(target));
          return isConnected ? "oklch(0.50 0.08 30 / 0.50)" : "oklch(0.55 0.02 75 / 0.14)";
        }}
        linkWidth={(link: any) => {
          const source = typeof link.source === "object" ? link.source.id : link.source;
          const target = typeof link.target === "object" ? link.target.id : link.target;
          const isConnected = connectedIds.has(String(source)) && connectedIds.has(String(target));
          return isConnected ? 1.5 : 0.5;
        }}
        nodeCanvasObject={(nodeObj: any, ctx: CanvasRenderingContext2D, globalScale: number) => {
          const node = nodeObj as GraphNodeVisual;
          const isSelected = node.id === selectedNodeId;
          const isHovered = node.id === hoveredNodeId;
          const isConnected = connectedIds.has(node.id);
          const isHighlighted = highlightedNodeIds.has(node.id);
          const matchesSearch = !!search && node.searchText.includes(search);

          const baseRadius = Math.max(3.5, 4.5 + Math.sqrt(Math.max(node.degree, 1)) * 0.9);
          const radius = isSelected ? baseRadius + 3.5 : isHovered ? baseRadius + 1.5 : baseRadius;
          const x = node.x || 0;
          const y = node.y || 0;

          // Highlighted pulse ring (query results)
          if (isHighlighted && !isSelected) {
            const ringRadius = radius + 4 * pulseScale;
            ctx.beginPath();
            ctx.arc(x, y, ringRadius, 0, 2 * Math.PI, false);
            ctx.fillStyle = "oklch(0.50 0.14 30 / 0.12)";
            ctx.fill();
            ctx.lineWidth = 1.5;
            ctx.strokeStyle = "oklch(0.50 0.14 30 / 0.45)";
            ctx.stroke();
          }

          // Main node
          ctx.beginPath();
          ctx.arc(x, y, radius, 0, 2 * Math.PI, false);
          ctx.fillStyle = isSelected
            ? "oklch(0.50 0.16 30)"
            : isHovered
              ? "oklch(0.55 0.12 50)"
              : matchesSearch
                ? "oklch(0.58 0.14 75)"
                : isHighlighted
                  ? "oklch(0.55 0.14 30)"
                  : NODE_COLORS[node.type];
          ctx.fill();

          // Connected / hovered stroke
          if (isConnected || isHighlighted || isHovered) {
            ctx.lineWidth = isSelected ? 2.5 : isHovered ? 1.8 : 1.2;
            ctx.strokeStyle = isSelected
              ? "oklch(0.95 0.02 75 / 0.95)"
              : "oklch(0.90 0.02 75 / 0.7)";
            ctx.stroke();
          }

          // Labels — show on hover, selection, highlight, search match, or sufficient zoom
          const showLabel = isSelected || isHovered || isHighlighted || matchesSearch || globalScale >= 2.8;
          if (showLabel) {
            // Font size in screen pixels, converted to canvas units
            const screenPx = isSelected ? 13 : isHovered ? 12 : 11;
            const fontSize = screenPx / globalScale;
            ctx.font = `${isSelected || isHovered ? 600 : 400} ${fontSize}px "DM Sans", sans-serif`;
            ctx.textAlign = "left";
            ctx.textBaseline = "middle";

            const labelX = x + radius + 4 / globalScale;
            const text = node.title;
            const metrics = ctx.measureText(text);

            // Label background
            const pad = 2.5 / globalScale;
            ctx.fillStyle = "oklch(0.95 0.015 75 / 0.88)";
            ctx.fillRect(
              labelX - pad,
              y - fontSize / 2 - pad,
              metrics.width + pad * 2,
              fontSize + pad * 2
            );

            ctx.fillStyle = "oklch(0.22 0.02 55)";
            ctx.fillText(text, labelX, y);
          }
        }}
        nodePointerAreaPaint={(nodeObj: any, color: string, ctx: CanvasRenderingContext2D) => {
          const node = nodeObj as GraphNodeVisual;
          const radius = Math.max(10, 7 + Math.sqrt(Math.max(node.degree, 1)));
          ctx.fillStyle = color;
          ctx.beginPath();
          ctx.arc(node.x || 0, node.y || 0, radius, 0, 2 * Math.PI, false);
          ctx.fill();
        }}
        onNodeHover={(node: any) => {
          setHoveredNodeId(node ? (node as GraphNodeVisual).id : null);
        }}
        onNodeClick={(node: any) => {
          onSelectNode((node as GraphNodeVisual).id);
        }}
      />
    </div>
  );
}
