import { randomUUID } from "node:crypto";
import { readFile } from "node:fs/promises";
import { BookSessionSchema, type BookSession } from "./session.js";
import {
  appendTranscriptEvents,
  legacyBookSessionPath,
} from "./session-transcript.js";
import type { MessageEvent } from "./session-transcript-schema.js";

const EMPTY_USAGE = {
  input: 0,
  output: 0,
  cacheRead: 0,
  cacheWrite: 0,
  totalTokens: 0,
  cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0, total: 0 },
};

export async function readLegacyBookSession(
  projectRoot: string,
  sessionId: string,
): Promise<BookSession | null> {
  try {
    const raw = await readFile(legacyBookSessionPath(projectRoot, sessionId), "utf-8");
    return BookSessionSchema.parse(JSON.parse(raw));
  } catch {
    return null;
  }
}

export async function migrateLegacyBookSessionToTranscript(
  projectRoot: string,
  session: BookSession,
): Promise<void> {
  await appendTranscriptEvents(projectRoot, session.sessionId, ({ events, nextSeq }) => {
    if (events.length > 0) return [];

    const sessionCreatedSeq = nextSeq;
    const requestStartedSeq = nextSeq + 1;
    let messageSeq = nextSeq + 2;
    const requestId = `legacy-${randomUUID()}`;
    const transcriptEvents: MessageEvent[] = [];
    let parentUuid: string | null = null;

    for (const legacyMessage of session.messages) {
      const uuid = randomUUID();
      const message = legacyMessage.role === "assistant"
        ? {
            role: "assistant",
            content: [{ type: "text", text: legacyMessage.content }],
            api: "anthropic-messages",
            provider: "legacy",
            model: "unknown",
            usage: EMPTY_USAGE,
            stopReason: "stop",
            timestamp: legacyMessage.timestamp,
          }
        : {
            role: legacyMessage.role,
            content: legacyMessage.content,
            timestamp: legacyMessage.timestamp,
          };
      transcriptEvents.push({
        type: "message",
        version: 1,
        sessionId: session.sessionId,
        requestId,
        uuid,
        parentUuid,
        seq: messageSeq++,
        role: legacyMessage.role === "assistant" ? "assistant" : legacyMessage.role,
        timestamp: legacyMessage.timestamp,
        ...(legacyMessage.role === "assistant" && legacyMessage.thinking
          ? { legacyDisplay: { thinking: legacyMessage.thinking } }
          : {}),
        message,
      });
      parentUuid = uuid;
    }

    return [
      {
        type: "session_created",
        version: 1,
        sessionId: session.sessionId,
        seq: sessionCreatedSeq,
        timestamp: session.createdAt,
        bookId: session.bookId,
        title: session.title,
        createdAt: session.createdAt,
        updatedAt: session.updatedAt,
      },
      {
        type: "request_started",
        version: 1,
        sessionId: session.sessionId,
        requestId,
        seq: requestStartedSeq,
        timestamp: session.createdAt,
        input: "",
      },
      ...transcriptEvents,
      {
        type: "request_committed",
        version: 1,
        sessionId: session.sessionId,
        requestId,
        seq: messageSeq,
        timestamp: session.updatedAt,
      },
    ];
  });
}
