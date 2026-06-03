import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { mkdtemp, readdir, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { ArchitectAgent } from "../agents/architect.js";
import type { BookConfig } from "../models/book.js";

const ZERO_USAGE = {
  promptTokens: 0,
  completionTokens: 0,
  totalTokens: 0,
} as const;

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
    id: "phase5-book",
    title: "Phase5测试书",
    platform: "other",
    genre: "urban",
    status: "active",
    targetChapters: 60,
    chapterWordCount: 2200,
    language: "zh",
    createdAt: "2026-04-15T00:00:00.000Z",
    updatedAt: "2026-04-15T00:00:00.000Z",
  };
}

const SAMPLE_RESPONSE = [
  "=== SECTION: story_frame ===",
  "## 主题与基调",
  "这本书讲的是一个被时代按在泥里的人如何选择不被改写。",
  "## 主角弧线",
  "主角从沉默的旁观者走向沉默的见证人——代价是离开故乡。",
  "## 核心冲突与对手",
  "主角相信记录真相有价值，体制相信记录真相会扰乱秩序。",
  "## 世界观底色",
  "这是一个湿冷的沿海城市，铁律：凡被记录的名字都会消失。",
  "## 终局方向",
  "最后一个镜头是主角在码头上把笔记本烧了又重新写。",
  "",
  "=== SECTION: volume_map ===",
  "## 各卷主题与情绪曲线",
  "共三卷，第一卷压，第二卷放，第三卷压回。",
  "## 关键节点章",
  "第 17 章让他回家——母亲病重。第 32 章揭开秘密。第 55 章最终对峙。",
  "## 卷间钩子与回收",
  "第一卷埋下笔记本钩子，第 32 章回收。",
  "## 角色阶段性目标",
  "第一卷末：主角决定留下。",
  "## 卷尾必须发生的改变",
  "第一卷末：身份暴露。",
  "## 节奏意图",
  "前 10 章高压引人。",
  "",
  "=== SECTION: rhythm_principles ===",
  "## 原则 1：高潮间距",
  "每 8-10 章一个大高潮。",
  "## 原则 2：喘息频率",
  "每 3 章高压后必须 1 章喘息。",
  "## 原则 3：钩子密度",
  "每章章末 1 个主钩，最多悬 5 章。",
  "## 原则 4：信息释放节奏",
  "前 1/3 释放 30%，中段 40%，后段 30%。",
  "## 原则 5：爽点节奏",
  "每 5 章一个智商碾压式爽点。",
  "## 原则 6：情感节点递进",
  "每 6 章情感关系必须实质推进一次。",
  "",
  "=== SECTION: roles ===",
  "---ROLE---",
  "tier: major",
  "name: 林辞",
  "---CONTENT---",
  "## 核心标签",
  "沉默、执拗、过度理性",
  "## 反差细节",
  "会在加油站给流浪狗留罐头",
  "## 人物小传",
  "十五岁时失去父亲，从此习惯把情绪写下来。",
  "## 当前现状",
  "在码头边上的旧书店做账房。",
  "## 关系网络",
  "与沈默是旧日同窗。",
  "## 内在驱动",
  "想知道父亲死前那一夜发生了什么。",
  "## 成长弧光",
  "从独自追查到学会把真相交给别人。",
  "---ROLE---",
  "tier: major",
  "name: 沈默",
  "---CONTENT---",
  "## 核心标签",
  "精致、疏离、惯于算计",
  "## 反差细节",
  "唯独对林辞从不说谎",
  "## 人物小传",
  "出身体制内家庭。",
  "## 当前现状",
  "新任区域办公室副职。",
  "## 关系网络",
  "与林辞关系复杂。",
  "## 内在驱动",
  "想在规则内做到最好。",
  "## 成长弧光",
  "被迫在规则与情义间选择。",
  "---ROLE---",
  "tier: minor",
  "name: 老张",
  "---CONTENT---",
  "## 核心标签",
  "油滑、念旧",
  "## 反差细节",
  "每年清明会独自去扫一个无名坟",
  "## 当前现状",
  "旧书店老板。",
  "## 与主角关系",
  "代父执辈。",
  "",
  "=== SECTION: book_rules ===",
  "---",
  "version: \"1.0\"",
  "protagonist:",
  "  name: 林辞",
  "  personalityLock: [沉默, 执拗, 理性]",
  "  behavioralConstraints: [不对长辈失礼]",
  "genreLock:",
  "  primary: urban",
  "  forbidden: [玄幻色彩]",
  "prohibitions:",
  "  - 不得美化体制暴力",
  "chapterTypesOverride: []",
  "fatigueWordsOverride: []",
  "additionalAuditDimensions: []",
  "enableFullCastTracking: false",
  "---",
  "## 叙事视角",
  "第三人称单一视角，贴着主角。",
  "## 核心冲突驱动",
  "参见 outline/story_frame.md 段 3。",
  "",
  "=== SECTION: current_state ===",
  "| 字段 | 值 |",
  "| --- | --- |",
  "| 当前章节 | 0 |",
  "| 当前位置 | 码头旧书店 |",
  "| 主角状态 | 刚回乡 |",
  "| 当前目标 | 查清父亲死因 |",
  "| 当前限制 | 没有线索 |",
  "| 当前敌我 | 尚未出现 |",
  "| 当前冲突 | 自我怀疑 |",
  "",
  "=== SECTION: pending_hooks ===",
  "| hook_id | 起始章节 | 类型 | 状态 | 最近推进 | 预期回收 | 回收节奏 | 备注 |",
  "| --- | --- | --- | --- | --- | --- | --- | --- |",
  "| H01 | 1 | 主线 | 未开启 | 0 | 32章 | 中程 | 父亲的笔记本 |",
].join("\n");

describe("ArchitectAgent — Phase 5 prose output", () => {
  let bookDir: string;

  beforeEach(async () => {
    bookDir = await mkdtemp(join(tmpdir(), "jiaos-phase5-arch-"));
  });

  afterEach(async () => {
    await rm(bookDir, { recursive: true, force: true });
    vi.restoreAllMocks();
  });

  it("parses storyFrame / volumeMap / rhythmPrinciples / roles from the response", async () => {
    const agent = buildAgent();
    vi.spyOn(agent as unknown as { chat: (...args: unknown[]) => Promise<unknown> }, "chat")
      .mockResolvedValue({ content: SAMPLE_RESPONSE, usage: ZERO_USAGE });

    const result = await agent.generateFoundation(baseBook());

    expect(result.storyFrame).toContain("主题与基调");
    expect(result.volumeMap).toContain("第 17 章让他回家");
    expect(result.rhythmPrinciples).toContain("高潮间距");
    expect(result.roles).toBeDefined();
    expect(result.roles).toHaveLength(3);

    const majors = (result.roles ?? []).filter((role) => role.tier === "major");
    const minors = (result.roles ?? []).filter((role) => role.tier === "minor");
    expect(majors.map((role) => role.name)).toEqual(["林辞", "沈默"]);
    expect(minors.map((role) => role.name)).toEqual(["老张"]);
    expect(majors[0]?.content).toContain("核心标签");
    expect(majors[0]?.content).toContain("反差细节");
  });

  it("writes outline/* prose files, roles/*, and compat shims for story_bible/character_matrix", async () => {
    const agent = buildAgent();
    vi.spyOn(agent as unknown as { chat: (...args: unknown[]) => Promise<unknown> }, "chat")
      .mockResolvedValue({ content: SAMPLE_RESPONSE, usage: ZERO_USAGE });

    const result = await agent.generateFoundation(baseBook());
    await agent.writeFoundationFiles(bookDir, result, false, "zh");

    const storyDir = join(bookDir, "story");
    const storyFrame = await readFile(join(storyDir, "outline/story_frame.md"), "utf-8");
    expect(storyFrame).toContain("主题与基调");

    const volumeMap = await readFile(join(storyDir, "outline/volume_map.md"), "utf-8");
    expect(volumeMap).toContain("第 17 章让他回家");

    const rhythm = await readFile(join(storyDir, "outline/节奏原则.md"), "utf-8");
    expect(rhythm).toContain("高潮间距");

    // Role files — one per character, grouped by tier
    const majorFiles = await readdir(join(storyDir, "roles", "主要角色"));
    expect(majorFiles.sort()).toEqual(["林辞.md", "沈默.md"]);
    const minorFiles = await readdir(join(storyDir, "roles", "次要角色"));
    expect(minorFiles).toEqual(["老张.md"]);

    // Compat shim: story_bible.md must exist and point at outline/story_frame.md
    const storyBibleShim = await readFile(join(storyDir, "story_bible.md"), "utf-8");
    expect(storyBibleShim).toContain("兼容指针");
    expect(storyBibleShim).toContain("outline/story_frame.md");

    // Compat shim: character_matrix.md points at roles/ directory
    const matrixShim = await readFile(join(storyDir, "character_matrix.md"), "utf-8");
    expect(matrixShim).toContain("兼容指针");
    expect(matrixShim).toContain("roles/主要角色/林辞.md");
    expect(matrixShim).toContain("roles/次要角色/老张.md");

    // Runtime state files still produced
    const currentState = await readFile(join(storyDir, "current_state.md"), "utf-8");
    expect(currentState).toContain("当前章节");
    const pendingHooks = await readFile(join(storyDir, "pending_hooks.md"), "utf-8");
    expect(pendingHooks).toContain("H01");

    // Cleanup #1: volume_outline.md mirror is NOT written anymore. All
    // readers flow through readVolumeMap() which falls back to the legacy
    // path only for pre-Phase-5 books that still have the file on disk.
    await expect(readFile(join(storyDir, "volume_outline.md"), "utf-8")).rejects.toThrow();
  });

  it("still requires book_rules / roles / pending_hooks to be present (current_state is optional after consolidation)", async () => {
    const agent = buildAgent();
    vi.spyOn(agent as unknown as { chat: (...args: unknown[]) => Promise<unknown> }, "chat")
      .mockResolvedValue({
        content: [
          "=== SECTION: story_frame ===",
          "# frame",
          "=== SECTION: volume_map ===",
          "# map",
          "=== SECTION: pending_hooks ===",
          "# hooks",
        ].join("\n"),
        usage: ZERO_USAGE,
      });

    // book_rules + roles both missing — the error message lists them.
    await expect(agent.generateFoundation(baseBook())).rejects.toThrow(/book_rules/i);
    await expect(agent.generateFoundation(baseBook())).rejects.toThrow(/roles/i);
    // current_state is NOT in the missing list — it's optional now.
    try {
      await agent.generateFoundation(baseBook());
      throw new Error("should have rejected");
    } catch (error) {
      const message = (error as Error).message;
      expect(message).not.toMatch(/current_state/i);
    }
  });

  it("requires at least one of story_frame or legacy story_bible", async () => {
    const agent = buildAgent();
    vi.spyOn(agent as unknown as { chat: (...args: unknown[]) => Promise<unknown> }, "chat")
      .mockResolvedValue({
        content: [
          "=== SECTION: volume_map ===",
          "# map",
          "=== SECTION: roles ===",
          "---ROLE---",
          "tier: major",
          "name: X",
          "---CONTENT---",
          "## 核心标签",
          "只是占位",
          "=== SECTION: book_rules ===",
          "---\nversion: \"1.0\"\n---",
          "=== SECTION: pending_hooks ===",
          "| hook_id | 起始章节 | 类型 | 状态 | 最近推进 | 预期回收 | 回收节奏 | 备注 |",
        ].join("\n"),
        usage: ZERO_USAGE,
      });

    await expect(agent.generateFoundation(baseBook())).rejects.toThrow(/story_frame/i);
  });

  it("system prompt emphasises volume-level prose for volume_map and contrast-detail for roles", async () => {
    const agent = buildAgent();
    const chat = vi.spyOn(agent as unknown as { chat: (...args: unknown[]) => Promise<unknown> }, "chat")
      .mockResolvedValue({ content: SAMPLE_RESPONSE, usage: ZERO_USAGE });

    await agent.generateFoundation(baseBook());

    const messages = chat.mock.calls[0]?.[0] as Array<{ role: string; content: string }>;
    const system = messages[0]?.content ?? "";
    expect(system).toContain("散文密度");
    // Post-refactor: architect stays at volume level; chapter-level planning is planner's job.
    expect(system).toContain("只写到卷级 prose");
    expect(system).toContain("反差细节");
    expect(system).toContain("节奏原则");
    expect(system).toContain("=== SECTION: story_frame ===");
    expect(system).toContain("=== SECTION: volume_map ===");
    // Phase 5 consolidation: rhythm_principles is merged into volume_map's
    // closing paragraph and is NOT a standalone SECTION header.
    expect(system).not.toContain("=== SECTION: rhythm_principles ===");
    // current_state is also no longer produced by the architect — era/setting
    // anchors (when the genre pins to a real year) are woven into
    // story_frame.世界观底色; other genres omit them entirely.
    expect(system).not.toContain("=== SECTION: current_state ===");
    expect(system).toContain("=== SECTION: roles ===");
    expect(system).toContain("=== SECTION: book_rules ===");
    expect(system).toContain("=== SECTION: pending_hooks ===");
  });
});

describe("writeFoundationFiles — rhythm file is skipped when rhythmPrinciples is empty", () => {
  let bookDir: string;

  beforeEach(async () => {
    bookDir = await mkdtemp(join(tmpdir(), "jiaos-phase5-rhythm-skip-"));
  });

  afterEach(async () => {
    await rm(bookDir, { recursive: true, force: true });
    vi.restoreAllMocks();
  });

  it("does not write outline/节奏原则.md when the architect output carries no rhythm block", async () => {
    // CONSOLIDATED_RESPONSE (trimmed) has rhythm merged into volume_map tail
    // and no standalone rhythm_principles section — rhythmPrinciples ends up
    // an empty string.
    const noRhythmResponse = [
      "=== SECTION: story_frame ===",
      "## 主题与基调",
      "一段主题散文。",
      "## 核心冲突",
      "主角 vs 体制。",
      "## 世界观底色",
      "湿冷的沿海城市。",
      "## 终局方向",
      "最后一个镜头。",
      "",
      "=== SECTION: volume_map ===",
      "## 各卷主题与情绪曲线",
      "三卷结构。",
      "## 关键节点章",
      "第 17 章回家。",
      "## 卷间钩子",
      "钩子 H01。",
      "## 角色阶段性目标",
      "卷一末：定调。",
      "## 卷尾必须发生的改变",
      "身份暴露。",
      "## 节奏原则（具体化 + 通用）",
      "1-6. 节奏 merged into volume_map tail.",
      "",
      "=== SECTION: roles ===",
      "---ROLE---",
      "tier: major",
      "name: 林辞",
      "---CONTENT---",
      "## 核心标签",
      "沉默",
      "## 反差细节",
      "罐头",
      "## 人物小传",
      "过往。",
      "## 当前现状",
      "账房。",
      "## 关系网络",
      "与沈默。",
      "## 内在驱动",
      "查真相。",
      "## 成长弧光",
      "从独到托。",
      "",
      "=== SECTION: book_rules ===",
      "---",
      "version: \"1.0\"",
      "---",
      "",
      "=== SECTION: pending_hooks ===",
      "| hook_id | 起始章节 | 类型 | 状态 | 最近推进 | 预期回收 | 回收节奏 | 备注 |",
      "| --- | --- | --- | --- | --- | --- | --- | --- |",
      "| H01 | 1 | 主线 | 未开启 | 0 | 终章 | 终局 | 笔记本 |",
    ].join("\n");

    const agent = buildAgent();
    vi.spyOn(agent as unknown as { chat: (...args: unknown[]) => Promise<unknown> }, "chat")
      .mockResolvedValue({ content: noRhythmResponse, usage: ZERO_USAGE });

    const out = await agent.generateFoundation(baseBook());
    expect((out.rhythmPrinciples ?? "").trim()).toBe("");

    await agent.writeFoundationFiles(bookDir, out, false, "zh");

    // No standalone rhythm file on disk — rhythm content lives in
    // volume_map's closing paragraph.
    await expect(
      readFile(join(bookDir, "story/outline/节奏原则.md"), "utf-8"),
    ).rejects.toThrow();

    // But volume_map still exists and carries the rhythm tail.
    const volumeMap = await readFile(
      join(bookDir, "story/outline/volume_map.md"),
      "utf-8",
    );
    expect(volumeMap).toContain("节奏原则（具体化 + 通用）");
  });

  it("still writes outline/rhythm_principles.md (en) when the architect emits a standalone block (legacy path)", async () => {
    // Simulate a legacy-shaped output that DOES carry an explicit
    // rhythm_principles section — writeFoundationFiles must still honour it
    // for back-compat.
    const withRhythmResponse = SAMPLE_RESPONSE;
    const agent = buildAgent();
    vi.spyOn(agent as unknown as { chat: (...args: unknown[]) => Promise<unknown> }, "chat")
      .mockResolvedValue({ content: withRhythmResponse, usage: ZERO_USAGE });

    const out = await agent.generateFoundation(baseBook());
    expect((out.rhythmPrinciples ?? "").trim().length).toBeGreaterThan(0);

    await agent.writeFoundationFiles(bookDir, out, false, "zh");

    const rhythm = await readFile(
      join(bookDir, "story/outline/节奏原则.md"),
      "utf-8",
    );
    expect(rhythm).toContain("高潮间距");
  });
});
