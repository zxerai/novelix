import type { AgentMessage } from "@mariozechner/pi-agent-core";
import { readTranscriptEvents } from "./session-transcript.js";
import {
  BookSessionSchema,
  type BookSession,
  type InteractionMessage,
  type ToolExecution,
} from "./session.js";
import type { MessageEvent, TranscriptEvent } from "./session-transcript-schema.js";

function isObject(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object";
}

function contentBlocks(message: Record<string, unknown>): unknown[] {
  return Array.isArray(message.content) ? message.content : [];
}

function hasTextContent(message: Record<string, unknown>): boolean {
  return contentBlocks(message).some(
    (block) =>
      isObject(block) &&
      block.type === "text" &&
      typeof block.text === "string" &&
      block.text.length > 0,
  );
}

function hasToolCallContent(message: Record<string, unknown>): boolean {
  return contentBlocks(message).some(
    (block) => isObject(block) && block.type === "toolCall" && typeof block.id === "string",
  );
}

function toolCallIds(message: Record<string, unknown>): string[] {
  return contentBlocks(message)
    .filter(
      (block): block is Record<string, unknown> =>
        isObject(block) && block.type === "toolCall" && typeof block.id === "string",
    )
    .map((block) => block.id as string);
}

function isThinkingBlock(block: unknown): boolean {
  return isObject(block) && (block.type === "thinking" || block.type === "redacted_thinking");
}

function removeTrailingThinking(message: AgentMessage): AgentMessage {
  if (!isObject(message) || message.role !== "assistant" || !Array.isArray(message.content)) {
    return message;
  }

  const content = [...message.content];
  while (content.length > 0 && isThinkingBlock(content[content.length - 1])) {
    content.pop();
  }

  if (content.length === message.content.length) return message;
  return { ...message, content } as AgentMessage;
}

const emptyUsage = {
  input: 0,
  output: 0,
  cacheRead: 0,
  cacheWrite: 0,
  totalTokens: 0,
  cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0, total: 0 },
};

export const TOOL_RESULT_BRIDGE_TEXT = "I have processed the tool results.";

function toolResultBridgeMessage(timestamp: number): AgentMessage {
  return {
    role: "assistant",
    content: [{ type: "text", text: TOOL_RESULT_BRIDGE_TEXT }],
    api: "openai-completions",
    provider: "jiaos",
    model: "synthetic-tool-result-bridge",
    usage: emptyUsage,
    stopReason: "stop",
    timestamp,
  } as AgentMessage;
}

function addToolResultBridges(messages: AgentMessage[]): AgentMessage[] {
  const bridged: AgentMessage[] = [];

  for (let i = 0; i < messages.length; i++) {
    const message = messages[i];
    bridged.push(message);

    if (!isObject(message) || message.role !== "toolResult") continue;

    const next = messages[i + 1];
    if (isObject(next) && (next.role === "toolResult" || next.role === "assistant")) continue;

    const timestamp = typeof message.timestamp === "number" ? message.timestamp + 1 : Date.now();
    bridged.push(toolResultBridgeMessage(timestamp));
  }

  return bridged;
}

export function cleanRestoredAgentMessages(messages: AgentMessage[]): AgentMessage[] {
  const availableToolCalls = new Set<string>();
  for (const message of messages) {
    if (isObject(message) && message.role === "assistant") {
      for (const id of toolCallIds(message)) availableToolCalls.add(id);
    }
  }

  const cleaned = messages.filter((message) => {
    if (!isObject(message)) return false;
    if (message.role === "toolResult") {
      return typeof message.toolCallId === "string" && availableToolCalls.has(message.toolCallId);
    }
    if (message.role === "assistant") {
      return hasTextContent(message) || hasToolCallContent(message);
    }
    return message.role === "user" || message.role === "system";
  });

  if (cleaned.length === 0) return cleaned;
  const last = cleaned[cleaned.length - 1];
  if (isObject(last) && last.role === "assistant") {
    cleaned[cleaned.length - 1] = removeTrailingThinking(last);
  }

  return cleaned;
}

interface TargetModelIdentity {
  readonly api?: unknown;
  readonly provider?: unknown;
  readonly id?: unknown;
  readonly compat?: unknown;
}

function requiresAssistantAfterToolResult(target: TargetModelIdentity): boolean {
  return !!(
    target.compat &&
    typeof target.compat === "object" &&
    (target.compat as { requiresAssistantAfterToolResult?: unknown }).requiresAssistantAfterToolResult === true
  );
}

function isSameAssistantModel(message: Record<string, unknown>, target: TargetModelIdentity): boolean {
  return (
    typeof message.api === "string" &&
    typeof message.provider === "string" &&
    typeof message.model === "string" &&
    message.api === target.api &&
    message.provider === target.provider &&
    message.model === target.id
  );
}

export function adaptRestoredAgentMessagesForModel(
  messages: AgentMessage[],
  target: TargetModelIdentity,
): AgentMessage[] {
  const adapted: AgentMessage[] = [];
  const nativeToolCallIds = new Set<string>();

  const pushToolResultsAsUser = (toolResults: AgentMessage[]) => {
    const lines = toolResults.flatMap((message) => {
      const raw: Record<string, unknown> = isObject(message) ? message : {};
      const toolName = typeof raw.toolName === "string" ? raw.toolName : "tool";
      const toolCallId = typeof raw.toolCallId === "string" ? raw.toolCallId : "unknown";
      const text = contentBlocks(raw)
        .map((block) => {
          if (isObject(block) && block.type === "text" && typeof block.text === "string") {
            return block.text;
          }
          return "";
        })
        .filter(Boolean)
        .join("\n")
        .trim() || "(empty tool result)";
      return [`- ${toolName} (${toolCallId}):`, text];
    });
    const timestamp = toolResults.reduce((max, message) => {
      if (isObject(message) && typeof message.timestamp === "number") {
        return Math.max(max, message.timestamp);
      }
      return max;
    }, 0) || Date.now();
    adapted.push({
      role: "user",
      content: [
        "[Tool results]",
        ...lines,
        "These tool results were restored from a previous model run. Use them as context only.",
      ].join("\n"),
      timestamp,
    } as AgentMessage);
  };

  for (let index = 0; index < messages.length; index++) {
    const message = messages[index];
    if (!isObject(message)) continue;

    if (message.role === "assistant") {
      const content = contentBlocks(message);
      const isBridge = content.length === 1 &&
        isObject(content[0]) &&
        content[0].type === "text" &&
        typeof content[0].text === "string" &&
        content[0].text.trim() === TOOL_RESULT_BRIDGE_TEXT;
      const previous = adapted[adapted.length - 1];
      if (
        isBridge &&
        isObject(previous) &&
        previous.role === "user" &&
        typeof previous.content === "string" &&
        previous.content.startsWith("[Tool results]")
      ) {
        continue;
      }

      if (Array.isArray(message.content) && isSameAssistantModel(message, target)) {
        adapted.push(message);
        for (const id of toolCallIds(message)) nativeToolCallIds.add(id);
        continue;
      }

      const contentWithoutThinking = content.filter((block) => !isThinkingBlock(block));
      const foreignToolCallIds = new Set(
        contentWithoutThinking
          .filter(
            (block): block is Record<string, unknown> =>
              isObject(block) && block.type === "toolCall" && typeof block.id === "string",
          )
          .map((block) => block.id as string),
      );

      if (foreignToolCallIds.size === 0) {
        const rewritten = contentWithoutThinking.length === content.length
          ? message
          : ({ ...message, content: contentWithoutThinking } as AgentMessage);
        if (
          contentWithoutThinking.some(
            (block) =>
              isObject(block) &&
              block.type === "text" &&
              typeof block.text === "string" &&
              block.text.length > 0,
          )
        ) {
          adapted.push(rewritten);
        }
        continue;
      }

      const textContent = contentWithoutThinking.filter(
        (block): block is { type: "text"; text: string } =>
          isObject(block) &&
          block.type === "text" &&
          typeof block.text === "string" &&
          block.text.trim().length > 0,
      );
      if (textContent.length > 0) {
        adapted.push({ ...message, content: textContent } as AgentMessage);
      }

      const toolResults: AgentMessage[] = [];
      let nextIndex = index + 1;
      while (nextIndex < messages.length) {
        const next = messages[nextIndex];
        if (
          !isObject(next) ||
          next.role !== "toolResult" ||
          typeof next.toolCallId !== "string" ||
          !foreignToolCallIds.has(next.toolCallId)
        ) {
          break;
        }
        toolResults.push(next);
        nextIndex += 1;
      }
      if (toolResults.length > 0) {
        pushToolResultsAsUser(toolResults);
        index = nextIndex - 1;
      }
      continue;
    }

    if (message.role === "toolResult") {
      const toolCallId = typeof message.toolCallId === "string" ? message.toolCallId : "";
      if (nativeToolCallIds.has(toolCallId)) {
        adapted.push(message);
      } else {
        pushToolResultsAsUser([message]);
      }
      continue;
    }

    adapted.push(message);
  }

  const filtered = adapted.filter((message) => {
    if (!isObject(message) || message.role !== "assistant") return true;
    return hasTextContent(message) || hasToolCallContent(message);
  });

  return requiresAssistantAfterToolResult(target)
    ? addToolResultBridges(filtered)
    : filtered;
}

export function committedMessageEvents(events: TranscriptEvent[]): MessageEvent[] {
  const committed = new Set(
    events
      .filter((event) => event.type === "request_committed")
      .map((event) => event.requestId),
  );

  return events
    .filter((event): event is MessageEvent => event.type === "message" && committed.has(event.requestId))
    .sort((a, b) => a.seq - b.seq);
}

export async function restoreAgentMessagesFromTranscript(
  projectRoot: string,
  sessionId: string,
): Promise<AgentMessage[]> {
  const events = await readTranscriptEvents(projectRoot, sessionId);
  return cleanRestoredAgentMessages(
    committedMessageEvents(events).map((event) => event.message as AgentMessage),
  );
}

function textFromContent(content: unknown): string {
  if (typeof content === "string") return content;
  if (!Array.isArray(content)) return "";
  return content
    .filter(
      (block): block is { type: string; text: string } =>
        isObject(block) && block.type === "text" && typeof block.text === "string",
    )
    .map((block) => block.text)
    .join("");
}

function thinkingFromContent(content: unknown): string | undefined {
  if (!Array.isArray(content)) return undefined;
  const value = content
    .filter((block): block is Record<string, unknown> => isObject(block) && block.type === "thinking")
    .map((block) => typeof block.thinking === "string" ? block.thinking : "")
    .join("");
  return value || undefined;
}

function joinThinking(parts: ReadonlyArray<string | undefined>): string | undefined {
  const values = parts
    .map((part) => part?.trim() ?? "")
    .filter((part) => part.length > 0);
  return values.length > 0 ? values.join("\n\n---\n\n") : undefined;
}

function firstUserMessageTitle(messages: InteractionMessage[]): string | null {
  for (const message of messages) {
    if (message.role !== "user") continue;
    const oneLine = message.content.trim().replace(/\s+/g, " ");
    if (!oneLine) return null;
    return oneLine.length > 20 ? `${oneLine.slice(0, 20)}…` : oneLine;
  }
  return null;
}

function messageEventToInteractionMessage(
  event: MessageEvent,
  restoredToolExecutions?: ToolExecution[],
  restoredThinking?: ReadonlyArray<string>,
): InteractionMessage | null {
  const raw = event.message as Record<string, unknown>;
  if (!isObject(raw)) return null;
  if (event.role === "toolResult") return null;

  if (event.role === "user") {
    const content = textFromContent(raw.content);
    return content ? { role: "user", content, timestamp: event.timestamp } : null;
  }

  if (event.role === "assistant") {
    const content = textFromContent(raw.content);
    const thinking = joinThinking([
      ...(restoredThinking ?? []),
      thinkingFromContent(raw.content),
      event.legacyDisplay?.thinking,
    ]);
    const toolExecutions = restoredToolExecutions?.length
      ? restoredToolExecutions
      : event.legacyDisplay?.toolExecutions as ToolExecution[] | undefined;
    if (!content) return null;
    return {
      role: "assistant",
      content,
      ...(thinking ? { thinking } : {}),
      ...(toolExecutions?.length ? { toolExecutions } : {}),
      timestamp: event.timestamp,
    };
  }

  if (event.role === "system") {
    const content = textFromContent(raw.content);
    return content ? { role: "system", content, timestamp: event.timestamp } : null;
  }

  return null;
}

function messageEventsToInteractionMessages(events: MessageEvent[]): InteractionMessage[] {
  type RestoredToolCall = {
    id: string;
    tool: string;
    args?: Record<string, unknown>;
    timestamp: number;
  };

  const agentLabels: Record<string, string> = {
    architect: "建书",
    writer: "写作",
    auditor: "审计",
    reviser: "修订",
    exporter: "导出",
  };
  const toolLabels: Record<string, string> = {
    read: "读取文件",
    edit: "编辑文件",
    grep: "搜索",
    ls: "列目录",
    short_fiction_run: "短篇生产",
    generate_cover: "生成封面",
  };

  const messages: InteractionMessage[] = [];
  const toolCalls = new Map<string, RestoredToolCall>();
  let pendingToolExecutions: ToolExecution[] = [];
  let pendingThinking: string[] = [];
  let activeRequestId: string | null = null;

  const clearPending = () => {
    pendingToolExecutions = [];
    pendingThinking = [];
  };
  const toolCallKey = (requestId: string, toolCallId: string): string =>
    `${requestId}\0${toolCallId}`;

  const objectArgs = (value: unknown): Record<string, unknown> | undefined => {
    if (isObject(value)) return value;
    if (typeof value !== "string" || !value.trim()) return undefined;
    try {
      const parsed: unknown = JSON.parse(value);
      return isObject(parsed) ? parsed : undefined;
    } catch {
      return undefined;
    }
  };

  const resolveToolLabel = (tool: string, agent?: string): string => {
    if (tool === "sub_agent" && agent) return agentLabels[agent] ?? agent;
    return toolLabels[tool] ?? tool;
  };

  const rememberToolCalls = (event: MessageEvent, raw: Record<string, unknown>) => {
    for (const block of contentBlocks(raw)) {
      if (!isObject(block) || block.type !== "toolCall") continue;
      if (typeof block.id !== "string" || !block.id) continue;
      const tool = typeof block.name === "string" && block.name ? block.name : "tool";
      const args = objectArgs(block.arguments);
      toolCalls.set(toolCallKey(event.requestId, block.id), {
        id: block.id,
        tool,
        ...(args ? { args } : {}),
        timestamp: event.timestamp,
      });
    }
  };

  const toolExecutionFromResult = (event: MessageEvent): ToolExecution | null => {
    const raw = event.message as Record<string, unknown>;
    if (!isObject(raw)) return null;
    const toolCallId = typeof raw.toolCallId === "string"
      ? raw.toolCallId
      : typeof event.toolCallId === "string"
        ? event.toolCallId
        : "";
    if (!toolCallId) return null;

    const call = toolCalls.get(toolCallKey(event.requestId, toolCallId));
    const tool = typeof raw.toolName === "string" && raw.toolName
      ? raw.toolName
      : call?.tool ?? "tool";
    const args = call?.args;
    const agent = tool === "sub_agent" && typeof args?.agent === "string"
      ? args.agent
      : undefined;
    const text = textFromContent(raw.content).trim();
    const isError = raw.isError === true;
    const details = raw.details;

    return {
      id: toolCallId,
      tool,
      ...(agent ? { agent } : {}),
      label: resolveToolLabel(tool, agent),
      status: isError ? "error" : "completed",
      ...(args ? { args } : {}),
      ...(isError
        ? { error: text.slice(0, 500) || "Tool execution failed" }
        : text
          ? { result: text.slice(0, 200) }
          : {}),
      ...(details !== undefined ? { details } : {}),
      startedAt: call?.timestamp ?? event.timestamp,
      completedAt: event.timestamp,
    };
  };

  for (const event of events) {
    const raw = event.message as Record<string, unknown>;
    if (activeRequestId !== event.requestId) {
      activeRequestId = event.requestId;
      clearPending();
    }

    if (event.role === "assistant" && isObject(raw)) {
      rememberToolCalls(event, raw);
      const currentThinking = thinkingFromContent(raw.content);
      const message = messageEventToInteractionMessage(
        event,
        pendingToolExecutions.length > 0 ? pendingToolExecutions : undefined,
        pendingThinking.length > 0 ? pendingThinking : undefined,
      );
      if (message) {
        messages.push(message);
        clearPending();
      } else if (hasToolCallContent(raw) && currentThinking) {
        pendingThinking.push(currentThinking);
      }
      continue;
    }

    if (event.role === "toolResult") {
      const execution = toolExecutionFromResult(event);
      if (execution) pendingToolExecutions.push(execution);
      continue;
    }

    clearPending();
    const message = messageEventToInteractionMessage(event);
    if (message) messages.push(message);
  }

  return messages;
}

export async function deriveBookSessionFromTranscript(
  projectRoot: string,
  sessionId: string,
): Promise<BookSession | null> {
  const events = await readTranscriptEvents(projectRoot, sessionId);
  if (events.length === 0) return null;

  const created = events.find((event) => event.type === "session_created");
  let bookId = created?.type === "session_created" ? created.bookId : null;
  let title = created?.type === "session_created" ? created.title : null;
  const createdAt = created?.type === "session_created"
    ? created.createdAt
    : events[0]?.timestamp ?? Date.now();
  const latestActivityTimestamp = events.reduce((max, event) => {
    if (event.type === "session_created" || event.type === "session_metadata_updated") {
      return Math.max(max, event.updatedAt);
    }
    return Math.max(max, event.timestamp);
  }, 0);
  let updatedAt = created?.type === "session_created"
    ? created.updatedAt
    : events[events.length - 1]?.timestamp ?? createdAt;
  updatedAt = Math.max(updatedAt, latestActivityTimestamp);

  for (const event of events) {
    if (event.type !== "session_metadata_updated") continue;
    if ("bookId" in event && event.bookId !== undefined) bookId = event.bookId;
    if ("title" in event && event.title !== undefined) title = event.title;
    updatedAt = Math.max(updatedAt, event.updatedAt);
  }

  const messages = messageEventsToInteractionMessages(committedMessageEvents(events));

  if (title === null) {
    title = firstUserMessageTitle(messages);
  }

  return BookSessionSchema.parse({
    sessionId,
    bookId,
    title,
    messages,
    draftRounds: [],
    events: [],
    createdAt,
    updatedAt,
  });
}
