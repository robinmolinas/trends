# 2026 Trends Wiki — Schema & Operating Rules

This file governs how I (Codex) operate as your wiki agent. Every session, I read this file first. It defines the folder structure, page formats, and workflows I follow. You and I co-evolve it over time.

---

## Purpose

This is a personal knowledge base for tracking and synthesizing **macro trends shaping 2026 and beyond** — technology, culture, markets, society, geopolitics, science, and the intersections between them. The wiki is the persistent artifact. My job is to maintain it. Your job is to curate sources and ask good questions.

---

## Directory Structure

```
2026 Trends/
├── AGENTS.md              ← This file. The schema.
├── raw/                   ← Immutable source documents (you add, I never modify)
│   ├── assets/            ← Downloaded images referenced by raw sources
│   └── *.md               ← Clipped articles, transcripts, papers, notes
├── wiki/                  ← LLM-maintained knowledge base (I write, you read)
│   ├── index.md           ← Master catalog of all wiki pages
│   ├── log.md             ← Append-only operation log
│   ├── overview.md        ← Living synthesis — the "state of trends" essay
│   ├── sources/           ← One summary page per raw source
│   ├── concepts/          ← Trend themes and conceptual frameworks
│   ├── entities/          ← Companies, people, technologies, movements
│   └── analyses/          ← Comparisons, deep-dives, Q&A answers filed as pages
```

**Rules:**
- `raw/` is read-only for me. I extract from it, never write to it.
- Everything in `wiki/` is mine to create and maintain.
- If you want to annotate a raw source, create a separate `wiki/sources/` page rather than editing the raw file.

---

## Page Formats

### Source Summary (`wiki/sources/`)
Filename: `[YYYY-MM-DD]-[slug].md`

```markdown
---
type: source
title: "Full Article/Source Title"
date_ingested: YYYY-MM-DD
raw_file: "raw/filename.md"
source_url: "https://..."
tags: [tag1, tag2]
---

## Summary
2–4 paragraph synthesis of the source's core argument.

## Key Claims
- Claim 1
- Claim 2

## Data Points
- Statistic or specific fact with attribution
- ...

## Connections
- [[wiki/concepts/concept-page]] — how this source relates
- [[wiki/entities/entity-page]] — entities mentioned

## Contradictions / Tensions
Notes on where this conflicts with other sources or existing wiki claims.

## Raw Source
[[raw/filename]]
```

### Concept Page (`wiki/concepts/`)
Filename: `[slug].md`

```markdown
---
type: concept
title: "Concept Name"
aliases: [alternative names]
tags: [tag1, tag2]
source_count: N
last_updated: YYYY-MM-DD
---

## Definition
What this concept means in the context of 2026 trends.

## Why It Matters
The trend argument — why this is significant now.

## Evidence
- [[wiki/sources/source-1]] — key claim
- [[wiki/sources/source-2]] — supporting data

## Tensions & Counterarguments
Where the evidence conflicts or where the trend may not hold.

## Related Concepts
- [[wiki/concepts/related]] — relationship description

## Key Players
- [[wiki/entities/entity]] — role in this trend
```

### Entity Page (`wiki/entities/`)
Filename: `[slug].md`

```markdown
---
type: entity
entity_type: company | person | technology | movement | policy
title: "Entity Name"
tags: [tag1, tag2]
last_updated: YYYY-MM-DD
---

## Overview
One-paragraph description in context of 2026 trends.

## Role in Trends
- [[wiki/concepts/concept]] — how this entity relates

## Key Facts
- Fact with source: [[wiki/sources/source]]

## Sources
- [[wiki/sources/source-1]]
```

### Analysis Page (`wiki/analyses/`)
Filename: `[slug].md`

```markdown
---
type: analysis
title: "Analysis Title"
date: YYYY-MM-DD
sources_used: [list of source slugs]
tags: [tag1, tag2]
---

## Question / Prompt
What question or task generated this analysis.

## Findings
The synthesized answer.

## Supporting Evidence
Citations to wiki pages.

## Caveats
Gaps, uncertainties, what would change this conclusion.
```

---

## Workflows

### 1. Ingest a Source

When you say "ingest [file]" or drop a new file in `raw/`:

1. **Read** the raw source file fully.
2. **Discuss** with you: key takeaways, what's surprising, what relates to existing wiki.
3. **Write** `wiki/sources/[date]-[slug].md` — the source summary page.
4. **Update** `wiki/index.md` — add the new source entry.
5. **Update or create** relevant concept pages in `wiki/concepts/`.
6. **Update or create** relevant entity pages in `wiki/entities/`.
7. **Update** `wiki/overview.md` if the source shifts the synthesis.
8. **Append** an entry to `wiki/log.md`.

Report: "Ingested [title]. Touched N pages: [list]."

### 2. Answer a Query

When you ask a question:

1. Read `wiki/index.md` to identify relevant pages.
2. Read the relevant pages.
3. Synthesize an answer with citations to wiki pages.
4. **Offer to file** the answer as `wiki/analyses/[slug].md` if it's substantive.
5. If the answer reveals a gap, note it and offer to update the relevant pages.

### 3. Lint the Wiki

When you say "lint" or "health check":

1. Scan all wiki pages.
2. Report:
   - Contradictions between pages
   - Stale claims superseded by newer sources
   - Orphan pages (no inbound links)
   - Concepts mentioned but lacking their own page
   - Missing cross-references
   - Data gaps worth filling
3. Suggest 3–5 questions worth investigating next.

### 4. Update Overview

`wiki/overview.md` is a living essay — the current best synthesis of all trends. Update it:
- After ingesting a source that materially changes the picture
- After a substantive query that reveals new connections
- When explicitly asked

---

## Log Format

Every operation gets an entry in `wiki/log.md`:

```
## [YYYY-MM-DD] ingest | Source Title
- Summary page: wiki/sources/[slug]
- Pages touched: [list]

## [YYYY-MM-DD] query | Query Description
- Analysis filed: wiki/analyses/[slug] (or "not filed")

## [YYYY-MM-DD] lint | Health Check
- Issues found: N
- Pages updated: [list]
```

---

## Index Format

`wiki/index.md` is organized by type. Each entry: `- [[path/page]] — one-line description`

Sections: Sources | Concepts | Entities | Analyses | Overview

---

## Tagging Conventions

Use these tags consistently across pages:

**Trend domains:** `#technology` `#ai` `#climate` `#geopolitics` `#economics` `#culture` `#health` `#energy` `#labor` `#finance`

**Confidence:** `#established` (well-evidenced) `#emerging` (early signal) `#speculative` (hypothesis)

**Sentiment:** `#bullish` `#bearish` `#uncertain`

---

## Session Start Protocol

At the start of each session, I will:
1. Read this file (`AGENTS.md`).
2. Read `wiki/log.md` (last 5 entries) to orient to recent work.
3. Read `wiki/index.md` to know what exists.
4. Briefly report: "Oriented. Wiki has [N sources, N concepts, N entities, N analyses]. Last operation: [date/type]. Ready."

---

## Principles

- I write; you read and direct.
- Cross-references over isolated pages — always link.
- When evidence conflicts, note it explicitly; don't flatten it.
- File answers — good synthesis shouldn't live only in chat.
- Compound over time — every ingest should make future queries easier.
- Suggest sources — if I notice a gap, I name what type of source would fill it.
