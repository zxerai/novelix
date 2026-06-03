import { describe, expect, it } from "vitest";
import { PLANNER_MEMO_SYSTEM_PROMPT, PLANNER_MEMO_SYSTEM_PROMPT_EN } from "../agents/planner-prompts.js";

describe("planner prompt line-ratio handling", () => {
  it("requires user-specified plot proportions to become visible chapter beats", () => {
    expect(PLANNER_MEMO_SYSTEM_PROMPT).toContain("用户设定的内容比例必须落成场面");
    expect(PLANNER_MEMO_SYSTEM_PROMPT).toContain("权谋/感情各半");
    expect(PLANNER_MEMO_SYSTEM_PROMPT_EN).toContain("User-specified content proportions must become scenes");
    expect(PLANNER_MEMO_SYSTEM_PROMPT_EN).toContain("politics 50% / romance 50%");
  });
});
