/**
 * v13 hotfix round 4 — tests for:
 *   Issue 1: old-book editing (no outline/story_frame.md) — isNewLayoutBook
 *   Issue 2: per-chapter promotion pass
 *   Issue 3: word-boundary + column-scoped regex for advanced_count
 *
 * Studio server tests for Issue 1 live in packages/studio/src/api/v13-hotfix-round4.test.ts.
 */

import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  isNewLayoutBook,
} from "../utils/outline-paths.js";
import {
  deriveAdvancedCountsFromSummaries,
  escapeRegex,
  rerunPromotionPass,
} from "../utils/hook-promotion.js";
import {
  parsePendingHooksMarkdown,
  renderHookSnapshot,
} from "../utils/story-markdown.js";
import type { StoredHook } from "../state/memory-db.js";

// ---------------------------------------------------------------------------
// Issue 1: isNewLayoutBook — old vs new book detection
// ---------------------------------------------------------------------------

describe("Issue 1 — isNewLayoutBook detection", () => {
  let bookDir: string;

  beforeEach(async () => {
    bookDir = await mkdtemp(join(tmpdir(), "jiaos-layout-detect-"));
    await mkdir(join(bookDir, "story"), { recursive: true });
  });

  afterEach(async () => {
    await rm(bookDir, { recursive: true, force: true });
  });

  it("returns false when outline/story_frame.md does not exist (legacy book)", async () => {
    await writeFile(join(bookDir, "story", "story_bible.md"), "# Story Bible", "utf-8");
    expect(await isNewLayoutBook(bookDir)).toBe(false);
  });

  it("returns true when outline/story_frame.md exists (new layout book)", async () => {
    await mkdir(join(bookDir, "story", "outline"), { recursive: true });
    await writeFile(join(bookDir, "story", "outline", "story_frame.md"), "# Frame", "utf-8");
    expect(await isNewLayoutBook(bookDir)).toBe(true);
  });

  it("returns false when story/ dir does not exist at all", async () => {
    const emptyDir = await mkdtemp(join(tmpdir(), "jiaos-empty-"));
    try {
      expect(await isNewLayoutBook(emptyDir)).toBe(false);
    } finally {
      await rm(emptyDir, { recursive: true, force: true });
    }
  });
});

// ---------------------------------------------------------------------------
// Issue 1: write_truth_file — old book allows story_bible.md writes
// ---------------------------------------------------------------------------

describe("Issue 1 — write_truth_file per-book shim detection", () => {
  let bookDir: string;

  beforeEach(async () => {
    bookDir = await mkdtemp(join(tmpdir(), "jiaos-wt-shim-"));
    await mkdir(join(bookDir, "story"), { recursive: true });
  });

  afterEach(async () => {
    await rm(bookDir, { recursive: true, force: true });
  });

  it("old book: isNewLayoutBook returns false so story_bible.md is writable", async () => {
    await writeFile(join(bookDir, "story", "story_bible.md"), "# Old", "utf-8");
    expect(await isNewLayoutBook(bookDir)).toBe(false);
  });

  it("new book: isNewLayoutBook returns true so story_bible.md is a shim", async () => {
    await mkdir(join(bookDir, "story", "outline"), { recursive: true });
    await writeFile(join(bookDir, "story", "outline", "story_frame.md"), "# Frame", "utf-8");
    await writeFile(join(bookDir, "story", "story_bible.md"), "# Shim", "utf-8");
    expect(await isNewLayoutBook(bookDir)).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Issue 2: per-chapter promotion pass
// ---------------------------------------------------------------------------

describe("Issue 2 — rerunPromotionPass", () => {
  it("promotes hook when mentioned in 2+ chapters of chapter_summaries", () => {
    const hooks: StoredHook[] = [
      {
        hookId: "H05",
        startChapter: 3,
        type: "小承诺",
        status: "open",
        lastAdvancedChapter: 7,
        expectedPayoff: "15章",
        payoffTiming: "near-term",
        notes: "",
        promoted: false,
      },
    ];
    const summaries = [
      "| 章节 | 标题 | 出场人物 | 关键事件 | 状态变化 | 伏笔动态 | 情绪基调 | 章节类型 |",
      "| --- | --- | --- | --- | --- | --- | --- | --- |",
      "| 4 | A | X | event | change | H05 推进 | 压抑 | 铺垫 |",
      "| 7 | B | X | event2 | change2 | H05 推进 | 紧绷 | 推进 |",
    ].join("\n");

    const result = rerunPromotionPass(hooks, summaries);
    expect(result.updated).toBe(true);
    expect(result.flippedCount).toBe(1);
    expect(result.hooks[0]!.promoted).toBe(true);
  });

  it("does not promote when mentioned in only 1 chapter", () => {
    const hooks: StoredHook[] = [
      {
        hookId: "H06",
        startChapter: 5,
        type: "小",
        status: "open",
        lastAdvancedChapter: 0,
        expectedPayoff: "",
        notes: "",
        promoted: false,
      },
    ];
    const summaries = [
      "| 章节 | 标题 | 出场人物 | 关键事件 | 状态变化 | 伏笔动态 | 情绪基调 | 章节类型 |",
      "| --- | --- | --- | --- | --- | --- | --- | --- |",
      "| 5 | A | X | event | change | H06 推进 | 压抑 | 铺垫 |",
    ].join("\n");

    const result = rerunPromotionPass(hooks, summaries);
    expect(result.updated).toBe(false);
    expect(result.flippedCount).toBe(0);
    expect(result.hooks[0]!.promoted).toBe(false);
  });

  it("skips already-promoted hooks", () => {
    const hooks: StoredHook[] = [
      {
        hookId: "H07",
        startChapter: 1,
        type: "主线",
        status: "open",
        lastAdvancedChapter: 5,
        expectedPayoff: "",
        notes: "",
        promoted: true,
      },
    ];
    const summaries = [
      "| 章节 | 标题 | 出场人物 | 关键事件 | 状态变化 | 伏笔动态 | 情绪基调 | 章节类型 |",
      "| --- | --- | --- | --- | --- | --- | --- | --- |",
      "| 3 | A | X | event | change | H07 推进 | 压抑 | 铺垫 |",
      "| 5 | B | X | event2 | change2 | H07 推进 | 紧绷 | 推进 |",
    ].join("\n");

    const result = rerunPromotionPass(hooks, summaries);
    expect(result.updated).toBe(false);
    expect(result.flippedCount).toBe(0);
  });
});

describe("Issue 2 — per-chapter promotion persists to pending_hooks.md", () => {
  let bookDir: string;

  beforeEach(async () => {
    bookDir = await mkdtemp(join(tmpdir(), "jiaos-perchapt-promo-"));
    await mkdir(join(bookDir, "story"), { recursive: true });
  });

  afterEach(async () => {
    await rm(bookDir, { recursive: true, force: true });
  });

  it("after writing chapter where H05 is mentioned 2nd time, pending_hooks.md shows H05 promoted=true", async () => {
    const hooks: StoredHook[] = [
      {
        hookId: "H05",
        startChapter: 3,
        type: "小承诺",
        status: "open",
        lastAdvancedChapter: 7,
        expectedPayoff: "15章",
        payoffTiming: "near-term",
        notes: "sister promise",
        promoted: false,
      },
    ];
    const storyDir = join(bookDir, "story");
    const ledgerPath = join(storyDir, "pending_hooks.md");
    await writeFile(ledgerPath, renderHookSnapshot(hooks, "zh"), "utf-8");

    // Simulate chapter_summaries with H05 mentioned in 2 chapters
    await writeFile(join(storyDir, "chapter_summaries.md"), [
      "| 章节 | 标题 | 出场人物 | 关键事件 | 状态变化 | 伏笔动态 | 情绪基调 | 章节类型 |",
      "| --- | --- | --- | --- | --- | --- | --- | --- |",
      "| 4 | 旧信 | 林辞 | 收到家书 | 回忆 | H05 推进 | 压抑 | 铺垫 |",
      "| 7 | 码头 | 林辞 | 查账 | 汇合 | H05 推进 | 紧绷 | 推进 |",
    ].join("\n"), "utf-8");

    // Run the promotion pass (same logic as runner.ts step 3c)
    const ledgerRaw = await readFile(ledgerPath, "utf-8");
    const parsedHooks = parsePendingHooksMarkdown(ledgerRaw);
    const summariesRaw = await readFile(join(storyDir, "chapter_summaries.md"), "utf-8");
    const result = rerunPromotionPass(parsedHooks, summariesRaw);

    expect(result.updated).toBe(true);
    // Write back
    await writeFile(ledgerPath, renderHookSnapshot([...result.hooks], "zh"), "utf-8");

    // Verify the file on disk
    const updated = parsePendingHooksMarkdown(await readFile(ledgerPath, "utf-8"));
    expect(updated.find((h) => h.hookId === "H05")!.promoted).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Issue 3: word-boundary + column-scoped regex
// ---------------------------------------------------------------------------

describe("Issue 3 — escapeRegex", () => {
  it("escapes special characters", () => {
    // `-` is not a regex metachar outside character classes, so not escaped
    expect(escapeRegex("H-01")).toBe("H-01");
    expect(escapeRegex("H.01")).toBe("H\\.01");
    expect(escapeRegex("test(1)")).toBe("test\\(1\\)");
    expect(escapeRegex("hook[0]")).toBe("hook\\[0\\]");
  });
});

describe("Issue 3 — deriveAdvancedCountsFromSummaries", () => {
  it("H01 does NOT match H010 in the same row", () => {
    const summaries = [
      "| 章节 | 标题 | 出场人物 | 关键事件 | 状态变化 | 伏笔动态 | 情绪基调 | 章节类型 |",
      "| --- | --- | --- | --- | --- | --- | --- | --- |",
      "| 5 | title | char | event | change | H010 推进 | mood | type |",
    ].join("\n");

    const counts = deriveAdvancedCountsFromSummaries(summaries, ["H01"]);
    expect(counts.get("H01")).toBeUndefined();
  });

  it("H010 matches H010 correctly", () => {
    const summaries = [
      "| 章节 | 标题 | 出场人物 | 关键事件 | 状态变化 | 伏笔动态 | 情绪基调 | 章节类型 |",
      "| --- | --- | --- | --- | --- | --- | --- | --- |",
      "| 5 | title | char | event | change | H010 推进 | mood | type |",
    ].join("\n");

    const counts = deriveAdvancedCountsFromSummaries(summaries, ["H010"]);
    expect(counts.get("H010")).toBe(1);
  });

  it("hook_id in title column does NOT count as advancement", () => {
    // H01 appears in the title column (index 1), not hookActivity (index 5)
    const summaries = [
      "| 章节 | 标题 | 出场人物 | 关键事件 | 状态变化 | 伏笔动态 | 情绪基调 | 章节类型 |",
      "| --- | --- | --- | --- | --- | --- | --- | --- |",
      "| 5 | H01的故事 | char | event | change | 其他线索 | mood | type |",
    ].join("\n");

    const counts = deriveAdvancedCountsFromSummaries(summaries, ["H01"]);
    expect(counts.get("H01")).toBeUndefined();
  });

  it("hook_id in hookActivity column DOES count", () => {
    const summaries = [
      "| 章节 | 标题 | 出场人物 | 关键事件 | 状态变化 | 伏笔动态 | 情绪基调 | 章节类型 |",
      "| --- | --- | --- | --- | --- | --- | --- | --- |",
      "| 5 | 普通标题 | char | event | change | H01 推进 | mood | type |",
      "| 6 | 另一个 | char | event | change | H01 推进 | mood | type |",
    ].join("\n");

    const counts = deriveAdvancedCountsFromSummaries(summaries, ["H01"]);
    expect(counts.get("H01")).toBe(2);
  });

  it("works with en-locale headers", () => {
    const summaries = [
      "| chapter | title | characters | events | stateChanges | hookActivity | mood | chapterType |",
      "| --- | --- | --- | --- | --- | --- | --- | --- |",
      "| 5 | old letter | Lin | found letter | memory | H01 advanced | tense | setup |",
      "| 6 | dock | Lin | check | converge | H01 advanced | tense | progress |",
    ].join("\n");

    const counts = deriveAdvancedCountsFromSummaries(summaries, ["H01"]);
    expect(counts.get("H01")).toBe(2);
  });

  it("hook_id in events column (not hookActivity) does not count", () => {
    const summaries = [
      "| chapter | title | characters | events | stateChanges | hookActivity | mood | chapterType |",
      "| --- | --- | --- | --- | --- | --- | --- | --- |",
      "| 5 | title | char | H01 discovered | change | other stuff | mood | type |",
    ].join("\n");

    const counts = deriveAdvancedCountsFromSummaries(summaries, ["H01"]);
    expect(counts.get("H01")).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// Issue 1: write_truth_file — old book allows story_bible.md writes
// ---------------------------------------------------------------------------

describe("Issue 1 — write_truth_file per-book shim detection", () => {
  let bookDir: string;

  beforeEach(async () => {
    bookDir = await mkdtemp(join(tmpdir(), "jiaos-wt-shim-"));
    await mkdir(join(bookDir, "story"), { recursive: true });
  });

  afterEach(async () => {
    await rm(bookDir, { recursive: true, force: true });
  });

  it("old book: isNewLayoutBook returns false so story_bible.md is writable", async () => {
    await writeFile(join(bookDir, "story", "story_bible.md"), "# Old", "utf-8");
    expect(await isNewLayoutBook(bookDir)).toBe(false);
  });

  it("new book: isNewLayoutBook returns true so story_bible.md is a shim", async () => {
    await mkdir(join(bookDir, "story", "outline"), { recursive: true });
    await writeFile(join(bookDir, "story", "outline", "story_frame.md"), "# Frame", "utf-8");
    await writeFile(join(bookDir, "story", "story_bible.md"), "# Shim", "utf-8");
    expect(await isNewLayoutBook(bookDir)).toBe(true);
  });
});
