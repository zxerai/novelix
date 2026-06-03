/**
 * Mistral AI
 *
 * - 官网：https://mistral.ai/
 * - 控制台 / API key：https://console.mistral.ai/api-keys/
 * - API 文档：https://docs.mistral.ai/api/
 * - 模型列表：https://docs.mistral.ai/getting-started/models/models_overview/
 */
import type { JiaosEndpoint } from "../types.js";

export const MISTRAL: JiaosEndpoint = {
  id: "mistral",
  label: "Mistral AI",
  group: "overseas",
  api: "openai-completions",
  baseUrl: "https://api.mistral.ai/v1",
  checkModel: "mistral-small-latest",
  temperatureRange: [0, 1],
  defaultTemperature: 0.7,
  writingTemperature: 1,
  models: [
    { id: "devstral-2512", maxOutput: 4096, contextWindowTokens: 262144, releasedAt: "2025-12-09" },
    { id: "labs-devstral-small-2512", maxOutput: 4096, contextWindowTokens: 262144, releasedAt: "2025-12-09" },
    { id: "mistral-medium-2508", maxOutput: 4096, contextWindowTokens: 131072, enabled: true },
    { id: "magistral-medium-2509", maxOutput: 4096, contextWindowTokens: 131072 },
    { id: "magistral-small-2509", maxOutput: 4096, contextWindowTokens: 131072 },
    { id: "open-mistral-nemo", maxOutput: 4096, contextWindowTokens: 131072 },
    { id: "mistral-small-2603", maxOutput: 4096, contextWindowTokens: 256000, releasedAt: "2026-03-16" },
    { id: "mistral-small-2506", maxOutput: 4096, contextWindowTokens: 131072 },
    { id: "mistral-large-2512", maxOutput: 4096, contextWindowTokens: 256000, enabled: true, releasedAt: "2025-12-02" },
    { id: "mistral-large-2411", maxOutput: 4096, contextWindowTokens: 131072 },
    { id: "codestral-latest", maxOutput: 4096, contextWindowTokens: 256000, releasedAt: "2025-07-30" },
    { id: "pixtral-large-latest", maxOutput: 4096, contextWindowTokens: 131072 },
    { id: "pixtral-12b-2409", maxOutput: 4096, contextWindowTokens: 131072 },
    { id: "ministral-3b-latest", maxOutput: 4096, contextWindowTokens: 131072 },
    { id: "ministral-8b-latest", maxOutput: 4096, contextWindowTokens: 131072 },
    { id: "open-codestral-mamba", maxOutput: 4096, contextWindowTokens: 256000 },
    { id: "labs-leanstral-2603", maxOutput: 4096, contextWindowTokens: 256000, releasedAt: "2026-03-16" },
  ],
};
