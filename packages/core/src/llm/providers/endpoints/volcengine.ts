/**
 * 火山方舟 (Volcengine Ark / Doubao)
 *
 * - 官网：https://www.volcengine.com/product/ark
 * - 控制台 / API key：https://console.volcengine.com/ark/region:ark+cn-beijing/apiKey
 * - API 文档：https://www.volcengine.com/docs/82379
 */
import type { JiaosEndpoint } from "../types.js";

export const VOLCENGINE: JiaosEndpoint = {
  id: "volcengine",
  label: "火山引擎 (豆包)",
  group: "china",
  api: "openai-completions",
  baseUrl: "https://ark.cn-beijing.volces.com/api/v3",
  checkModel: "doubao-seed-2.0-lite",
  temperatureRange: [0, 2],
  defaultTemperature: 0.7,
  writingTemperature: 1,
  models: [
    { id: "doubao-seed-2.0-pro", maxOutput: 32000, contextWindowTokens: 256000, enabled: true, releasedAt: "2026-02-15" },
    { id: "doubao-seed-2.0-lite", maxOutput: 32000, contextWindowTokens: 256000, enabled: true, releasedAt: "2026-02-15" },
    { id: "doubao-seed-2.0-mini", maxOutput: 32000, contextWindowTokens: 256000, releasedAt: "2026-02-15" },
    { id: "doubao-seed-2.0-code", maxOutput: 32000, contextWindowTokens: 256000, releasedAt: "2026-02-15" },
    { id: "doubao-seed-1.8", maxOutput: 64000, contextWindowTokens: 256000, releasedAt: "2025-12-18" },
    { id: "doubao-seed-code", maxOutput: 32000, contextWindowTokens: 256000 },
    { id: "glm-4-7", maxOutput: 16000, contextWindowTokens: 200000 },
    { id: "deepseek-v3.2", maxOutput: 32768, contextWindowTokens: 131072 },
    { id: "deepseek-v3.1", maxOutput: 32768, contextWindowTokens: 131072 },
    { id: "kimi-k2-thinking", maxOutput: 32768, contextWindowTokens: 262144, temperature: 1 },
    { id: "kimi-k2", maxOutput: 32768, contextWindowTokens: 262144 },
    { id: "doubao-seed-1.6-vision", maxOutput: 32000, contextWindowTokens: 256000 },
    { id: "doubao-seed-1.6-thinking", maxOutput: 32000, contextWindowTokens: 256000 },
    { id: "doubao-seed-1.6", maxOutput: 32000, contextWindowTokens: 256000 },
    { id: "doubao-seed-1.6-lite", maxOutput: 32000, contextWindowTokens: 256000 },
    { id: "doubao-seed-1.6-flash", maxOutput: 32000, contextWindowTokens: 256000 },
    { id: "doubao-1.5-ui-tars", maxOutput: 16000, contextWindowTokens: 131072 },
    { id: "doubao-1.5-thinking-vision-pro", maxOutput: 16000, contextWindowTokens: 131072 },
    { id: "doubao-1.5-thinking-pro", maxOutput: 16000, contextWindowTokens: 131072 },
    { id: "doubao-1.5-thinking-pro-m", maxOutput: 16000, contextWindowTokens: 131072 },
    { id: "deepseek-r1", maxOutput: 16384, contextWindowTokens: 131072 },
    { id: "deepseek-v3", maxOutput: 16384, contextWindowTokens: 128000 },
    { id: "doubao-1.5-pro-32k", maxOutput: 16384, contextWindowTokens: 128000 },
    { id: "doubao-1.5-pro-256k", maxOutput: 12288, contextWindowTokens: 256000 },
    { id: "doubao-1.5-lite-32k", maxOutput: 12288, contextWindowTokens: 32768 },
    { id: "doubao-1.5-vision-pro-32k", maxOutput: 12288, contextWindowTokens: 32768, releasedAt: "2025-01-15" },
    { id: "doubao-1.5-vision-pro", maxOutput: 16384, contextWindowTokens: 128000, releasedAt: "2025-03-28" },
    { id: "doubao-1.5-vision-lite", maxOutput: 16384, contextWindowTokens: 128000, releasedAt: "2025-03-15" },
    { id: "doubao-lite-32k", maxOutput: 4096, contextWindowTokens: 32768 },
    { id: "doubao-pro-32k", maxOutput: 4096, contextWindowTokens: 32768 },
  ],
};
