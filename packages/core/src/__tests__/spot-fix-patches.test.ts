import { describe, expect, it } from "vitest";
import {
  applySpotFixPatches,
  parseSpotFixPatches,
  type SpotFixPatch,
} from "../utils/spot-fix-patches.js";

describe("spot-fix patches", () => {
  it("parses patch blocks from the PATCHES section", () => {
    const patches = parseSpotFixPatches([
      "=== PATCHES ===",
      "--- PATCH 1 ---",
      "TARGET_TEXT:",
      "原句一。",
      "REPLACEMENT_TEXT:",
      "新句一。",
      "--- END PATCH ---",
      "--- PATCH 2 ---",
      "TARGET_TEXT:",
      "原句二。",
      "REPLACEMENT_TEXT:",
      "新句二。",
      "--- END PATCH ---",
    ].join("\n"));

    expect(patches).toEqual<SpotFixPatch[]>([
      { targetText: "原句一。", replacementText: "新句一。" },
      { targetText: "原句二。", replacementText: "新句二。" },
    ]);
  });

  it("applies a uniquely targeted patch while preserving untouched text", () => {
    const original = [
      "门轴轻轻响了一下。",
      "林越没有立刻进去。",
      "",
      "巷子尽头的风还在吹。",
      "他把手按在潮冷的门框上，没有出声。",
      "更远处传来极轻的脚步回响，又很快断掉。",
    ].join("\n");

    const result = applySpotFixPatches(original, [
      {
        targetText: "林越没有立刻进去。",
        replacementText: "林越先停在门槛外，侧耳听了一息。",
      },
    ]);

    expect(result.applied).toBe(true);
    expect(result.appliedPatchCount).toBe(1);
    expect(result.skippedPatchCount).toBe(0);
    expect(result.revisedContent).toBe([
      "门轴轻轻响了一下。",
      "林越先停在门槛外，侧耳听了一息。",
      "",
      "巷子尽头的风还在吹。",
      "他把手按在潮冷的门框上，没有出声。",
      "更远处传来极轻的脚步回响，又很快断掉。",
    ].join("\n"));
  });

  it("skips non-unique patches instead of rejecting all", () => {
    const original = "他停了一下。\n门里的人也停了一下。\n窗外很静。";

    const result = applySpotFixPatches(original, [
      { targetText: "停了一下", replacementText: "顿了顿" },
      { targetText: "窗外很静。", replacementText: "窗外传来虫鸣。" },
    ]);

    expect(result.applied).toBe(true);
    expect(result.appliedPatchCount).toBe(1);
    expect(result.skippedPatchCount).toBe(1);
    expect(result.revisedContent).toContain("窗外传来虫鸣。");
    expect(result.revisedContent).toContain("停了一下"); // unchanged — patch was skipped
  });

  it("applies patches via fuzzy match when whitespace differs", () => {
    const original = "他慢慢站起来，   看了一眼\n远处的山。";

    const result = applySpotFixPatches(original, [
      {
        targetText: "他慢慢站起来， 看了一眼 远处的山。",
        replacementText: "他猛地起身，盯着远山。",
      },
    ]);

    expect(result.applied).toBe(true);
    expect(result.appliedPatchCount).toBe(1);
    expect(result.revisedContent).toBe("他猛地起身，盯着远山。");
  });

  it("reports all skipped when no patches can be matched", () => {
    const original = "完全不相关的内容。";

    const result = applySpotFixPatches(original, [
      { targetText: "这段不存在", replacementText: "替换" },
    ]);

    expect(result.applied).toBe(false);
    expect(result.appliedPatchCount).toBe(0);
    expect(result.skippedPatchCount).toBe(1);
    expect(result.rejectedReason).toContain("No patches could be matched");
  });
});
