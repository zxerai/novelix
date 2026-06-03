// === Types ===

export type LogLevel = "debug" | "info" | "warn" | "error";

export interface LogEntry {
  readonly level: LogLevel;
  readonly tag: string;
  readonly message: string;
  readonly timestamp: string;
  readonly ctx?: Record<string, unknown>;
}

export interface LogSink {
  readonly write: (entry: LogEntry) => void;
}

export interface Logger {
  readonly debug: (msg: string, ctx?: Record<string, unknown>) => void;
  readonly info: (msg: string, ctx?: Record<string, unknown>) => void;
  readonly warn: (msg: string, ctx?: Record<string, unknown>) => void;
  readonly error: (msg: string, ctx?: Record<string, unknown>) => void;
  readonly child: (tag: string, extraCtx?: Record<string, unknown>) => Logger;
}

// === Level Ordering ===

const LEVEL_ORDER: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

// === ANSI Colors ===

const COLORS: Record<LogLevel, string> = {
  debug: "\x1b[90m", // gray
  info: "\x1b[36m",  // cyan
  warn: "\x1b[33m",  // yellow
  error: "\x1b[31m", // red
};
const RESET = "\x1b[0m";

// === Built-in Sinks ===

export function createStderrSink(options: {
  readonly minLevel?: LogLevel;
  readonly enableColors?: boolean;
}): LogSink {
  const minLevel = options.minLevel ?? "info";
  const enableColors = options.enableColors ?? (process.stderr.isTTY ?? false);
  const minOrder = LEVEL_ORDER[minLevel];

  return {
    write(entry: LogEntry): void {
      if (LEVEL_ORDER[entry.level] < minOrder) return;

      const levelTag = entry.level.toUpperCase().padEnd(5);
      const prefix = `[${entry.tag}]`;

      if (enableColors) {
        const color = COLORS[entry.level];
        process.stderr.write(
          `${color}${levelTag}${RESET} ${prefix} ${entry.message}\n`,
        );
      } else {
        process.stderr.write(`${levelTag} ${prefix} ${entry.message}\n`);
      }
    },
  };
}

export function createJsonLineSink(writable: NodeJS.WritableStream): LogSink {
  return {
    write(entry: LogEntry): void {
      writable.write(JSON.stringify(entry) + "\n");
    },
  };
}

export const nullSink: LogSink = {
  write(): void {},
};

// === Factory ===

export function createLogger(options: {
  readonly tag: string;
  readonly sinks: ReadonlyArray<LogSink>;
  readonly minLevel?: LogLevel;
  readonly baseCtx?: Record<string, unknown>;
}): Logger {
  const { tag, sinks, baseCtx } = options;

  function emit(level: LogLevel, msg: string, ctx?: Record<string, unknown>): void {
    const entry: LogEntry = {
      level,
      tag,
      message: msg,
      timestamp: new Date().toISOString(),
      ...(ctx || baseCtx
        ? { ctx: { ...baseCtx, ...ctx } }
        : {}),
    };
    for (const sink of sinks) {
      sink.write(entry);
    }
  }

  return {
    debug: (msg, ctx) => emit("debug", msg, ctx),
    info: (msg, ctx) => emit("info", msg, ctx),
    warn: (msg, ctx) => emit("warn", msg, ctx),
    error: (msg, ctx) => emit("error", msg, ctx),
    child(childTag, extraCtx) {
      return createLogger({
        tag: childTag,
        sinks,
        baseCtx: { ...baseCtx, ...extraCtx },
      });
    },
  };
}
