/**
 * 七牛云 AI 推理 (Qiniu)
 *
 * - 官网：https://www.qiniu.com/
 * - 控制台 / API key：https://portal.qiniu.com/ai-inference/api-key
 * - API 文档：https://developer.qiniu.com/aitokenapi
 */
import type { JiaosEndpoint } from "../types.js";

export const QINIU: JiaosEndpoint = {
  id: "qiniu",
  label: "七牛云 AI",
  group: "aggregator",
  api: "openai-completions",
  baseUrl: "https://api.qnaigc.com/v1",
  checkModel: "deepseek-v3",
  temperatureRange: [0, 2],
  defaultTemperature: 0.7,
  writingTemperature: 1,
  models: [
    { id: "deepseek-v3", maxOutput: 4096, contextWindowTokens: 131072, enabled: true },
    { id: "deepseek-r1", maxOutput: 4096, contextWindowTokens: 65536, enabled: true },
    { id: "minimax/minimax-m2.1", maxOutput: 131072, contextWindowTokens: 204800, enabled: true, releasedAt: "2025-12-24" },
    { id: "minimax/minimax-m2", maxOutput: 131072, contextWindowTokens: 204800, enabled: true, releasedAt: "2025-10-27" },
    { id: "deepseek/deepseek-math-v2", maxOutput: 131072, contextWindowTokens: 163840, enabled: true, releasedAt: "2025-11-27" },
    { id: "meituan/longcat-flash-chat", maxOutput: 65536, contextWindowTokens: 131072, enabled: true, releasedAt: "2025-09-01" },
    { id: "z-ai/glm-4.7", maxOutput: 128000, contextWindowTokens: 200000, enabled: true, releasedAt: "2025-12-23" },
    { id: "z-ai/glm-4.6", maxOutput: 128000, contextWindowTokens: 200000, enabled: true, releasedAt: "2025-09-30" },
    { id: "x-ai/grok-4-fast", maxOutput: 4096, contextWindowTokens: 2000000, enabled: true, releasedAt: "2025-09-09" },
    { id: "x-ai/grok-code-fast-1", maxOutput: 4096, contextWindowTokens: 256000, releasedAt: "2025-08-27" },
  ],
};
