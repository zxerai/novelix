import {
  appendInteractionMessage,
  clearPendingDecision,
  createLLMClient,
  runAgentSession,
  type InteractionSession,
} from "@actalk/jiaos-core";
import { persistProjectSession } from "./session-store.js";
import { buildPipelineConfig, loadConfig } from "../utils.js";

export async function processTuiAgentInput(params: {
  readonly projectRoot: string;
  readonly input: string;
  readonly session: InteractionSession;
  readonly activeBookId?: string;
  readonly onTextDelta?: (text: string) => void;
}) {
  const config = await loadConfig({ requireApiKey: false, projectRoot: params.projectRoot });
  const client = createLLMClient(config.llm);
  const pipeline = new (await import("@actalk/jiaos-core")).PipelineRunner(
    buildPipelineConfig(config, params.projectRoot, { quiet: true }),
  );
  const userTimestamp = Date.now();
  const resolvedBookId = params.activeBookId ?? params.session.activeBookId ?? null;
  const initialMessages = params.session.messages
    .filter((message) => message.role === "user" || message.role === "assistant")
    .map((message) => ({ role: message.role, content: message.content }));

  let nextSession = appendInteractionMessage(clearPendingDecision({
    ...params.session,
    ...(resolvedBookId ? { activeBookId: resolvedBookId } : {}),
    currentExecution: {
      status: "planning",
      ...(resolvedBookId ? { bookId: resolvedBookId } : {}),
      ...(params.session.activeChapterNumber ? { chapterNumber: params.session.activeChapterNumber } : {}),
      stageLabel: "agent",
    },
  }), {
    role: "user",
    content: params.input,
    timestamp: userTimestamp,
  });

  if (!resolvedBookId && isCreateBookInstruction(params.input)) {
    const book = parseBookCreationRequest(params.input);
    if (book) {
      await pipeline.initBook(book, {
        externalContext: params.input,
        authorIntent: params.input,
      });
      const responseText = `已创建《${book.title}》，接下来可以直接输入“写第1章”。`;
      nextSession = appendInteractionMessage({
        ...nextSession,
        activeBookId: book.id,
        currentExecution: {
          status: "completed",
          bookId: book.id,
          stageLabel: "architect",
        },
      }, {
        role: "assistant",
        content: responseText,
        timestamp: userTimestamp + 1,
      });
      await persistProjectSession(params.projectRoot, nextSession);
      return {
        responseText,
        session: nextSession,
      };
    }
  }

  if (resolvedBookId && isWriteNextInstruction(params.input)) {
    const writeResult = await pipeline.writeNextChapter(resolvedBookId);
    const chapterNumber = getResultNumber(writeResult, "chapterNumber");
    const title = getResultString(writeResult, "title");
    const wordCount = getResultNumber(writeResult, "wordCount");
    const status = getResultString(writeResult, "status");
    const responseText = [
      `已为 ${resolvedBookId} 完成`,
      chapterNumber ? `第 ${chapterNumber} 章` : "下一章",
      title ? `《${title}》` : "",
      wordCount ? `，字数 ${wordCount}` : "",
      status ? `，状态 ${status}` : "",
      "。",
    ].join("");
    nextSession = appendInteractionMessage({
      ...nextSession,
      activeBookId: resolvedBookId,
      currentExecution: {
        status: "completed",
        bookId: resolvedBookId,
        ...(chapterNumber ? { chapterNumber } : {}),
        stageLabel: "writer",
      },
      ...(chapterNumber ? { activeChapterNumber: chapterNumber } : {}),
    }, {
      role: "assistant",
      content: responseText,
      timestamp: userTimestamp + 1,
    });
    await persistProjectSession(params.projectRoot, nextSession);
    return {
      responseText,
      session: nextSession,
    };
  }

  const result = await runAgentSession(
    {
      sessionId: params.session.sessionId,
      bookId: resolvedBookId,
      language: config.language ?? "zh",
      pipeline,
      projectRoot: params.projectRoot,
      model: client._piModel
        ? client._piModel
        : { provider: config.llm.provider ?? "openai", modelId: config.llm.model },
      apiKey: client._apiKey,
      onEvent: (event: any) => {
        if (event.type === "message_update" && event.assistantMessageEvent?.type === "text_delta") {
          params.onTextDelta?.(event.assistantMessageEvent.delta);
        }
      },
    },
    params.input,
    initialMessages,
  );
  const createdBookId = extractCreatedBookId(result.messages);
  const activeBookId = createdBookId ?? resolvedBookId;

  if (result.responseText?.trim()) {
    const lastAssistant = result.messages.filter((message: any) => message.role === "assistant").pop() as { thinking?: string } | undefined;
    nextSession = appendInteractionMessage({
      ...nextSession,
      ...(activeBookId ? { activeBookId } : {}),
      currentExecution: {
        status: "completed",
        ...(activeBookId ? { bookId: activeBookId } : {}),
        ...(params.session.activeChapterNumber ? { chapterNumber: params.session.activeChapterNumber } : {}),
        stageLabel: "agent",
      },
    }, {
      role: "assistant",
      content: result.responseText,
      ...(lastAssistant?.thinking ? { thinking: lastAssistant.thinking } : {}),
      timestamp: userTimestamp + 1,
    });
  } else {
    nextSession = {
      ...nextSession,
      ...(activeBookId ? { activeBookId } : {}),
      currentExecution: {
        status: "completed",
        ...(activeBookId ? { bookId: activeBookId } : {}),
        ...(params.session.activeChapterNumber ? { chapterNumber: params.session.activeChapterNumber } : {}),
        stageLabel: "agent",
      },
    };
  }

  await persistProjectSession(params.projectRoot, nextSession);
  return {
    responseText: result.responseText,
    session: nextSession,
  };
}

function isWriteNextInstruction(instruction: string): boolean {
  const trimmed = instruction.trim();
  return /^(continue|继续|继续写|写下一章|write next|下一章|再来一章)$/i.test(trimmed)
    || /^写第\s*\d+\s*章$/i.test(trimmed)
    || /(继续写|写下一章|下一章|再来一章|write\s+next)/i.test(trimmed);
}

function isCreateBookInstruction(instruction: string): boolean {
  return /(建书|新建书|创建|开书|create\s+(?:a\s+)?book)/i.test(instruction)
    && /(?:标题|书名|title)\s*[《"“]/i.test(instruction);
}

function parseBookCreationRequest(instruction: string): {
  id: string;
  title: string;
  genre: string;
  platform: "tomato" | "feilu" | "qidian" | "other";
  language: "zh" | "en";
  status: "outlining";
  targetChapters: number;
  chapterWordCount: number;
  createdAt: string;
  updatedAt: string;
} | undefined {
  const title = extractTitle(instruction);
  if (!title) return undefined;
  const now = new Date().toISOString();
  return {
    id: deriveBookId(title),
    title,
    genre: inferGenre(instruction),
    platform: inferPlatform(instruction),
    language: /[\u4e00-\u9fff]/.test(instruction) ? "zh" : "en",
    status: "outlining",
    targetChapters: extractNumber(instruction, /(\d+)\s*章/) ?? 200,
    chapterWordCount: extractNumber(instruction, /(?:每章|章节|章)\D{0,8}(\d{3,5})\s*字/) ?? 3000,
    createdAt: now,
    updatedAt: now,
  };
}

function extractTitle(instruction: string): string | undefined {
  const match = instruction.match(/(?:标题|书名|title)\s*[《"“]([^》"”]+)[》"”]/i);
  const title = match?.[1]?.trim();
  return title && title.length > 0 ? title : undefined;
}

function extractNumber(instruction: string, pattern: RegExp): number | undefined {
  const value = Number.parseInt(instruction.match(pattern)?.[1] ?? "", 10);
  return Number.isFinite(value) && value > 0 ? value : undefined;
}

function inferPlatform(instruction: string): "tomato" | "feilu" | "qidian" | "other" {
  if (/番茄|tomato/i.test(instruction)) return "tomato";
  if (/飞卢|feilu/i.test(instruction)) return "feilu";
  if (/起点|qidian/i.test(instruction)) return "qidian";
  return "other";
}

function inferGenre(instruction: string): string {
  if (/都市/.test(instruction)) return "urban";
  if (/悬疑|推理|mystery/i.test(instruction)) return "mystery";
  if (/玄幻|xuanhuan/i.test(instruction)) return "xuanhuan";
  if (/科幻|sci[-\s]?fi/i.test(instruction)) return "sci-fi";
  if (/言情|甜宠|romance/i.test(instruction)) return "romance";
  return "other";
}

function deriveBookId(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9\u4e00-\u9fff]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 30) || `book-${Date.now().toString(36)}`;
}

function extractCreatedBookId(messages: ReadonlyArray<unknown>): string | undefined {
  for (const message of messages) {
    const details = (message as { details?: { kind?: string; bookId?: string } }).details;
    if (details?.kind === "book_created" && details.bookId) {
      return details.bookId;
    }
  }
  return undefined;
}

function getResultString(value: unknown, key: string): string | undefined {
  const raw = (value as Record<string, unknown>)[key];
  return typeof raw === "string" && raw.length > 0 ? raw : undefined;
}

function getResultNumber(value: unknown, key: string): number | undefined {
  const raw = (value as Record<string, unknown>)[key];
  return typeof raw === "number" && Number.isFinite(raw) ? raw : undefined;
}
