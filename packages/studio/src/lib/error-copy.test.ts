import { describe, expect, it } from "vitest";
import { localizeKnownRuntimeMessage } from "./error-copy";

describe("localizeKnownRuntimeMessage", () => {
  it("localizes the state-degraded continuation blocker", () => {
    expect(localizeKnownRuntimeMessage(
      "Latest chapter 1 is state-degraded. Repair state or rewrite that chapter before continuing.",
    )).toBe("最新第 1 章处于状态降级（state-degraded）。继续写下一章前，请先修复状态，或重写这一章。");
  });

  it("localizes related state repair errors while preserving unknown messages", () => {
    expect(localizeKnownRuntimeMessage("Chapter 3 is not state-degraded.")).toBe(
      "第 3 章不是状态降级（state-degraded），无需按状态修复。",
    );
    expect(localizeKnownRuntimeMessage(
      "Only the latest state-degraded chapter can be repaired safely (latest is 5).",
    )).toBe("只能安全修复最新的状态降级（state-degraded）章节；当前最新章是第 5 章。");
    expect(localizeKnownRuntimeMessage("Bad request")).toBe("Bad request");
  });

  it("localizes common LLM configuration errors", () => {
    const studioMessage = localizeKnownRuntimeMessage(
      "Studio LLM API key not set. Open Studio services and save an API key for the selected service.",
    );
    expect(studioMessage).toContain("Studio 模型 API Key 未设置");
    expect(studioMessage).not.toMatch(/kkaiapi/i);

    const cliMessage = localizeKnownRuntimeMessage(
      "JIAOS_LLM_API_KEY not set. Run 'jiaos config set-global' or add it to project .env file.",
    );
    expect(cliMessage).toContain("JIAOS_LLM_API_KEY 未设置");
    expect(cliMessage).not.toMatch(/kkaiapi/i);
  });
});
