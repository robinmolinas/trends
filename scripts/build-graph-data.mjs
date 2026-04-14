import { promises as fs } from "node:fs";
import path from "node:path";
import matter from "gray-matter";

const PROJECT_ROOT = process.cwd();
const WIKI_ROOT = path.join(PROJECT_ROOT, "wiki");
const OUTPUT_PATH = path.join(PROJECT_ROOT, "public", "data", "graph.json");

const COLLECTIONS = [
  { dir: "sources", type: "source" },
  { dir: "concepts", type: "concept" },
  { dir: "entities", type: "entity" },
  { dir: "analyses", type: "analysis" }
];

const SPECIAL_FILES = [
  { file: "overview.md", type: "overview", id: "wiki/overview" },
  { file: "index.md", type: "index", id: "wiki/index" }
];

const WIKI_LINK_RE = /\[\[([^\]|]+)(?:\|[^\]]+)?\]\]/g;
const MARKDOWN_HEADING_RE = /^#{1,6}\s+/gm;
const MARKDOWN_INLINE_RE = /(\*\*|__|`|\*|_|~{2})/g;
const MARKDOWN_LINK_RE = /\[([^\]]+)\]\([^\)]+\)/g;

function humanizeSlug(slug) {
  return slug
    .replace(/-/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function normalizeTags(tags) {
  if (Array.isArray(tags)) {
    return tags.map((tag) => String(tag).trim()).filter(Boolean);
  }
  if (typeof tags === "string" && tags.trim()) {
    return tags
      .split(",")
      .map((tag) => tag.trim())
      .filter(Boolean);
  }
  return [];
}

function normalizeWikiLinkTarget(rawTarget) {
  let target = rawTarget.trim();
  if (!target) return "";

  target = target.replace(/^\/+/, "").replace(/\.md$/i, "");
  if (target.startsWith("./")) target = target.slice(2);
  if (!target.startsWith("wiki/")) return "";

  return target;
}

function extractLinks(markdown) {
  const links = [];
  let match;

  while ((match = WIKI_LINK_RE.exec(markdown)) !== null) {
    const normalized = normalizeWikiLinkTarget(match[1]);
    if (normalized) links.push(normalized);
  }

  return [...new Set(links)];
}

function stripMarkdown(markdown) {
  return markdown
    .replace(MARKDOWN_HEADING_RE, "")
    .replace(MARKDOWN_LINK_RE, "$1")
    .replace(MARKDOWN_INLINE_RE, "")
    .replace(/\n{2,}/g, "\n")
    .trim();
}

function extractSummary(markdown) {
  const text = stripMarkdown(markdown);
  if (!text) return "";

  const paragraphs = text
    .split(/\n+/)
    .map((part) => part.trim())
    .filter(Boolean);

  return (paragraphs[0] || "").slice(0, 400);
}

async function readMarkdownFile(filePath) {
  const raw = await fs.readFile(filePath, "utf8");
  try {
    const parsed = matter(raw);
    return { raw, parsed };
  } catch {
    const parsed = parseFrontmatterFallback(raw);
    return { raw, parsed };
  }
}

function parseFrontmatterFallback(raw) {
  if (!raw.startsWith("---")) {
    return { data: {}, content: raw };
  }

  const closingIndex = raw.indexOf("\n---", 3);
  if (closingIndex === -1) {
    return { data: {}, content: raw };
  }

  const header = raw.slice(4, closingIndex).trim();
  const content = raw.slice(closingIndex + 4).trimStart();
  const data = {};

  for (const line of header.split("\n")) {
    const separator = line.indexOf(":");
    if (separator === -1) continue;

    const key = line.slice(0, separator).trim();
    const value = line.slice(separator + 1).trim();
    if (!key) continue;

    if (value.startsWith("[") && value.endsWith("]")) {
      data[key] = value
        .slice(1, -1)
        .split(",")
        .map((item) => item.trim().replace(/^"|"$/g, ""))
        .filter(Boolean);
      continue;
    }

    data[key] = value.replace(/^"|"$/g, "");
  }

  return { data, content };
}

async function loadCollectionNodes() {
  const nodes = [];

  for (const collection of COLLECTIONS) {
    const absoluteDir = path.join(WIKI_ROOT, collection.dir);

    let entries = [];
    try {
      entries = await fs.readdir(absoluteDir, { withFileTypes: true });
    } catch {
      continue;
    }

    for (const entry of entries) {
      if (!entry.isFile() || !entry.name.endsWith(".md")) continue;

      const filePath = path.join(absoluteDir, entry.name);
      const relativePath = path.join("wiki", collection.dir, entry.name).replace(/\\/g, "/");
      const id = relativePath.replace(/\.md$/i, "");
      const { raw, parsed } = await readMarkdownFile(filePath);
      const slug = entry.name.replace(/\.md$/i, "");

      const title = parsed.data.title ? String(parsed.data.title) : humanizeSlug(slug);
      const tags = normalizeTags(parsed.data.tags);
      const summary = extractSummary(parsed.content);
      const links = extractLinks(raw);

      nodes.push({
        id,
        type: collection.type,
        slug,
        title,
        tags,
        path: relativePath,
        summary,
        content: parsed.content,
        links,
        sourceMeta: parsed.data
      });
    }
  }

  return nodes;
}

async function loadSpecialNodes() {
  const nodes = [];

  for (const special of SPECIAL_FILES) {
    const filePath = path.join(WIKI_ROOT, special.file);

    try {
      const { raw, parsed } = await readMarkdownFile(filePath);
      const title = parsed.data.title
        ? String(parsed.data.title)
        : special.file.replace(/\.md$/, "").replace(/\b\w/g, (c) => c.toUpperCase());

      nodes.push({
        id: special.id,
        type: special.type,
        slug: special.file.replace(/\.md$/i, ""),
        title,
        tags: [],
        path: path.join("wiki", special.file).replace(/\\/g, "/"),
        summary: extractSummary(parsed.content),
        content: parsed.content,
        links: extractLinks(raw),
        sourceMeta: parsed.data
      });
    } catch {
      // Skip missing optional special files.
    }
  }

  return nodes;
}

function buildEdges(nodes) {
  const nodeById = new Map(nodes.map((node) => [node.id, node]));
  const edgeWeights = new Map();

  for (const node of nodes) {
    for (const target of node.links) {
      if (!nodeById.has(target) || target === node.id) continue;

      const key = `${node.id}->${target}`;
      edgeWeights.set(key, (edgeWeights.get(key) || 0) + 1);
    }
  }

  return Array.from(edgeWeights.entries()).map(([key, weight]) => {
    const [source, target] = key.split("->");
    const sourceNode = nodeById.get(source);
    const targetNode = nodeById.get(target);

    return {
      id: key,
      source,
      target,
      weight,
      relation: `${sourceNode?.type || "node"}_to_${targetNode?.type || "node"}`
    };
  });
}

function addNodeMetrics(nodes, edges) {
  const inbound = new Map();
  const outbound = new Map();

  for (const edge of edges) {
    outbound.set(edge.source, (outbound.get(edge.source) || 0) + edge.weight);
    inbound.set(edge.target, (inbound.get(edge.target) || 0) + edge.weight);
  }

  return nodes.map((node) => {
    const inboundCount = inbound.get(node.id) || 0;
    const outboundCount = outbound.get(node.id) || 0;
    const degree = inboundCount + outboundCount;

    return {
      ...node,
      inboundCount,
      outboundCount,
      degree,
      searchText: [node.title, node.summary, node.tags.join(" "), node.type].join(" ").toLowerCase()
    };
  });
}

function buildTypeCounts(nodes) {
  const counts = {};
  for (const node of nodes) {
    counts[node.type] = (counts[node.type] || 0) + 1;
  }
  return counts;
}

async function main() {
  const collectionNodes = await loadCollectionNodes();
  const specialNodes = await loadSpecialNodes();
  const allNodes = [...collectionNodes, ...specialNodes].sort((a, b) => {
    if (a.type !== b.type) return a.type.localeCompare(b.type);
    return a.title.localeCompare(b.title);
  });

  const edges = buildEdges(allNodes);
  const nodes = addNodeMetrics(allNodes, edges);

  const payload = {
    generatedAt: new Date().toISOString(),
    meta: {
      totalNodes: nodes.length,
      totalEdges: edges.length,
      countsByType: buildTypeCounts(nodes)
    },
    nodes,
    edges
  };

  await fs.mkdir(path.dirname(OUTPUT_PATH), { recursive: true });
  await fs.writeFile(OUTPUT_PATH, JSON.stringify(payload, null, 2));

  console.log(
    `Graph data generated: ${payload.meta.totalNodes} nodes, ${payload.meta.totalEdges} edges -> ${path.relative(PROJECT_ROOT, OUTPUT_PATH)}`
  );
}

main().catch((error) => {
  console.error("Failed to build graph data.");
  console.error(error);
  process.exit(1);
});
