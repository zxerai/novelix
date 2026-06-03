/**
 * Phase 7 hotfix 4 — edge-case coverage for hotfixes 1/2/3.
 *
 * These tests pin down the hotfix-specific invariants that the pre-existing
 * Phase 7 suites did not cover:
 *
 *   hotfix 1: half_life roundtrips through render/parse (12-col), empty cell
 *             falls back to undefined, legacy 11-col still parses.
 *   hotfix 2: architect tags core_hook seeds as promoted=true at seed time;
 *             consolidator re-promotes seeds whose advancedCount>=2 at volume
 *             boundary; reviewer prompt gates critical severity on promoted.
 *   hotfix 3: blocked-distance computation embeds the 已阻 N 章 token.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { mkdtemp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { StoredHook } from "../state/memory-db.js";
import {
  normalizeHookId,
  parsePendingHooksMarkdown,
  renderHookSnapshot,
} from "../utils/story-markdown.js";
import { computeHookDiagnostics, renderHookDiagnosticMarker } from "../utils/hook-stale-detection.js";
import { ArchitectAgent } from "../agents/architect.js";
import { ConsolidatorAgent } from "../agents/consolidator.js";
import type { BookConfig } from "../models/book.js";

const ZERO_USAGE = {
  promptTokens: 0,
  completionTokens: 0,
  totalTokens: 0,
} as const;

// ---------------------------------------------------------------------------
// Hotfix 1: half_life roundtrip
// ---------------------------------------------------------------------------

describe("Phase 7 hotfix 1 — half_life roundtrip", () => {
  it("drops punctuation-only hook ids instead of preserving generated dashes", () => {
    expect(normalizeHookId("--")).toBe("");
    expect(normalizeHookId("**H--07**")).toBe("H-07");
  });

  it("renders the 半衰期 column and parses it back with the original value", () => {
    const hooks: StoredHook[] = [
      {
        hookId: "H-explicit",
        startChapter: 5,
        type: "主线",
        status: "open",
        lastAdvancedChapter: 0,
        expectedPayoff: "终章揭晓",
        notes: "带半衰期的钩子",
        payoffTiming: "endgame",
        halfLifeChapters: 45,
      },
      {
        hookId: "H-implicit",
        startChapter: 7,
        type: "谜团",
        status: "open",
        lastAdvancedChapter: 0,
        expectedPayoff: "15章",
        notes: "不带半衰期",
        payoffTiming: "near-term",
      },
    ];

    const rendered = renderHookSnapshot(hooks, "zh");
    expect(rendered).toContain("| 半衰期 |");
    expect(rendered).toContain("| H-explicit | 5 | 主线 | open | 0 | 终章揭晓 | 终局 | 无 |  | 否 | 45 |  | 带半衰期的钩子 |");
    expect(rendered).toContain("| H-implicit | 7 | 谜团 | open | 0 | 15章 | 近期 | 无 |  | 否 |  |  | 不带半衰期 |");

    const parsed = parsePendingHooksMarkdown(rendered);
    const hExplicit = parsed.find((h) => h.hookId === "H-explicit")!;
    expect(hExplicit.halfLifeChapters).toBe(45);
    const hImplicit = parsed.find((h) => h.hookId === "H-implicit")!;
    expect(hImplicit.halfLifeChapters).toBeUndefined();
  });

  it("legacy 11-column pending_hooks.md still parses (half_life stays undefined)", () => {
    const legacy11 = [
      "| hook_id | 起始章节 | 类型 | 状态 | 最近推进 | 预期回收 | 回收节奏 | 上游依赖 | 回收卷 | 核心 | 备注 |",
      "| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |",
      "| L01 | 1 | 主线 | 未开启 | 0 | 终章揭晓 | 终局 | 无 | 第3卷 | 是 | 早期书目 |",
    ].join("\n");

    const parsed = parsePendingHooksMarkdown(legacy11);
    expect(parsed).toHaveLength(1);
    const h = parsed[0]!;
    expect(h.hookId).toBe("L01");
    expect(h.coreHook).toBe(true);
    expect(h.halfLifeChapters).toBeUndefined();
    // promoted should also be undefined on legacy 11-col data.
    expect(h.promoted).toBeUndefined();
  });

  it("hook-stale-detection honors explicit halfLifeChapters after roundtrip", () => {
    const hooks: StoredHook[] = [
      {
        hookId: "H-late",
        startChapter: 5,
        type: "主线",
        status: "open",
        lastAdvancedChapter: 0,
        expectedPayoff: "terminal",
        notes: "",
        payoffTiming: "near-term", // default would be 10
        halfLifeChapters: 60,
      },
    ];

    const rendered = renderHookSnapshot(hooks, "zh");
    const parsed = parsePendingHooksMarkdown(rendered);

    // distance 40 vs halfLife 60 → not stale (would have been stale with the
    // near-term default of 10).
    const diag = computeHookDiagnostics({ hooks: parsed, currentChapter: 45 }).get("H-late")!;
    expect(diag.halfLife).toBe(60);
    expect(diag.stale).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Hotfix 2: promotion wiring
// ---------------------------------------------------------------------------

function buildPhase7Response(language: "zh" = "zh"): string {
  // zh-only for brevity — we care about the promoted flag logic, not language.
  void language;
  return [
    "=== SECTION: story_frame ===",
    "## 主题与基调",
    "这本书讲的是记忆与承诺。",
    "=== SECTION: volume_map ===",
    "## 各卷主题与情绪曲线",
    "### 第一卷：起航 (1-20章)",
    "导言。",
    "### 第二卷：中盘 (21-40章)",
    "转折。",
    "### 第三卷：终局 (41-60章)",
    "收束。",
    "=== SECTION: rhythm_principles ===",
    "## 原则 1",
    "每 10 章一个高潮。",
    "=== SECTION: roles ===",
    "---ROLE---",
    "tier: major",
    "name: 林辞",
    "---CONTENT---",
    "## 核心标签",
    "沉默",
    "## 反差细节",
    "会给流浪狗留罐头",
    "## 人物小传",
    "过往。",
    "## 当前现状",
    "码头边做账房。",
    "## 关系网络",
    "与沈默是旧友。",
    "## 内在驱动",
    "查清真相。",
    "## 成长弧光",
    "从独行到托付。",
    "=== SECTION: book_rules ===",
    "---",
    "version: \"1.0\"",
    "---",
    "## 叙事视角",
    "第三人称。",
    "=== SECTION: current_state ===",
    "| 字段 | 值 |",
    "| --- | --- |",
    "| 当前章节 | 0 |",
    "",
    "=== SECTION: pending_hooks ===",
    "| hook_id | 起始章节 | 类型 | 状态 | 最近推进 | 预期回收 | 回收节奏 | 上游依赖 | 回收卷 | 核心 | 半衰期 | 备注 |",
    "| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |",
    // core_hook=是 → promoted 是
    "| H-core | 1 | 主线 | 未开启 | 0 | 终章揭晓 | 终局 | 无 | 第3卷终章前 | 是 | 80 | 主承重 |",
    // depends_on non-empty → promoted 是
    "| H-dep | 5 | 谜团 | 未开启 | 0 | 第2卷揭开 | 中程 | [H-core] | 第2卷中段 | 否 | 30 | 因果下游 |",
    // cross_volume via slow-burn in vol 1 → promoted 是
    "| H-slow | 3 | 伏笔 | 未开启 | 0 | 终卷前 | 慢烧 | 无 | 第3卷 | 否 |  | 慢烧 |",
    // local, no rule firing → promoted 否
    "| H-local | 8 | 小承诺 | 未开启 | 0 | 15章 | 近期 | 无 | 第1卷末 | 否 |  | 对妹妹的承诺 |",
  ].join("\n");
}

function buildArchitectAgent(): ArchitectAgent {
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
    id: "phase7-hotfix-book",
    title: "hotfix测试书",
    platform: "other",
    genre: "urban",
    status: "active",
    targetChapters: 60,
    chapterWordCount: 2000,
    language: "zh",
    createdAt: "2026-04-15T00:00:00.000Z",
    updatedAt: "2026-04-15T00:00:00.000Z",
  };
}

describe("Phase 7 hotfix 2 — architect pre-promotes structural seeds", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("tags core_hook / depends_on / cross_volume seeds as promoted=是, others as promoted=否", async () => {
    const agent = buildArchitectAgent();
    vi.spyOn(agent as unknown as { chat: (...args: unknown[]) => Promise<unknown> }, "chat")
      .mockResolvedValue({ content: buildPhase7Response(), usage: ZERO_USAGE });

    const result = await agent.generateFoundation(baseBook());

    // H-core: core_hook=是 → 升级=是
    expect(result.pendingHooks).toMatch(/\| H-core \|.*\| 是 \| 主承重 \|/);
    // H-dep: depends_on=[H-core] → 升级=是
    expect(result.pendingHooks).toMatch(/\| H-dep \|.*\| 是 \| 因果下游 \|/);
    // H-slow: slow-burn in vol 1 → 升级=是 (cross_volume)
    expect(result.pendingHooks).toMatch(/\| H-slow \|.*\| 是 \| 慢烧 \|/);
    // H-local: no rule firing → 升级=否
    expect(result.pendingHooks).toMatch(/\| H-local \|.*\| 否 \| 对妹妹的承诺 \|/);

    const parsed = parsePendingHooksMarkdown(result.pendingHooks);
    expect(parsed.find((h) => h.hookId === "H-core")!.promoted).toBe(true);
    expect(parsed.find((h) => h.hookId === "H-dep")!.promoted).toBe(true);
    expect(parsed.find((h) => h.hookId === "H-slow")!.promoted).toBe(true);
    expect(parsed.find((h) => h.hookId === "H-local")!.promoted).toBe(false);
  });
});

describe("Phase 7 hotfix 2 — consolidator re-promotes advancedCount>=2", () => {
  let bookDir: string;

  beforeEach(async () => {
    bookDir = await mkdtemp(join(tmpdir(), "jiaos-phase7-hf-consolid-"));
    await mkdir(join(bookDir, "story"), { recursive: true });
  });

  afterEach(async () => {
    await rm(bookDir, { recursive: true, force: true });
    vi.restoreAllMocks();
  });

  it("flips promoted=false → true when chapter_summaries mentions the hook in 2+ chapters", async () => {
    // Seed ledger: H-slept was architect-emitted as 否 (no rule firing at
    // seed time), but subsequent chapter summaries mention it 3 times.
    // Consolidator must re-promote via the derived advancedCount path.
    const seededHooks: StoredHook[] = [
      {
        hookId: "H-slept",
        startChapter: 3,
        type: "小承诺",
        status: "open",
        lastAdvancedChapter: 9,
        expectedPayoff: "15章",
        payoffTiming: "near-term",
        notes: "对妹妹的承诺",
        dependsOn: [],
        paysOffInArc: "第1卷末",
        coreHook: false,
        promoted: false,
      },
      {
        hookId: "H-cold",
        startChapter: 4,
        type: "小线索",
        status: "open",
        lastAdvancedChapter: 0,
        expectedPayoff: "",
        payoffTiming: "mid-arc",
        notes: "",
        dependsOn: [],
        paysOffInArc: "",
        coreHook: false,
        promoted: false,
      },
    ];
    const ledgerPath = join(bookDir, "story", "pending_hooks.md");
    await writeFile(ledgerPath, renderHookSnapshot(seededHooks, "zh"), "utf-8");

    // chapter_summaries mentions H-slept in 3 chapters (>=2 → promote).
    // H-cold mentioned in only 1 chapter (below threshold).
    await writeFile(
      join(bookDir, "story", "chapter_summaries.md"),
      [
        "| 章节 | 标题 | 出场人物 | 关键事件 | 状态变化 | 伏笔动态 | 情绪基调 | 章节类型 |",
        "| --- | --- | --- | --- | --- | --- | --- | --- |",
        "| 4 | 旧信 | 林辞 | 收到家书 | 回忆浮现 | H-slept 推进 | 压抑 | 铺垫 |",
        "| 5 | 湿巷 | 林辞 | 遇到熟人 | 警戒上升 | H-cold 提及 | 紧绷 | 铺垫 |",
        "| 7 | 码头 | 林辞 | 查账 | 线索汇合 | H-slept 推进 | 紧绷 | 推进 |",
        "| 9 | 雨夜 | 林辞 | 回到住所 | 情绪积压 | H-slept 推进 | 压抑 | 内省 |",
      ].join("\n"),
      "utf-8",
    );

    const agent = new ConsolidatorAgent({
      client: {} as ConstructorParameters<typeof ConsolidatorAgent>[0]["client"],
      model: "test-model",
      projectRoot: bookDir,
    });

    const result = await agent.consolidate(bookDir);
    expect(result.promotedHookCount).toBe(1);

    const next = await readFile(ledgerPath, "utf-8");
    const parsed = parsePendingHooksMarkdown(next);
    expect(parsed.find((h) => h.hookId === "H-slept")!.promoted).toBe(true);
    expect(parsed.find((h) => h.hookId === "H-cold")!.promoted).toBe(false);
  });

  it("leaves ledger untouched when no hook crosses the threshold", async () => {
    const hooks: StoredHook[] = [
      {
        hookId: "H-still",
        startChapter: 3,
        type: "小",
        status: "open",
        lastAdvancedChapter: 0,
        expectedPayoff: "",
        payoffTiming: "mid-arc",
        notes: "",
        promoted: false,
      },
    ];
    const ledgerPath = join(bookDir, "story", "pending_hooks.md");
    const before = renderHookSnapshot(hooks, "zh");
    await writeFile(ledgerPath, before, "utf-8");

    const agent = new ConsolidatorAgent({
      client: {} as ConstructorParameters<typeof ConsolidatorAgent>[0]["client"],
      model: "test-model",
      projectRoot: bookDir,
    });

    const result = await agent.consolidate(bookDir);
    expect(result.promotedHookCount).toBe(0);
    const after = await readFile(ledgerPath, "utf-8");
    expect(after).toBe(before);
  });
});

describe("Phase 7 hotfix 2 — reviewer gates critical severity on promoted", () => {
  it("zh reviewer prompt references 升级=是 as critical gate and the 已阻 N 章 token", async () => {
    // We drive the reviewer end-to-end against a minimal book fixture and
    // assert the system prompt carries the hotfix language. This mirrors the
    // continuity.test.ts style so we're exercising the actual prompt builder
    // rather than a decoupled unit.
    const { ContinuityAuditor } = await import("../agents/continuity.js");
    const root = await mkdtemp(join(tmpdir(), "jiaos-hf-reviewer-zh-"));
    const bookDirLocal = join(root, "book");
    const storyDir = join(bookDirLocal, "story");
    await mkdir(storyDir, { recursive: true });

    try {
      await writeFile(
        join(bookDirLocal, "book.json"),
        JSON.stringify({
          id: "hf-zh",
          title: "hotfix-zh",
          genre: "urban",
          platform: "other",
          chapterWordCount: 2000,
          targetChapters: 60,
          status: "active",
          language: "zh",
          createdAt: "2026-04-15T00:00:00.000Z",
          updatedAt: "2026-04-15T00:00:00.000Z",
        }, null, 2),
        "utf-8",
      );
      await Promise.all([
        writeFile(join(storyDir, "current_state.md"), "# 当前状态\n", "utf-8"),
        writeFile(join(storyDir, "pending_hooks.md"), "# 伏笔池\n", "utf-8"),
        writeFile(join(storyDir, "chapter_summaries.md"), "# 章节摘要\n", "utf-8"),
        writeFile(join(storyDir, "subplot_board.md"), "# 支线进度板\n", "utf-8"),
        writeFile(join(storyDir, "emotional_arcs.md"), "# 情感弧线\n", "utf-8"),
        writeFile(join(storyDir, "character_matrix.md"), "# 角色交互矩阵\n", "utf-8"),
        writeFile(join(storyDir, "volume_outline.md"), "# 卷纲\n", "utf-8"),
        writeFile(join(storyDir, "style_guide.md"), "# 文风\n", "utf-8"),
      ]);

      const auditor = new ContinuityAuditor({
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
        projectRoot: root,
      });

      // Mock both possible paths — eraResearch genres go through chatWithSearch,
      // others use chat. The two spies share a capture so whichever runs wins.
      const stub = vi.fn().mockResolvedValue({
        content: JSON.stringify({ passed: true, issues: [], summary: "ok" }),
        usage: ZERO_USAGE,
      });
      vi.spyOn(ContinuityAuditor.prototype as never, "chatWithSearch" as never).mockImplementation(stub as never);
      vi.spyOn(ContinuityAuditor.prototype as never, "chat" as never).mockImplementation(stub as never);

      await auditor.auditChapter(bookDirLocal, "章节正文。", 1, "urban");

      const messages = stub.mock.calls[0]?.[0] as ReadonlyArray<{ content: string }> | undefined;
      const systemPrompt = messages?.[0]?.content ?? "";

      // Critical severity gated on 升级=是.
      expect(systemPrompt).toContain("升级");
      expect(systemPrompt).toContain("升级=是");
      // The 已阻 N 章 literal token reviewer reads verbatim (from hotfix 3).
      expect(systemPrompt).toContain("已阻");
      // Non-promoted stale hooks stay at info.
      expect(systemPrompt).toMatch(/升级=否.*info|非升级.*info/);
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  it("en reviewer prompt gates on promoted=true and references 'blocked N chapters'", async () => {
    const { ContinuityAuditor } = await import("../agents/continuity.js");
    const root = await mkdtemp(join(tmpdir(), "jiaos-hf-reviewer-en-"));
    const bookDirLocal = join(root, "book");
    const storyDir = join(bookDirLocal, "story");
    await mkdir(storyDir, { recursive: true });

    try {
      await writeFile(
        join(bookDirLocal, "book.json"),
        JSON.stringify({
          id: "hf-en",
          title: "hotfix-en",
          genre: "other",
          platform: "royalroad",
          chapterWordCount: 800,
          targetChapters: 60,
          status: "active",
          language: "en",
          createdAt: "2026-04-15T00:00:00.000Z",
          updatedAt: "2026-04-15T00:00:00.000Z",
        }, null, 2),
        "utf-8",
      );
      await Promise.all([
        writeFile(join(storyDir, "current_state.md"), "# Current State\n", "utf-8"),
        writeFile(join(storyDir, "pending_hooks.md"), "# Pending Hooks\n", "utf-8"),
        writeFile(join(storyDir, "chapter_summaries.md"), "# Chapter Summaries\n", "utf-8"),
        writeFile(join(storyDir, "subplot_board.md"), "# Subplot Board\n", "utf-8"),
        writeFile(join(storyDir, "emotional_arcs.md"), "# Emotional Arcs\n", "utf-8"),
        writeFile(join(storyDir, "character_matrix.md"), "# Character Matrix\n", "utf-8"),
        writeFile(join(storyDir, "volume_outline.md"), "# Volume Outline\n", "utf-8"),
        writeFile(join(storyDir, "style_guide.md"), "# Style Guide\n", "utf-8"),
      ]);

      const auditor = new ContinuityAuditor({
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
        projectRoot: root,
      });

      // Mock both possible paths — eraResearch genres go through chatWithSearch,
      // others use chat. The two spies share a capture so whichever runs wins.
      const stub = vi.fn().mockResolvedValue({
        content: JSON.stringify({ passed: true, issues: [], summary: "ok" }),
        usage: ZERO_USAGE,
      });
      vi.spyOn(ContinuityAuditor.prototype as never, "chatWithSearch" as never).mockImplementation(stub as never);
      vi.spyOn(ContinuityAuditor.prototype as never, "chat" as never).mockImplementation(stub as never);

      await auditor.auditChapter(bookDirLocal, "Chapter body.", 1, "other");

      const messages = stub.mock.calls[0]?.[0] as ReadonlyArray<{ content: string }> | undefined;
      const systemPrompt = messages?.[0]?.content ?? "";

      expect(systemPrompt).toContain("promoted=true");
      expect(systemPrompt).toContain("blocked ");
      // info-only for non-promoted.
      expect(systemPrompt).toMatch(/non-promoted.*info/i);
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });
});

// ---------------------------------------------------------------------------
// Hotfix 3: blocked distance
// ---------------------------------------------------------------------------

describe("Phase 7 hotfix 3 — blocked distance embeds 已阻 N 章 token", () => {
  it("reports blocked distance = currentChapter - upstream.startChapter when upstream is planted but unresolved", () => {
    // H01 planted ch 3 (open, unresolved).
    // H02 depends on H01, planted ch 5.
    // current ch 12 → H02 has been blocked since upstream planting (ch 3).
    // Expected: 已阻 9 章 (12 - 3).
    const upstream: StoredHook = {
      hookId: "H01",
      startChapter: 3,
      type: "主线",
      status: "open",
      lastAdvancedChapter: 0,
      expectedPayoff: "",
      notes: "",
    };
    const downstream: StoredHook = {
      hookId: "H02",
      startChapter: 5,
      type: "下游",
      status: "open",
      lastAdvancedChapter: 0,
      expectedPayoff: "",
      notes: "",
      dependsOn: ["H01"],
    };

    const diag = computeHookDiagnostics({
      hooks: [upstream, downstream],
      currentChapter: 12,
    }).get("H02")!;

    expect(diag.blocked).toBe(true);
    expect(diag.blockedDistance).toBe(9);
    expect(renderHookDiagnosticMarker(diag, "zh")).toContain("已阻 9 章");
    expect(renderHookDiagnosticMarker(diag, "en")).toContain("blocked 9 chapters");
  });

  it("uses hook.startChapter as the reference when upstream is missing from the ledger entirely", () => {
    // Upstream ghost id → blocked since hook's own planting.
    const hook: StoredHook = {
      hookId: "H-orphan",
      startChapter: 4,
      type: "",
      status: "open",
      lastAdvancedChapter: 0,
      expectedPayoff: "",
      notes: "",
      dependsOn: ["H-ghost"],
    };

    const diag = computeHookDiagnostics({
      hooks: [hook],
      currentChapter: 11,
    }).get("H-orphan")!;

    expect(diag.blocked).toBe(true);
    expect(diag.blockedDistance).toBe(7); // 11 - 4
    expect(renderHookDiagnosticMarker(diag, "zh")).toContain("已阻 7 章");
  });

  it("blockedDistance is 0 when hook is not blocked", () => {
    const upstream: StoredHook = {
      hookId: "U",
      startChapter: 2,
      type: "",
      status: "resolved",
      lastAdvancedChapter: 5,
      expectedPayoff: "",
      notes: "",
    };
    const downstream: StoredHook = {
      hookId: "D",
      startChapter: 4,
      type: "",
      status: "open",
      lastAdvancedChapter: 0,
      expectedPayoff: "",
      notes: "",
      dependsOn: ["U"],
    };
    const diag = computeHookDiagnostics({ hooks: [upstream, downstream], currentChapter: 10 }).get("D")!;
    expect(diag.blocked).toBe(false);
    expect(diag.blockedDistance).toBe(0);
    expect(renderHookDiagnosticMarker(diag, "zh")).toBe("");
  });
});
