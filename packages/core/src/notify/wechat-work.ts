export interface WechatWorkConfig {
  readonly webhookUrl: string;
}

export async function sendWechatWork(
  config: WechatWorkConfig,
  content: string,
): Promise<void> {
  const response = await fetch(config.webhookUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      msgtype: "markdown",
      markdown: { content },
    }),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`WeCom send failed: ${response.status} ${body}`);
  }
}
