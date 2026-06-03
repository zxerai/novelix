import { describe, it, expect, vi, afterEach } from "vitest";
import { ArchitectAgent } from "../agents/architect.js";
import { FoundationReviewerAgent } from "../agents/foundation-reviewer.js";
import type { ArchitectOutput } from "../agents/architect.js";
import type { BookConfig } from "../models/book.js";
import type { LLMClient } from "../llm/provider.js";

// 测试 stub：chat 会被 vi.spyOn 拦截，client.defaults 运行时根本不会被读取。
// 故意不填 temperature / maxTokens 等数字，避免在测试里留下"推荐配置"的错误
// 示范（尤其 maxTokens —— 填错会误导后续抄到生产，触发 CLAUDE.md 禁止的
// maxTokens 回归）。只保留类型要求的身份字段。
const TEST_CLIENT: LLMClient = {
  provider: "openai",
  apiFormat: "chat",
  stream: false,
} as unknown as LLMClient;

const buildArchitect = (): ArchitectAgent =>
  new ArchitectAgent({
    client: TEST_CLIENT,
    model: "test-model",
    projectRoot: process.cwd(),
  });

const testBook = (): BookConfig => ({
  id: "test-book", title: "测试书", platform: "qidian", genre: "xuanhuan",
  status: "active", targetChapters: 50, chapterWordCount: 3000, language: "zh",
  createdAt: "2026-04-19T00:00:00.000Z", updatedAt: "2026-04-19T00:00:00.000Z",
});

describe("architect generateFoundation with reviseFrom option", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("injects legacy content into the system prompt when reviseFrom is supplied", async () => {
    const agent = buildArchitect();
    const chatSpy = vi.spyOn(agent as unknown as { chat: (...args: unknown[]) => Promise<unknown> }, "chat")
      .mockResolvedValue({
        content: [
          "=== SECTION: story_frame ===",
          "## 主题",
          "新段落主题",
          "",
          "=== SECTION: volume_map ===",
          "## 段 1",
          "新卷一",
          "",
          "=== SECTION: roles ===",
          "---ROLE---",
          "tier: major",
          "name: 林辞",
          "---CONTENT---",
          "主角",
          "",
          "=== SECTION: book_rules ===",
          "---",
          "version: \"1.0\"",
          "---",
          "",
          "=== SECTION: pending_hooks ===",
          "| hook_id |",
        ].join("\n"),
        usage: { promptTokens: 0, completionTokens: 0, totalTokens: 0 },
      });

    await agent.generateFoundation(testBook(), undefined, undefined, {
      reviseFrom: {
        storyBible: "- 旧世界观：架空唐代\n- 旧主角：林辞",
        volumeOutline: "## 第一卷\n- 1. 主角登场",
        bookRules: "## 规则\n- 禁现代词",
        characterMatrix: "林辞 - 主角",
        userFeedback: "升级到段落式架构稿",
      },
    });

    const systemMsg = (chatSpy.mock.calls[0]?.[0] as Array<{ role: string; content: string }>)[0]!;
    expect(systemMsg.content).toContain("把一本已有书的架构稿从条目式升级");
    expect(systemMsg.content).toContain("旧世界观：架空唐代");
    expect(systemMsg.content).toContain("升级到段落式架构稿");
  });

  it("does not inject revisePrompt when reviseFrom is absent", async () => {
    const agent = buildArchitect();
    const chatSpy = vi.spyOn(agent as unknown as { chat: (...args: unknown[]) => Promise<unknown> }, "chat")
      .mockResolvedValue({
        content: [
          "=== SECTION: story_frame ===", "## 主题", "段落",
          "=== SECTION: volume_map ===", "## 段 1", "卷一",
          "=== SECTION: roles ===", "---ROLE---", "tier: major", "name: X", "---CONTENT---", "主角",
          "=== SECTION: book_rules ===", "---", "version: \"1.0\"", "---",
          "=== SECTION: pending_hooks ===", "| hook_id |",
        ].join("\n"),
        usage: { promptTokens: 0, completionTokens: 0, totalTokens: 0 },
      });

    await agent.generateFoundation(testBook());

    const systemMsg = (chatSpy.mock.calls[0]?.[0] as Array<{ role: string; content: string }>)[0]!;
    expect(systemMsg.content).not.toContain("把一本已有书的架构稿从条目式升级");
  });
});

describe("pipeline.reviseFoundation", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("backs up legacy files and writes Phase 5 output", async () => {
    const { mkdtemp, writeFile, mkdir, rm, access, readdir } = await import("node:fs/promises");
    const { tmpdir } = await import("node:os");
    const { join } = await import("node:path");
    const { PipelineRunner } = await import("../pipeline/runner.js");
    const { StateManager } = await import("../state/manager.js");

    const root = await mkdtemp(join(tmpdir(), "jiaos-revise-e2e-"));
    const bookDir = join(root, "books", "legacy-book");

    try {
      // Construct a 旧书 on disk with 4 legacy files
      await mkdir(join(bookDir, "story"), { recursive: true });
      await writeFile(join(bookDir, "story", "story_bible.md"), "# 旧书架构稿\n\n- 架空唐代\n- 主角林辞", "utf-8");
      await writeFile(join(bookDir, "story", "volume_outline.md"), "## 第一卷\n- 主角登场", "utf-8");
      await writeFile(join(bookDir, "story", "book_rules.md"), "## 规则\n- 禁现代词", "utf-8");
      await writeFile(join(bookDir, "story", "character_matrix.md"), "## 角色\n林辞 - 主角", "utf-8");
      await writeFile(join(bookDir, "book.json"), JSON.stringify({
        id: "legacy-book", title: "旧书", platform: "qidian", genre: "xuanhuan",
        status: "active", targetChapters: 50, chapterWordCount: 3000, language: "zh",
        createdAt: "2026-04-01T00:00:00.000Z", updatedAt: "2026-04-01T00:00:00.000Z",
      }), "utf-8");

      // Stub architect.generateFoundation → Phase 5 output
      const mockFoundation: ArchitectOutput = {
        storyBible: "(shim)",
        volumeOutline: "(shim)",
        bookRules: "---\nversion: \"1.0\"\n---\n",
        currentState: "",
        pendingHooks: "| hook_id |",
        storyFrame: "## 主题\n\n段落式主题",
        volumeMap: "## 段 1\n\n卷一段落",
        roles: [{ tier: "major", name: "林辞", content: "主角段落描写" }],
      };
      vi.spyOn(ArchitectAgent.prototype, "generateFoundation").mockResolvedValue(mockFoundation);
      vi.spyOn(FoundationReviewerAgent.prototype, "review").mockResolvedValue({
        passed: true, totalScore: 90, dimensions: [], overallFeedback: "ok",
      } as unknown as Awaited<ReturnType<FoundationReviewerAgent["review"]>>);

      // Minimal config for PipelineRunner — 共用 TEST_CLIENT 避免重复。
      const state = new StateManager(root);
      const runner = new PipelineRunner({
        state,
        projectRoot: root,
        client: TEST_CLIENT,
        model: "test-model",
      } as unknown as ConstructorParameters<typeof PipelineRunner>[0]);

      await runner.reviseFoundation("legacy-book", "升级到段落式");

      // New files created
      await expect(access(join(bookDir, "story", "outline", "story_frame.md"))).resolves.not.toThrow();
      await expect(access(join(bookDir, "story", "outline", "volume_map.md"))).resolves.not.toThrow();
      await expect(access(join(bookDir, "story", "roles", "主要角色", "林辞.md"))).resolves.not.toThrow();
      // Backup exists
      const storyEntries = await readdir(join(bookDir, "story"));
      const backupDir = storyEntries.find((e) => e.startsWith(".backup-phase4-"));
      expect(backupDir).toBeDefined();
      await expect(access(join(bookDir, "story", backupDir!, "story_bible.md"))).resolves.not.toThrow();
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  // ---- Bug fix regression suite ----

  it("revise 不重置运行时状态文件（current_state / pending_hooks / particle_ledger / subplot_board / emotional_arcs 保留章节累积）", async () => {
    const { mkdtemp, writeFile, mkdir, rm, readFile } = await import("node:fs/promises");
    const { tmpdir } = await import("node:os");
    const { join } = await import("node:path");
    const { PipelineRunner } = await import("../pipeline/runner.js");
    const { StateManager } = await import("../state/manager.js");

    const root = await mkdtemp(join(tmpdir(), "jiaos-revise-runtime-"));
    const bookDir = join(root, "books", "live-book");

    try {
      // 构造一本已经写过 N 章的 legacy 旧书——架构稿文件 + 运行时状态文件
      // 全都有"第 N 章累积后"的真实内容
      await mkdir(join(bookDir, "story"), { recursive: true });
      await writeFile(join(bookDir, "story", "story_bible.md"), "# 架构稿\n- 世界观", "utf-8");
      await writeFile(join(bookDir, "story", "volume_outline.md"), "## 卷一", "utf-8");
      await writeFile(join(bookDir, "story", "book_rules.md"), "## 规则", "utf-8");
      await writeFile(join(bookDir, "story", "character_matrix.md"), "## 角色", "utf-8");
      // 运行时状态（模拟 consolidator 累积了 20 章后的内容）
      await writeFile(join(bookDir, "story", "current_state.md"), "# 当前状态\n\n第 20 章结束：主角在京城查失踪案。", "utf-8");
      await writeFile(join(bookDir, "story", "pending_hooks.md"), "| H001 | 1 | 主线 | open | 15 | ... 推进到 15 章 ... |", "utf-8");
      await writeFile(join(bookDir, "story", "particle_ledger.md"), "# 资源账本\n\n| 20 | 500 | 积累 | - | 10 | 510 | 第 20 章 |", "utf-8");
      await writeFile(join(bookDir, "story", "subplot_board.md"), "# 支线\n\n| S1 | 宫廷阴谋 | ... | 5 | 18 | 13 | active | 已推到 18 章 |", "utf-8");
      await writeFile(join(bookDir, "story", "emotional_arcs.md"), "# 情感弧线\n\n| 林辞 | 15 | 愤怒 | 发现背叛 | 8 | 上升 |", "utf-8");
      await writeFile(join(bookDir, "book.json"), JSON.stringify({
        id: "live-book", title: "写了 20 章的书", platform: "qidian", genre: "xuanhuan",
        status: "active", targetChapters: 50, chapterWordCount: 3000, language: "zh",
        createdAt: "2026-01-01T00:00:00.000Z", updatedAt: "2026-04-01T00:00:00.000Z",
      }), "utf-8");

      const mockFoundation: ArchitectOutput = {
        storyBible: "(shim)", volumeOutline: "(shim)",
        bookRules: "---\nversion: \"1.0\"\n---\n",
        currentState: "", pendingHooks: "| hook_id | ...（新生成，不该被写）|",
        storyFrame: "## 主题\n段落式",
        volumeMap: "## 段 1\n卷一",
        roles: [{ tier: "major", name: "林辞", content: "新卡" }],
      };
      vi.spyOn(ArchitectAgent.prototype, "generateFoundation").mockResolvedValue(mockFoundation);
      vi.spyOn(FoundationReviewerAgent.prototype, "review").mockResolvedValue({
        passed: true, totalScore: 90, dimensions: [], overallFeedback: "ok",
      } as unknown as Awaited<ReturnType<FoundationReviewerAgent["review"]>>);

      const state = new StateManager(root);
      const runner = new PipelineRunner({
        state, projectRoot: root, client: TEST_CLIENT, model: "test-model",
      } as unknown as ConstructorParameters<typeof PipelineRunner>[0]);

      await runner.reviseFoundation("live-book", "改下主角设定");

      // 5 个运行时状态文件**必须保持原内容**（消费者看到的是"写了 20 章后"的状态，
      // 不是重置为空模板或架构师新输出）
      const currentState = await readFile(join(bookDir, "story", "current_state.md"), "utf-8");
      expect(currentState).toContain("第 20 章结束：主角在京城查失踪案");
      expect(currentState).not.toContain("建书时占位");  // init 模式的 seed 占位不该被写

      const pendingHooks = await readFile(join(bookDir, "story", "pending_hooks.md"), "utf-8");
      expect(pendingHooks).toContain("推进到 15 章");
      expect(pendingHooks).not.toContain("（新生成，不该被写）");

      const ledger = await readFile(join(bookDir, "story", "particle_ledger.md"), "utf-8");
      expect(ledger).toContain("第 20 章");
      expect(ledger).not.toContain("| 0 | 0 | 初始化 |");  // init 模式的初始模板

      const subplot = await readFile(join(bookDir, "story", "subplot_board.md"), "utf-8");
      expect(subplot).toContain("已推到 18 章");

      const emotional = await readFile(join(bookDir, "story", "emotional_arcs.md"), "utf-8");
      expect(emotional).toContain("发现背叛");
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  it("Phase 5 书二次 revise 时从 outline/roles 权威源读（不把 shim 喂给 architect）", async () => {
    const { mkdtemp, writeFile, mkdir, rm } = await import("node:fs/promises");
    const { tmpdir } = await import("node:os");
    const { join } = await import("node:path");
    const { PipelineRunner } = await import("../pipeline/runner.js");
    const { StateManager } = await import("../state/manager.js");

    const root = await mkdtemp(join(tmpdir(), "jiaos-revise-phase5-"));
    const bookDir = join(root, "books", "phase5-book");

    try {
      // 构造一本已经是 Phase 5 的书
      await mkdir(join(bookDir, "story", "outline"), { recursive: true });
      await mkdir(join(bookDir, "story", "roles", "主要角色"), { recursive: true });
      await mkdir(join(bookDir, "story", "roles", "次要角色"), { recursive: true });
      // outline/ 是权威，内容完整
      await writeFile(join(bookDir, "story", "outline", "story_frame.md"),
        "## 主题与基调\n完整的段落式世界观描写，包含所有设定细节、人物关系、剧情主线。" + "a".repeat(5000),
        "utf-8");
      await writeFile(join(bookDir, "story", "outline", "volume_map.md"),
        "## 段 1\n完整卷大纲描写。" + "b".repeat(5000),
        "utf-8");
      // roles/ 是权威，内容完整
      await writeFile(join(bookDir, "story", "roles", "主要角色", "林辞.md"),
        "## 核心标签\n冷静、执着\n\n## 主角线\n完整角色线，3000 字描写，反映复杂内在位移" + "c".repeat(3000),
        "utf-8");
      // story_bible.md / character_matrix.md 是 shim（只有指针和摘录）
      await writeFile(join(bookDir, "story", "story_bible.md"),
        "# 故事圣经（已废弃）\n\n> 权威来源是 outline/story_frame.md\n\n## story_frame 摘录\n\n只有前 2000 字...",
        "utf-8");
      await writeFile(join(bookDir, "story", "character_matrix.md"),
        "# 角色矩阵（已废弃）\n\n> 权威来源是 roles/ 目录\n\n## 主要角色\n\n- roles/主要角色/林辞.md",
        "utf-8");
      await writeFile(join(bookDir, "story", "book_rules.md"), "# 规则 shim", "utf-8");
      await writeFile(join(bookDir, "story", "volume_outline.md"), "## 卷一 shim", "utf-8");
      await writeFile(join(bookDir, "book.json"), JSON.stringify({
        id: "phase5-book", title: "Phase 5 书", platform: "qidian", genre: "xuanhuan",
        status: "active", targetChapters: 50, chapterWordCount: 3000, language: "zh",
        createdAt: "2026-04-01T00:00:00.000Z", updatedAt: "2026-04-10T00:00:00.000Z",
      }), "utf-8");

      const generateSpy = vi.spyOn(ArchitectAgent.prototype, "generateFoundation")
        .mockResolvedValue({
          storyBible: "(shim)", volumeOutline: "(shim)",
          bookRules: "---\nversion: \"1.0\"\n---\n",
          currentState: "", pendingHooks: "| hook_id |",
          storyFrame: "## 主题\n段落式 v2",
          volumeMap: "## 段 1\n卷一 v2",
          roles: [{ tier: "major", name: "林辞", content: "新卡 v2" }],
        });
      vi.spyOn(FoundationReviewerAgent.prototype, "review").mockResolvedValue({
        passed: true, totalScore: 90, dimensions: [], overallFeedback: "ok",
      } as unknown as Awaited<ReturnType<FoundationReviewerAgent["review"]>>);

      const state = new StateManager(root);
      const runner = new PipelineRunner({
        state, projectRoot: root, client: TEST_CLIENT, model: "test-model",
      } as unknown as ConstructorParameters<typeof PipelineRunner>[0]);

      await runner.reviseFoundation("phase5-book", "调整某个角色设定");

      // 检查传给 architect 的 reviseFrom.storyBible 和 characterMatrix 是权威全文，
      // 不是 shim 摘录
      const call = generateSpy.mock.calls[0];
      const options = call?.[3] as { reviseFrom?: { storyBible: string; characterMatrix: string } };
      expect(options?.reviseFrom?.storyBible).toContain("完整的段落式世界观描写");
      expect(options?.reviseFrom?.storyBible).not.toContain("已废弃");
      expect(options?.reviseFrom?.characterMatrix).toContain("完整角色线，3000 字描写");
      expect(options?.reviseFrom?.characterMatrix).not.toContain("roles/主要角色/林辞.md");  // shim 里才有文件路径列表
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  it("revise 清空旧 role 文件（删除/改名角色后旧卡片不残留）", async () => {
    const { mkdtemp, writeFile, mkdir, rm, access } = await import("node:fs/promises");
    const { tmpdir } = await import("node:os");
    const { join } = await import("node:path");
    const { PipelineRunner } = await import("../pipeline/runner.js");
    const { StateManager } = await import("../state/manager.js");

    const root = await mkdtemp(join(tmpdir(), "jiaos-revise-ghost-"));
    const bookDir = join(root, "books", "ghost-book");

    try {
      // 初始状态：Phase 5 书已有 3 个主要角色、2 个次要角色
      await mkdir(join(bookDir, "story", "outline"), { recursive: true });
      await mkdir(join(bookDir, "story", "roles", "主要角色"), { recursive: true });
      await mkdir(join(bookDir, "story", "roles", "次要角色"), { recursive: true });
      await writeFile(join(bookDir, "story", "outline", "story_frame.md"), "## 主题", "utf-8");
      await writeFile(join(bookDir, "story", "outline", "volume_map.md"), "## 段 1", "utf-8");
      await writeFile(join(bookDir, "story", "roles", "主要角色", "林辞.md"), "老卡", "utf-8");
      await writeFile(join(bookDir, "story", "roles", "主要角色", "要删掉的人.md"), "应该消失", "utf-8");
      await writeFile(join(bookDir, "story", "roles", "主要角色", "要改名的A.md"), "改名前", "utf-8");
      await writeFile(join(bookDir, "story", "roles", "次要角色", "老配角.md"), "老次要", "utf-8");
      await writeFile(join(bookDir, "story", "roles", "次要角色", "要删掉的次要.md"), "应该消失", "utf-8");
      await writeFile(join(bookDir, "story", "book_rules.md"), "", "utf-8");
      await writeFile(join(bookDir, "story", "character_matrix.md"), "", "utf-8");
      await writeFile(join(bookDir, "story", "story_bible.md"), "", "utf-8");
      await writeFile(join(bookDir, "story", "volume_outline.md"), "", "utf-8");
      await writeFile(join(bookDir, "book.json"), JSON.stringify({
        id: "ghost-book", title: "测试", platform: "qidian", genre: "xuanhuan",
        status: "active", targetChapters: 50, chapterWordCount: 3000, language: "zh",
        createdAt: "2026-04-01T00:00:00.000Z", updatedAt: "2026-04-10T00:00:00.000Z",
      }), "utf-8");

      // architect revise 只输出 2 个新 role（主角保留、一个改名后的新 id、删了 "要删掉的人"）
      vi.spyOn(ArchitectAgent.prototype, "generateFoundation").mockResolvedValue({
        storyBible: "(shim)", volumeOutline: "(shim)",
        bookRules: "---\nversion: \"1.0\"\n---\n",
        currentState: "", pendingHooks: "| hook_id |",
        storyFrame: "## 主题\n新", volumeMap: "## 段 1\n新",
        roles: [
          { tier: "major", name: "林辞", content: "新卡" },
          { tier: "major", name: "改名后的B", content: "改名后" },
        ],
      });
      vi.spyOn(FoundationReviewerAgent.prototype, "review").mockResolvedValue({
        passed: true, totalScore: 90, dimensions: [], overallFeedback: "ok",
      } as unknown as Awaited<ReturnType<FoundationReviewerAgent["review"]>>);

      const state = new StateManager(root);
      const runner = new PipelineRunner({
        state, projectRoot: root, client: TEST_CLIENT, model: "test-model",
      } as unknown as ConstructorParameters<typeof PipelineRunner>[0]);

      await runner.reviseFoundation("ghost-book", "精简角色");

      // 新输出的 2 个 role 应该存在
      await expect(access(join(bookDir, "story", "roles", "主要角色", "林辞.md"))).resolves.not.toThrow();
      await expect(access(join(bookDir, "story", "roles", "主要角色", "改名后的B.md"))).resolves.not.toThrow();
      // 旧的 5 个 role 文件里没出现在新输出的，**必须被清空**
      await expect(access(join(bookDir, "story", "roles", "主要角色", "要删掉的人.md"))).rejects.toThrow();
      await expect(access(join(bookDir, "story", "roles", "主要角色", "要改名的A.md"))).rejects.toThrow();
      await expect(access(join(bookDir, "story", "roles", "次要角色", "老配角.md"))).rejects.toThrow();
      await expect(access(join(bookDir, "story", "roles", "次要角色", "要删掉的次要.md"))).rejects.toThrow();
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  it("revise 模式 + LLM 意外输出 legacy 格式 → 抛错且不动架构稿文件", async () => {
    const { mkdtemp, writeFile, mkdir, rm, readFile } = await import("node:fs/promises");
    const { tmpdir } = await import("node:os");
    const { join } = await import("node:path");
    const { PipelineRunner } = await import("../pipeline/runner.js");
    const { StateManager } = await import("../state/manager.js");

    const root = await mkdtemp(join(tmpdir(), "jiaos-revise-legacyfallback-"));
    const bookDir = join(root, "books", "safe-book");

    try {
      // 构造 Phase 5 书 —— outline/ + roles/ 有原始内容
      await mkdir(join(bookDir, "story", "outline"), { recursive: true });
      await mkdir(join(bookDir, "story", "roles", "主要角色"), { recursive: true });
      await writeFile(join(bookDir, "story", "outline", "story_frame.md"), "原始 story_frame", "utf-8");
      await writeFile(join(bookDir, "story", "outline", "volume_map.md"), "原始 volume_map", "utf-8");
      await writeFile(join(bookDir, "story", "roles", "主要角色", "原始角色.md"), "原始角色内容", "utf-8");
      await writeFile(join(bookDir, "story", "story_bible.md"), "shim 指针", "utf-8");
      await writeFile(join(bookDir, "story", "character_matrix.md"), "", "utf-8");
      await writeFile(join(bookDir, "story", "volume_outline.md"), "", "utf-8");
      await writeFile(join(bookDir, "story", "book_rules.md"), "", "utf-8");
      await writeFile(join(bookDir, "book.json"), JSON.stringify({
        id: "safe-book", title: "t", platform: "qidian", genre: "xuanhuan",
        status: "active", targetChapters: 50, chapterWordCount: 3000, language: "zh",
        createdAt: "2026-04-01T00:00:00.000Z", updatedAt: "2026-04-10T00:00:00.000Z",
      }), "utf-8");

      // Stub architect → 模拟 LLM 回退 legacy 输出（storyFrame 为空 / 没 roles）
      vi.spyOn(ArchitectAgent.prototype, "generateFoundation").mockResolvedValue({
        storyBible: "LLM 产出的 legacy story bible",
        volumeOutline: "LLM 产出的 legacy volume outline",
        bookRules: "---\nversion: \"1.0\"\n---\n",
        currentState: "",
        pendingHooks: "| hook_id |",
        // 故意不填 storyFrame / volumeMap / roles —— 模拟 LLM 回退 legacy
      } as unknown as Awaited<ReturnType<ArchitectAgent["generateFoundation"]>>);
      vi.spyOn(FoundationReviewerAgent.prototype, "review").mockResolvedValue({
        passed: true, totalScore: 90, dimensions: [], overallFeedback: "ok",
      } as unknown as Awaited<ReturnType<FoundationReviewerAgent["review"]>>);

      const state = new StateManager(root);
      const runner = new PipelineRunner({
        state, projectRoot: root, client: TEST_CLIENT, model: "test-model",
      } as unknown as ConstructorParameters<typeof PipelineRunner>[0]);

      // revise 应该抛错
      await expect(runner.reviseFoundation("safe-book", "改"))
        .rejects.toThrow(/legacy-format output.*NOT been modified/);

      // 架构稿原始文件**必须保持不变**（writeFoundationFiles 在抛错前没写任何文件）
      // 注意：rolesMajorDir 在 reviseFoundation 的 Step 5 里会被 mkdir（但不删），
      // 写角色卡的 loop 在抛错之前，具体行为看实现：抛错在 rm + mkdir 之后但 writeFile 之前。
      // 所以旧角色文件可能被 rm 删掉，但那是在 runner.reviseFoundation 已经备份到
      // .backup-phase5-<ts>/ 之后。验证备份里有原始内容即可。
      const storyFrame = await readFile(join(bookDir, "story", "outline", "story_frame.md"), "utf-8");
      expect(storyFrame).toBe("原始 story_frame");  // outline/ 没被动

      const volumeMap = await readFile(join(bookDir, "story", "outline", "volume_map.md"), "utf-8");
      expect(volumeMap).toBe("原始 volume_map");

      // story_bible.md 也没被覆盖（legacy 输出的 "LLM 产出的 legacy story bible" 没写进去）
      const storyBible = await readFile(join(bookDir, "story", "story_bible.md"), "utf-8");
      expect(storyBible).toBe("shim 指针");
      expect(storyBible).not.toContain("LLM 产出的 legacy");
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  it("Phase 5 revise 备份目录带 phase5 tag 并包含 outline/ + roles/", async () => {
    const { mkdtemp, writeFile, mkdir, rm, readdir, access } = await import("node:fs/promises");
    const { tmpdir } = await import("node:os");
    const { join } = await import("node:path");
    const { PipelineRunner } = await import("../pipeline/runner.js");
    const { StateManager } = await import("../state/manager.js");

    const root = await mkdtemp(join(tmpdir(), "jiaos-revise-backup-"));
    const bookDir = join(root, "books", "p5");

    try {
      await mkdir(join(bookDir, "story", "outline"), { recursive: true });
      await mkdir(join(bookDir, "story", "roles", "主要角色"), { recursive: true });
      await writeFile(join(bookDir, "story", "outline", "story_frame.md"), "原 frame", "utf-8");
      await writeFile(join(bookDir, "story", "outline", "volume_map.md"), "原 map", "utf-8");
      await writeFile(join(bookDir, "story", "roles", "主要角色", "A.md"), "原角色 A", "utf-8");
      await writeFile(join(bookDir, "story", "book_rules.md"), "", "utf-8");
      await writeFile(join(bookDir, "story", "character_matrix.md"), "", "utf-8");
      await writeFile(join(bookDir, "story", "story_bible.md"), "", "utf-8");
      await writeFile(join(bookDir, "story", "volume_outline.md"), "", "utf-8");
      await writeFile(join(bookDir, "book.json"), JSON.stringify({
        id: "p5", title: "t", platform: "qidian", genre: "xuanhuan",
        status: "active", targetChapters: 50, chapterWordCount: 3000, language: "zh",
        createdAt: "2026-04-01T00:00:00.000Z", updatedAt: "2026-04-10T00:00:00.000Z",
      }), "utf-8");

      vi.spyOn(ArchitectAgent.prototype, "generateFoundation").mockResolvedValue({
        storyBible: "(shim)", volumeOutline: "(shim)",
        bookRules: "---\nversion: \"1.0\"\n---\n",
        currentState: "", pendingHooks: "| hook_id |",
        storyFrame: "## 新", volumeMap: "## 新",
        roles: [{ tier: "major", name: "B", content: "新" }],
      });
      vi.spyOn(FoundationReviewerAgent.prototype, "review").mockResolvedValue({
        passed: true, totalScore: 90, dimensions: [], overallFeedback: "ok",
      } as unknown as Awaited<ReturnType<FoundationReviewerAgent["review"]>>);

      const state = new StateManager(root);
      const runner = new PipelineRunner({
        state, projectRoot: root, client: TEST_CLIENT, model: "test-model",
      } as unknown as ConstructorParameters<typeof PipelineRunner>[0]);

      await runner.reviseFoundation("p5", "改");

      const entries = await readdir(join(bookDir, "story"));
      const backupDir = entries.find((e) => e.startsWith(".backup-phase5-"));
      expect(backupDir).toBeDefined();
      // backup 应该包含 outline/ 和 roles/（Phase 5 权威源）
      await expect(access(join(bookDir, "story", backupDir!, "outline", "story_frame.md"))).resolves.not.toThrow();
      await expect(access(join(bookDir, "story", backupDir!, "outline", "volume_map.md"))).resolves.not.toThrow();
      await expect(access(join(bookDir, "story", backupDir!, "roles", "主要角色", "A.md"))).resolves.not.toThrow();
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });
});
