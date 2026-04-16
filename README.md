# 2026 Trends Atlas

Interactive web app for your 2026 trend intelligence wiki.

## What It Does

- Builds a live knowledge graph from `wiki/` markdown pages and Obsidian-style links (`[[wiki/...]]`)
- Visualizes nodes and connections with filtering and search
- Lets users ask strategic questions and receive synthesized responses grounded in graph evidence

## Local Development

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Build For Production

```bash
npm run build
npm start
```

## Data Pipeline

`npm run graph` runs `scripts/build-graph-data.mjs`, which:

1. Reads `wiki/sources`, `wiki/concepts`, `wiki/entities`, `wiki/analyses`, and key pages (`wiki/overview.md`, `wiki/index.md`)
2. Parses frontmatter + wiki links
3. Exports `public/data/graph.json`

This file powers both:

- Graph UI (`/`)
- Query API (`/api/query`)

## Deploy To Vercel

1. Push this repo to GitHub
2. Import the repo in Vercel
3. Framework preset: **Next.js**
4. Build command: `npm run build`
5. Output directory: leave default

No environment variables are required for deterministic mode.
Optional for LLM grounded answers via OpenRouter:
- `OPENROUTER_API_KEY` — enables `"llm"` query mode in `/api/query`
- `KNOWLEDGE_GRAPH_LLM_MODEL` — optional override, but only these free models are accepted:
  - `google/gemma-4-31b-it:free` (default)
  - `openai/gpt-oss-120b:free`

If `KNOWLEDGE_GRAPH_LLM_MODEL` is set to anything else, the API automatically falls back to deterministic mode.

## Notes

- `raw/` files stay untouched
- The app reads only from `wiki/` generated content
- If you ingest new sources, redeploy (or run `npm run graph` before local testing)
