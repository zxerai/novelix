import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { readBookRules } from "../agents/rules-reader.js";
import { readBookRules as readPlannerBookRules } from "../agents/planner-context.js";
import { tryParseBookRulesFrontmatter } from "../models/book-rules.js";

// ---------------------------------------------------------------------------
// Phase 5 hotfix 2 — ParsedBookRules.body must no longer contain story_frame
// prose; it should only hold narrow narrative rules from the legacy
// book_rules.md file (if any).
// ---------------------------------------------------------------------------

describe("Phase 5 hotfix 2 — bookRules.body decoupling", () => {
  let bookDir: string;

  beforeEach(async () => {
    bookDir = await mkdtemp(join(tmpdir(), "jiaos-hotfix2-"));
  });

  afterEach(async () => {
    await rm(bookDir, { recursive: true, force: true });
    vi.restoreAllMocks();
  });

  it("readBookRules() yields empty body when the source is story_frame.md", async () => {
    // New-layout book: YAML frontmatter + prose outline essay on story_frame.md
    const storyDir = join(bookDir, "story");
    await mkdir(join(storyDir, "outline"), { recursive: true });
    await writeFile(
      join(storyDir, "outline/story_frame.md"),
      [
        "---",
        "version: \"1.0\"",
        "protagonist:",
        "  name: 主角甲",
        "  personalityLock: [沉默]",
        "  behavioralConstraints: []",
        "prohibitions:",
        "  - 禁止美化暴力",
        "---",
        "",
        "## 主题与基调",
        "这是 story_frame 的散文正文，不应该被当作 book rules body。",
        "## 主角弧线",
        "从 A 到 B 的旅程。",
      ].join("\n"),
      "utf-8",
    );

    const parsed = await readBookRules(bookDir);
    expect(parsed).not.toBeNull();
    expect(parsed?.rules.protagonist?.name).toBe("主角甲");
    expect(parsed?.rules.prohibitions).toEqual(["禁止美化暴力"]);
    // The prose MUST NOT leak into body.
    expect(parsed?.body).toBe("");
  });

  it("readBookRules() preserves legacy book_rules.md body for pre-cleanup books (byte-identical)", async () => {
    const storyDir = join(bookDir, "story");
    await mkdir(storyDir, { recursive: true });
    const legacyBody = "## 叙事视角\n第三人称单一视角。\n\n## 语言风格\n冷静克制。";
    await writeFile(
      join(storyDir, "book_rules.md"),
      [
        "---",
        "version: \"1.0\"",
        "protagonist:",
        "  name: LegacyHero",
        "  personalityLock: []",
        "  behavioralConstraints: []",
        "---",
        "",
        legacyBody,
      ].join("\n"),
      "utf-8",
    );

    const parsed = await readBookRules(bookDir);
    expect(parsed?.rules.protagonist?.name).toBe("LegacyHero");
    // Legacy body is preserved — this is critical for the reviser/continuity
    // style_guide fallback chain.
    expect(parsed?.body).toBe(legacyBody);
  });

  it("planner-context readBookRules does NOT paste story_frame prose (no duplication)", async () => {
    const storyDir = join(bookDir, "story");
    await mkdir(join(storyDir, "outline"), { recursive: true });
    await writeFile(
      join(storyDir, "outline/story_frame.md"),
      [
        "---",
        "version: \"1.0\"",
        "protagonist:",
        "  name: 林辞",
        "  personalityLock: [沉默]",
        "  behavioralConstraints: []",
        "prohibitions:",
        "  - 不得神化主角",
        "---",
        "",
        "## 主题与基调",
        "独家的五段散文正文内容，planner 不应重复注入。",
      ].join("\n"),
      "utf-8",
    );

    const rendered = await readPlannerBookRules(storyDir);
    expect(rendered).toContain("林辞");
    expect(rendered).toContain("不得神化主角");
    // The story_frame prose must NOT be duplicated via book rules body.
    expect(rendered).not.toContain("独家的五段散文正文内容");
  });
});

// ---------------------------------------------------------------------------
// Phase 5 hotfix 3 — broken YAML frontmatter on story_frame.md must not
// silently zero out rules; fall back to legacy book_rules.md if present.
// ---------------------------------------------------------------------------

describe("Phase 5 hotfix 3 — broken frontmatter fallback", () => {
  let bookDir: string;
  let warnSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(async () => {
    bookDir = await mkdtemp(join(tmpdir(), "jiaos-hotfix3-"));
    warnSpy = vi.spyOn(console, "warn").mockImplementation(() => { /* suppress */ });
  });

  afterEach(async () => {
    await rm(bookDir, { recursive: true, force: true });
    vi.restoreAllMocks();
  });

  it("tryParseBookRulesFrontmatter returns null on missing frontmatter", () => {
    const result = tryParseBookRulesFrontmatter("# just markdown, no yaml\n\nhello");
    expect(result).toBeNull();
  });

  it("tryParseBookRulesFrontmatter returns null on malformed YAML and invokes onError", () => {
    const onError = vi.fn();
    const result = tryParseBookRulesFrontmatter(
      "---\nprotagonist: {name: 主角\nno_close_brace: true\n---\n",
      onError,
    );
    expect(result).toBeNull();
    expect(onError).toHaveBeenCalledOnce();
  });

  it("tryParseBookRulesFrontmatter returns parsed rules on valid YAML", () => {
    const result = tryParseBookRulesFrontmatter(
      "---\nversion: \"1.0\"\nprotagonist:\n  name: X\n  personalityLock: []\n  behavioralConstraints: []\nprohibitions: []\n---\n",
    );
    expect(result).not.toBeNull();
    expect(result?.rules.protagonist?.name).toBe("X");
    expect(result?.body).toBe("");
  });

  it("readBookRules falls back to legacy book_rules.md when story_frame frontmatter is broken", async () => {
    const storyDir = join(bookDir, "story");
    await mkdir(join(storyDir, "outline"), { recursive: true });
    // Broken YAML (unterminated flow sequence)
    await writeFile(
      join(storyDir, "outline/story_frame.md"),
      "---\nprotagonist:\n  name: [broken\n  personalityLock: oops\n---\n\n# prose\n",
      "utf-8",
    );
    // Valid legacy rules
    await writeFile(
      join(storyDir, "book_rules.md"),
      [
        "---",
        "version: \"1.0\"",
        "protagonist:",
        "  name: LegacyHero",
        "  personalityLock: [stoic]",
        "  behavioralConstraints: []",
        "prohibitions:",
        "  - No lazy tropes",
        "---",
        "",
        "## 叙事视角",
        "legacy body content",
      ].join("\n"),
      "utf-8",
    );

    const parsed = await readBookRules(bookDir);
    expect(parsed?.rules.protagonist?.name).toBe("LegacyHero");
    expect(parsed?.rules.prohibitions).toEqual(["No lazy tropes"]);
    expect(parsed?.body).toContain("legacy body content");
    // Warning was logged
    expect(warnSpy).toHaveBeenCalled();
    const warnMessage = String(warnSpy.mock.calls[0]?.[0] ?? "");
    expect(warnMessage).toMatch(/story_frame\.md frontmatter is malformed/);
  });

  it("readBookRules with broken story_frame frontmatter AND shim-only book_rules.md returns null (does NOT silently zero rules)", async () => {
    // Phase hotfix 1 — common new-book path: story_frame YAML is broken,
    // book_rules.md exists only as the architect-emitted compat shim with no
    // YAML. Falling back to it as default-empty rules silently wipes
    // protagonist / prohibitions / genreLock. Must return null + warn.
    const storyDir = join(bookDir, "story");
    await mkdir(join(storyDir, "outline"), { recursive: true });
    await writeFile(
      join(storyDir, "outline/story_frame.md"),
      "---\nprotagonist: [unterminated\n---\n",
      "utf-8",
    );
    await writeFile(
      join(storyDir, "book_rules.md"),
      "# 本书规则（兼容指针——已废弃）\n\n> 本文件仅为外部读取保留。权威 YAML frontmatter（protagonist / prohibitions / genreLock / ...）已迁移至 outline/story_frame.md 顶部。",
      "utf-8",
    );

    const parsed = await readBookRules(bookDir);
    expect(parsed).toBeNull();
    // Two warnings expected: one for the broken story_frame frontmatter,
    // one for the shim fallback.
    expect(warnSpy).toHaveBeenCalled();
    const allWarnings = warnSpy.mock.calls
      .map((call) => String(call[0] ?? ""))
      .join("\n");
    expect(allWarnings).toMatch(/story_frame\.md frontmatter is malformed/);
    expect(allWarnings).toMatch(/Phase 5 compat shim/);
  });

  it("readBookRules with broken frontmatter AND no legacy returns null (with warning)", async () => {
    const storyDir = join(bookDir, "story");
    await mkdir(join(storyDir, "outline"), { recursive: true });
    await writeFile(
      join(storyDir, "outline/story_frame.md"),
      "---\nprotagonist: [unterminated\n---\n",
      "utf-8",
    );

    const parsed = await readBookRules(bookDir);
    // No legacy source, no valid frontmatter → null (caller provides defaults
    // at runtime via `?.rules ?? null`). Critically: rules were NOT silently
    // zeroed and a warning WAS logged.
    expect(parsed).toBeNull();
    expect(warnSpy).toHaveBeenCalled();
  });

  it("readBookRules prefers story_frame.md frontmatter over legacy when BOTH are valid", async () => {
    const storyDir = join(bookDir, "story");
    await mkdir(join(storyDir, "outline"), { recursive: true });
    // Valid story_frame frontmatter
    await writeFile(
      join(storyDir, "outline/story_frame.md"),
      [
        "---",
        "version: \"1.0\"",
        "protagonist:",
        "  name: NewHero",
        "  personalityLock: []",
        "  behavioralConstraints: []",
        "---",
        "",
        "## prose",
      ].join("\n"),
      "utf-8",
    );
    // Legacy file also present with different name — must be IGNORED
    await writeFile(
      join(storyDir, "book_rules.md"),
      [
        "---",
        "version: \"1.0\"",
        "protagonist:",
        "  name: OldHero",
        "  personalityLock: []",
        "  behavioralConstraints: []",
        "---",
        "",
        "legacy body",
      ].join("\n"),
      "utf-8",
    );

    const parsed = await readBookRules(bookDir);
    expect(parsed?.rules.protagonist?.name).toBe("NewHero");
    expect(parsed?.body).toBe(""); // story_frame source → empty body
    // No warning — story_frame was valid.
    expect(warnSpy).not.toHaveBeenCalled();
  });
});
