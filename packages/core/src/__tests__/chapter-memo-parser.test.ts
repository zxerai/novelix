import { describe, it, expect } from "vitest";
import { parseMemo, PlannerParseError } from "../utils/chapter-memo-parser.js";

const SECTIONS = `
## 当前任务
主角进入七号门现场，比对锁芯刮痕与监控时间线，把"被动过手脚"从猜测钉成实证。

## 读者此刻在等什么
1) 读者在等七号门异常是否实锤
2) 本章完全兑现——钉成现场实证

## 该兑现的 / 暂不掀的
- 该兑现：七号门异常 → 钉成现场实证
- 暂不掀：幕后主使 → 压到第 20 章

## 日常/过渡承担什么任务
不适用 - 本章为高压实证章，无日常过渡段。

## 关键抉择过三连问
- 主角本章最关键的一次选择：
  - 为什么这么做？因为线索只剩这一条
  - 符合当前利益吗？符合
  - 符合他的人设吗？符合
- 对手/配角本章最关键的一次选择：
  - 为什么这么做？为了掩盖踪迹
  - 符合当前利益吗？符合
  - 符合他的人设吗？符合

## 章尾必须发生的改变
- 信息改变：主角掌握实证
- 关系改变：主角对阿泽产生戒心

## 本章 hook 账
advance:
- H03 "七号门异常" → 从 pressured → near_payoff（主角拿到实证）
resolve:
- S004 "锁芯刮痕" → 本章核验完毕
defer:
- H07 "幕后主使" → 压到第 20 章，时机未到

## 不要做
- 不要让对手突然降智
- 不要直接点破幕后主使
`.trim();

function makeRaw(
  opts: {
    chapter?: number | string;
    goal?: string;
    isGoldenOpening?: boolean | string;
    threadRefs?: ReadonlyArray<string> | null | unknown;
    body?: string;
    dropFrontmatter?: boolean;
  } = {},
): string {
  if (opts.dropFrontmatter) {
    return opts.body ?? SECTIONS;
  }

  const threadRefsText = Array.isArray(opts.threadRefs)
    ? `threadRefs:\n${opts.threadRefs.map((id) => `  - ${id}`).join("\n")}`
    : opts.threadRefs === null
      ? "threadRefs: null"
      : opts.threadRefs === undefined
        ? "threadRefs: []"
        : `threadRefs: ${String(opts.threadRefs)}`;

  const frontmatter = [
    `chapter: ${opts.chapter ?? 12}`,
    `goal: ${opts.goal ?? "把七号门被动过手脚钉成现场实证"}`,
    `isGoldenOpening: ${opts.isGoldenOpening ?? false}`,
    threadRefsText,
  ].join("\n");

  return `---\n${frontmatter}\n---\n${opts.body ?? SECTIONS}\n`;
}

describe("parseMemo", () => {
  it("parses a valid frontmatter + 7 sections", () => {
    const memo = parseMemo(makeRaw({ threadRefs: ["H03", "S004"] }), 12, false);
    expect(memo.chapter).toBe(12);
    expect(memo.goal).toBe("把七号门被动过手脚钉成现场实证");
    expect(memo.isGoldenOpening).toBe(false);
    expect(memo.threadRefs).toEqual(["H03", "S004"]);
    expect(memo.body).toContain("## 当前任务");
    expect(memo.body).toContain("## 不要做");
  });

  it("throws when frontmatter delimiters are missing", () => {
    expect(() => parseMemo(SECTIONS, 12, false)).toThrow(PlannerParseError);
    expect(() => parseMemo(SECTIONS, 12, false)).toThrow(/frontmatter/);
  });

  it("throws when goal exceeds 50 chars", () => {
    const longGoal = "把异常钉成实证".repeat(10);
    expect(() => parseMemo(makeRaw({ goal: longGoal }), 12, false)).toThrow(/goal too long/);
  });

  it("throws when chapter mismatches expected", () => {
    expect(() => parseMemo(makeRaw({ chapter: 99 }), 12, false)).toThrow(/chapter mismatch/);
  });

  it.each([
    "## 当前任务",
    "## 读者此刻在等什么",
    "## 该兑现的 / 暂不掀的",
    "## 日常/过渡承担什么任务",
    "## 关键抉择过三连问",
    "## 章尾必须发生的改变",
    "## 本章 hook 账",
    "## 不要做",
  ])("throws when body is missing section %s", (heading) => {
    const body = SECTIONS.replace(heading, "## SECTION-REMOVED");
    expect(() => parseMemo(makeRaw({ body }), 12, false)).toThrow(/missing sections/);
  });

  it("silently coerces non-array threadRefs to empty array", () => {
    const raw = makeRaw({ threadRefs: null });
    const memo = parseMemo(raw, 12, false);
    expect(memo.threadRefs).toEqual([]);
  });

  it("uses caller-provided isGoldenOpening, not LLM frontmatter value", () => {
    // LLM claims true but caller says false — caller wins
    const raw = makeRaw({ isGoldenOpening: true });
    const memo = parseMemo(raw, 12, false);
    expect(memo.isGoldenOpening).toBe(false);

    // LLM claims false but caller says true — caller wins
    const raw2 = makeRaw({ isGoldenOpening: false });
    const memo2 = parseMemo(raw2, 12, true);
    expect(memo2.isGoldenOpening).toBe(true);
  });

  it("throws when YAML frontmatter is not an object", () => {
    const raw = `---\n- just\n- a\n- list\n---\n${SECTIONS}\n`;
    expect(() => parseMemo(raw, 12, false)).toThrow(/frontmatter is not an object/);
  });

  it("throws when chapter is not an integer", () => {
    const raw = `---\nchapter: 12.5\ngoal: x\nisGoldenOpening: false\nthreadRefs: []\n---\n${SECTIONS}\n`;
    expect(() => parseMemo(raw, 12, false)).toThrow(/chapter must be an integer/);
  });

  it("throws on invalid YAML", () => {
    const raw = `---\nchapter: 12\n  bad indent: : :\n---\n${SECTIONS}\n`;
    expect(() => parseMemo(raw, 12, false)).toThrow(/invalid YAML/);
  });

  // Phase hotfix 7: empty / blank section payloads must be rejected.
  describe("empty section detection", () => {
    it("rejects a memo where every heading is present but payloads are blank", () => {
      const blankBody = [
        "## 当前任务",
        "",
        "## 读者此刻在等什么",
        "",
        "## 该兑现的 / 暂不掀的",
        "",
        "## 日常/过渡承担什么任务",
        "",
        "## 关键抉择过三连问",
        "",
        "## 章尾必须发生的改变",
        "",
        "## 本章 hook 账",
        "",
        "## 不要做",
        "",
      ].join("\n");
      expect(() => parseMemo(makeRaw({ body: blankBody }), 12, false))
        .toThrow(/empty sections/);
    });

    it("rejects a memo where one section has only whitespace / placeholder", () => {
      const body = SECTIONS.replace(
        /## 当前任务\n[\s\S]*?\n\n## 读者此刻在等什么/,
        "## 当前任务\n   \n\n## 读者此刻在等什么",
      );
      expect(() => parseMemo(makeRaw({ body }), 12, false))
        .toThrow(/empty sections.*当前任务/);
    });

    it("rejects a memo where one section has 'TODO' (under 20 chars)", () => {
      const body = SECTIONS.replace(
        /## 章尾必须发生的改变\n[\s\S]*?\n\n## 本章 hook 账/,
        "## 章尾必须发生的改变\nTODO\n\n## 本章 hook 账",
      );
      expect(() => parseMemo(makeRaw({ body }), 12, false))
        .toThrow(/empty sections.*章尾必须发生的改变/);
    });

    it("accepts a sparse-but-non-empty memo (Phase 6 sparse-memo principle)", () => {
      // Each section just barely meets the threshold — this is the
      // breath/transition chapter case the principle wants to keep legal.
      const sparseBody = [
        "## 当前任务",
        "主角与协作者在码头会合，交换上一案的情报与下一步行动安排。",
        "",
        "## 读者此刻在等什么",
        "读者在等线索是否真被坐实。本章只给出半成品的暗示。",
        "",
        "## 该兑现的 / 暂不掀的",
        "该兑现：暗示线索成形；暂不掀：幕后是谁，留到第 20 章。",
        "",
        "## 日常/过渡承担什么任务",
        "码头闲笔铺人物关系，让协作者的犹豫成为下一章的钩。",
        "",
        "## 关键抉择过三连问",
        "主角选信协作者，因为情报缺口只能从这里补；符合利益与人设。",
        "",
        "## 章尾必须发生的改变",
        "关系改变：主角和协作者从交易关系微微转向共担风险的同伴。",
        "",
        "## 本章 hook 账",
        "advance: H03 线索 → 从 planted 推到 pressured（本章让协作者第一次点头）。",
        "",
        "## 不要做",
        "无",
      ].join("\n");

      const memo = parseMemo(makeRaw({ body: sparseBody }), 12, false);
      expect(memo.body).toContain("## 当前任务");
      expect(memo.body).toContain("## 不要做");
    });

    it('accepts "## 不要做" with very short content like "无" / "N/A" (relaxed threshold)', () => {
      // The "do not" section uses a 5-char minimum so books with no extra
      // chapter-level prohibitions can say so without inventing filler.
      const body = SECTIONS.replace(
        /## 不要做\n[\s\S]*$/,
        "## 不要做\n无。",
      );
      const memo = parseMemo(makeRaw({ body }), 12, false);
      expect(memo.body).toContain("无。");
    });

    it("rejects empty '## 不要做' even with the relaxed threshold", () => {
      const body = SECTIONS.replace(
        /## 不要做\n[\s\S]*$/,
        "## 不要做\n",
      );
      expect(() => parseMemo(makeRaw({ body }), 12, false))
        .toThrow(/empty sections.*不要做/);
    });
  });
});
