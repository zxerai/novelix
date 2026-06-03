import type { ChapterIntent, ChapterMemo, ContextPackage } from "../models/input-governance.js";

const HOOK_ID_PATTERN = /\bH\d+\b/gi;
const HOOK_SLUG_PATTERN = /\b[a-z]+(?:-[a-z]+){1,3}\b/g;
const CHAPTER_REF_PATTERNS: ReadonlyArray<RegExp> = [
  /\bch(?:apter)?\s*\d+\b/gi,
  /第\s*\d+\s*章/g,
];

const ZH_REPLACEMENTS: ReadonlyArray<[RegExp, string]> = [
  [/前几章/g, "此前"],
  [/本章要做的是/g, "眼下要处理的是"],
  [/本章要做的/g, "眼下要处理的"],
  [/仿佛/g, "像"],
  [/似乎/g, "像是"],
];

const EN_REPLACEMENTS: ReadonlyArray<[RegExp, string]> = [
  [/\bprevious chapters\b/gi, "earlier scenes"],
  [/\bthis chapter needs to\b/gi, "the current move is to"],
];

export function sanitizeNarrativeControlText(
  text: string,
  language: "zh" | "en" = "zh",
): string {
  let result = text;

  result = result.replace(HOOK_ID_PATTERN, language === "en" ? "this thread" : "这条线索");
  result = result.replace(HOOK_SLUG_PATTERN, language === "en" ? "this thread" : "这条线索");
  for (const pattern of CHAPTER_REF_PATTERNS) {
    result = result.replace(pattern, language === "en" ? "an earlier scene" : "此前");
  }

  for (const [pattern, replacement] of [...ZH_REPLACEMENTS, ...EN_REPLACEMENTS]) {
    result = result.replace(pattern, replacement);
  }

  return result;
}

/**
 * Render a ChapterMemo + optional ChapterIntent into a sanitized narrative
 * control block for the writer / reviser prompt.
 *
 * Phase 4: the memo body already contains the 7 required section headings
 * (当前任务 / 读者此刻在等什么 / 该兑现的 / 日常过渡 / 关键抉择 / 章尾 / 不要做)
 * produced by the planner LLM. We emit them at top level so the writer sees
 * each section as its own task-unit instead of one flattened "memo" block.
 */
export function renderMemoAsNarrativeBlock(
  memo: ChapterMemo,
  intent: ChapterIntent | undefined,
  language: "zh" | "en" = "zh",
): string {
  const s = (text: string) => sanitizeNarrativeControlText(text, language);
  const isEn = language === "en";
  const sections: string[] = [];

  sections.push(`## ${isEn ? "Goal" : "目标"}\n- ${s(memo.goal)}`);

  if (intent?.arcContext) {
    sections.push(`## ${isEn ? "Arc Context" : "弧线背景"}\n- ${s(intent.arcContext)}`);
  }

  if (memo.threadRefs.length > 0) {
    const threads = memo.threadRefs.map((id) => `- ${id}`).join("\n");
    sections.push(`## ${isEn ? "Thread Refs" : "关联线索"}\n${threads}`);
  }

  if (memo.isGoldenOpening) {
    sections.push(
      `## ${isEn ? "Golden Opening" : "黄金开场"}\n- ${isEn ? "This is a golden opening chapter — prioritize hook-dense, high-tempo pacing." : "本章是黄金开场章——优先钩子密集、高节奏。"}`,
    );
  }

  // Emit the 7-section memo body at top level so each heading is a task.
  if (memo.body.trim().length > 0) {
    sections.push(s(memo.body));
  }

  return sections.join("\n\n");
}

export function buildNarrativeIntentBrief(
  chapterIntent: string,
  language: "zh" | "en" = "zh",
): string {
  const sections = [
    { heading: "## Goal", label: language === "en" ? "Goal" : "目标" },
    { heading: "## Outline Node", label: language === "en" ? "Outline Node" : "当前节点" },
    { heading: "## Must Keep", label: language === "en" ? "Keep" : "保留" },
    { heading: "## Must Avoid", label: language === "en" ? "Avoid" : "避免" },
    { heading: "## Style Emphasis", label: language === "en" ? "Style" : "风格" },
    { heading: "## Structured Directives", label: language === "en" ? "Directives" : "指令" },
  ] as const;

  const rendered = sections
    .map(({ heading, label }) => {
      const section = extractMarkdownSection(chapterIntent, heading);
      if (!section) return null;

      const lines = section
        .split("\n")
        .map((line) => line.trim())
        .filter(Boolean)
        .filter((line) => !["- none", "- 无", "- 本轮无", "(not found)"].includes(line));
      if (lines.length === 0) return null;

      const normalized = lines
        .map((line) => line.startsWith("- ") ? line.slice(2) : line)
        .map((line) => sanitizeNarrativeControlText(line, language))
        .filter(Boolean)
        .map((line) => `- ${line}`)
        .join("\n");

      return `## ${label}\n${normalized}`;
    })
    .filter((section): section is string => Boolean(section));

  return rendered.join("\n\n");
}

export function renderNarrativeSelectedContext(
  entries: ReadonlyArray<ContextPackage["selectedContext"][number]>,
  language: "zh" | "en" = "zh",
): string {
  const heading = language === "en" ? "Evidence" : "证据";
  const reasonLabel = language === "en" ? "reason" : "原因";
  const detailLabel = language === "en" ? "detail" : "细节";

  return entries
    .map((entry, index) => {
      const lines = [
        `### ${heading} ${index + 1}`,
        `- ${reasonLabel}: ${sanitizeNarrativeControlText(entry.reason, language)}`,
        entry.excerpt ? `- ${detailLabel}: ${sanitizeNarrativeControlText(entry.excerpt, language)}` : "",
      ].filter(Boolean);
      return lines.join("\n");
    })
    .join("\n\n");
}

export function sanitizeNarrativeEvidenceBlock(
  block: string | undefined,
  language: "zh" | "en" = "zh",
): string | undefined {
  if (!block) return undefined;
  const withoutSources = block.replace(
    /(^|\n)-\s+(?:story|runtime)\/[^:\n]+:\s*/g,
    (_match, prefix: string) => `${prefix}- evidence: `,
  );
  return sanitizeNarrativeControlText(withoutSources, language);
}

function extractMarkdownSection(content: string, heading: string): string | undefined {
  const lines = content.split("\n");
  let buffer: string[] | null = null;

  for (const line of lines) {
    if (line.trim() === heading) {
      buffer = [];
      continue;
    }

    if (buffer && line.startsWith("## ") && line.trim() !== heading) {
      break;
    }

    if (buffer) {
      buffer.push(line);
    }
  }

  const section = buffer?.join("\n").trim();
  return section && section.length > 0 ? section : undefined;
}
