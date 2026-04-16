import type { GenerateGroundedAnswer, GroundingSnippet } from "./query-engine";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

const ALLOWED_FREE_MODELS = new Set([
  "google/gemma-4-31b-it:free",
  "openai/gpt-oss-120b:free"
]);

function serializeSnippets(snippets: GroundingSnippet[]): string {
  return snippets
    .map((snippet) => {
      const safeSummary = snippet.summary || "(no summary)";
      const safeContent = snippet.content || "(no content)";
      return [
        `Source [${snippet.index}]`,
        `Title: ${snippet.title}`,
        `Type: ${snippet.type}`,
        `Path: ${snippet.path}`,
        `Summary: ${safeSummary}`,
        `Content: ${safeContent}`
      ].join("\n");
    })
    .join("\n\n");
}

function buildSystemPrompt(): string {
  return [
    "You are answering a question strictly from a local trend wiki evidence pack.",
    "Rules:",
    "- Use ONLY the provided evidence pack.",
    "- If evidence is weak/incomplete, explicitly say so.",
    "- Do not invent facts, companies, numbers, or dates.",
    "- Add inline citations like [1], [2] exactly matching evidence IDs.",
    "- Every concrete claim should have at least one citation.",
    "- Keep the answer concise (around 120-220 words)."
  ].join("\n");
}

function buildUserPrompt(query: string, snippets: GroundingSnippet[]): string {
  return [
    `Question: ${query}`,
    "",
    "Evidence pack:",
    serializeSnippets(snippets)
  ].join("\n");
}

function extractTextFromOpenRouterResponse(payload: any): string {
  const content = payload?.choices?.[0]?.message?.content;
  if (typeof content === "string") return content.trim();
  if (Array.isArray(content)) {
    const text = content
      .map((part: any) => (typeof part?.text === "string" ? part.text : ""))
      .join("\n")
      .trim();
    return text;
  }
  return "";
}

function readDotEnvLocalValue(key: string): string | undefined {
  try {
    const path = join(process.cwd(), ".env.local");
    if (!existsSync(path)) return undefined;
    const text = readFileSync(path, "utf8");
    const line = text
      .split(/\r?\n/)
      .find((entry) => entry.trim().startsWith(`${key}=`));
    if (!line) return undefined;
    const [, ...rest] = line.split("=");
    const value = rest.join("=").trim();
    if (!value) return undefined;
    return value.replace(/^['"]|['"]$/g, "");
  } catch {
    return undefined;
  }
}

export function createOpenRouterGroundedAnswerer(options?: {
  apiKey?: string;
  model?: string;
  referer?: string;
  appName?: string;
}): GenerateGroundedAnswer | undefined {
  const apiKey = options?.apiKey ?? readDotEnvLocalValue("OPENROUTER_API_KEY") ?? process.env.OPENROUTER_API_KEY;
  const model =
    options?.model ??
    readDotEnvLocalValue("KNOWLEDGE_GRAPH_LLM_MODEL") ??
    process.env.KNOWLEDGE_GRAPH_LLM_MODEL ??
    "google/gemma-4-31b-it:free";
  const referer =
    options?.referer ??
    process.env.OPENROUTER_SITE_URL ??
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : undefined) ??
    "http://localhost:3000";
  const appName = options?.appName ?? process.env.OPENROUTER_APP_NAME ?? "2026 Trends Atlas";

  if (!apiKey) {
    console.warn("OpenRouter LLM disabled: OPENROUTER_API_KEY is missing.");
    return undefined;
  }
  if (!ALLOWED_FREE_MODELS.has(model)) {
    console.warn(
      `OpenRouter LLM disabled: model "${model}" is not in the free-model allowlist (${[
        ...ALLOWED_FREE_MODELS
      ].join(", ")}).`
    );
    return undefined;
  }

  return async ({ query, snippets }) => {
    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
        "HTTP-Referer": referer,
        "X-Title": appName
      },
      body: JSON.stringify({
        model,
        temperature: 0.2,
        messages: [
          {
            role: "system",
            content: buildSystemPrompt()
          },
          {
            role: "user",
            content: buildUserPrompt(query, snippets)
          }
        ]
      })
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`OpenRouter synthesis failed (${response.status}): ${text.slice(0, 400)}`);
    }

    const payload = await response.json();
    const text = extractTextFromOpenRouterResponse(payload);
    if (!text) {
      throw new Error("LLM returned an empty answer");
    }

    return text;
  };
}
