import { describe, it, expect } from "vitest";
import { analyzeAITells } from "../agents/ai-tells.js";

describe("analyzeAITells", () => {
  it("returns no issues for varied paragraph lengths", () => {
    const content = [
      "短段。",
      "",
      "这是一个中等长度的段落，包含一些描述性的内容，让这个段落稍微长一些。",
      "",
      "很长的段落。这个段落包含了大量的内容，描述了各种各样的场景和人物。角色们在这里进行了激烈的讨论，关于未来的计划和当前的困境。他们需要找到一种方式来解决眼前的问题。",
    ].join("\n");

    const result = analyzeAITells(content);
    const paraIssues = result.issues.filter((i) => i.category === "段落等长");
    expect(paraIssues).toHaveLength(0);
  });

  it("detects uniform paragraph lengths (dim 20)", () => {
    // Generate paragraphs of nearly identical length
    const para = "这是一个测试段落的内容，长度大约相同。";
    const content = [para, "", para, "", para, "", para].join("\n");

    const result = analyzeAITells(content);
    const paraIssues = result.issues.filter((i) => i.category === "段落等长");
    expect(paraIssues.length).toBeGreaterThan(0);
    expect(paraIssues[0]!.severity).toBe("warning");
  });

  it("detects high hedge word density (dim 21)", () => {
    const content = [
      "他似乎觉得这件事可能不太对劲。",
      "",
      "或许他应该大概去看看。似乎有什么东西在那里。",
      "",
      "可能是一种错觉，大概只是风声。某种程度上他也不太确定。",
    ].join("\n");

    const result = analyzeAITells(content);
    const hedgeIssues = result.issues.filter((i) => i.category === "套话密度");
    expect(hedgeIssues.length).toBeGreaterThan(0);
  });

  it("detects formulaic transition repetition (dim 22)", () => {
    const content = [
      "第一段内容。然而事情并不简单。",
      "",
      "第二段内容。然而他没有放弃。",
      "",
      "第三段内容。然而命运弄人。",
    ].join("\n");

    const result = analyzeAITells(content);
    const transIssues = result.issues.filter((i) => i.category === "公式化转折");
    expect(transIssues.length).toBeGreaterThan(0);
    expect(transIssues[0]!.description).toContain("然而");
  });

  it("detects list-like sentence structure (dim 23)", () => {
    const content = [
      "他看着远方的山峰。他看着脚下的深渊。他看着身旁的同伴。他看着手中的剑。",
    ].join("\n");

    const result = analyzeAITells(content);
    const listIssues = result.issues.filter((i) => i.category === "列表式结构");
    expect(listIssues.length).toBeGreaterThan(0);
    expect(listIssues[0]!.severity).toBe("info");
  });

  it("returns no issues for content with fewer than 3 paragraphs", () => {
    const content = "只有一段话。";
    const result = analyzeAITells(content);
    expect(result.issues).toHaveLength(0);
  });

  it("returns no issues for clean varied text", () => {
    const content = [
      "陈风一脚踩碎了脚下的石板。碎石飞溅，打在旁边的墙壁上发出清脆的声响。",
      "",
      "短暂的沉默。空气中弥漫着灰尘的味道，呛得他咳嗽了两声。远处传来脚步声。",
      "",
      "\"谁？\"他低喝一声，手已经按上了腰间的刀柄。指尖触到冰凉的金属，心跳稍微稳了一些。黑暗中，一双眼睛正盯着他。那目光冰冷得像冬夜的寒风，带着审视和一丝不易察觉的警惕。",
    ].join("\n");

    const result = analyzeAITells(content);
    // Should have no or few issues for natural-looking text
    const warningIssues = result.issues.filter((i) => i.severity === "warning");
    expect(warningIssues).toHaveLength(0);
  });
});
