import { describe, it, expect } from "vitest";
import { analyzeSensitiveWords } from "../agents/sensitive-words.js";

describe("analyzeSensitiveWords", () => {
  it("returns no issues for clean text", () => {
    const content = "陈风一脚踩碎了脚下的石板。碎石飞溅，他握紧了手中的长剑，准备迎战。";
    const result = analyzeSensitiveWords(content);
    expect(result.issues).toHaveLength(0);
    expect(result.found).toHaveLength(0);
  });

  it("detects political terms as block severity", () => {
    const content = "他在广场上看到了法轮功的标语，不禁皱了皱眉。";
    const result = analyzeSensitiveWords(content);
    expect(result.found.length).toBeGreaterThan(0);
    const politicalMatches = result.found.filter((f) => f.severity === "block");
    expect(politicalMatches.length).toBeGreaterThan(0);
    expect(politicalMatches[0]!.word).toBe("法轮功");
    // Issues should have critical severity for block words
    const criticalIssues = result.issues.filter((i) => i.severity === "critical");
    expect(criticalIssues.length).toBeGreaterThan(0);
    expect(criticalIssues[0]!.category).toBe("敏感词");
  });

  it("detects sexual terms as warn severity", () => {
    const content = "他看到了一些淫荡的画面。";
    const result = analyzeSensitiveWords(content);
    expect(result.found.length).toBeGreaterThan(0);
    const warnMatches = result.found.filter((f) => f.severity === "warn");
    expect(warnMatches.length).toBeGreaterThan(0);
    // Issues should have warning severity for warn words
    const warningIssues = result.issues.filter((i) => i.severity === "warning");
    expect(warningIssues.length).toBeGreaterThan(0);
  });

  it("detects extreme violence terms as warn severity", () => {
    const content = "敌人对俘虏进行了残忍的肢解。";
    const result = analyzeSensitiveWords(content);
    const violenceMatches = result.found.filter((f) => f.word === "肢解");
    expect(violenceMatches.length).toBe(1);
    expect(violenceMatches[0]!.severity).toBe("warn");
  });

  it("detects custom words", () => {
    const content = "他使用了禁术「灭世天火」来对付敌人。";
    const result = analyzeSensitiveWords(content, ["灭世天火", "灭世之力"]);
    expect(result.found.length).toBe(1);
    expect(result.found[0]!.word).toBe("灭世天火");
    expect(result.found[0]!.severity).toBe("warn");
  });

  it("counts multiple occurrences of the same word", () => {
    const content = "共产党的历史很长，共产党的影响很大，共产党的组织遍布各地。";
    const result = analyzeSensitiveWords(content);
    const match = result.found.find((f) => f.word === "共产党");
    expect(match).toBeDefined();
    expect(match!.count).toBe(3);
  });

  it("matches substring words (新疆 in context)", () => {
    // "新疆" is not in the default list, but "新疆集中营" is.
    // This test verifies that exact matching works.
    const content = "他来自新疆，是一名普通的牧民。";
    const result = analyzeSensitiveWords(content);
    // "新疆" alone is not in the list, only "新疆集中营" and "维吾尔"
    // So this should not match
    const xinjiangMatch = result.found.find((f) => f.word === "新疆集中营");
    expect(xinjiangMatch).toBeUndefined();
  });

  it("does not false-positive on partial matches for multi-char words", () => {
    const content = "这是一个全新的疆域，充满了未知。";
    const result = analyzeSensitiveWords(content);
    // "新疆集中营" should not match in "新的疆域"
    expect(result.found).toHaveLength(0);
  });

  it("detects multiple categories simultaneously", () => {
    const content = "法轮功的信徒在广场上进行了淫荡的仪式，场面极其血腥，有人被肢解。";
    const result = analyzeSensitiveWords(content);
    const blockCount = result.found.filter((f) => f.severity === "block").length;
    const warnCount = result.found.filter((f) => f.severity === "warn").length;
    expect(blockCount).toBeGreaterThan(0);
    expect(warnCount).toBeGreaterThan(0);
    // Should have issues for both political and sexual/violence
    expect(result.issues.length).toBeGreaterThanOrEqual(2);
  });
});
