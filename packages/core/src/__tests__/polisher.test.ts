import { afterEach, describe, expect, it, vi } from "vitest";
import { PolisherAgent } from "../agents/polisher.js";

const ZERO_USAGE = {
  promptTokens: 0,
  completionTokens: 0,
  totalTokens: 0,
} as const;

function makeAgent(): PolisherAgent {
  return new PolisherAgent({
    client: {
      provider: "openai",
      apiFormat: "chat",
      stream: false,
      defaults: {
        temperature: 0.7,
        maxTokens: 4096,
        thinkingBudget: 0, maxTokensCap: null,
        extra: {},
      },
    },
    model: "test-model",
    projectRoot: "/tmp/irrelevant",
  });
}

describe("PolisherAgent", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("encodes file-layer scope boundary and six prose 雷点 in the zh system prompt", async () => {
    const agent = makeAgent();
    const chatSpy = vi.spyOn(PolisherAgent.prototype as never, "chat" as never).mockResolvedValue({
      content: "润色后的正文。",
      usage: ZERO_USAGE,
    });

    await agent.polishChapter({
      chapterContent: "原始正文。",
      chapterNumber: 7,
      language: "zh",
    });

    const messages = chatSpy.mock.calls[0]?.[0] as
      | ReadonlyArray<{ content: string }>
      | undefined;
    const systemPrompt = messages?.[0]?.content ?? "";

    // Hard scope boundary.
    expect(systemPrompt).toContain("润色边界");
    expect(systemPrompt).toContain("禁止增删情节");
    expect(systemPrompt).toContain("结构的事归 Reviewer");
    // File-layer 雷点 subset.
    expect(systemPrompt).toContain("描写无效");
    expect(systemPrompt).toContain("文笔华丽过度");
    expect(systemPrompt).toContain("排版不规范");
    // Hard text-layer rules.
    expect(systemPrompt).toContain("3-5 行/段");
    expect(systemPrompt).toContain("五感代入");
    expect(systemPrompt).toContain("对话自然度");
  });

  it("routes plot/structure findings to [polisher-note] lines instead of rewriting", async () => {
    const agent = makeAgent();
    const chatSpy = vi.spyOn(PolisherAgent.prototype as never, "chat" as never).mockResolvedValue({
      content: "润色后的正文。",
      usage: ZERO_USAGE,
    });

    await agent.polishChapter({
      chapterContent: "原始正文。",
      chapterNumber: 7,
      language: "zh",
    });

    const messages = chatSpy.mock.calls[0]?.[0] as
      | ReadonlyArray<{ content: string }>
      | undefined;
    const systemPrompt = messages?.[0]?.content ?? "";

    expect(systemPrompt).toContain("[polisher-note]");
  });

  it("injects the chapter memo so polish stays anchored to the memo goal", async () => {
    const agent = makeAgent();
    const chatSpy = vi.spyOn(PolisherAgent.prototype as never, "chat" as never).mockResolvedValue({
      content: "润色后的正文。",
      usage: ZERO_USAGE,
    });

    await agent.polishChapter({
      chapterContent: "原始正文。",
      chapterNumber: 7,
      language: "zh",
      chapterMemo: {
        chapter: 7,
        goal: "陆焚拿回残刃",
        isGoldenOpening: false,
        body: "## 当前任务\n陆焚拿回残刃。",
        threadRefs: [],
      },
    });

    const messages = chatSpy.mock.calls[0]?.[0] as
      | ReadonlyArray<{ content: string }>
      | undefined;
    const userPrompt = messages?.[1]?.content ?? "";

    expect(userPrompt).toContain("## 章节备忘（润色不得偏离此目标）");
    expect(userPrompt).toContain("goal：陆焚拿回残刃");
  });

  it("returns polished content and flags 'changed' when output differs", async () => {
    const agent = makeAgent();
    vi.spyOn(PolisherAgent.prototype as never, "chat" as never).mockResolvedValue({
      content: "润色后的正文。",
      usage: ZERO_USAGE,
    });

    const out = await agent.polishChapter({
      chapterContent: "原始正文。",
      chapterNumber: 1,
      language: "zh",
    });

    expect(out.polishedContent).toBe("润色后的正文。");
    expect(out.changed).toBe(true);
  });

  it("preserves the original chapter when the model returns empty content", async () => {
    const agent = makeAgent();
    vi.spyOn(PolisherAgent.prototype as never, "chat" as never).mockResolvedValue({
      content: "",
      usage: ZERO_USAGE,
    });

    const out = await agent.polishChapter({
      chapterContent: "原始正文。",
      chapterNumber: 1,
      language: "zh",
    });

    expect(out.polishedContent).toBe("原始正文。");
    expect(out.changed).toBe(false);
  });

  it("strips a surrounding fenced-code-block wrapper if the model adds one", async () => {
    const agent = makeAgent();
    vi.spyOn(PolisherAgent.prototype as never, "chat" as never).mockResolvedValue({
      content: "```markdown\n润色后的正文。\n```",
      usage: ZERO_USAGE,
    });

    const out = await agent.polishChapter({
      chapterContent: "原始正文。",
      chapterNumber: 1,
      language: "zh",
    });

    expect(out.polishedContent).toBe("润色后的正文。");
    expect(out.changed).toBe(true);
  });

  it("builds the English system prompt when language is en", async () => {
    const agent = makeAgent();
    const chatSpy = vi.spyOn(PolisherAgent.prototype as never, "chat" as never).mockResolvedValue({
      content: "Polished chapter body.",
      usage: ZERO_USAGE,
    });

    await agent.polishChapter({
      chapterContent: "Original chapter body.",
      chapterNumber: 3,
      language: "en",
    });

    const messages = chatSpy.mock.calls[0]?.[0] as
      | ReadonlyArray<{ content: string }>
      | undefined;
    const systemPrompt = messages?.[0]?.content ?? "";

    expect(systemPrompt).toContain("Polisher Scope");
    expect(systemPrompt).toContain("FORBIDDEN from adding or removing plot beats");
    expect(systemPrompt).toContain("Ineffective description");
    expect(systemPrompt).toContain("Dialogue naturalness");
  });
});
