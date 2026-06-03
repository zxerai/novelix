import { describe, it, expect } from "vitest";
import { analyzeStyle } from "../agents/style-analyzer.js";

describe("analyzeStyle", () => {
  const sampleText = [
    "陈风一脚踩碎了脚下的石板。碎石飞溅，打在旁边的墙壁上发出清脆的声响。他低头看了一眼，嘴角微微上扬。",
    "",
    "\"谁？\"他低喝一声，手已经按上了腰间的刀柄。指尖触到冰凉的金属，心跳稍微稳了一些。",
    "",
    "黑暗中，一双眼睛正盯着他。那目光冰冷得像冬夜的寒风，带着审视和一丝不易察觉的警惕。来者不善。但陈风并不怕。他经历过比这更恶劣的处境。比这更危险的对手。他攥紧了刀柄，朝着那双眼睛走了过去。脚步声在空旷的巷子里回荡。",
  ].join("\n");

  it("calculates sentence length statistics", () => {
    const profile = analyzeStyle(sampleText);
    expect(profile.avgSentenceLength).toBeGreaterThan(0);
    expect(profile.sentenceLengthStdDev).toBeGreaterThan(0);
  });

  it("calculates paragraph length statistics", () => {
    const profile = analyzeStyle(sampleText);
    expect(profile.avgParagraphLength).toBeGreaterThan(0);
    expect(profile.paragraphLengthRange.min).toBeGreaterThan(0);
    expect(profile.paragraphLengthRange.max).toBeGreaterThanOrEqual(profile.paragraphLengthRange.min);
  });

  it("calculates vocabulary diversity", () => {
    const profile = analyzeStyle(sampleText);
    expect(profile.vocabularyDiversity).toBeGreaterThan(0);
    expect(profile.vocabularyDiversity).toBeLessThanOrEqual(1);
  });

  it("includes source name when provided", () => {
    const profile = analyzeStyle(sampleText, "测试来源");
    expect(profile.sourceName).toBe("测试来源");
  });

  it("includes analyzed timestamp", () => {
    const profile = analyzeStyle(sampleText);
    expect(profile.analyzedAt).toBeDefined();
  });

  it("handles empty text", () => {
    const profile = analyzeStyle("");
    expect(profile.avgSentenceLength).toBe(0);
    expect(profile.avgParagraphLength).toBe(0);
    expect(profile.vocabularyDiversity).toBe(0);
  });

  it("detects top patterns from repeated sentence openings", () => {
    const repetitiveText = [
      "他看着远方。他看着山峰。他看着大海。他看着天空。",
      "",
      "风在吹。雨在下。",
    ].join("\n");

    const profile = analyzeStyle(repetitiveText);
    // "他看" should be detected as a top pattern
    const hasHeKan = profile.topPatterns.some((p) => p.includes("他看"));
    expect(hasHeKan).toBe(true);
  });
});
