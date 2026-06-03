import { afterEach, describe, expect, it, vi } from "vitest";
import { StateValidatorAgent } from "../agents/state-validator.js";

const ZERO_USAGE = {
  promptTokens: 0,
  completionTokens: 0,
  totalTokens: 0,
} as const;

describe("StateValidatorAgent", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("accepts a valid JSON object even when the model appends markdown with extra braces", async () => {
    const agent = new StateValidatorAgent({
      client: {
        provider: "openai",
        apiFormat: "chat",
        stream: false,
        defaults: {
          temperature: 0.7,
          maxTokens: 4096,
          thinkingBudget: 0,
          extra: {},
        },
      },
      model: "test-model",
      projectRoot: process.cwd(),
    });

    vi.spyOn(agent as unknown as { chat: (...args: unknown[]) => Promise<unknown> }, "chat")
      .mockResolvedValue({
        content: [
          "{\"warnings\":[],\"passed\":true}",
          "",
          "## Notes",
          "Trailing markdown can still mention braces like } without changing the verdict.",
        ].join("\n"),
        usage: ZERO_USAGE,
      });

    await expect(agent.validate(
      "Chapter body.",
      3,
      "old state",
      "new state",
      "old hooks",
      "new hooks",
      "en",
    )).resolves.toEqual({
      warnings: [],
      passed: true,
    });
  });

  it("passes maxTokens large enough for thinking models to chat()", async () => {
    const agent = new StateValidatorAgent({
      client: {
        provider: "openai",
        apiFormat: "chat",
        stream: false,
        defaults: {
          temperature: 0.7,
          maxTokens: 8192,
          thinkingBudget: 0,
          extra: {},
        },
      },
      model: "test-model",
      projectRoot: process.cwd(),
    });

    const chatSpy = vi.spyOn(
      agent as unknown as { chat: (...args: unknown[]) => Promise<unknown> },
      "chat",
    ).mockResolvedValue({ content: "PASS", usage: ZERO_USAGE });

    await agent.validate("Body.", 1, "old", "new state", "old hooks", "new hooks", "zh");

    const options = chatSpy.mock.calls[0]?.[1] as { maxTokens?: number } | undefined;
    // Must not hardcode a small value like 2048 that starves thinking models
    expect(options?.maxTokens).toBeUndefined();
  });

  it("passes authority truth context into the cross-file validation prompt", async () => {
    const agent = new StateValidatorAgent({
      client: {
        provider: "openai",
        apiFormat: "chat",
        stream: false,
        defaults: {
          temperature: 0.7,
          maxTokens: 8192,
          thinkingBudget: 0,
          extra: {},
        },
      },
      model: "test-model",
      projectRoot: process.cwd(),
    });

    const chatSpy = vi.spyOn(
      agent as unknown as { chat: (...args: unknown[]) => Promise<unknown> },
      "chat",
    ).mockResolvedValue({ content: "PASS", usage: ZERO_USAGE });

    await agent.validate(
      "正文确认：第五条规则才是天黑后不准出宿舍。",
      2,
      "old state",
      "new state: 第一条规则已被批注",
      "old hooks",
      "new hooks",
      "zh",
      {
        storyFrame: "简介里写过：规则一：天黑后不准出宿舍。",
        bookRules: "硬规则：规则编号必须以前文正文确立版本为准。",
        chapterSummaries: "第1章：发现第五条规则的漏洞。",
      },
    );

    const messages = chatSpy.mock.calls[0]?.[0] as Array<{ role: string; content: string }>;
    expect(messages[0]?.content).toContain("truth files");
    expect(messages[0]?.content).toContain("numbered");
    expect(messages[1]?.content).toContain("## Authority / Cross-Truth Context");
    expect(messages[1]?.content).toContain("规则一：天黑后不准出宿舍");
    expect(messages[1]?.content).toContain("第1章：发现第五条规则的漏洞");
  });

  it("throws when the validator model returns an empty response", async () => {
    const agent = new StateValidatorAgent({
      client: {
        provider: "openai",
        apiFormat: "chat",
        stream: false,
        defaults: {
          temperature: 0.7,
          maxTokens: 4096,
          thinkingBudget: 0,
          extra: {},
        },
      },
      model: "test-model",
      projectRoot: process.cwd(),
    });

    vi.spyOn(agent as unknown as { chat: (...args: unknown[]) => Promise<unknown> }, "chat")
      .mockResolvedValue({
        content: "",
        usage: ZERO_USAGE,
      });

    // Empty response throws (fail-closed)
    await expect(agent.validate(
      "Chapter body.",
      3,
      "old state",
      "new state",
      "old hooks",
      "new hooks",
      "en",
    )).rejects.toThrow("empty response");
  });
});
