import type { Theme } from "../../hooks/use-theme";
import {
  Message,
  MessageContent,
  MessageResponse,
} from "../ai-elements/message";
import { XCircle } from "lucide-react";

export interface ChatMessageProps {
  readonly role: "user" | "assistant";
  readonly content: string;
  readonly timestamp: number;
  readonly theme: Theme;
}

export function ChatMessage({
  role,
  content,
}: ChatMessageProps) {
  const isUser = role === "user";
  const isError = content.startsWith("\u2717");

  return (
    <Message from={role}>
      <MessageContent>
        {isUser ? (
          <div className="text-sm leading-relaxed">{content}</div>
        ) : isError ? (
          <div className="flex items-center gap-2 text-sm text-destructive">
            <XCircle size={14} className="shrink-0" />
            <span>{content.replace(/^\u2717\s*/, "")}</span>
          </div>
        ) : (
          <MessageResponse>{content}</MessageResponse>
        )}
      </MessageContent>
    </Message>
  );
}
