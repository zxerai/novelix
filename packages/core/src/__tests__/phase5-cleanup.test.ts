import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { ArchitectAgent } from "../agents/architect.js";
import { readBookRules as readStructuredBookRules } from "../agents/rules-reader.js";
import { readBookRules as readPlannerBookRules } from "../agents/planner-context.js";
import { readVolumeMap } from "../utils/outline-paths.js";
import { StateManager } from "../state/manager.js";
import type { BookConfig } from "../models/book.js";

// ---------------------------------------------------------------------------
// Phase 5 cleanup (4) — verifies the post-cleanup invariants:
//   (1) volume_outline.md mirror is NOT produced by the architect
//       — readVolumeMap() still resolves through outline/volume_map.md
//   (2) particle_ledger.md / subplot_board.md are NOT seeded by the architect
//   (3) book_rules.md's YAML frontmatter now lives on story_frame.md; the
//       legacy file becomes a compat shim, and readBookRules() prefers the
//       new location
// ---------------------------------------------------------------------------

const ZERO_USAGE = {
  promptTokens: 0,
  completionTokens: 0,
  totalTokens: 0,
} as const;

const SAMPLE_RESPONSE = [
  "=== SECTION: story_frame ===",
  "## 主题与基调",
  "一段测试用的主题散文。",
  "## 主角弧线",
  "主角从 A 走向 B。",
  "## 核心冲突与对手",
  "对手是 X。",
  "## 世界观底色",
  "湿冷的小镇。",
  "## 终局方向",
  "最后一个镜头。",
  "",
  "=== SECTION: volume_map ===",
  "## 各卷主题",
  "卷一压卷二放。",
  "## 关键节点章",
  "第 10 章转折。",
  "## 卷间钩子与回收",
  "钩子 H01。",
  "## 角色阶段性目标",
  "卷一：定调。",
  "## 卷尾必须发生的改变",
  "身份暴露。",
  "## 节奏意图",
  "前 10 章压。",
  "",
  "=== SECTION: rhythm_principles ===",
  "## 原则 1",
  "每 8 章一个高潮。",
  "",
  "=== SECTION: roles ===",
  "---ROLE---",
  "tier: major",
  "name: 主角甲",
  "---CONTENT---",
  "## 核心标签",
  "沉默、执拗",
  "## 反差细节",
  "会给流浪狗留罐头",
  "## 人物小传",
  "测试用小传。",
  "## 当前现状",
  "旧书店账房。",
  "## 关系网络",
  "无。",
  "## 内在驱动",
  "查清真相。",
  "## 成长弧光",
  "从单打独斗到托付他人。",
  "",
  "=== SECTION: book_rules ===",
  "---",
  "version: \"1.0\"",
  "protagonist:",
  "  name: 主角甲",
  "  personalityLock: [沉默, 执拗]",
  "  behavioralConstraints: [不对长辈失礼]",
  "prohibitions:",
  "  - 不得美化体制暴力",
  "chapterTypesOverride: []",
  "fatigueWordsOverride: []",
  "additionalAuditDimensions: []",
  "enableFullCastTracking: false",
  "---",
  "## 叙事视角",
  "第三人称单一视角。",
  "",
  "=== SECTION: current_state ===",
  "| 字段 | 值 |",
  "| --- | --- |",
  "| 当前章节 | 0 |",
  "",
  "=== SECTION: pending_hooks ===",
  "| hook_id | 起始章节 | 类型 | 状态 | 最近推进 | 预期回收 | 回收节奏 | 备注 |",
  "| --- | --- | --- | --- | --- | --- | --- | --- |",
  "| H01 | 1 | 主线 | 未开启 | 0 | 32章 | 中程 | 测试钩子 |",
].join("\n");

function buildAgent(): ArchitectAgent {
  return new ArchitectAgent({
    client: {
      provider: "openai",
      apiFormat: "chat",
      stream: false,
      defaults: {
        temperature: 0.7,
        maxTokens: 4096,
        thinkingBudget: 0,
        maxTokensCap: null,
        extra: {},
      },
    },
    model: "test-model",
    projectRoot: process.cwd(),
  });
}

function baseBook(): BookConfig {
  return {
    id: "cleanup-book",
    title: "清理测试书",
    platform: "other",
    genre: "urban",
    status: "active",
    targetChapters: 40,
    chapterWordCount: 2000,
    language: "zh",
    createdAt: "2026-04-15T00:00:00.000Z",
    updatedAt: "2026-04-15T00:00:00.000Z",
  };
}

describe("Phase 5 cleanup (1) — volume_outline.md mirror removed", () => {
  let bookDir: string;

  beforeEach(async () => {
    bookDir = await mkdtemp(join(tmpdir(), "jiaos-cleanup-1-"));
  });

  afterEach(async () => {
    await rm(bookDir, { recursive: true, force: true });
    vi.restoreAllMocks();
  });

  it("does not write volume_outline.md when running a fresh architect foundation", async () => {
    const agent = buildAgent();
    vi.spyOn(agent as unknown as { chat: (...args: unknown[]) => Promise<unknown> }, "chat")
      .mockResolvedValue({ content: SAMPLE_RESPONSE, usage: ZERO_USAGE });

    const output = await agent.generateFoundation(baseBook());
    await agent.writeFoundationFiles(bookDir, output, false, "zh");

    await expect(
      readFile(join(bookDir, "story/volume_outline.md"), "utf-8"),
    ).rejects.toThrow();

    const newOutline = await readFile(join(bookDir, "story/outline/volume_map.md"), "utf-8");
    expect(newOutline).toContain("卷一压卷二放");
  });

  it("readVolumeMap resolves the new path without needing the legacy mirror", async () => {
    await mkdir(join(bookDir, "story/outline"), { recursive: true });
    await writeFile(
      join(bookDir, "story/outline/volume_map.md"),
      "NEW map content",
      "utf-8",
    );

    const content = await readVolumeMap(bookDir, "(missing)");
    expect(content).toBe("NEW map content");
  });

  it("readVolumeMap still falls back to legacy volume_outline.md for pre-cleanup books", async () => {
    await mkdir(join(bookDir, "story"), { recursive: true });
    await writeFile(
      join(bookDir, "story/volume_outline.md"),
      "LEGACY outline content",
      "utf-8",
    );

    const content = await readVolumeMap(bookDir, "(missing)");
    expect(content).toBe("LEGACY outline content");
  });

  it("isCompleteBookDirectory accepts the new outline/ layout (no legacy mirror needed)", async () => {
    const projectRoot = await mkdtemp(join(tmpdir(), "jiaos-cleanup-1-proj-"));
    try {
      const targetBookDir = join(projectRoot, "books", "cleanup-book");
      const storyDir = join(targetBookDir, "story");
      await mkdir(join(storyDir, "outline"), { recursive: true });
      await mkdir(join(targetBookDir, "chapters"), { recursive: true });

      await Promise.all([
        writeFile(join(targetBookDir, "book.json"), "{}", "utf-8"),
        writeFile(join(storyDir, "outline/story_frame.md"), "# frame", "utf-8"),
        writeFile(join(storyDir, "outline/volume_map.md"), "# map", "utf-8"),
        writeFile(join(storyDir, "book_rules.md"), "# rules", "utf-8"),
        writeFile(join(storyDir, "current_state.md"), "# state", "utf-8"),
        writeFile(join(storyDir, "pending_hooks.md"), "# hooks", "utf-8"),
        writeFile(join(targetBookDir, "chapters/index.json"), "[]", "utf-8"),
      ]);

      const state = new StateManager(projectRoot);
      await expect(state.isCompleteBookDirectory(targetBookDir)).resolves.toBe(true);
    } finally {
      await rm(projectRoot, { recursive: true, force: true });
    }
  });

  it("isCompleteBookDirectory still accepts the pre-cleanup layout (legacy flat files)", async () => {
    const projectRoot = await mkdtemp(join(tmpdir(), "jiaos-cleanup-1-legacy-"));
    try {
      const targetBookDir = join(projectRoot, "books", "legacy-book");
      const storyDir = join(targetBookDir, "story");
      await mkdir(storyDir, { recursive: true });
      await mkdir(join(targetBookDir, "chapters"), { recursive: true });

      await Promise.all([
        writeFile(join(targetBookDir, "book.json"), "{}", "utf-8"),
        writeFile(join(storyDir, "story_bible.md"), "# bible", "utf-8"),
        writeFile(join(storyDir, "volume_outline.md"), "# outline", "utf-8"),
        writeFile(join(storyDir, "book_rules.md"), "# rules", "utf-8"),
        writeFile(join(storyDir, "current_state.md"), "# state", "utf-8"),
        writeFile(join(storyDir, "pending_hooks.md"), "# hooks", "utf-8"),
        writeFile(join(targetBookDir, "chapters/index.json"), "[]", "utf-8"),
      ]);

      const state = new StateManager(projectRoot);
      await expect(state.isCompleteBookDirectory(targetBookDir)).resolves.toBe(true);
    } finally {
      await rm(projectRoot, { recursive: true, force: true });
    }
  });
});

describe("Phase 5 cleanup (2) — architect no longer seeds runtime log files", () => {
  let bookDir: string;

  beforeEach(async () => {
    bookDir = await mkdtemp(join(tmpdir(), "jiaos-cleanup-2-"));
  });

  afterEach(async () => {
    await rm(bookDir, { recursive: true, force: true });
    vi.restoreAllMocks();
  });

  it("does not write particle_ledger.md or subplot_board.md even when the genre wants a numerical system", async () => {
    const agent = buildAgent();
    vi.spyOn(agent as unknown as { chat: (...args: unknown[]) => Promise<unknown> }, "chat")
      .mockResolvedValue({ content: SAMPLE_RESPONSE, usage: ZERO_USAGE });

    const output = await agent.generateFoundation(baseBook());
    // numericalSystem=true would previously seed particle_ledger.md
    await agent.writeFoundationFiles(bookDir, output, true, "zh");

    await expect(
      readFile(join(bookDir, "story/particle_ledger.md"), "utf-8"),
    ).rejects.toThrow();
    await expect(
      readFile(join(bookDir, "story/subplot_board.md"), "utf-8"),
    ).rejects.toThrow();
  });
});

describe("Phase 5 cleanup (3) — book_rules YAML moved to story_frame.md frontmatter", () => {
  let bookDir: string;

  beforeEach(async () => {
    bookDir = await mkdtemp(join(tmpdir(), "jiaos-cleanup-3-"));
  });

  afterEach(async () => {
    await rm(bookDir, { recursive: true, force: true });
    vi.restoreAllMocks();
  });

  it("writes the YAML frontmatter onto story_frame.md (not book_rules.md)", async () => {
    const agent = buildAgent();
    vi.spyOn(agent as unknown as { chat: (...args: unknown[]) => Promise<unknown> }, "chat")
      .mockResolvedValue({ content: SAMPLE_RESPONSE, usage: ZERO_USAGE });

    const output = await agent.generateFoundation(baseBook());
    await agent.writeFoundationFiles(bookDir, output, false, "zh");

    const storyFrame = await readFile(join(bookDir, "story/outline/story_frame.md"), "utf-8");
    // story_frame.md now starts with YAML frontmatter
    expect(storyFrame.trimStart().startsWith("---")).toBe(true);
    expect(storyFrame).toContain("protagonist:");
    expect(storyFrame).toContain("主角甲");
    expect(storyFrame).toContain("prohibitions:");
    // prose body still present
    expect(storyFrame).toContain("主题与基调");

    // book_rules.md is now a compat shim, not the full YAML file
    const bookRulesShim = await readFile(join(bookDir, "story/book_rules.md"), "utf-8");
    expect(bookRulesShim).toContain("兼容指针");
    expect(bookRulesShim).toContain("story_frame.md");
    // Shim carries the narrative body excerpt but not the YAML frontmatter
    expect(bookRulesShim).toContain("叙事视角");
    expect(bookRulesShim).not.toMatch(/^---\s*\nversion:/m);
  });

  it("readBookRules() prefers story_frame.md frontmatter and parses the rules", async () => {
    const agent = buildAgent();
    vi.spyOn(agent as unknown as { chat: (...args: unknown[]) => Promise<unknown> }, "chat")
      .mockResolvedValue({ content: SAMPLE_RESPONSE, usage: ZERO_USAGE });

    const output = await agent.generateFoundation(baseBook());
    await agent.writeFoundationFiles(bookDir, output, false, "zh");

    const parsed = await readStructuredBookRules(bookDir);
    expect(parsed).not.toBeNull();
    expect(parsed?.rules.protagonist?.name).toBe("主角甲");
    expect(parsed?.rules.protagonist?.personalityLock).toEqual(["沉默", "执拗"]);
    expect(parsed?.rules.prohibitions).toEqual(["不得美化体制暴力"]);
  });

  it("readBookRules() falls back to legacy book_rules.md when story_frame.md has no frontmatter", async () => {
    const storyDir = join(bookDir, "story");
    await mkdir(join(storyDir, "outline"), { recursive: true });
    // story_frame.md exists but has NO frontmatter (pre-cleanup book)
    await writeFile(
      join(storyDir, "outline/story_frame.md"),
      "# Story Frame\n\nPure prose with no YAML.\n",
      "utf-8",
    );
    // Legacy book_rules.md carries the real frontmatter
    await writeFile(
      join(storyDir, "book_rules.md"),
      "---\nversion: \"1.0\"\nprotagonist:\n  name: LegacyHero\n  personalityLock: [stoic]\n  behavioralConstraints: []\nprohibitions:\n  - No lazy tropes\n---\n",
      "utf-8",
    );

    const parsed = await readStructuredBookRules(bookDir);
    expect(parsed?.rules.protagonist?.name).toBe("LegacyHero");
    expect(parsed?.rules.prohibitions).toEqual(["No lazy tropes"]);
  });

  it("readBookRules() returns null when neither source exists", async () => {
    const parsed = await readStructuredBookRules(bookDir);
    expect(parsed).toBeNull();
  });

  it("planner-context readBookRules renders structured fields as a markdown block", async () => {
    const storyDir = join(bookDir, "story");
    await mkdir(join(storyDir, "outline"), { recursive: true });
    await writeFile(
      join(storyDir, "outline/story_frame.md"),
      [
        "---",
        "version: \"1.0\"",
        "protagonist:",
        "  name: 林辞",
        "  personalityLock: [沉默, 执拗]",
        "  behavioralConstraints: [不对长辈失礼]",
        "prohibitions:",
        "  - 不得美化体制暴力",
        "  - 不得神化主角",
        "---",
        "",
        "# Story Frame",
        "",
        "主题：测试",
        "",
      ].join("\n"),
      "utf-8",
    );

    const rendered = await readPlannerBookRules(storyDir);
    expect(rendered).toContain("林辞");
    expect(rendered).toContain("沉默");
    expect(rendered).toContain("执拗");
    expect(rendered).toContain("不得美化体制暴力");
    expect(rendered).toContain("不得神化主角");
    expect(rendered).toContain("不对长辈失礼");
  });

  it("planner-context readBookRules returns empty string when no rules source exists", async () => {
    const storyDir = join(bookDir, "story");
    await mkdir(storyDir, { recursive: true });
    const rendered = await readPlannerBookRules(storyDir);
    expect(rendered).toBe("");
  });
});
