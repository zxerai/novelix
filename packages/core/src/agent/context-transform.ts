import type { AgentMessage } from "@mariozechner/pi-agent-core";
import type { UserMessage } from "@mariozechner/pi-ai";
import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";
import { isNewLayoutBook } from "../utils/outline-paths.js";

/** Files read in this order; anything else in story/ comes after, sorted alphabetically. */
const PRIORITY_FILES = [
  "story_bible.md",
  "volume_outline.md",
  "book_rules.md",
  "current_focus.md",
];

const UPGRADE_HINT =
  "[提示] 当前这本书的架构稿是旧的条目式格式（story_bible.md / volume_outline.md / character_matrix.md）。" +
  "如果作者有意愿升级成段落式架构稿 + 一人一卡的角色目录（outline/story_frame.md + outline/volume_map.md + roles/），" +
  "可以调用 `sub_agent(architect, { revise: true, bookId, feedback: \"把架构稿从条目式升级成段落式架构稿，并把角色矩阵拆成 roles 目录一人一卡\" })`。" +
  "升级只改架构稿，不动已写的章节。在作者没明确同意前不要主动触发。";

export function createBookContextTransform(
  bookId: string | null,
  projectRoot: string,
): (messages: AgentMessage[], signal?: AbortSignal) => Promise<AgentMessage[]> {
  if (bookId === null) {
    return async (messages) => messages;
  }

  const bookDir = join(projectRoot, "books", bookId);
  const storyDir = join(bookDir, "story");

  return async (messages) => {
    const sections = await readTruthFiles(storyDir);
    if (sections.length === 0) return messages;

    const isNew = await isNewLayoutBook(bookDir);
    const hintBlock = isNew ? "" : `\n\n${UPGRADE_HINT}`;

    const body =
      "[以下是当前书籍的真相文件，每次对话时自动从磁盘读取注入。请基于这些内容进行创作和判断。]" +
      hintBlock + "\n\n" +
      sections.map((s) => `=== ${s.name} ===\n${s.content}`).join("\n\n");

    const injected: UserMessage = {
      role: "user",
      content: body,
      timestamp: Date.now(),
    };

    return [injected, ...messages];
  };
}

interface TruthFileSection {
  name: string;
  content: string;
}

async function readTruthFiles(storyDir: string): Promise<TruthFileSection[]> {
  let entries: string[];
  try {
    entries = await readdir(storyDir);
  } catch {
    return [];
  }

  const mdFiles = entries.filter((f) => f.endsWith(".md"));
  if (mdFiles.length === 0) return [];

  const prioritySet = new Set(PRIORITY_FILES);
  const prioritized = PRIORITY_FILES.filter((f) => mdFiles.includes(f));
  const rest = mdFiles.filter((f) => !prioritySet.has(f)).sort();
  const ordered = [...prioritized, ...rest];

  const sections: TruthFileSection[] = [];
  for (const fileName of ordered) {
    try {
      const content = await readFile(join(storyDir, fileName), "utf-8");
      sections.push({ name: fileName, content });
    } catch {
      // skip unreadable files
    }
  }
  return sections;
}
