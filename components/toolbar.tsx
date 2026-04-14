"use client";

import type { NodeType } from "@/lib/types";

type FilterDefinition = {
  type: NodeType;
  label: string;
  color: string;
};

const FILTERS: FilterDefinition[] = [
  { type: "concept", label: "Concepts", color: "oklch(0.60 0.10 75)" },
  { type: "source", label: "Sources", color: "oklch(0.52 0.06 240)" },
  { type: "entity", label: "Entities", color: "oklch(0.58 0.08 155)" },
  { type: "analysis", label: "Analyses", color: "oklch(0.55 0.09 60)" },
  { type: "overview", label: "Overview", color: "oklch(0.48 0.06 200)" },
  { type: "index", label: "Index", color: "oklch(0.44 0.04 220)" }
];

type ToolbarProps = {
  searchTerm: string;
  onSearchChange: (term: string) => void;
  activeTypes: NodeType[];
  onToggleType: (type: NodeType) => void;
  nodeCount: number;
  edgeCount: number;
};

export function Toolbar({
  searchTerm,
  onSearchChange,
  activeTypes,
  onToggleType,
  nodeCount,
  edgeCount
}: ToolbarProps) {
  return (
    <div className="toolbar-overlay">
      <div className="toolbar-inner">
        <div className="toolbar-search">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search nodes..."
            className="toolbar-search-input"
          />
        </div>

        <div className="toolbar-filters" role="group" aria-label="Filter node types">
          {FILTERS.map((filter) => {
            const active = activeTypes.includes(filter.type);
            return (
              <button
                key={filter.type}
                type="button"
                className={`toolbar-filter-chip ${active ? "active" : ""}`}
                onClick={() => onToggleType(filter.type)}
              >
                <span
                  className="filter-dot"
                  style={{ backgroundColor: filter.color }}
                />
                {filter.label}
              </button>
            );
          })}
        </div>

        <div className="toolbar-meta">
          <span className="toolbar-meta-item">
            <strong>{nodeCount}</strong> nodes
          </span>
          <span className="toolbar-meta-divider" />
          <span className="toolbar-meta-item">
            <strong>{edgeCount}</strong> edges
          </span>
        </div>
      </div>
    </div>
  );
}
