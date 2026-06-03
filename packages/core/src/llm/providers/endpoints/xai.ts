/**
 * xAI (Grok)
 *
 * - 官网：https://x.ai/
 * - 控制台 / API key：https://console.x.ai/
 * - API 文档：https://docs.x.ai/docs/overview
 * - 模型列表：https://docs.x.ai/docs/models
 */
import type { JiaosEndpoint } from "../types.js";

export const XAI: JiaosEndpoint = {
  id: "xai",
  label: "xAI (Grok)",
  group: "overseas",
  api: "openai-completions",
  baseUrl: "https://api.x.ai/v1",
  checkModel: "grok-2-1212",
  temperatureRange: [0, 2],
  defaultTemperature: 1,
  writingTemperature: 1,
  models: [
    { id: "grok-4.20-beta-0309-reasoning", maxOutput: 4096, contextWindowTokens: 2000000, enabled: true, releasedAt: "2026-03-09" },
    { id: "grok-4.20-beta-0309-non-reasoning", maxOutput: 4096, contextWindowTokens: 2000000, enabled: true, releasedAt: "2026-03-09" },
    { id: "grok-4.20-multi-agent-beta-0309", maxOutput: 4096, contextWindowTokens: 2000000, enabled: true, releasedAt: "2026-03-09" },
    { id: "grok-4-1-fast-non-reasoning", maxOutput: 4096, contextWindowTokens: 2000000, enabled: true, releasedAt: "2025-11-20" },
    { id: "grok-4-1-fast-reasoning", maxOutput: 4096, contextWindowTokens: 2000000, enabled: true, releasedAt: "2025-11-20" },
    { id: "grok-4-fast-non-reasoning", maxOutput: 4096, contextWindowTokens: 2000000, releasedAt: "2025-09-09" },
    { id: "grok-4-fast-reasoning", maxOutput: 4096, contextWindowTokens: 2000000, releasedAt: "2025-09-09" },
    { id: "grok-code-fast-1", maxOutput: 4096, contextWindowTokens: 256000, releasedAt: "2025-08-27" },
    { id: "grok-4", maxOutput: 4096, contextWindowTokens: 256000, releasedAt: "2025-07-09" },
    { id: "grok-3", maxOutput: 4096, contextWindowTokens: 131072, releasedAt: "2025-04-03" },
    { id: "grok-3-mini", maxOutput: 4096, contextWindowTokens: 131072, releasedAt: "2025-04-03" },
  ],
};
