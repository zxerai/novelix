import { describe, expect, it, beforeEach, afterEach } from "vitest";
import { mkdtemp, rm } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { appendTranscriptEvent } from "../interaction/session-transcript.js";
import {
  adaptRestoredAgentMessagesForModel,
  deriveBookSessionFromTranscript,
  restoreAgentMessagesFromTranscript,
  TOOL_RESULT_BRIDGE_TEXT,
} from "../interaction/session-transcript-restore.js";
import type { MessageEvent } from "../interaction/session-transcript-schema.js";

const usage = {
  input: 0,
  output: 0,
  cacheRead: 0,
  cacheWrite: 0,
  totalTokens: 0,
  cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0, total: 0 },
};

describe("session transcript restore", () => {
  let projectRoot: string;

  beforeEach(async () => {
    projectRoot = await mkdtemp(join(tmpdir(), "jiaos-restore-"));
  });

  afterEach(async () => {
    await rm(projectRoot, { recursive: true, force: true });
  });

  it("只恢复已 committed request 内的 message", async () => {
    await appendTranscriptEvent(projectRoot, {
      type: "request_started",
      version: 1,
      sessionId: "s1",
      requestId: "r1",
      seq: 1,
      timestamp: 1,
      input: "hi",
    });
    await appendTranscriptEvent(projectRoot, {
      type: "message",
      version: 1,
      sessionId: "s1",
      requestId: "r1",
      uuid: "u1",
      parentUuid: null,
      seq: 2,
      role: "user",
      timestamp: 2,
      message: { role: "user", content: "hi", timestamp: 2 },
    } as MessageEvent);
    await appendTranscriptEvent(projectRoot, {
      type: "request_committed",
      version: 1,
      sessionId: "s1",
      requestId: "r1",
      seq: 3,
      timestamp: 3,
    });
    await appendTranscriptEvent(projectRoot, {
      type: "request_started",
      version: 1,
      sessionId: "s1",
      requestId: "r2",
      seq: 4,
      timestamp: 4,
      input: "lost",
    });
    await appendTranscriptEvent(projectRoot, {
      type: "message",
      version: 1,
      sessionId: "s1",
      requestId: "r2",
      uuid: "u2",
      parentUuid: "u1",
      seq: 5,
      role: "user",
      timestamp: 5,
      message: { role: "user", content: "lost", timestamp: 5 },
    } as MessageEvent);

    const restored = await restoreAgentMessagesFromTranscript(projectRoot, "s1");

    expect(restored).toHaveLength(1);
    expect(restored[0]).toMatchObject({ role: "user", content: "hi" });
  });

  it("保留 committed toolResult 和 assistant thinking signature", async () => {
    await appendTranscriptEvent(projectRoot, {
      type: "request_started",
      version: 1,
      sessionId: "s1",
      requestId: "r1",
      seq: 1,
      timestamp: 1,
      input: "tool",
    });
    await appendTranscriptEvent(projectRoot, {
      type: "message",
      version: 1,
      sessionId: "s1",
      requestId: "r1",
      uuid: "a1",
      parentUuid: null,
      seq: 2,
      role: "assistant",
      timestamp: 2,
      toolCallId: "tool-1",
      message: {
        role: "assistant",
        content: [
          { type: "thinking", thinking: "需要查资料", signature: "sig" },
          { type: "toolCall", id: "tool-1", name: "read", arguments: { path: "a.md" } },
        ],
        api: "anthropic-messages",
        provider: "anthropic",
        model: "claude",
        usage,
        stopReason: "tool_use",
        timestamp: 2,
      },
    } as MessageEvent);
    await appendTranscriptEvent(projectRoot, {
      type: "message",
      version: 1,
      sessionId: "s1",
      requestId: "r1",
      uuid: "t1",
      parentUuid: "a1",
      seq: 3,
      role: "toolResult",
      timestamp: 3,
      toolCallId: "tool-1",
      sourceToolAssistantUuid: "a1",
      message: {
        role: "toolResult",
        toolCallId: "tool-1",
        toolName: "read",
        content: [{ type: "text", text: "资料" }],
        details: { path: "a.md" },
        isError: false,
        timestamp: 3,
      },
    } as MessageEvent);
    await appendTranscriptEvent(projectRoot, {
      type: "request_committed",
      version: 1,
      sessionId: "s1",
      requestId: "r1",
      seq: 4,
      timestamp: 4,
    });

    const restored = await restoreAgentMessagesFromTranscript(projectRoot, "s1");

    expect(restored).toHaveLength(2);
    expect(restored[0]).toMatchObject({
      role: "assistant",
      content: [
        { type: "thinking", thinking: "需要查资料", signature: "sig" },
        { type: "toolCall", id: "tool-1" },
      ],
    });
    expect(restored[1]).toMatchObject({ role: "toolResult", toolCallId: "tool-1", toolName: "read" });
    expect(JSON.stringify(restored)).not.toContain(TOOL_RESULT_BRIDGE_TEXT);
  });

  it("恢复中断工具轮次时只清理空 assistant，不在 raw restore 阶段补 bridge", async () => {
    await appendTranscriptEvent(projectRoot, {
      type: "request_started",
      version: 1,
      sessionId: "s1",
      requestId: "r1",
      seq: 1,
      timestamp: 1,
      input: "tool",
    });
    await appendTranscriptEvent(projectRoot, {
      type: "message",
      version: 1,
      sessionId: "s1",
      requestId: "r1",
      uuid: "u1",
      parentUuid: null,
      seq: 2,
      role: "user",
      timestamp: 2,
      message: { role: "user", content: "tool", timestamp: 2 },
    } as MessageEvent);
    await appendTranscriptEvent(projectRoot, {
      type: "message",
      version: 1,
      sessionId: "s1",
      requestId: "r1",
      uuid: "a1",
      parentUuid: "u1",
      seq: 3,
      role: "assistant",
      timestamp: 3,
      toolCallId: "tool-1",
      message: {
        role: "assistant",
        content: [{ type: "toolCall", id: "tool-1", name: "read", arguments: { path: "a.md" } }],
        api: "openai-completions",
        provider: "google",
        model: "gemini-pro-latest",
        usage,
        stopReason: "toolUse",
        timestamp: 3,
      },
    } as MessageEvent);
    await appendTranscriptEvent(projectRoot, {
      type: "message",
      version: 1,
      sessionId: "s1",
      requestId: "r1",
      uuid: "t1",
      parentUuid: "a1",
      seq: 4,
      role: "toolResult",
      timestamp: 4,
      toolCallId: "tool-1",
      sourceToolAssistantUuid: "a1",
      message: {
        role: "toolResult",
        toolCallId: "tool-1",
        toolName: "read",
        content: [{ type: "text", text: "资料" }],
        isError: false,
        timestamp: 4,
      },
    } as MessageEvent);
    await appendTranscriptEvent(projectRoot, {
      type: "message",
      version: 1,
      sessionId: "s1",
      requestId: "r1",
      uuid: "a2",
      parentUuid: "t1",
      seq: 5,
      role: "assistant",
      timestamp: 5,
      message: {
        role: "assistant",
        content: [],
        api: "openai-completions",
        provider: "google",
        model: "gemini-pro-latest",
        usage,
        stopReason: "error",
        errorMessage: "400 status code",
        timestamp: 5,
      },
    } as MessageEvent);
    await appendTranscriptEvent(projectRoot, {
      type: "request_committed",
      version: 1,
      sessionId: "s1",
      requestId: "r1",
      seq: 6,
      timestamp: 6,
    });
    await appendTranscriptEvent(projectRoot, {
      type: "request_started",
      version: 1,
      sessionId: "s1",
      requestId: "r2",
      seq: 7,
      timestamp: 7,
      input: "继续",
    });
    await appendTranscriptEvent(projectRoot, {
      type: "message",
      version: 1,
      sessionId: "s1",
      requestId: "r2",
      uuid: "u2",
      parentUuid: "a2",
      seq: 8,
      role: "user",
      timestamp: 8,
      message: { role: "user", content: "继续", timestamp: 8 },
    } as MessageEvent);
    await appendTranscriptEvent(projectRoot, {
      type: "request_committed",
      version: 1,
      sessionId: "s1",
      requestId: "r2",
      seq: 9,
      timestamp: 9,
    });

    const restored = await restoreAgentMessagesFromTranscript(projectRoot, "s1");

    expect(restored.map((message) => message.role)).toEqual([
      "user",
      "assistant",
      "toolResult",
      "user",
    ]);
    expect(JSON.stringify(restored)).not.toContain(TOOL_RESULT_BRIDGE_TEXT);
  });

  it("移除最后 assistant message 的 trailing thinking block", async () => {
    await appendTranscriptEvent(projectRoot, {
      type: "request_started",
      version: 1,
      sessionId: "s1",
      requestId: "r1",
      seq: 1,
      timestamp: 1,
      input: "hi",
    });
    await appendTranscriptEvent(projectRoot, {
      type: "message",
      version: 1,
      sessionId: "s1",
      requestId: "r1",
      uuid: "a1",
      parentUuid: null,
      seq: 2,
      role: "assistant",
      timestamp: 2,
      message: {
        role: "assistant",
        content: [
          { type: "text", text: "回答" },
          { type: "thinking", thinking: "尾部", signature: "sig" },
        ],
        api: "anthropic-messages",
        provider: "anthropic",
        model: "claude",
        usage,
        stopReason: "stop",
        timestamp: 2,
      },
    } as MessageEvent);
    await appendTranscriptEvent(projectRoot, {
      type: "request_committed",
      version: 1,
      sessionId: "s1",
      requestId: "r1",
      seq: 3,
      timestamp: 3,
    });

    const restored = await restoreAgentMessagesFromTranscript(projectRoot, "s1");

    expect((restored[0] as any).content).toEqual([{ type: "text", text: "回答" }]);
  });

  it("跨模型恢复时移除 provider-specific thinking，但保留正文", () => {
    const messages = [
      {
        role: "assistant",
        content: [
          { type: "thinking", thinking: "DeepSeek reasoning", thinkingSignature: "reasoning_content" },
          { type: "text", text: "可见回答" },
        ],
        api: "openai-completions",
        provider: "openai",
        model: "deepseek-v4-pro",
        usage,
        stopReason: "stop",
        timestamp: 1,
      },
    ] as any;

    const adapted = adaptRestoredAgentMessagesForModel(messages, {
      api: "openai-completions",
      provider: "openai",
      id: "gemini-pro-latest",
    });

    expect((adapted[0] as any).content).toEqual([{ type: "text", text: "可见回答" }]);
  });

  it("同模型恢复时保留 thinking continuity", () => {
    const messages = [
      {
        role: "assistant",
        content: [
          { type: "thinking", thinking: "DeepSeek reasoning", thinkingSignature: "reasoning_content" },
          { type: "text", text: "可见回答" },
        ],
        api: "openai-completions",
        provider: "openai",
        model: "deepseek-v4-pro",
        usage,
        stopReason: "stop",
        timestamp: 1,
      },
    ] as any;

    const adapted = adaptRestoredAgentMessagesForModel(messages, {
      api: "openai-completions",
      provider: "openai",
      id: "deepseek-v4-pro",
    });

    expect((adapted[0] as any).content).toEqual(messages[0].content);
  });

  it("同模型恢复时保留 reasoning_content 和原生 toolResult 连续性", () => {
    const messages = [
      {
        role: "assistant",
        content: [
          { type: "thinking", thinking: "Need a file", thinkingSignature: "reasoning_content" },
          { type: "toolCall", id: "tool-1", name: "read", arguments: { path: "story.md" } },
        ],
        api: "openai-completions",
        provider: "openai",
        model: "deepseek-v4-pro",
        usage,
        stopReason: "toolUse",
        timestamp: 1,
      },
      {
        role: "toolResult",
        toolCallId: "tool-1",
        toolName: "read",
        content: [{ type: "text", text: "资料" }],
        isError: false,
        timestamp: 2,
      },
    ] as any;

    const adapted = adaptRestoredAgentMessagesForModel(messages, {
      api: "openai-completions",
      provider: "openai",
      id: "deepseek-v4-pro",
    });

    expect(adapted).toEqual(messages);
  });

  it("does not add synthetic toolResult bridge when target model does not require it", () => {
    const messages = [
      {
        role: "assistant",
        content: [{ type: "toolCall", id: "tool-1", name: "read", arguments: {} }],
        api: "anthropic-messages",
        provider: "anthropic",
        model: "claude",
        usage,
        stopReason: "toolUse",
        timestamp: 1,
      },
      {
        role: "toolResult",
        toolCallId: "tool-1",
        toolName: "read",
        content: [{ type: "text", text: "result" }],
        isError: false,
        timestamp: 2,
      },
    ] as any[];

    const adapted = adaptRestoredAgentMessagesForModel(messages, {
      api: "anthropic-messages",
      provider: "anthropic",
      id: "claude",
    });

    expect(JSON.stringify(adapted)).not.toContain(TOOL_RESULT_BRIDGE_TEXT);
  });

  it("adds synthetic toolResult bridge when target model compat requires it", () => {
    const messages = [
      {
        role: "assistant",
        content: [{ type: "toolCall", id: "tool-1", name: "read", arguments: {} }],
        api: "openai-completions",
        provider: "openai",
        model: "deepseek-v4-pro",
        usage,
        stopReason: "toolUse",
        timestamp: 1,
      },
      {
        role: "toolResult",
        toolCallId: "tool-1",
        toolName: "read",
        content: [{ type: "text", text: "result" }],
        isError: false,
        timestamp: 2,
      },
    ] as any[];

    const adapted = adaptRestoredAgentMessagesForModel(messages, {
      api: "openai-completions",
      provider: "openai",
      id: "deepseek-v4-pro",
      compat: { requiresAssistantAfterToolResult: true },
    });

    expect(JSON.stringify(adapted)).toContain(TOOL_RESULT_BRIDGE_TEXT);
  });

  it("跨模型恢复时把原生工具回合降级为 user 文本", () => {
    const messages = [
      {
        role: "assistant",
        content: [
          { type: "toolCall", id: "tool-1", name: "read", arguments: { path: "story.md" } },
        ],
        api: "openai-completions",
        provider: "openai",
        model: "gemini-pro-latest",
        usage,
        stopReason: "toolUse",
        timestamp: 1,
      },
      {
        role: "toolResult",
        toolCallId: "tool-1",
        toolName: "read",
        content: [{ type: "text", text: "资料" }],
        isError: false,
        timestamp: 2,
      },
      {
        role: "assistant",
        content: [{ type: "text", text: "I have processed the tool results." }],
        api: "openai-completions",
        provider: "jiaos",
        model: "synthetic-tool-result-bridge",
        usage,
        stopReason: "stop",
        timestamp: 3,
      },
    ] as any;

    const adapted = adaptRestoredAgentMessagesForModel(messages, {
      api: "openai-completions",
      provider: "openai",
      id: "deepseek-v4-pro",
    });

    expect(JSON.stringify(adapted)).not.toContain("\"toolCall\"");
    expect(adapted.some((message: any) => message.role === "toolResult")).toBe(false);
    expect(adapted).toEqual([
      expect.objectContaining({
        role: "user",
        content: expect.stringContaining("[Tool results]"),
      }),
    ]);
    expect(JSON.stringify(adapted)).toContain("read");
    expect(JSON.stringify(adapted)).toContain("tool-1");
    expect(JSON.stringify(adapted)).toContain("资料");
    expect(JSON.stringify(adapted)).not.toContain("I have processed the tool results.");
  });

  it("native Google 同协议恢复时保留 thinking signature 和原生工具回合", () => {
    const messages = [
      {
        role: "assistant",
        content: [
          { type: "thinking", thinking: "plan", thinkingSignature: "google-signature" },
          { type: "toolCall", id: "tool-1", name: "ls", arguments: { subdir: "story/roles" } },
        ],
        api: "google-generative-ai",
        provider: "google",
        model: "gemini-pro-latest",
        usage,
        stopReason: "toolUse",
        timestamp: 1,
      },
      {
        role: "toolResult",
        toolCallId: "tool-1",
        toolName: "ls",
        content: [{ type: "text", text: "主要角色/\n次要角色/" }],
        isError: false,
        timestamp: 2,
      },
    ] as any;

    const adapted = adaptRestoredAgentMessagesForModel(messages, {
      api: "google-generative-ai",
      provider: "google",
      id: "gemini-pro-latest",
    });

    expect(adapted).toEqual(messages);
    expect(JSON.stringify(adapted)).toContain("google-signature");
  });

  it("切到 native Google 时把旧 OpenAI-compatible Gemini 工具回合文本化", () => {
    const messages = [
      {
        role: "assistant",
        content: [{ type: "toolCall", id: "tool-1", name: "ls", arguments: { subdir: "story/roles" } }],
        api: "openai-completions",
        provider: "openai",
        model: "gemini-pro-latest",
        usage,
        stopReason: "toolUse",
        timestamp: 1,
      },
      {
        role: "toolResult",
        toolCallId: "tool-1",
        toolName: "ls",
        content: [{ type: "text", text: "主要角色/" }],
        isError: false,
        timestamp: 2,
      },
    ] as any;

    const adapted = adaptRestoredAgentMessagesForModel(messages, {
      api: "google-generative-ai",
      provider: "google",
      id: "gemini-pro-latest",
    });

    const body = JSON.stringify(adapted);
    expect(body).not.toContain("\"toolCall\"");
    expect(adapted.some((message: any) => message.role === "toolResult")).toBe(false);
    expect(adapted).toEqual([
      expect.objectContaining({
        role: "user",
        content: expect.stringContaining("[Tool results]"),
      }),
    ]);
    expect(body).toContain("ls");
    expect(body).toContain("主要角色");
  });

  it("切到 native Google 时丢弃 DeepSeek reasoning_content 并文本化工具结果", () => {
    const messages = [
      {
        role: "assistant",
        content: [
          { type: "thinking", thinking: "deepseek reasoning", thinkingSignature: "reasoning_content" },
          { type: "text", text: "先看角色。" },
          { type: "toolCall", id: "tool-1", name: "read", arguments: { path: "story/roles/林默.md" } },
        ],
        api: "openai-completions",
        provider: "openai",
        model: "deepseek-v4-pro",
        usage,
        stopReason: "toolUse",
        timestamp: 1,
      },
      {
        role: "toolResult",
        toolCallId: "tool-1",
        toolName: "read",
        content: [{ type: "text", text: "林默资料" }],
        isError: false,
        timestamp: 2,
      },
    ] as any;

    const adapted = adaptRestoredAgentMessagesForModel(messages, {
      api: "google-generative-ai",
      provider: "google",
      id: "gemini-pro-latest",
    });

    const body = JSON.stringify(adapted);
    expect(body).not.toContain("reasoning_content");
    expect(body).not.toContain("deepseek reasoning");
    expect(body).not.toContain("\"toolCall\"");
    expect(body).toContain("先看角色。");
    expect(body).toContain("[Tool results]");
    expect(body).toContain("林默资料");
  });

  it("派生 BookSession 时跳过没有正文的 assistant tool-use message", async () => {
    await appendTranscriptEvent(projectRoot, {
      type: "session_created",
      version: 1,
      sessionId: "s1",
      seq: 1,
      timestamp: 1,
      bookId: null,
      title: null,
      createdAt: 1,
      updatedAt: 1,
    });
    await appendTranscriptEvent(projectRoot, {
      type: "request_started",
      version: 1,
      sessionId: "s1",
      requestId: "r1",
      seq: 2,
      timestamp: 2,
      input: "你好",
    });
    await appendTranscriptEvent(projectRoot, {
      type: "message",
      version: 1,
      sessionId: "s1",
      requestId: "r1",
      uuid: "u1",
      parentUuid: null,
      seq: 3,
      role: "user",
      timestamp: 3,
      message: { role: "user", content: "你好", timestamp: 3 },
    } as MessageEvent);
    await appendTranscriptEvent(projectRoot, {
      type: "message",
      version: 1,
      sessionId: "s1",
      requestId: "r1",
      uuid: "a1",
      parentUuid: "u1",
      seq: 4,
      role: "assistant",
      timestamp: 4,
      message: {
        role: "assistant",
        content: [
          { type: "thinking", thinking: "内部推理" },
          { type: "toolCall", id: "read-1", name: "read", arguments: { path: "books/a.md" } },
        ],
        api: "openai-completions",
        provider: "google",
        model: "gemini-pro-latest",
        usage,
        stopReason: "toolUse",
        timestamp: 4,
      },
    } as MessageEvent);
    await appendTranscriptEvent(projectRoot, {
      type: "request_committed",
      version: 1,
      sessionId: "s1",
      requestId: "r1",
      seq: 5,
      timestamp: 5,
    });

    const session = await deriveBookSessionFromTranscript(projectRoot, "s1");

    expect(session?.messages).toEqual([{ role: "user", content: "你好", timestamp: 3 }]);
  });

  it("从 transcript 派生 BookSession UI 视图", async () => {
    await appendTranscriptEvent(projectRoot, {
      type: "session_created",
      version: 1,
      sessionId: "s1",
      seq: 1,
      timestamp: 1,
      bookId: "book-a",
      title: null,
      createdAt: 1,
      updatedAt: 1,
    });
    await appendTranscriptEvent(projectRoot, {
      type: "request_started",
      version: 1,
      sessionId: "s1",
      requestId: "r1",
      seq: 2,
      timestamp: 2,
      input: "第一条问题",
    });
    await appendTranscriptEvent(projectRoot, {
      type: "message",
      version: 1,
      sessionId: "s1",
      requestId: "r1",
      uuid: "u1",
      parentUuid: null,
      seq: 3,
      role: "user",
      timestamp: 3,
      message: { role: "user", content: "第一条问题", timestamp: 3 },
    } as MessageEvent);
    await appendTranscriptEvent(projectRoot, {
      type: "message",
      version: 1,
      sessionId: "s1",
      requestId: "r1",
      uuid: "a1",
      parentUuid: "u1",
      seq: 4,
      role: "assistant",
      timestamp: 4,
      message: {
        role: "assistant",
        content: [
          { type: "thinking", thinking: "思考" },
          { type: "text", text: "回答" },
        ],
        api: "anthropic-messages",
        provider: "anthropic",
        model: "claude",
        usage,
        stopReason: "stop",
        timestamp: 4,
      },
    } as MessageEvent);
    await appendTranscriptEvent(projectRoot, {
      type: "request_committed",
      version: 1,
      sessionId: "s1",
      requestId: "r1",
      seq: 5,
      timestamp: 5,
    });

    const session = await deriveBookSessionFromTranscript(projectRoot, "s1");

    expect(session).toMatchObject({
      sessionId: "s1",
      bookId: "book-a",
      title: "第一条问题",
      messages: [
        { role: "user", content: "第一条问题" },
        { role: "assistant", content: "回答", thinking: "思考" },
      ],
    });
  });

  it("从 transcript 派生 BookSession UI 工具执行记录", async () => {
    await appendTranscriptEvent(projectRoot, {
      type: "session_created",
      version: 1,
      sessionId: "s1",
      seq: 1,
      timestamp: 1,
      bookId: "book-a",
      title: null,
      createdAt: 1,
      updatedAt: 1,
    });
    await appendTranscriptEvent(projectRoot, {
      type: "request_started",
      version: 1,
      sessionId: "s1",
      requestId: "r1",
      seq: 2,
      timestamp: 2,
      input: "查看角色目录",
    });
    await appendTranscriptEvent(projectRoot, {
      type: "message",
      version: 1,
      sessionId: "s1",
      requestId: "r1",
      uuid: "u1",
      parentUuid: null,
      seq: 3,
      role: "user",
      timestamp: 3,
      message: { role: "user", content: "查看角色目录", timestamp: 3 },
    } as MessageEvent);
    await appendTranscriptEvent(projectRoot, {
      type: "message",
      version: 1,
      sessionId: "s1",
      requestId: "r1",
      uuid: "a1",
      parentUuid: "u1",
      seq: 4,
      role: "assistant",
      timestamp: 4,
      toolCallId: "ls-1",
      message: {
        role: "assistant",
        content: [
          { type: "thinking", thinking: "先列目录" },
          { type: "toolCall", id: "ls-1", name: "ls", arguments: { bookId: "book-a", subdir: "story/roles" } },
        ],
        api: "google-generative-ai",
        provider: "google",
        model: "gemini-pro-latest",
        usage,
        stopReason: "toolUse",
        timestamp: 4,
      },
    } as MessageEvent);
    await appendTranscriptEvent(projectRoot, {
      type: "message",
      version: 1,
      sessionId: "s1",
      requestId: "r1",
      uuid: "t1",
      parentUuid: "a1",
      seq: 5,
      role: "toolResult",
      timestamp: 5,
      toolCallId: "ls-1",
      sourceToolAssistantUuid: "a1",
      message: {
        role: "toolResult",
        toolCallId: "ls-1",
        toolName: "ls",
        content: [{ type: "text", text: "主要角色/\n次要角色/" }],
        details: { path: "books/book-a/story/roles" },
        isError: false,
        timestamp: 5,
      },
    } as MessageEvent);
    await appendTranscriptEvent(projectRoot, {
      type: "message",
      version: 1,
      sessionId: "s1",
      requestId: "r1",
      uuid: "a2",
      parentUuid: "t1",
      seq: 6,
      role: "assistant",
      timestamp: 6,
      message: {
        role: "assistant",
        content: [{ type: "text", text: "角色目录已查看。" }],
        api: "google-generative-ai",
        provider: "google",
        model: "gemini-pro-latest",
        usage,
        stopReason: "stop",
        timestamp: 6,
      },
    } as MessageEvent);
    await appendTranscriptEvent(projectRoot, {
      type: "request_committed",
      version: 1,
      sessionId: "s1",
      requestId: "r1",
      seq: 7,
      timestamp: 7,
    });

    const session = await deriveBookSessionFromTranscript(projectRoot, "s1");

    expect(session?.messages).toMatchObject([
      { role: "user", content: "查看角色目录" },
      {
        role: "assistant",
        content: "角色目录已查看。",
        thinking: "先列目录",
        toolExecutions: [{
          id: "ls-1",
          tool: "ls",
          label: "列目录",
          status: "completed",
          args: { bookId: "book-a", subdir: "story/roles" },
          result: "主要角色/\n次要角色/",
          details: { path: "books/book-a/story/roles" },
          startedAt: 4,
          completedAt: 5,
        }],
      },
    ]);
  });

  it("keeps UI message order by transcript seq instead of message timestamp", async () => {
    await appendTranscriptEvent(projectRoot, {
      type: "session_created",
      version: 1,
      sessionId: "s1",
      seq: 1,
      timestamp: 1,
      bookId: "book-a",
      title: null,
      createdAt: 1,
      updatedAt: 1,
    });
    await appendTranscriptEvent(projectRoot, {
      type: "request_started",
      version: 1,
      sessionId: "s1",
      requestId: "r1",
      seq: 2,
      timestamp: 2,
      input: "先问",
    });
    await appendTranscriptEvent(projectRoot, {
      type: "message",
      version: 1,
      sessionId: "s1",
      requestId: "r1",
      uuid: "u1",
      parentUuid: null,
      seq: 3,
      role: "user",
      timestamp: 100,
      message: { role: "user", content: "先问", timestamp: 100 },
    } as MessageEvent);
    await appendTranscriptEvent(projectRoot, {
      type: "message",
      version: 1,
      sessionId: "s1",
      requestId: "r1",
      uuid: "a1",
      parentUuid: "u1",
      seq: 4,
      role: "assistant",
      timestamp: 50,
      message: {
        role: "assistant",
        content: [{ type: "text", text: "后答" }],
        api: "anthropic-messages",
        provider: "anthropic",
        model: "claude",
        usage,
        stopReason: "stop",
        timestamp: 50,
      },
    } as MessageEvent);
    await appendTranscriptEvent(projectRoot, {
      type: "request_committed",
      version: 1,
      sessionId: "s1",
      requestId: "r1",
      seq: 5,
      timestamp: 5,
    });

    const session = await deriveBookSessionFromTranscript(projectRoot, "s1");

    expect(session?.messages.map((message) => message.content)).toEqual(["先问", "后答"]);
  });

  it("does not carry pending tool executions or thinking across request boundaries", async () => {
    await appendTranscriptEvent(projectRoot, {
      type: "session_created",
      version: 1,
      sessionId: "s1",
      seq: 1,
      timestamp: 1,
      bookId: "book-a",
      title: null,
      createdAt: 1,
      updatedAt: 1,
    });
    await appendTranscriptEvent(projectRoot, {
      type: "request_started",
      version: 1,
      sessionId: "s1",
      requestId: "r1",
      seq: 2,
      timestamp: 2,
      input: "列目录",
    });
    await appendTranscriptEvent(projectRoot, {
      type: "message",
      version: 1,
      sessionId: "s1",
      requestId: "r1",
      uuid: "u1",
      parentUuid: null,
      seq: 3,
      role: "user",
      timestamp: 3,
      message: { role: "user", content: "列目录", timestamp: 3 },
    } as MessageEvent);
    await appendTranscriptEvent(projectRoot, {
      type: "message",
      version: 1,
      sessionId: "s1",
      requestId: "r1",
      uuid: "a1",
      parentUuid: "u1",
      seq: 4,
      role: "assistant",
      timestamp: 4,
      toolCallId: "ls-1",
      message: {
        role: "assistant",
        content: [
          { type: "thinking", thinking: "第一轮工具前思考" },
          { type: "toolCall", id: "ls-1", name: "ls", arguments: { subdir: "story" } },
        ],
        api: "anthropic-messages",
        provider: "anthropic",
        model: "claude",
        usage,
        stopReason: "toolUse",
        timestamp: 4,
      },
    } as MessageEvent);
    await appendTranscriptEvent(projectRoot, {
      type: "message",
      version: 1,
      sessionId: "s1",
      requestId: "r1",
      uuid: "t1",
      parentUuid: "a1",
      seq: 5,
      role: "toolResult",
      timestamp: 5,
      toolCallId: "ls-1",
      sourceToolAssistantUuid: "a1",
      message: {
        role: "toolResult",
        toolCallId: "ls-1",
        toolName: "ls",
        content: [{ type: "text", text: "roles/" }],
        isError: false,
        timestamp: 5,
      },
    } as MessageEvent);
    await appendTranscriptEvent(projectRoot, {
      type: "request_committed",
      version: 1,
      sessionId: "s1",
      requestId: "r1",
      seq: 6,
      timestamp: 6,
    });
    await appendTranscriptEvent(projectRoot, {
      type: "request_started",
      version: 1,
      sessionId: "s1",
      requestId: "r2",
      seq: 7,
      timestamp: 7,
      input: "继续",
    });
    await appendTranscriptEvent(projectRoot, {
      type: "message",
      version: 1,
      sessionId: "s1",
      requestId: "r2",
      uuid: "u2",
      parentUuid: null,
      seq: 8,
      role: "user",
      timestamp: 8,
      message: { role: "user", content: "继续", timestamp: 8 },
    } as MessageEvent);
    await appendTranscriptEvent(projectRoot, {
      type: "message",
      version: 1,
      sessionId: "s1",
      requestId: "r2",
      uuid: "a2",
      parentUuid: "u2",
      seq: 9,
      role: "assistant",
      timestamp: 9,
      message: {
        role: "assistant",
        content: [{ type: "text", text: "第二轮回答" }],
        api: "anthropic-messages",
        provider: "anthropic",
        model: "claude",
        usage,
        stopReason: "stop",
        timestamp: 9,
      },
    } as MessageEvent);
    await appendTranscriptEvent(projectRoot, {
      type: "request_committed",
      version: 1,
      sessionId: "s1",
      requestId: "r2",
      seq: 10,
      timestamp: 10,
    });

    const session = await deriveBookSessionFromTranscript(projectRoot, "s1");
    const secondAssistant = session?.messages.find((message) => message.content === "第二轮回答");

    expect(secondAssistant).toMatchObject({ role: "assistant", content: "第二轮回答" });
    expect(secondAssistant).not.toHaveProperty("thinking");
    expect(secondAssistant).not.toHaveProperty("toolExecutions");
  });

  it("does not resolve tool results with tool calls from a previous request", async () => {
    await appendTranscriptEvent(projectRoot, {
      type: "session_created",
      version: 1,
      sessionId: "s1",
      seq: 1,
      timestamp: 1,
      bookId: "book-a",
      title: null,
      createdAt: 1,
      updatedAt: 1,
    });
    await appendTranscriptEvent(projectRoot, {
      type: "request_started",
      version: 1,
      sessionId: "s1",
      requestId: "r1",
      seq: 2,
      timestamp: 2,
      input: "第一轮",
    });
    await appendTranscriptEvent(projectRoot, {
      type: "message",
      version: 1,
      sessionId: "s1",
      requestId: "r1",
      uuid: "a1",
      parentUuid: null,
      seq: 3,
      role: "assistant",
      timestamp: 3,
      toolCallId: "shared-tool",
      message: {
        role: "assistant",
        content: [
          { type: "toolCall", id: "shared-tool", name: "ls", arguments: { subdir: "story/roles" } },
        ],
        api: "anthropic-messages",
        provider: "anthropic",
        model: "claude",
        usage,
        stopReason: "toolUse",
        timestamp: 3,
      },
    } as MessageEvent);
    await appendTranscriptEvent(projectRoot, {
      type: "request_committed",
      version: 1,
      sessionId: "s1",
      requestId: "r1",
      seq: 4,
      timestamp: 4,
    });
    await appendTranscriptEvent(projectRoot, {
      type: "request_started",
      version: 1,
      sessionId: "s1",
      requestId: "r2",
      seq: 5,
      timestamp: 5,
      input: "第二轮",
    });
    await appendTranscriptEvent(projectRoot, {
      type: "message",
      version: 1,
      sessionId: "s1",
      requestId: "r2",
      uuid: "u2",
      parentUuid: null,
      seq: 6,
      role: "user",
      timestamp: 6,
      message: { role: "user", content: "第二轮", timestamp: 6 },
    } as MessageEvent);
    await appendTranscriptEvent(projectRoot, {
      type: "message",
      version: 1,
      sessionId: "s1",
      requestId: "r2",
      uuid: "t2",
      parentUuid: "u2",
      seq: 7,
      role: "toolResult",
      timestamp: 7,
      toolCallId: "shared-tool",
      message: {
        role: "toolResult",
        toolCallId: "shared-tool",
        toolName: "ls",
        content: [{ type: "text", text: "chapters/" }],
        isError: false,
        timestamp: 7,
      },
    } as MessageEvent);
    await appendTranscriptEvent(projectRoot, {
      type: "message",
      version: 1,
      sessionId: "s1",
      requestId: "r2",
      uuid: "a2",
      parentUuid: "t2",
      seq: 8,
      role: "assistant",
      timestamp: 8,
      message: {
        role: "assistant",
        content: [{ type: "text", text: "第二轮回答" }],
        api: "anthropic-messages",
        provider: "anthropic",
        model: "claude",
        usage,
        stopReason: "stop",
        timestamp: 8,
      },
    } as MessageEvent);
    await appendTranscriptEvent(projectRoot, {
      type: "request_committed",
      version: 1,
      sessionId: "s1",
      requestId: "r2",
      seq: 9,
      timestamp: 9,
    });

    const session = await deriveBookSessionFromTranscript(projectRoot, "s1");
    const secondAssistant = session?.messages.find((message) => message.content === "第二轮回答");

    expect(secondAssistant?.toolExecutions).toEqual([
      expect.objectContaining({
        id: "shared-tool",
        tool: "ls",
        result: "chapters/",
        startedAt: 7,
        completedAt: 7,
      }),
    ]);
    expect(secondAssistant?.toolExecutions?.[0]).not.toHaveProperty("args");
  });
});
