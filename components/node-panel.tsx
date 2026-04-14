"use client";

import { useMemo } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import type { GraphNode } from "@/lib/types";

const WIKILINK_RE = /\[\[([^\]|]+)(?:\|([^\]]+))?\]\]/g;

function convertWikilinks(markdown: string, allNodes: Map<string, GraphNode>): string {
  return markdown.replace(WIKILINK_RE, (_match, target: string, display?: string) => {
    const nodeId = target.trim().replace(/^\/+/, "").replace(/\.md$/i, "");
    const linkedNode = allNodes.get(nodeId);
    const label = display || linkedNode?.title || nodeId.split("/").pop() || nodeId;
    return `[${label}](${nodeId})`;
  });
}

type NodePanelProps = {
  node: GraphNode | undefined;
  allNodes: Map<string, GraphNode>;
  onClose: () => void;
  onNavigateToNode: (nodeId: string) => void;
};

export function NodePanel({ node, allNodes, onClose, onNavigateToNode }: NodePanelProps) {
  const isOpen = !!node;

  return (
    <aside className={`node-panel ${isOpen ? "open" : ""}`} aria-label="Node detail panel">
      {node ? (
        <>
          <div className="node-panel-header">
            <button
              type="button"
              className="node-panel-close"
              onClick={onClose}
              aria-label="Close panel"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>

            <span className="node-panel-type" data-type={node.type}>
              {node.type}
            </span>
            <h2 className="node-panel-title">{node.title}</h2>
          </div>

          <div className="node-panel-stats">
            <div className="node-panel-stat">
              <span className="stat-value">{node.inboundCount}</span>
              <span className="stat-label">Inbound</span>
            </div>
            <div className="node-panel-stat">
              <span className="stat-value">{node.outboundCount}</span>
              <span className="stat-label">Outbound</span>
            </div>
            <div className="node-panel-stat">
              <span className="stat-value">{node.degree}</span>
              <span className="stat-label">Degree</span>
            </div>
          </div>

          {node.tags.length > 0 && (
            <div className="node-panel-tags">
              {node.tags.map((tag) => (
                <span key={tag} className="node-tag">{tag}</span>
              ))}
            </div>
          )}

          <NodeContent
            content={node.content || node.summary || "No content available."}
            allNodes={allNodes}
            onNavigateToNode={onNavigateToNode}
          />

          {node.links.length > 0 && (
            <div className="node-panel-connections">
              <h3>Connected Pages</h3>
              <ul>
                {node.links.slice(0, 12).map((linkId) => {
                  const linkedNode = allNodes.get(linkId);
                  return (
                    <li key={linkId}>
                      <button
                        type="button"
                        className="connection-link"
                        onClick={() => onNavigateToNode(linkId)}
                      >
                        <span
                          className="connection-dot"
                          data-type={linkedNode?.type || "source"}
                        />
                        {linkedNode?.title || linkId}
                      </button>
                    </li>
                  );
                })}
              </ul>
            </div>
          )}
        </>
      ) : null}
    </aside>
  );
}

function NodeContent({
  content,
  allNodes,
  onNavigateToNode
}: {
  content: string;
  allNodes: Map<string, GraphNode>;
  onNavigateToNode: (nodeId: string) => void;
}) {
  const processed = useMemo(() => convertWikilinks(content, allNodes), [content, allNodes]);

  return (
    <div className="node-panel-content">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          a: ({ href, children }) => {
            if (href && href.startsWith("wiki/")) {
              const nodeId = href.replace(/\.md$/, "");
              return (
                <button
                  type="button"
                  className="node-content-link"
                  onClick={() => onNavigateToNode(nodeId)}
                >
                  {children}
                </button>
              );
            }
            return <a href={href} target="_blank" rel="noopener noreferrer">{children}</a>;
          }
        }}
      >
        {processed}
      </ReactMarkdown>
    </div>
  );
}
