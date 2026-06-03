import { describe, it, expect } from "vitest";
import {
  parseHookLedger,
  validateHookLedger,
} from "../utils/hook-ledger-validator.js";

const ZH_MEMO = `## 当前任务
林秋潜入账房取回账册。

## 本章 hook 账
open:
- [new] 旧港眼线盯梢 || 理由：留给下一卷

advance:
- H007 "胖虎借条" → planted → pressured
- H012 "雷架焦痕" → pressured → near_payoff

resolve:
- H003 "杂役腰牌" → 林秋主动摘下

defer:
- H009 "守拙诀来历" → 本章不动

## 不要做
- 不要点破母亲身份`;

const EN_MEMO = `## Current task
Lin Qiu lifts the ledger from the Old Port accounting hall.

## Hook ledger for this chapter
open:
- [new] Old Port tail || reason: save for later arc

advance:
- H007 "Huzi's IOU" → planted → pressured

resolve:
- H003 "errand badge" → Lin Qiu unpins it himself

defer:
- H009 "Shou-Zhuo Jue origin" → timing not right

## Do not
- Do not reveal the mother's name`;

describe("parseHookLedger", () => {
  it("extracts all four sub-lists from a zh memo", () => {
    const ledger = parseHookLedger(ZH_MEMO);
    expect(ledger.advance.map((e) => e.id)).toEqual(["H007", "H012"]);
    expect(ledger.resolve.map((e) => e.id)).toEqual(["H003"]);
    expect(ledger.defer.map((e) => e.id)).toEqual(["H009"]);
    // open uses [new] so no hook_id is extracted
    expect(ledger.open).toEqual([]);
  });

  it("captures descriptor + keywords for each entry", () => {
    const ledger = parseHookLedger(ZH_MEMO);
    const h007 = ledger.advance[0]!;
    expect(h007.id).toBe("H007");
    expect(h007.descriptor).toContain("胖虎借条");
    expect(h007.keywords).toContain("胖虎");
    expect(h007.keywords).toContain("借条");

    const h003 = ledger.resolve[0]!;
    expect(h003.keywords).toContain("杂役");
    expect(h003.keywords).toContain("腰牌");
  });

  it("extracts all four sub-lists from an en memo", () => {
    const ledger = parseHookLedger(EN_MEMO);
    expect(ledger.advance.map((e) => e.id)).toEqual(["H007"]);
    expect(ledger.resolve.map((e) => e.id)).toEqual(["H003"]);
    expect(ledger.defer.map((e) => e.id)).toEqual(["H009"]);
  });

  it("returns empty lists when no ledger section is present", () => {
    const ledger = parseHookLedger("## 当前任务\n正文\n\n## 不要做\n- 无");
    expect(ledger).toEqual({ open: [], advance: [], resolve: [], defer: [], newOpenCount: 0 });
  });

  it("counts [new] placeholder lines under open as new hooks opened", () => {
    const memo = `## 本章 hook 账
open:
- [new] 下一卷伏笔 || 理由
- [new] 第二条埋点 || 理由
advance:
- H001 "x" → y
`;
    const ledger = parseHookLedger(memo);
    expect(ledger.open).toEqual([]); // [new] lines have no id → not in .open
    expect(ledger.newOpenCount).toBe(2);
  });

  it("stops at the next H2 heading and does not pollute across sections", () => {
    const memo = `## 本章 hook 账
advance:
- H007 "xxx" → ...

## 不要做
- H999 looks-like-a-hook-but-its-under-do-not`;
    const ledger = parseHookLedger(memo);
    expect(ledger.advance.map((e) => e.id)).toEqual(["H007"]);
    expect(ledger.defer).toEqual([]);
  });

  it("ignores placeholder tokens like 无 / none / n/a under empty slots", () => {
    const memo = `## 本章 hook 账
advance:
- 无
- none
- H007 "真的钩子" → planted
resolve:
- 暂无
defer:
- n/a
`;
    const ledger = parseHookLedger(memo);
    expect(ledger.advance.map((e) => e.id)).toEqual(["H007"]);
    expect(ledger.resolve).toEqual([]);
    expect(ledger.defer).toEqual([]);
  });
});

describe("validateHookLedger", () => {
  it("passes when draft echoes keyword from each committed ledger entry", () => {
    // Draft mentions 胖虎/借条 (→H007), 雷架 or 焦痕 (→H012), 杂役 or 腰牌 (→H003).
    const draft =
      "林秋在账房找到胖虎借条，又在后巷被雷架焦痕刮到眼角。他摘下杂役腰牌后退入暗处。";
    const violations = validateHookLedger(ZH_MEMO, draft);
    expect(violations).toEqual([]);
  });

  it("flags a critical violation for each un-echoed advance/resolve entry", () => {
    // Only 胖虎 (H007) present; 雷架/焦痕 (H012) and 杂役/腰牌 (H003) missing.
    const draft = "林秋只摸出胖虎借条，其他都没写。";
    const violations = validateHookLedger(ZH_MEMO, draft);
    expect(violations).toHaveLength(2);
    expect(violations.every((v) => v.severity === "critical")).toBe(true);
    expect(violations.map((v) => v.description).join(" ")).toContain("H012");
    expect(violations.map((v) => v.description).join(" ")).toContain("H003");
  });

  it("does NOT flag hooks that are only under defer", () => {
    // H009 is deferred — keyword 守拙诀 absence is fine.
    const draft = "林秋翻出胖虎借条与雷架焦痕推进情节，随后摘下杂役腰牌。";
    const violations = validateHookLedger(ZH_MEMO, draft);
    expect(violations).toEqual([]);
  });

  it("does NOT flag [new] open entries (they have no pre-existing id)", () => {
    const memo = `## 本章 hook 账
open:
- [new] 新钩子 || 理由
advance:
- H001 "测试项" → x
`;
    const draft = "正文提到测试项的细节。";
    const violations = validateHookLedger(memo, draft);
    expect(violations).toEqual([]);
  });

  it("returns empty array when memo has no ledger section at all", () => {
    const violations = validateHookLedger("## 别的东西\n正文", "draft");
    expect(violations).toEqual([]);
  });

  it("falls back to strict ID match when ledger line has no descriptor", () => {
    const memo = `## 本章 hook 账
advance:
- H1
`;
    // Draft contains H12 — must NOT accidentally satisfy H1 commitment.
    const draft = "剧情涉及 H12 和 H123。";
    const violations = validateHookLedger(memo, draft);
    expect(violations).toHaveLength(1);
    expect(violations[0]!.description).toContain("H1");
  });

  it("accepts english keyword match for en memos", () => {
    const draft =
      "Lin Qiu finds Huzi's IOU folded inside the ledger and tucks it away. Later he unpins the errand badge before slipping out.";
    const violations = validateHookLedger(EN_MEMO, draft);
    expect(violations).toEqual([]);
  });

  it("flags 揭 1 埋 1 violation when a chapter resolves hooks without opening any", () => {
    const memo = `## 本章 hook 账
advance:
- H007 "胖虎借条" → planted
resolve:
- H003 "杂役腰牌" → 林秋主动摘下
`;
    const draft = "林秋翻看胖虎借条，随后摘下杂役腰牌。";
    const violations = validateHookLedger(memo, draft);
    expect(violations).toHaveLength(1);
    expect(violations[0]!.category).toContain("揭 1 埋 1");
  });

  it("accepts 揭 1 埋 1 floor when a [new] line balances the resolved hook", () => {
    const memo = `## 本章 hook 账
open:
- [new] 母亲留下的半枚玉佩 || 理由：下一卷线索
advance:
- H007 "胖虎借条" → planted
resolve:
- H003 "杂役腰牌" → 林秋主动摘下
`;
    const draft = "林秋翻看胖虎借条，随后摘下杂役腰牌。";
    const violations = validateHookLedger(memo, draft);
    expect(violations).toEqual([]);
  });

  it("does not let placeholder 无 raise a false critical", () => {
    const memo = `## 本章 hook 账
open:
- [new] 下一卷伏笔 || 理由
advance:
- 无
resolve:
- H005 "通行印验号" → ok
`;
    const draft = "主峰的通行印验号按部就班完成。";
    const violations = validateHookLedger(memo, draft);
    expect(violations).toEqual([]);
  });

  it("accepts middle keywords from a longer Chinese hook name", () => {
    const memo = `## 本章 hook 账
advance:
- H007 "被定位的安全威胁" → evoked → pressured
`;
    const draft = "旧手机弹出定位结果，林知夏发现店外有人盯梢，安全空间塌了。";
    const violations = validateHookLedger(memo, draft);
    expect(violations).toEqual([]);
  });
});
