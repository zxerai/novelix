import { describe, expect, it } from "vitest";
import { extractErrorMessage, extractToolError } from "./runtime";

describe("chat runtime error copy", () => {
  it("localizes known assistant errors", () => {
    expect(extractErrorMessage({
      message: "Latest chapter 1 is state-degraded. Repair state or rewrite that chapter before continuing.",
    })).toBe("最新第 1 章处于状态降级（state-degraded）。继续写下一章前，请先修复状态，或重写这一章。");
  });

  it("localizes known tool errors", () => {
    expect(extractToolError({
      content: [
        {
          type: "text",
          text: "Latest chapter 2 is state-degraded. Repair state or rewrite that chapter before continuing.",
        },
      ],
    })).toBe("最新第 2 章处于状态降级（state-degraded）。继续写下一章前，请先修复状态，或重写这一章。");
  });
});
