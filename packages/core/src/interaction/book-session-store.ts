import { readdir, unlink } from "node:fs/promises";
import { createBookSession } from "./session.js";
import type { BookSession } from "./session.js";
import {
  appendTranscriptEvents,
  legacyBookSessionPath,
  readTranscriptEvents,
  sessionsDir,
  transcriptPath,
} from "./session-transcript.js";
import {
  migrateLegacyBookSessionToTranscript,
  readLegacyBookSession,
} from "./session-transcript-legacy.js";
import { deriveBookSessionFromTranscript } from "./session-transcript-restore.js";

/**
 * 从 messages 数组里取第一条 user 消息，裁剪成 ≤20 字的单行字符串。
 * 用于把用户首条提问作为会话标题。
 */
export function extractFirstUserMessageTitle(messages: unknown): string | null {
  if (!Array.isArray(messages)) return null;
  for (const message of messages) {
    if (!message || typeof message !== "object") continue;
    if ((message as { role?: unknown }).role !== "user") continue;
    const content = (message as { content?: unknown }).content;
    if (typeof content !== "string") return null;
    const oneLine = content.trim().replace(/\s+/g, " ");
    if (oneLine.length === 0) return null;
    return oneLine.length > 20 ? `${oneLine.slice(0, 20)}…` : oneLine;
  }
  return null;
}

export class SessionAlreadyMigratedError extends Error {
  constructor(sessionId: string, currentBookId: string) {
    super(`Session "${sessionId}" is already bound to book "${currentBookId}"`);
    this.name = "SessionAlreadyMigratedError";
  }
}

export async function loadBookSession(
  projectRoot: string,
  sessionId: string,
): Promise<BookSession | null> {
  const transcriptSession = await deriveBookSessionFromTranscript(projectRoot, sessionId);
  if (transcriptSession) return transcriptSession;

  const legacySession = await readLegacyBookSession(projectRoot, sessionId);
  if (!legacySession) return null;

  await migrateLegacyBookSessionToTranscript(projectRoot, legacySession);
  return await deriveBookSessionFromTranscript(projectRoot, sessionId) ?? legacySession;
}

async function appendSessionCreatedEvent(
  projectRoot: string,
  session: BookSession,
): Promise<void> {
  await appendTranscriptEvents(projectRoot, session.sessionId, ({ events, nextSeq }) => {
    if (events.some((event) => event.type === "session_created")) return [];
    return [{
      type: "session_created",
      version: 1,
      sessionId: session.sessionId,
      seq: nextSeq,
      timestamp: session.createdAt,
      bookId: session.bookId,
      title: session.title,
      createdAt: session.createdAt,
      updatedAt: session.updatedAt,
    }];
  });
}

async function appendSessionMetadataUpdatedEvent(
  projectRoot: string,
  sessionId: string,
  metadata: {
    readonly bookId?: string | null;
    readonly title?: string | null;
    readonly updatedAt: number;
  },
): Promise<void> {
  await appendTranscriptEvents(projectRoot, sessionId, ({ nextSeq }) => [{
    type: "session_metadata_updated",
    version: 1,
    sessionId,
    seq: nextSeq,
    timestamp: metadata.updatedAt,
    updatedAt: metadata.updatedAt,
    ...("bookId" in metadata ? { bookId: metadata.bookId } : {}),
    ...("title" in metadata ? { title: metadata.title } : {}),
  }]);
}

export async function persistBookSession(
  projectRoot: string,
  session: BookSession,
): Promise<void> {
  const events = await readTranscriptEvents(projectRoot, session.sessionId);
  if (events.length === 0) {
    if (session.messages.length === 0) {
      await appendSessionCreatedEvent(projectRoot, session);
      return;
    }
    await migrateLegacyBookSessionToTranscript(projectRoot, session);
    return;
  }

  await appendSessionMetadataUpdatedEvent(projectRoot, session.sessionId, {
    bookId: session.bookId,
    title: session.title,
    updatedAt: session.updatedAt,
  });
}

export interface BookSessionSummary {
  readonly sessionId: string;
  readonly bookId: string | null;
  readonly title: string | null;
  readonly messageCount: number;
  readonly createdAt: number;
  readonly updatedAt: number;
}

export async function listBookSessions(
  projectRoot: string,
  bookId: string | null,
): Promise<ReadonlyArray<BookSessionSummary>> {
  const dir = sessionsDir(projectRoot);
  let files: string[];
  try {
    files = await readdir(dir);
  } catch {
    return [];
  }

  const sessionIds = new Set<string>();
  for (const file of files) {
    if (file.endsWith(".jsonl")) {
      sessionIds.add(file.slice(0, -".jsonl".length));
    } else if (file.endsWith(".json")) {
      sessionIds.add(file.slice(0, -".json".length));
    }
  }

  const summaries = await Promise.all(
    [...sessionIds].map(async (sessionId): Promise<BookSessionSummary | null> => {
      try {
        const session = await loadBookSession(projectRoot, sessionId);
        if (!session || session.bookId !== bookId) return null;

        return {
          sessionId: session.sessionId,
          bookId: session.bookId,
          title: session.title,
          messageCount: session.messages.length,
          createdAt: session.createdAt,
          updatedAt: session.updatedAt,
        };
      } catch {
        return null;
      }
    }),
  );

  return summaries
    .filter((summary): summary is BookSessionSummary => summary !== null)
    .sort((a, b) => b.updatedAt - a.updatedAt);
}

export async function renameBookSession(
  projectRoot: string,
  sessionId: string,
  title: string,
): Promise<BookSession | null> {
  const session = await loadBookSession(projectRoot, sessionId);
  if (!session) return null;
  const updatedAt = Date.now();
  await appendSessionMetadataUpdatedEvent(projectRoot, sessionId, { title, updatedAt });
  return loadBookSession(projectRoot, sessionId);
}

export async function deleteBookSession(
  projectRoot: string,
  sessionId: string,
): Promise<void> {
  await Promise.all([
    unlink(transcriptPath(projectRoot, sessionId)).catch(() => undefined),
    unlink(legacyBookSessionPath(projectRoot, sessionId)).catch(() => undefined),
  ]);
}

export async function migrateBookSession(
  projectRoot: string,
  sessionId: string,
  newBookId: string,
): Promise<BookSession | null> {
  const session = await loadBookSession(projectRoot, sessionId);
  if (!session) return null;
  if (session.bookId !== null) {
    throw new SessionAlreadyMigratedError(sessionId, session.bookId);
  }

  await appendSessionMetadataUpdatedEvent(projectRoot, sessionId, {
    bookId: newBookId,
    updatedAt: Date.now(),
  });
  return loadBookSession(projectRoot, sessionId);
}

export async function createAndPersistBookSession(
  projectRoot: string,
  bookId: string | null,
  sessionId?: string,
): Promise<BookSession> {
  // 如果指定了 sessionId 且对应文件已存在，视为幂等操作直接返回（支持"用户发消息时才持久化 draft"流程）
  if (sessionId) {
    const existing = await loadBookSession(projectRoot, sessionId);
    if (existing) return existing;
  }
  const session = createBookSession(bookId, sessionId);
  await appendSessionCreatedEvent(projectRoot, session);
  return session;
}
