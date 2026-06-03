import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  createLogger,
  createStderrSink,
  createJsonLineSink,
  nullSink,
  type LogEntry,
} from "../utils/logger.js";
import { createStreamMonitor } from "../llm/provider.js";

describe("createStderrSink", () => {
  const originalWrite = process.stderr.write;
  const captured: string[] = [];

  beforeEach(() => {
    captured.length = 0;
    process.stderr.write = ((chunk: unknown) => {
      captured.push(String(chunk));
      return true;
    }) as typeof process.stderr.write;
  });

  afterEach(() => {
    process.stderr.write = originalWrite;
  });

  it("filters entries below minLevel", () => {
    const sink = createStderrSink({ minLevel: "warn", enableColors: false });
    const logger = createLogger({ tag: "test", sinks: [sink] });

    logger.info("should be filtered");
    expect(captured).toHaveLength(0);

    logger.warn("should pass");
    expect(captured).toHaveLength(1);
    expect(captured[0]).toContain("should pass");
  });

  it("includes ANSI escape codes when enableColors=true", () => {
    const sink = createStderrSink({ minLevel: "info", enableColors: true });
    const logger = createLogger({ tag: "color-test", sinks: [sink] });

    logger.info("colored message");
    expect(captured[0]).toContain("\x1b[36m"); // cyan for info
    expect(captured[0]).toContain("\x1b[0m");  // reset
  });

  it("omits ANSI escape codes when enableColors=false", () => {
    const sink = createStderrSink({ minLevel: "info", enableColors: false });
    const logger = createLogger({ tag: "no-color", sinks: [sink] });

    logger.info("plain message");
    expect(captured[0]).not.toContain("\x1b[");
    expect(captured[0]).toContain("plain message");
    expect(captured[0]).toContain("[no-color]");
  });
});

describe("createJsonLineSink", () => {
  it("outputs parseable JSON, one entry per line", () => {
    const chunks: string[] = [];
    const writable = {
      write(data: string) {
        chunks.push(data);
        return true;
      },
    } as unknown as NodeJS.WritableStream;

    const sink = createJsonLineSink(writable);
    const logger = createLogger({ tag: "json-test", sinks: [sink] });

    logger.info("first message");
    logger.warn("second message", { key: "value" });

    expect(chunks).toHaveLength(2);

    const entry1 = JSON.parse(chunks[0]!) as LogEntry;
    expect(entry1.level).toBe("info");
    expect(entry1.tag).toBe("json-test");
    expect(entry1.message).toBe("first message");
    expect(entry1.timestamp).toBeTruthy();

    const entry2 = JSON.parse(chunks[1]!) as LogEntry;
    expect(entry2.level).toBe("warn");
    expect(entry2.ctx).toEqual({ key: "value" });
  });
});

describe("nullSink", () => {
  it("does not throw", () => {
    const logger = createLogger({ tag: "null-test", sinks: [nullSink] });
    expect(() => {
      logger.debug("ignored");
      logger.info("ignored");
      logger.warn("ignored");
      logger.error("ignored");
    }).not.toThrow();
  });
});

describe("Logger.child()", () => {
  it("replaces tag and merges context", () => {
    const entries: LogEntry[] = [];
    const sink = {
      write(entry: LogEntry) {
        entries.push(entry);
      },
    };

    const parent = createLogger({
      tag: "parent",
      sinks: [sink],
      baseCtx: { parentKey: "pv" },
    });

    const child = parent.child("child", { childKey: "cv" });
    child.info("from child");

    expect(entries).toHaveLength(1);
    expect(entries[0]!.tag).toBe("child");
    expect(entries[0]!.ctx).toEqual({ parentKey: "pv", childKey: "cv" });
  });
});

describe("createStreamMonitor", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("calls onProgress at interval with correct counts", () => {
    const calls: Array<{ totalChars: number; chineseChars: number; status: string }> = [];
    const monitor = createStreamMonitor((progress) => {
      calls.push({
        totalChars: progress.totalChars,
        chineseChars: progress.chineseChars,
        status: progress.status,
      });
    }, 1000);

    monitor.onChunk("hello");
    monitor.onChunk("世界你好");

    // Advance past one interval
    vi.advanceTimersByTime(1000);
    expect(calls).toHaveLength(1);
    expect(calls[0]!.totalChars).toBe(9); // 5 + 4
    expect(calls[0]!.chineseChars).toBe(4);
    expect(calls[0]!.status).toBe("streaming");

    // More chunks
    monitor.onChunk("abc");
    vi.advanceTimersByTime(1000);
    expect(calls).toHaveLength(2);
    expect(calls[1]!.totalChars).toBe(12);

    monitor.stop();
    // stop() emits a final "done" event
    expect(calls).toHaveLength(3);
    expect(calls[2]!.status).toBe("done");
    expect(calls[2]!.totalChars).toBe(12);
  });

  it("works without onProgress (undefined)", () => {
    const monitor = createStreamMonitor(undefined);
    expect(() => {
      monitor.onChunk("test data");
      monitor.onChunk("更多数据");
      monitor.stop();
    }).not.toThrow();
  });
});
