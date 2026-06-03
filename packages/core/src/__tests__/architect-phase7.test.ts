import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { ArchitectAgent } from "../agents/architect.js";
import type { BookConfig } from "../models/book.js";
import { parsePendingHooksMarkdown } from "../utils/story-markdown.js";

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
    id: "phase7-book",
    title: "Phase7测试书",
    platform: "other",
    genre: "urban",
    status: "active",
    targetChapters: 80,
    chapterWordCount: 2200,
    language: "zh",
    createdAt: "2026-04-15T00:00:00.000Z",
    updatedAt: "2026-04-15T00:00:00.000Z",
  };
}

const PHASE7_RESPONSE = [
  "=== SECTION: story_frame ===",
  "## 主题与基调",
  "这本书讲的是记忆与承诺。",
  "=== SECTION: volume_map ===",
  "## 各卷主题与情绪曲线",
  "三卷结构，第1卷 1-20 章。",
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
  "| H01 | 1 | 主线 | 未开启 | 0 | 终章揭晓 | 终局 | 无 | 第3卷终章前 | 是 | 80 | 父亲笔记本 |",
  "| H02 | 3 | 谜团 | 未开启 | 0 | 第2卷揭开 | 中程 | [H01] | 第2卷中段 | 否 | 30 | 码头名单碎片 |",
  "| H03 | 7 | 小承诺 | 未开启 | 0 | 15章 | 近期 | 无 | 第1卷末 | 否 |  | 对妹妹的承诺 |",
].join("\n");

describe("ArchitectAgent — Phase 7 extended hook frontmatter", () => {
  let bookDir: string;

  beforeEach(async () => {
    bookDir = await mkdtemp(join(tmpdir(), "jiaos-phase7-arch-"));
  });

  afterEach(async () => {
    await rm(bookDir, { recursive: true, force: true });
    vi.restoreAllMocks();
  });

  it("architect prompt instructs depends_on / pays_off_in_arc / core_hook / half_life", async () => {
    const agent = buildAgent();
    const chat = vi.spyOn(agent as unknown as { chat: (...args: unknown[]) => Promise<unknown> }, "chat")
      .mockResolvedValue({ content: PHASE7_RESPONSE, usage: ZERO_USAGE });

    await agent.generateFoundation(baseBook());

    const messages = chat.mock.calls[0]?.[0] as Array<{ role: string; content: string }>;
    const system = messages[0]?.content ?? "";
    // The zh prompt must document all four new columns with clear rules.
    expect(system).toContain("上游依赖");
    expect(system).toContain("回收卷");
    expect(system).toContain("核心");
    expect(system).toContain("半衰期");
    // Core-hook budget guidance: 3-7 per book.
    expect(system).toContain("3-7 条");
    // The extended table header must appear in the prompt example.
    expect(system).toContain("| hook_id | 起始章节 | 类型 | 状态 | 最近推进 | 预期回收 | 回收节奏 | 上游依赖 | 回收卷 | 核心 | 半衰期 | 备注 |");
  });

  it("round-trips extended columns through parseSections into the ledger", async () => {
    const agent = buildAgent();
    vi.spyOn(agent as unknown as { chat: (...args: unknown[]) => Promise<unknown> }, "chat")
      .mockResolvedValue({ content: PHASE7_RESPONSE, usage: ZERO_USAGE });

    const result = await agent.generateFoundation(baseBook());

    // Phase 7 hotfix 1: rendered ledger now includes a 12th column `半衰期`
    // (half_life) so architect-supplied values persist through the projection
    // roundtrip and are read by hook-stale-detection. Hooks without an explicit
    // half_life render an empty cell (parser falls back to timing default).
    // Hotfix 2 adds a 13th `升级` (promoted) column — architect computes it
    // from core_hook / depends_on / cross_volume at seed time. H01 (core=是)
    // and H02 (depends_on=[H01]) both get promoted=是; H03 has no rule firing.
    expect(result.pendingHooks).toContain("| hook_id | 起始章节 | 类型 | 状态 | 最近推进 | 预期回收 | 回收节奏 | 上游依赖 | 回收卷 | 核心 | 半衰期 | 升级 | 备注 |");
    expect(result.pendingHooks).toContain("| H01 | 1 | 主线 | 未开启 | 0 | 终章揭晓 | 终局 | 无 | 第3卷终章前 | 是 | 80 | 是 | 父亲笔记本 |");
    expect(result.pendingHooks).toContain("| H02 | 3 | 谜团 | 未开启 | 0 | 第2卷揭开 | 中程 | [H01] | 第2卷中段 | 否 | 30 | 是 | 码头名单碎片 |");
    // H03 omits half_life; cell renders empty. No rule fires so 升级=否.
    expect(result.pendingHooks).toContain("| H03 | 7 | 小承诺 | 未开启 | 0 | 15章 | 近期 | 无 | 第1卷末 | 否 |  | 否 | 对妹妹的承诺 |");
  });

  it("pending_hooks.md on disk carries the Phase 7 columns", async () => {
    const agent = buildAgent();
    vi.spyOn(agent as unknown as { chat: (...args: unknown[]) => Promise<unknown> }, "chat")
      .mockResolvedValue({ content: PHASE7_RESPONSE, usage: ZERO_USAGE });

    const result = await agent.generateFoundation(baseBook());
    await agent.writeFoundationFiles(bookDir, result, false, "zh");

    const disk = await readFile(join(bookDir, "story", "pending_hooks.md"), "utf-8");
    expect(disk).toContain("上游依赖");
    expect(disk).toContain("回收卷");
    expect(disk).toContain("核心");
    // Second row's depends_on column should be [H01].
    expect(disk).toMatch(/\| H02 \|.*\| \[H01\] \|/);
  });

  it("parsePendingHooksMarkdown reads the extended ledger shape", async () => {
    const agent = buildAgent();
    vi.spyOn(agent as unknown as { chat: (...args: unknown[]) => Promise<unknown> }, "chat")
      .mockResolvedValue({ content: PHASE7_RESPONSE, usage: ZERO_USAGE });

    const result = await agent.generateFoundation(baseBook());

    const hooks = parsePendingHooksMarkdown(result.pendingHooks);
    expect(hooks).toHaveLength(3);

    const h01 = hooks.find((h) => h.hookId === "H01")!;
    expect(h01.coreHook).toBe(true);
    expect(h01.paysOffInArc).toBe("第3卷终章前");
    expect(h01.dependsOn ?? []).toEqual([]);

    const h02 = hooks.find((h) => h.hookId === "H02")!;
    expect(h02.coreHook).toBe(false);
    expect(h02.dependsOn).toEqual(["H01"]);
    expect(h02.paysOffInArc).toBe("第2卷中段");

    // Phase 7 hotfix 1: half_life survives the roundtrip.
    expect(h01.halfLifeChapters).toBe(80);
    expect(h02.halfLifeChapters).toBe(30);
    // H03 omitted half_life — falls back to undefined, not a default.
    const h03 = hooks.find((h) => h.hookId === "H03")!;
    expect(h03.halfLifeChapters).toBeUndefined();
  });

  it("legacy 8-column pending_hooks tables still parse without new fields (backward compat)", () => {
    const legacy = [
      "| hook_id | 起始章节 | 类型 | 状态 | 最近推进 | 预期回收 | 回收节奏 | 备注 |",
      "| --- | --- | --- | --- | --- | --- | --- | --- |",
      "| L01 | 1 | 主线 | 未开启 | 0 | 15章 | 中程 | 旧书 |",
    ].join("\n");

    const hooks = parsePendingHooksMarkdown(legacy);
    expect(hooks).toHaveLength(1);
    const hook = hooks[0]!;
    expect(hook.hookId).toBe("L01");
    expect(hook.coreHook).toBeUndefined();
    expect(hook.dependsOn).toBeUndefined();
    expect(hook.paysOffInArc).toBeUndefined();
    expect(hook.halfLifeChapters).toBeUndefined();
  });
});
