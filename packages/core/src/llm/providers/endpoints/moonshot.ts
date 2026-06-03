/**
 * Moonshot AI (Kimi)
 *
 * - 官网：https://www.moonshot.cn/
 * - 控制台：https://platform.moonshot.cn/console/
 * - API key：https://platform.moonshot.cn/console/api-keys
 * - API 文档：https://platform.moonshot.cn/docs/api-reference
 * - 模型列表：https://platform.moonshot.cn/docs/pricing/chat
 */
import type { JiaosEndpoint } from "../types.js";

export const MOONSHOT: JiaosEndpoint = {
  id: "moonshot",
  label: "Moonshot (Kimi)",
  group: "china",
  api: "openai-completions",
  baseUrl: "https://api.moonshot.cn/v1",
  checkModel: "moonshot-v1-8k",
  temperatureRange: [0, 1],
  defaultTemperature: 0.3,
  writingTemperature: 1,
  temperatureHint: "kimi-k2.5/k2.6 推荐 temperature=1.0",
  models: [
    { id: "kimi-k2.6", maxOutput: 32768, contextWindowTokens: 262144, enabled: true, releasedAt: "2026-04-21", temperature: 1 },
    { id: "kimi-k2.5", maxOutput: 32768, contextWindowTokens: 262144, enabled: true, releasedAt: "2026-01-27", temperature: 1 },
    { id: "kimi-k2-thinking", maxOutput: 65536, contextWindowTokens: 262144, releasedAt: "2025-11-06", temperature: 1 },
    { id: "kimi-k2-thinking-turbo", maxOutput: 65536, contextWindowTokens: 262144, releasedAt: "2025-11-06", temperature: 1 },
    { id: "kimi-k2-0905-preview", maxOutput: 65536, contextWindowTokens: 262144, releasedAt: "2025-09-05" },
    { id: "kimi-k2-0711-preview", maxOutput: 4096, contextWindowTokens: 131072, releasedAt: "2025-07-11" },
    { id: "kimi-k2-turbo-preview", maxOutput: 4096, contextWindowTokens: 262144, enabled: true, releasedAt: "2025-09-05" },
    { id: "moonshot-v1-auto", maxOutput: 4096, contextWindowTokens: 131072 },
    { id: "moonshot-v1-8k", maxOutput: 4096, contextWindowTokens: 8192 },
    { id: "moonshot-v1-32k", maxOutput: 4096, contextWindowTokens: 32768 },
    { id: "moonshot-v1-128k", maxOutput: 4096, contextWindowTokens: 131072 },
    { id: "moonshot-v1-8k-vision-preview", maxOutput: 4096, contextWindowTokens: 8192, releasedAt: "2025-01-14" },
    { id: "moonshot-v1-32k-vision-preview", maxOutput: 4096, contextWindowTokens: 32768, releasedAt: "2025-01-14" },
    { id: "moonshot-v1-128k-vision-preview", maxOutput: 4096, contextWindowTokens: 131072, releasedAt: "2025-01-14" },
  ],
};
