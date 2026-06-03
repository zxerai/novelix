import { describe, expect, it, beforeEach, afterEach } from "vitest";
import { mkdtemp, rm, readFile, mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import {
  appendManualSessionMessages,
  appendTranscriptEvents,
  appendTranscriptEvent,
  nextTranscriptSeq,
  readTranscriptEvents,
  transcriptPath,
} from "../interaction/session-transcript.js";
import { restoreAgentMessagesFromTranscript } from "../interaction/session-transcript-restore.js";
import type {
  MessageEvent,
  RequestCommittedEvent,
  RequestStartedEvent,
} from "../interaction/session-transcript-schema.js";

describe("session transcript codec", () => {
  let projectRoot: string;

  beforeEach(async () => {
    projectRoot = await mkdtemp(join(tmpdir(), "jiaos-transcript-"));
  });

  afterEach(async () => {
    await rm(projectRoot, { recursive: true, force: true });
  });

  it("一行写入一个 JSON event 并保留 raw AgentMessage 字段", async () => {
    const started: RequestStartedEvent = {
      type: "request_started",
      version: 1,
      sessionId: "s1",
      requestId: "r1",
      seq: 1,
      timestamp: 100,
      input: "继续写",
    };
    const message: MessageEvent = {
      type: "message",
      version: 1,
      sessionId: "s1",
      requestId: "r1",
      uuid: "m1",
      parentUuid: null,
      seq: 2,
      role: "assistant",
      timestamp: 101,
      message: {
        role: "assistant",
        content: [
          { type: "thinking", thinking: "推理", signature: "sig-1" },
          { type: "text", text: "正文" },
        ],
        provider: "anthropic",
        api: "anthropic-messages",
        model: "claude",
        usage: {
          input: 1,
          output: 2,
          cacheRead: 0,
          cacheWrite: 0,
          totalTokens: 3,
          cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0, total: 0 },
        },
        stopReason: "stop",
        timestamp: 101,
      },
    };

    await appendTranscriptEvent(projectRoot, started);
    await appendTranscriptEvent(projectRoot, message);

    const raw = await readFile(transcriptPath(projectRoot, "s1"), "utf-8");
    expect(raw.trim().split("\n")).toHaveLength(2);

    const events = await readTranscriptEvents(projectRoot, "s1");
    expect(events).toHaveLength(2);
    expect((events[1] as MessageEvent).message).toMatchObject({
      role: "assistant",
      content: [
        { type: "thinking", thinking: "推理", signature: "sig-1" },
        { type: "text", text: "正文" },
      ],
    });
  });

  it("跳过坏行并保留合法 event", async () => {
    const dir = join(projectRoot, ".jiaos", "sessions");
    await mkdir(dir, { recursive: true });
    await writeFile(
      join(dir, "s1.jsonl"),
      [
        JSON.stringify({
          type: "request_started",
          version: 1,
          sessionId: "s1",
          requestId: "r1",
          seq: 1,
          timestamp: 1,
          input: "hi",
        }),
        "{bad json",
        JSON.stringify({
          type: "request_committed",
          version: 1,
          sessionId: "s1",
          requestId: "r1",
          seq: 2,
          timestamp: 2,
        }),
      ].join("\n"),
    );

    const events = await readTranscriptEvents(projectRoot, "s1");
    expect(events.map((event) => event.type)).toEqual(["request_started", "request_committed"]);
  });

  it("按已有 transcript 分配单调递增 seq", async () => {
    const committed: RequestCommittedEvent = {
      type: "request_committed",
      version: 1,
      sessionId: "s1",
      requestId: "r1",
      seq: 7,
      timestamp: 100,
    };

    await appendTranscriptEvent(projectRoot, committed);

    await expect(nextTranscriptSeq(projectRoot, "s1")).resolves.toBe(8);
  });

  it("atomically assigns unique seq for concurrent generated events", async () => {
    await Promise.all(
      Array.from({ length: 10 }, (_, index) =>
        appendTranscriptEvents(projectRoot, "s-concurrent", ({ nextSeq }) => [{
          type: "request_started",
          version: 1,
          sessionId: "s-concurrent",
          requestId: `r-${index}`,
          seq: nextSeq,
          timestamp: 100 + index,
          input: `input-${index}`,
        }]),
      ),
    );

    const events = await readTranscriptEvents(projectRoot, "s-concurrent");
    expect(events).toHaveLength(10);
    expect(events.map((event) => event.seq)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
  });

  it("appendManualSessionMessages 写入 committed request 并保留 raw assistant message", async () => {
    await appendManualSessionMessages(projectRoot, "s1", [{
      role: "assistant",
      content: [{ type: "text", text: "fallback" }],
      api: "anthropic-messages",
      provider: "anthropic",
      model: "fake",
      usage: {
        input: 0,
        output: 0,
        cacheRead: 0,
        cacheWrite: 0,
        totalTokens: 0,
        cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0, total: 0 },
      },
      stopReason: "stop",
      timestamp: 10,
    }], "fallback-input");

    const events = await readTranscriptEvents(projectRoot, "s1");
    expect(events.map((event) => event.type)).toEqual([
      "request_started",
      "message",
      "request_committed",
    ]);
    expect(events[0]).toMatchObject({ type: "request_started", input: "fallback-input" });

    const restored = await restoreAgentMessagesFromTranscript(projectRoot, "s1");
    expect(restored).toMatchObject([
      { role: "assistant", content: [{ type: "text", text: "fallback" }] },
    ]);
  });

  it("从 core index 导出 transcript helper", async () => {
    const core = await import("../index.js");
    expect(typeof core.readTranscriptEvents).toBe("function");
    expect(typeof core.restoreAgentMessagesFromTranscript).toBe("function");
    expect(typeof core.TranscriptEventSchema.safeParse).toBe("function");
  });
});
