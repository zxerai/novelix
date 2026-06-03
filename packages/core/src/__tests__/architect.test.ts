import { afterEach, describe, expect, it, vi } from "vitest";
import { ArchitectAgent } from "../agents/architect.js";
import type { BookConfig } from "../models/book.js";
import type { LLMClient } from "../llm/provider.js";

const ZERO_USAGE = {
  promptTokens: 0,
  completionTokens: 0,
  totalTokens: 0,
} as const;

describe("ArchitectAgent", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("uses English prompts when generating foundation from imported English chapters", async () => {
    const agent = new ArchitectAgent({
      client: {
        provider: "openai",
        apiFormat: "chat",
        stream: false,
        defaults: {
          temperature: 0.7,
          maxTokens: 4096,
          thinkingBudget: 0,
          extra: {},
        },
      },
      model: "test-model",
      projectRoot: process.cwd(),
    });

    const book: BookConfig = {
      id: "english-book",
      title: "English Book",
      platform: "other",
      genre: "other",
      status: "active",
      targetChapters: 20,
      chapterWordCount: 2200,
      language: "en",
      createdAt: "2026-03-24T00:00:00.000Z",
      updatedAt: "2026-03-24T00:00:00.000Z",
    };

    const chat = vi.spyOn(agent as unknown as { chat: (...args: unknown[]) => Promise<unknown> }, "chat")
      .mockResolvedValue({
        content: [
          "=== SECTION: story_bible ===",
          "# Story Bible",
          "",
          "=== SECTION: volume_outline ===",
          "# Volume Outline",
          "",
          "=== SECTION: book_rules ===",
          "---",
          "version: \"1.0\"",
          "---",
          "",
          "# Book Rules",
          "",
          "=== SECTION: current_state ===",
          "# Current State",
          "",
          "=== SECTION: pending_hooks ===",
          "# Pending Hooks",
        ].join("\n"),
        usage: ZERO_USAGE,
      });

    await agent.generateFoundationFromImport(
      book,
      "Chapter 1: Prelude\n\nA cold wind crossed the harbor.",
    );

    const messages = chat.mock.calls[0]?.[0] as Array<{ role: string; content: string }>;
    expect(messages[0]?.content).toContain("MUST be written in English");
    expect(messages[1]?.content).toContain("Generate the complete foundation");
    expect(messages[1]?.content).not.toContain("请从中反向推导");
  });

  it("does not embed Chinese section headings in imported English foundation prompts", async () => {
    const agent = new ArchitectAgent({
      client: {
        provider: "openai",
        apiFormat: "chat",
        stream: false,
        defaults: {
          temperature: 0.7,
          maxTokens: 4096,
          thinkingBudget: 0,
          extra: {},
        },
      },
      model: "test-model",
      projectRoot: process.cwd(),
    });

    const book: BookConfig = {
      id: "english-book",
      title: "English Book",
      platform: "other",
      genre: "other",
      status: "active",
      targetChapters: 20,
      chapterWordCount: 2200,
      language: "en",
      createdAt: "2026-03-24T00:00:00.000Z",
      updatedAt: "2026-03-24T00:00:00.000Z",
    };

    const chat = vi.spyOn(agent as unknown as { chat: (...args: unknown[]) => Promise<unknown> }, "chat")
      .mockResolvedValue({
        content: [
          "=== SECTION: story_bible ===",
          "# Story Bible",
          "",
          "=== SECTION: volume_outline ===",
          "# Volume Outline",
          "",
          "=== SECTION: book_rules ===",
          "---",
          "version: \"1.0\"",
          "---",
          "",
          "# Book Rules",
          "",
          "=== SECTION: current_state ===",
          "# Current State",
          "",
          "=== SECTION: pending_hooks ===",
          "# Pending Hooks",
        ].join("\n"),
        usage: ZERO_USAGE,
      });

    await agent.generateFoundationFromImport(
      book,
      "Chapter 1: Prelude\n\nA cold wind crossed the harbor.",
    );

    const messages = chat.mock.calls[0]?.[0] as Array<{ role: string; content: string }>;
    // Phase 5: architect prompts describe the new prose sections. The English
    // import prompt must not slip Chinese section headers into the system text.
    expect(messages[0]?.content).toContain("story_frame");
    expect(messages[0]?.content).toContain("volume_map");
    expect(messages[0]?.content).not.toContain("## 01_世界观");
    expect(messages[0]?.content).not.toContain("## 叙事视角");
  });

  it("embeds reviewer feedback into original foundation regeneration prompts", async () => {
    const agent = new ArchitectAgent({
      client: {
        provider: "openai",
        apiFormat: "chat",
        stream: false,
        defaults: {
          temperature: 0.7,
          maxTokens: 4096,
          thinkingBudget: 0,
          extra: {},
        },
      },
      model: "test-model",
      projectRoot: process.cwd(),
    });

    const book: BookConfig = {
      id: "review-feedback-book",
      title: "雾港回灯",
      platform: "tomato",
      genre: "urban",
      status: "active",
      targetChapters: 60,
      chapterWordCount: 2200,
      language: "zh",
      createdAt: "2026-04-03T00:00:00.000Z",
      updatedAt: "2026-04-03T00:00:00.000Z",
    };

    const chat = vi.spyOn(agent as unknown as { chat: (...args: unknown[]) => Promise<unknown> }, "chat")
      .mockResolvedValue({
        content: [
          "=== SECTION: story_bible ===",
          "# 故事圣经",
          "",
          "=== SECTION: volume_outline ===",
          "# 卷纲",
          "",
          "=== SECTION: book_rules ===",
          "---",
          "version: \"1.0\"",
          "---",
          "",
          "=== SECTION: current_state ===",
          "# 当前状态",
          "",
          "=== SECTION: pending_hooks ===",
          "# 待回收伏笔",
        ].join("\n"),
        usage: ZERO_USAGE,
      });

    await agent.generateFoundation(
      book,
      undefined,
      "请把核心冲突收紧，并明确新空间不是旧案重演。",
    );

    const messages = chat.mock.calls[0]?.[0] as Array<{ role: string; content: string }>;
    expect(messages[0]?.content).toContain("上一轮审核反馈");
    expect(messages[0]?.content).toContain("请把核心冲突收紧");
    expect(messages[0]?.content).toContain("明确新空间不是旧案重演");
  });

  it("embeds reviewer feedback into fanfic foundation regeneration prompts", async () => {
    const agent = new ArchitectAgent({
      client: {
        provider: "openai",
        apiFormat: "chat",
        stream: false,
        defaults: {
          temperature: 0.7,
          maxTokens: 4096,
          thinkingBudget: 0,
          extra: {},
        },
      },
      model: "test-model",
      projectRoot: process.cwd(),
    });

    const book: BookConfig = {
      id: "fanfic-review-feedback-book",
      title: "三体：回声舱",
      platform: "tomato",
      genre: "other",
      status: "active",
      targetChapters: 60,
      chapterWordCount: 2200,
      language: "zh",
      createdAt: "2026-04-03T00:00:00.000Z",
      updatedAt: "2026-04-03T00:00:00.000Z",
    };

    const chat = vi.spyOn(agent as unknown as { chat: (...args: unknown[]) => Promise<unknown> }, "chat")
      .mockResolvedValue({
        content: [
          "=== SECTION: story_bible ===",
          "# 故事圣经",
          "",
          "=== SECTION: volume_outline ===",
          "# 卷纲",
          "",
          "=== SECTION: book_rules ===",
          "---",
          "version: \"1.0\"",
          "---",
          "",
          "=== SECTION: current_state ===",
          "# 当前状态",
          "",
          "=== SECTION: pending_hooks ===",
          "# 待回收伏笔",
        ].join("\n"),
        usage: ZERO_USAGE,
      });

    await agent.generateFanficFoundation(
      book,
      "# 原作正典\n- 罗辑在面壁计划中留下了一处空档。",
      "canon",
      "请明确分岔点，并用原创冲突替代原作重走。",
    );

    const messages = chat.mock.calls[0]?.[0] as Array<{ role: string; content: string }>;
    expect(messages[0]?.content).toContain("上一轮审核反馈");
    expect(messages[0]?.content).toContain("请明确分岔点");
    expect(messages[0]?.content).toContain("原创冲突替代原作重走");
  });

  it("strips assistant-style trailing coda from the final pending hooks section", async () => {
    const agent = new ArchitectAgent({
      client: {
        provider: "openai",
        apiFormat: "chat",
        stream: false,
        defaults: {
          temperature: 0.7,
          maxTokens: 4096,
          thinkingBudget: 0,
          extra: {},
        },
      },
      model: "test-model",
      projectRoot: process.cwd(),
    });

    const book: BookConfig = {
      id: "zh-book",
      title: "雾港回灯",
      platform: "other",
      genre: "other",
      status: "active",
      targetChapters: 50,
      chapterWordCount: 2200,
      language: "zh",
      createdAt: "2026-03-24T00:00:00.000Z",
      updatedAt: "2026-03-24T00:00:00.000Z",
    };

    vi.spyOn(agent as unknown as { chat: (...args: unknown[]) => Promise<unknown> }, "chat")
      .mockResolvedValue({
        content: [
          "=== SECTION: story_bible ===",
          "# 故事圣经",
          "",
          "=== SECTION: volume_outline ===",
          "# 卷纲",
          "",
          "=== SECTION: book_rules ===",
          "---",
          "version: \"1.0\"",
          "---",
          "",
          "=== SECTION: current_state ===",
          "# 当前状态",
          "",
          "=== SECTION: pending_hooks ===",
          "| hook_id | 起始章节 | 类型 | 状态 | 最近推进 | 预期回收 | 备注 |",
          "| --- | --- | --- | --- | --- | --- | --- |",
          "| H01 | 1 | 主线 | 未开启 | 无 | 10章 | 主线核心钩子 |",
          "",
          "如果你愿意，我下一步可以继续为这本《雾港回灯》输出：",
          "1. 前10章逐章细纲",
        ].join("\n"),
        usage: ZERO_USAGE,
      });

    const result = await agent.generateFoundation(book);

    // Phase 7 + hotfixes 1/2: ledger renders extended columns — depends_on,
    // pays_off_in_arc, core_hook, half_life (empty when not specified), and
    // promoted (computed at architect time). This hook has no promotion rule
    // firing (core=否, no depends_on, in-volume payoff) so 升级=否.
    expect(result.pendingHooks).toContain("| H01 | 1 | 主线 | 未开启 | 0 | 10章 | 中程 | 无 |  | 否 |  | 否 | 主线核心钩子 |");
    expect(result.pendingHooks).not.toContain("如果你愿意");
    expect(result.pendingHooks).not.toContain("前10章逐章细纲");
  });

  it("normalizes architect pending hooks into runtime-compatible numeric progress columns", async () => {
    const agent = new ArchitectAgent({
      client: {
        provider: "openai",
        apiFormat: "chat",
        stream: false,
        defaults: {
          temperature: 0.7,
          maxTokens: 4096,
          thinkingBudget: 0,
          extra: {},
        },
      },
      model: "test-model",
      projectRoot: process.cwd(),
    });

    const book: BookConfig = {
      id: "zh-book",
      title: "凌晨三点的证词",
      platform: "tomato",
      genre: "urban",
      status: "active",
      targetChapters: 80,
      chapterWordCount: 2000,
      language: "zh",
      createdAt: "2026-03-25T00:00:00.000Z",
      updatedAt: "2026-03-25T00:00:00.000Z",
    };

    vi.spyOn(agent as unknown as { chat: (...args: unknown[]) => Promise<unknown> }, "chat")
      .mockResolvedValue({
        content: [
          "=== SECTION: story_bible ===",
          "# 故事圣经",
          "",
          "=== SECTION: volume_outline ===",
          "# 卷纲",
          "",
          "=== SECTION: book_rules ===",
          "---",
          "version: \"1.0\"",
          "---",
          "",
          "=== SECTION: current_state ===",
          "# 当前状态",
          "",
          "=== SECTION: pending_hooks ===",
          "| hook_id | 起始章节 | 类型 | 状态 | 最近推进 | 预期回收 | 备注 |",
          "| --- | --- | --- | --- | --- | --- | --- |",
          "| H13 | 22 | 舆情操盘 | 待推进 | 一家自媒体公司在多个旧案节点同步接单 | 51-60章 | 庄蔓出场后逐步揭露 |",
        ].join("\n"),
        usage: ZERO_USAGE,
      });

    const result = await agent.generateFoundation(book);

    expect(result.pendingHooks).toContain("| H13 | 22 | 舆情操盘 | 待推进 | 0 | 51-60章 | 中程 | 无 |  | 否 |  | 否 | 庄蔓出场后逐步揭露（初始线索：一家自媒体公司在多个旧案节点同步接单） |");
  });

  it("accepts section labels with spacing and punctuation drift from non-strict models", async () => {
    const agent = new ArchitectAgent({
      client: {
        provider: "openai",
        apiFormat: "chat",
        stream: false,
        defaults: {
          temperature: 0.7,
          maxTokens: 4096,
          thinkingBudget: 0,
          extra: {},
        },
      },
      model: "test-model",
      projectRoot: process.cwd(),
    });

    const book: BookConfig = {
      id: "format-drift-book",
      title: "格式漂移测试",
      platform: "other",
      genre: "other",
      status: "active",
      targetChapters: 20,
      chapterWordCount: 2200,
      language: "zh",
      createdAt: "2026-04-01T00:00:00.000Z",
      updatedAt: "2026-04-01T00:00:00.000Z",
    };

    vi.spyOn(agent as unknown as { chat: (...args: unknown[]) => Promise<unknown> }, "chat")
      .mockResolvedValue({
        content: [
          "=== Section：Story Bible ===",
          "# 故事圣经",
          "",
          "=== section: Volume Outline ===",
          "# 卷纲",
          "",
          "=== SECTION: book-rules ===",
          "---",
          "version: \"1.0\"",
          "---",
          "",
          "=== SECTION : current state ===",
          "# 当前状态",
          "",
          "=== SECTION: pending hooks ===",
          "| hook_id | 起始章节 | 类型 | 状态 | 最近推进 | 预期回收 | 备注 |",
          "| --- | --- | --- | --- | --- | --- | --- |",
          "| H01 | 1 | mystery | open | 0 | 10章 | 初始钩子 |",
        ].join("\n"),
        usage: ZERO_USAGE,
      });

    const result = await agent.generateFoundation(book);

    expect(result.storyBible).toBe("# 故事圣经");
    expect(result.volumeOutline).toBe("# 卷纲");
    expect(result.bookRules).toContain("version: \"1.0\"");
    expect(result.currentState).toBe("# 当前状态");
    expect(result.pendingHooks).toContain("| H01 | 1 | mystery | open | 0 | 10章 | 中程 | 无 |  | 否 |  | 否 | 初始钩子 |");
  });

  it("throws when a required foundation section is missing", async () => {
    const agent = new ArchitectAgent({
      client: {
        provider: "openai",
        apiFormat: "chat",
        stream: false,
        defaults: {
          temperature: 0.7,
          maxTokens: 4096,
          thinkingBudget: 0,
          extra: {},
        },
      },
      model: "test-model",
      projectRoot: process.cwd(),
    });

    const book: BookConfig = {
      id: "broken-book",
      title: "Broken Book",
      platform: "other",
      genre: "other",
      status: "active",
      targetChapters: 20,
      chapterWordCount: 2200,
      language: "zh",
      createdAt: "2026-03-29T00:00:00.000Z",
      updatedAt: "2026-03-29T00:00:00.000Z",
    };

    vi.spyOn(agent as unknown as { chat: (...args: unknown[]) => Promise<unknown> }, "chat")
      .mockResolvedValue({
        content: [
          "=== SECTION: story_bible ===",
          "# 故事圣经",
          "",
          "=== SECTION: volume_outline ===",
          "# 卷纲",
          "",
          "=== SECTION: current_state ===",
          "# 当前状态",
          "",
          "=== SECTION: pending_hooks ===",
          "# 伏笔池",
        ].join("\n"),
        usage: ZERO_USAGE,
      });

    await expect(agent.generateFoundation(book)).rejects.toThrow(/book_rules/i);
  });

  it("uses modelCard output budget when generating foundation", async () => {
    const agent = new ArchitectAgent({
      client: {
        provider: "openai",
        apiFormat: "chat",
        stream: false,
        defaults: {
          temperature: 0.7,
          maxTokens: 4096,
          thinkingBudget: 0,
          extra: {},
        },
      },
      model: "test-model",
      projectRoot: process.cwd(),
    });

    const book: BookConfig = {
      id: "max-tokens-book",
      title: "Max Tokens Book",
      platform: "other",
      genre: "other",
      status: "active",
      targetChapters: 20,
      chapterWordCount: 2200,
      language: "zh",
      createdAt: "2026-03-29T00:00:00.000Z",
      updatedAt: "2026-03-29T00:00:00.000Z",
    };

    const chatSpy = vi.spyOn(agent as unknown as { chat: (...args: unknown[]) => Promise<unknown> }, "chat")
      .mockResolvedValue({
        content: [
          "=== SECTION: story_bible ===",
          "# 故事圣经",
          "",
          "=== SECTION: volume_outline ===",
          "# 卷纲",
          "",
          "=== SECTION: book_rules ===",
          "---",
          "version: \"1.0\"",
          "---",
          "",
          "=== SECTION: current_state ===",
          "# 当前状态",
          "",
          "=== SECTION: pending_hooks ===",
          "| hook_id | 起始章节 | 类型 | 状态 | 最近推进 | 预期回收 | 备注 |",
          "| --- | --- | --- | --- | --- | --- | --- |",
          "| H01 | 1 | mystery | open | 0 | 10章 | 初始钩子 |",
        ].join("\n"),
        usage: ZERO_USAGE,
      });

    await agent.generateFoundation(book);

    const options = chatSpy.mock.calls[0]?.[1] as { temperature?: number; maxTokens?: number } | undefined;
    expect(options).toEqual(expect.objectContaining({ temperature: 0.8 }));
    expect(options).not.toHaveProperty("maxTokens");
  });

  it("uses modelCard output budget when generating foundation from import", async () => {
    const agent = new ArchitectAgent({
      client: {
        provider: "openai",
        apiFormat: "chat",
        stream: false,
        defaults: {
          temperature: 0.7,
          maxTokens: 4096,
          thinkingBudget: 0,
          extra: {},
        },
      },
      model: "test-model",
      projectRoot: process.cwd(),
    });

    const book: BookConfig = {
      id: "import-max-tokens-book",
      title: "Import Max Tokens Book",
      platform: "other",
      genre: "other",
      status: "active",
      targetChapters: 20,
      chapterWordCount: 2200,
      language: "zh",
      createdAt: "2026-03-29T00:00:00.000Z",
      updatedAt: "2026-03-29T00:00:00.000Z",
    };

    const chatSpy = vi.spyOn(agent as unknown as { chat: (...args: unknown[]) => Promise<unknown> }, "chat")
      .mockResolvedValue({
        content: [
          "=== SECTION: story_bible ===",
          "# 故事圣经",
          "",
          "=== SECTION: volume_outline ===",
          "# 卷纲",
          "",
          "=== SECTION: book_rules ===",
          "---",
          "version: \"1.0\"",
          "---",
          "",
          "=== SECTION: current_state ===",
          "# 当前状态",
          "",
          "=== SECTION: pending_hooks ===",
          "| hook_id | 起始章节 | 类型 | 状态 | 最近推进 | 预期回收 | 备注 |",
          "| --- | --- | --- | --- | --- | --- | --- |",
          "| H01 | 1 | mystery | open | 0 | 10章 | 初始钩子 |",
        ].join("\n"),
        usage: ZERO_USAGE,
      });

    await agent.generateFoundationFromImport(book, "第一章正文");

    const options = chatSpy.mock.calls[0]?.[1] as { temperature?: number; maxTokens?: number } | undefined;
    expect(options).toEqual(expect.objectContaining({ temperature: 0.5 }));
    expect(options).not.toHaveProperty("maxTokens");
  });

  it("uses modelCard output budget when generating fanfic foundation", async () => {
    const agent = new ArchitectAgent({
      client: {
        provider: "openai",
        apiFormat: "chat",
        stream: false,
        defaults: {
          temperature: 0.7,
          maxTokens: 4096,
          thinkingBudget: 0,
          extra: {},
        },
      },
      model: "test-model",
      projectRoot: process.cwd(),
    });

    const book: BookConfig = {
      id: "fanfic-max-tokens-book",
      title: "Fanfic Max Tokens Book",
      platform: "other",
      genre: "fanfic",
      status: "active",
      targetChapters: 20,
      chapterWordCount: 2200,
      language: "zh",
      createdAt: "2026-03-29T00:00:00.000Z",
      updatedAt: "2026-03-29T00:00:00.000Z",
    };

    const chatSpy = vi.spyOn(agent as unknown as { chat: (...args: unknown[]) => Promise<unknown> }, "chat")
      .mockResolvedValue({
        content: [
          "=== SECTION: story_bible ===",
          "# 故事圣经",
          "",
          "=== SECTION: volume_outline ===",
          "# 卷纲",
          "",
          "=== SECTION: book_rules ===",
          "---",
          "version: \"1.0\"",
          "---",
          "",
          "=== SECTION: current_state ===",
          "# 当前状态",
          "",
          "=== SECTION: pending_hooks ===",
          "| hook_id | 起始章节 | 类型 | 状态 | 最近推进 | 预期回收 | 备注 |",
          "| --- | --- | --- | --- | --- | --- | --- |",
          "| H01 | 1 | mystery | open | 0 | 10章 | 初始钩子 |",
        ].join("\n"),
        usage: ZERO_USAGE,
      });

    await agent.generateFanficFoundation(book, "正典文本", "canon");

    const options = chatSpy.mock.calls[0]?.[1] as { temperature?: number; maxTokens?: number } | undefined;
    expect(options).toEqual(expect.objectContaining({ temperature: 0.7 }));
    expect(options).not.toHaveProperty("maxTokens");
  });

  // ---- Phase 5 段落式架构稿专项 ----

  // 测试 stub：chat 会被 vi.spyOn 拦截，client.defaults 运行时不会被读取。
  // 故意不填 temperature / maxTokens 等数字——避免在测试里留下"推荐配置"的
  // 错误示范（maxTokens 填错会误导后续抄到生产，触发 CLAUDE.md 禁止的
  // maxTokens 回归）。只保留类型要求的身份字段。
  const buildPhase5Agent = (): ArchitectAgent =>
    new ArchitectAgent({
      client: {
        provider: "openai",
        apiFormat: "chat",
        stream: false,
      } as unknown as LLMClient,
      model: "test-model",
      projectRoot: process.cwd(),
    });

  const phase5Book = (): BookConfig => ({
    id: "phase5-book",
    title: "测试书",
    platform: "qidian",
    genre: "xuanhuan",
    status: "active",
    targetChapters: 50,
    chapterWordCount: 3000,
    language: "zh",
    createdAt: "2026-04-19T00:00:00.000Z",
    updatedAt: "2026-04-19T00:00:00.000Z",
  });

  it("generateFoundation parses story_frame / volume_map / roles sections", async () => {
    const agent = buildPhase5Agent();
    const book = phase5Book();

    vi.spyOn(agent as unknown as { chat: (...args: unknown[]) => Promise<unknown> }, "chat")
      .mockResolvedValue({
        content: [
          "=== SECTION: story_frame ===",
          "## 主题与基调",
          "段落 1 主题段落。",
          "",
          "## 核心冲突",
          "段落 2 冲突段落。",
          "",
          "=== SECTION: volume_map ===",
          "## 段 1",
          "卷一段落。",
          "",
          "=== SECTION: roles ===",
          "---ROLE---",
          "tier: major",
          "name: 林辞",
          "---CONTENT---",
          "## 核心标签",
          "冷静、执着",
          "",
          "---ROLE---",
          "tier: minor",
          "name: 配角A",
          "---CONTENT---",
          "次要角色描写",
          "",
          "=== SECTION: book_rules ===",
          "---",
          "version: \"1.0\"",
          "protagonist:",
          "  name: 林辞",
          "---",
          "",
          "=== SECTION: pending_hooks ===",
          "| hook_id | 起始章节 | 类型 | 状态 | 最近推进 | 预期回收 | 回收节奏 | 备注 |",
          "|---|---|---|---|---|---|---|---|",
          "| H001 | 1 | 主线 | open | 0 | 3 | 近期 | 初始线索 |",
        ].join("\n"),
        usage: ZERO_USAGE,
      });

    const output = await agent.generateFoundation(book);

    expect(output.storyFrame).toContain("主题与基调");
    expect(output.volumeMap).toContain("段 1");
    expect(output.roles).toBeDefined();
    expect(output.roles!.length).toBe(2);
    expect(output.roles![0]).toMatchObject({ tier: "major", name: "林辞" });
    expect(output.roles![1]).toMatchObject({ tier: "minor", name: "配角A" });
  });

  it("writeFoundationFiles writes outline/ and roles/ when Phase 5 fields present", async () => {
    const { mkdtemp, rm, access } = await import("node:fs/promises");
    const { tmpdir } = await import("node:os");
    const { join } = await import("node:path");

    const agent = buildPhase5Agent();
    const tmpDir = await mkdtemp(join(tmpdir(), "jiaos-arch-test-"));
    try {
      await agent.writeFoundationFiles(tmpDir, {
        storyBible: "legacy shim body",
        volumeOutline: "legacy outline",
        bookRules: "---\nversion: \"1.0\"\n---\n",
        currentState: "",
        pendingHooks: "| hook_id |",
        storyFrame: "## 主题\n\n段落内容",
        volumeMap: "## 卷一\n\n卷一段落",
        roles: [
          { tier: "major", name: "林辞", content: "主角描写" },
          { tier: "minor", name: "配角A", content: "配角描写" },
        ],
      }, false, "zh");

      await expect(access(join(tmpDir, "story", "outline", "story_frame.md"))).resolves.not.toThrow();
      await expect(access(join(tmpDir, "story", "outline", "volume_map.md"))).resolves.not.toThrow();
      await expect(access(join(tmpDir, "story", "roles", "主要角色", "林辞.md"))).resolves.not.toThrow();
      await expect(access(join(tmpDir, "story", "roles", "次要角色", "配角A.md"))).resolves.not.toThrow();
      // Shim 文件也要在（向后兼容读取点用）
      await expect(access(join(tmpDir, "story", "story_bible.md"))).resolves.not.toThrow();
      await expect(access(join(tmpDir, "story", "character_matrix.md"))).resolves.not.toThrow();
      await expect(access(join(tmpDir, "story", "book_rules.md"))).resolves.not.toThrow();
    } finally {
      await rm(tmpDir, { recursive: true, force: true });
    }
  });

  it("writeFoundationFiles falls back to legacy layout when storyFrame is empty", async () => {
    const { mkdtemp, rm, access, readFile } = await import("node:fs/promises");
    const { tmpdir } = await import("node:os");
    const { join } = await import("node:path");

    const agent = buildPhase5Agent();
    const tmpDir = await mkdtemp(join(tmpdir(), "jiaos-arch-legacy-test-"));
    try {
      await agent.writeFoundationFiles(tmpDir, {
        storyBible: "# Legacy Story Bible\n",
        volumeOutline: "# Legacy Volume Outline\n",
        bookRules: "# Legacy Book Rules\n",
        currentState: "# Current State\n",
        pendingHooks: "| hook_id |\n",
      }, false, "zh");

      const storyBible = await readFile(join(tmpDir, "story", "story_bible.md"), "utf-8");
      expect(storyBible).toContain("Legacy Story Bible");
      // outline/ 目录是创建的但里面没 story_frame.md
      await expect(access(join(tmpDir, "story", "outline", "story_frame.md"))).rejects.toThrow();
    } finally {
      await rm(tmpDir, { recursive: true, force: true });
    }
  });
});
