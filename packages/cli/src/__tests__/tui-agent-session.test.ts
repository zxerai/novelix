import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { mkdtemp, rm } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { createProjectSession, loadProjectSession } from "../tui/session-store.js";

const {
  runAgentSessionMock,
  loadConfigMock,
  buildPipelineConfigMock,
} = vi.hoisted(() => ({
  runAgentSessionMock: vi.fn(),
  loadConfigMock: vi.fn(),
  buildPipelineConfigMock: vi.fn(),
}));

vi.mock("@actalk/jiaos-core", async () => {
  const actual = await vi.importActual<typeof import("@actalk/jiaos-core")>("@actalk/jiaos-core");
  class PipelineRunnerMock {
    constructor(_config: unknown) {}
    async initBook(_book: unknown, _options?: unknown) {}
    async writeNextChapter(_bookId: string) {
      return {
        chapterNumber: 1,
        title: "雨夜",
        wordCount: 1200,
        status: "ready-for-review",
      };
    }
  }
  return {
    ...actual,
    createLLMClient: vi.fn(() => ({
      _piModel: {
        id: "gpt-5.4",
        name: "gpt-5.4",
        api: "openai-completions",
        provider: "openai",
        baseUrl: "https://right.codes/codex/v1",
        reasoning: false,
        input: ["text"],
        cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
        contextWindow: 128000,
        maxTokens: 8192,
      },
      _apiKey: "secret",
    })),
    PipelineRunner: PipelineRunnerMock as any,
    runAgentSession: runAgentSessionMock,
  };
});

vi.mock("../utils.js", () => ({
  loadConfig: loadConfigMock,
  buildPipelineConfig: buildPipelineConfigMock,
}));

describe("tui agent session bridge", () => {
  let projectRoot: string;

  beforeEach(async () => {
    projectRoot = await mkdtemp(join(tmpdir(), "jiaos-tui-agent-"));
    vi.clearAllMocks();
    loadConfigMock.mockResolvedValue({
      llm: {
        provider: "openai",
        model: "gpt-5.4",
        baseUrl: "https://right.codes/codex/v1",
        apiFormat: "chat",
        stream: false,
      },
      language: "zh",
    });
    buildPipelineConfigMock.mockReturnValue({});
  });

  afterEach(async () => {
    await rm(projectRoot, { recursive: true, force: true });
  });

  it("runs agent chat and persists raw assistant output into the tui session", async () => {
    runAgentSessionMock.mockResolvedValue({
      responseText: "这是 agent 直接返回的回复。",
      messages: [
        { role: "user", content: "帮我整理这一章" },
        { role: "assistant", content: "这是 agent 直接返回的回复。", thinking: "internal" },
      ],
    });

    const { processTuiAgentInput } = await import("../tui/agent-input.js");
    const session = {
      ...createProjectSession(projectRoot),
      activeBookId: "harbor",
      messages: [
        { role: "user" as const, content: "旧问题", timestamp: 1 },
        { role: "assistant" as const, content: "旧回答", timestamp: 2 },
      ],
    };

    const result = await processTuiAgentInput({
      projectRoot,
      input: "帮我整理这一章",
      session,
      activeBookId: "harbor",
    });

    expect(runAgentSessionMock).toHaveBeenCalledWith(
      expect.objectContaining({
        sessionId: session.sessionId,
        bookId: "harbor",
        projectRoot,
      }),
      "帮我整理这一章",
      [
        { role: "user", content: "旧问题" },
        { role: "assistant", content: "旧回答" },
      ],
    );
    expect(result.responseText).toBe("这是 agent 直接返回的回复。");
    expect(result.session.messages.at(-1)).toEqual(expect.objectContaining({
      role: "assistant",
      content: "这是 agent 直接返回的回复。",
      thinking: "internal",
    }));

    const persisted = await loadProjectSession(projectRoot);
    expect(persisted.messages.at(-1)).toEqual(expect.objectContaining({
      role: "assistant",
      content: "这是 agent 直接返回的回复。",
    }));
  });

  it("stores the created book from architect tool results as the active TUI book", async () => {
    runAgentSessionMock.mockResolvedValue({
      responseText: "《夜港》已创建成功。",
      messages: [
        {
          role: "toolResult",
          details: { kind: "book_created", bookId: "night-harbor", title: "夜港" },
        },
        { role: "assistant", content: "《夜港》已创建成功。" },
      ],
    });

    const { processTuiAgentInput } = await import("../tui/agent-input.js");
    const session = createProjectSession(projectRoot);

    const result = await processTuiAgentInput({
      projectRoot,
      input: "创建《夜港》",
      session,
    });

    expect(result.session.activeBookId).toBe("night-harbor");
    const persisted = await loadProjectSession(projectRoot);
    expect(persisted.activeBookId).toBe("night-harbor");
  });

  it("routes explicit create-book instructions directly to shared book creation", async () => {
    const initBookSpy = vi.spyOn(
      (await import("@actalk/jiaos-core")).PipelineRunner.prototype as any,
      "initBook",
    );
    const { processTuiAgentInput } = await import("../tui/agent-input.js");
    const session = createProjectSession(projectRoot);

    const result = await processTuiAgentInput({
      projectRoot,
      input: "创建一本10章中文都市悬疑短篇，标题《雾灯小巷》，目标平台番茄，每章约1200字。信息足够，请直接建书。",
      session,
    });

    expect(runAgentSessionMock).not.toHaveBeenCalled();
    expect(initBookSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        id: "雾灯小巷",
        title: "雾灯小巷",
        genre: "urban",
        platform: "tomato",
        targetChapters: 10,
        chapterWordCount: 1200,
      }),
      expect.objectContaining({
        externalContext: expect.stringContaining("雾灯小巷"),
      }),
    );
    expect(result.session.activeBookId).toBe("雾灯小巷");
    expect(result.responseText).toContain("已创建");
    const persisted = await loadProjectSession(projectRoot);
    expect(persisted.activeBookId).toBe("雾灯小巷");
  });

  it("routes write-next instructions directly to the writer when a book is active", async () => {
    const { processTuiAgentInput } = await import("../tui/agent-input.js");
    const session = {
      ...createProjectSession(projectRoot),
      activeBookId: "night-harbor",
    };

    const result = await processTuiAgentInput({
      projectRoot,
      input: "写第1章",
      session,
    });

    expect(runAgentSessionMock).not.toHaveBeenCalled();
    expect(result.responseText).toContain("第 1 章");
    expect(result.responseText).toContain("雨夜");
    const persisted = await loadProjectSession(projectRoot);
    expect(persisted.activeBookId).toBe("night-harbor");
    expect(persisted.activeChapterNumber).toBe(1);
  });
});
