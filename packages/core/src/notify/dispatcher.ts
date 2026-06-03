import type { NotifyChannel } from "../models/project.js";
import type { WebhookPayload } from "./webhook.js";

export interface NotifyMessage {
  readonly title: string;
  readonly body: string;
}

export async function dispatchNotification(
  channels: ReadonlyArray<NotifyChannel>,
  message: NotifyMessage,
): Promise<void> {
  const fullText = `**${message.title}**\n\n${message.body}`;

  const tasks = channels.map(async (channel) => {
    try {
      switch (channel.type) {
        case "telegram":
          {
            const { sendTelegram } = await import("./telegram.js");
            await sendTelegram(
              { botToken: channel.botToken, chatId: channel.chatId },
              fullText,
            );
          }
          break;
        case "feishu":
          {
            const { sendFeishu } = await import("./feishu.js");
            await sendFeishu(
              { webhookUrl: channel.webhookUrl },
              message.title,
              message.body,
            );
          }
          break;
        case "wechat-work":
          {
            const { sendWechatWork } = await import("./wechat-work.js");
            await sendWechatWork(
              { webhookUrl: channel.webhookUrl },
              fullText,
            );
          }
          break;
        case "webhook":
          // Webhook channels are handled by dispatchWebhookEvent for structured events.
          // For generic text notifications, send as a pipeline-complete event.
          {
            const { sendWebhook } = await import("./webhook.js");
            await sendWebhook(
              { url: channel.url, secret: channel.secret, events: channel.events },
              {
                event: "pipeline-complete",
                bookId: "",
                timestamp: new Date().toISOString(),
                data: { title: message.title, body: message.body },
              },
            );
          }
          break;
      }
    } catch (e) {
      // Log but don't throw — notification failure shouldn't block pipeline
      process.stderr.write(
        `[notify] ${channel.type} failed: ${e}\n`,
      );
    }
  });

  await Promise.all(tasks);
}

/** Dispatch a structured webhook event to all webhook channels. */
export async function dispatchWebhookEvent(
  channels: ReadonlyArray<NotifyChannel>,
  payload: WebhookPayload,
): Promise<void> {
  const webhookChannels = channels.filter((ch) => ch.type === "webhook");
  if (webhookChannels.length === 0) return;

  const tasks = webhookChannels.map(async (channel) => {
    if (channel.type !== "webhook") return;
    try {
      const { sendWebhook } = await import("./webhook.js");
      await sendWebhook(
        { url: channel.url, secret: channel.secret, events: channel.events },
        payload,
      );
    } catch (e) {
      process.stderr.write(`[webhook] ${channel.url} failed: ${e}\n`);
    }
  });

  await Promise.all(tasks);
}
