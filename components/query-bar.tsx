"use client";

import { FormEvent, useEffect, useRef, type ReactNode } from "react";
import type { QueryMode, QueryResponse } from "@/lib/types";

type QueryState = {
  isLoading: boolean;
  data: QueryResponse | null;
  error: string | null;
};

const QUICK_PROMPTS = [
  "If I am launching an AI product in 2026, what macro risks should shape my strategy?",
  "What trends are most relevant for creator-led commerce in 2026?",
  "How might sustainability regulation change go-to-market priorities?",
  "What does this graph imply for premium consumer brands?"
];

type QueryBarProps = {
  query: string;
  onQueryChange: (query: string) => void;
  queryMode: QueryMode;
  onQueryModeChange: (mode: QueryMode) => void;
  onSubmit: (query: string) => void;
  queryState: QueryState;
  isExpanded: boolean;
  onToggleExpand: () => void;
  onNavigateToNode: (nodeId: string) => void;
};

export function QueryBar({
  query,
  onQueryChange,
  queryMode,
  onQueryModeChange,
  onSubmit,
  queryState,
  isExpanded,
  onToggleExpand,
  onNavigateToNode
}: QueryBarProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Cmd+K global shortcut
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        if (!isExpanded) onToggleExpand();
        setTimeout(() => textareaRef.current?.focus(), 100);
      }
      if (e.key === "Escape" && isExpanded) {
        onToggleExpand();
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isExpanded, onToggleExpand]);

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (query.trim()) onSubmit(query);
  }

  // Collapsed mode — single line input
  if (!isExpanded) {
    return (
      <div className="query-dock collapsed">
        <button
          type="button"
          className="query-dock-trigger"
          onClick={() => {
            onToggleExpand();
            setTimeout(() => textareaRef.current?.focus(), 100);
          }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <span>Ask the knowledge graph...</span>
          <kbd>⌘K</kbd>
        </button>
      </div>
    );
  }

  // Expanded mode — full query interface
  return (
    <div className="query-dock expanded">
      <div className="query-dock-inner">
        <div className="query-dock-header">
          <h3>Ask the Knowledge Graph</h3>
          <button
            type="button"
            className="query-dock-close"
            onClick={onToggleExpand}
            aria-label="Close query panel"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="query-form">
          <div className="query-mode-toggle" role="group" aria-label="Answer mode">
            <button
              type="button"
              className={`query-mode-btn ${queryMode === "deterministic" ? "active" : ""}`}
              onClick={() => onQueryModeChange("deterministic")}
            >
              Deterministic
            </button>
            <button
              type="button"
              className={`query-mode-btn ${queryMode === "llm" ? "active" : ""}`}
              onClick={() => onQueryModeChange("llm")}
            >
              LLM (grounded)
            </button>
          </div>
          <textarea
            ref={textareaRef}
            value={query}
            onChange={(e) => onQueryChange(e.target.value)}
            placeholder="How will the shift from SEO to GEO affect luxury brands?"
            rows={3}
          />
          <button type="submit" className="query-submit" disabled={queryState.isLoading}>
            {queryState.isLoading ? "Synthesizing..." : "Query"}
          </button>
        </form>

        {!queryState.data && !queryState.error && (
          <div className="query-prompts">
            {QUICK_PROMPTS.map((prompt) => (
              <button
                type="button"
                key={prompt}
                className="query-prompt-chip"
                onClick={() => {
                  onQueryChange(prompt);
                  onSubmit(prompt);
                }}
              >
                {prompt}
              </button>
            ))}
          </div>
        )}

        {queryState.error && (
          <p className="query-error">{queryState.error}</p>
        )}

        {queryState.data && (
          <div className="query-results">
            <div className="query-answer">
              <h4>Answer</h4>
              <p>
                {renderAnswerWithCitations(
                  queryState.data.answer,
                  queryState.data.citations || [],
                  onNavigateToNode
                )}
              </p>
              {queryState.data.modeUsed === "deterministic" && queryMode === "llm" && (
                <p className="query-mode-note">
                  LLM answer unavailable. Showing deterministic fallback.
                </p>
              )}
            </div>

            {queryState.data.insights.length > 0 && (
              <div className="query-insights">
                <h4>Strategic Lenses</h4>
                <ul>
                  {queryState.data.insights.map((insight) => (
                    <li key={insight.title}>
                      <strong>{insight.title}</strong>
                      <span>{insight.rationale}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {queryState.data.evidence.length > 0 && (
              <div className="query-evidence">
                <h4>Evidence</h4>
                <ul>
                  {queryState.data.evidence.map((item) => (
                    <li key={item.id}>
                      <button
                        type="button"
                        className="evidence-link"
                        onClick={() => onNavigateToNode(item.id)}
                      >
                        <span className="evidence-type" data-type={item.type}>{item.type}</span>
                        <span className="evidence-title">{item.title}</span>
                        <span className="evidence-summary">{item.summary || ""}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {queryState.data.matchedTags.length > 0 && (
              <div className="query-tags">
                {queryState.data.matchedTags.slice(0, 6).map((tag) => (
                  <span key={tag} className="query-tag">{tag}</span>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function renderAnswerWithCitations(
  answer: string,
  citations: NonNullable<QueryResponse["citations"]>,
  onNavigateToNode: (nodeId: string) => void
) {
  if (!answer) return answer;

  const citationMap = new Map<number, string>();
  for (const citation of citations) {
    citationMap.set(citation.index, citation.evidenceId);
  }

  const parts: ReactNode[] = [];
  let lastIndex = 0;
  const regex = /\[(\d+)\]/g;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(answer)) !== null) {
    const start = match.index;
    const end = regex.lastIndex;
    const index = Number.parseInt(match[1], 10);

    if (start > lastIndex) {
      parts.push(answer.slice(lastIndex, start));
    }

    const evidenceId = citationMap.get(index);
    if (evidenceId) {
      parts.push(
        <button
          key={`${start}-${match[0]}`}
          type="button"
          className="query-citation"
          onClick={() => onNavigateToNode(evidenceId)}
        >
          {match[0]}
        </button>
      );
    } else {
      parts.push(match[0]);
    }

    lastIndex = end;
  }

  if (lastIndex < answer.length) {
    parts.push(answer.slice(lastIndex));
  }

  return parts;
}
