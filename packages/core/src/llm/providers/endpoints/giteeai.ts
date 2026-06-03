/**
 * Gitee AI
 *
 * - 官网：https://ai.gitee.com/
 * - 控制台 / API key：https://ai.gitee.com/dashboard/settings/tokens
 * - API 文档：https://ai.gitee.com/docs/openapi/serverless
 */
import type { JiaosEndpoint } from "../types.js";

export const GITEEAI: JiaosEndpoint = {
  id: "giteeai",
  label: "Gitee AI",
  group: "aggregator",
  api: "openai-completions",
  baseUrl: "https://ai.gitee.com/v1",
  checkModel: "Qwen2.5-72B-Instruct",
  temperatureRange: [0, 2],
  defaultTemperature: 0.7,
  writingTemperature: 1,
  models: [
    { id: "DeepSeek-R1-Distill-Qwen-1.5B", maxOutput: 4096, contextWindowTokens: 32000, enabled: true },
    { id: "DeepSeek-R1-Distill-Qwen-7B", maxOutput: 4096, contextWindowTokens: 32000, enabled: true },
    { id: "DeepSeek-R1-Distill-Qwen-14B", maxOutput: 4096, contextWindowTokens: 32000, enabled: true },
    { id: "DeepSeek-R1-Distill-Qwen-32B", maxOutput: 4096, contextWindowTokens: 32000, enabled: true },
    { id: "QwQ-32B-Preview", maxOutput: 4096, contextWindowTokens: 32000, enabled: true },
    { id: "Qwen2.5-72B-Instruct", maxOutput: 4096, contextWindowTokens: 16000, enabled: true },
    { id: "Qwen2.5-32B-Instruct", maxOutput: 4096, contextWindowTokens: 32000, enabled: true },
    { id: "Qwen2.5-14B-Instruct", maxOutput: 4096, contextWindowTokens: 24000, enabled: true },
    { id: "Qwen2.5-7B-Instruct", maxOutput: 4096, contextWindowTokens: 32000, enabled: true },
    { id: "Qwen2-72B-Instruct", maxOutput: 4096, contextWindowTokens: 32000 },
    { id: "Qwen2-7B-Instruct", maxOutput: 4096, contextWindowTokens: 24000 },
    { id: "Qwen2.5-Coder-32B-Instruct", maxOutput: 4096, contextWindowTokens: 32000, enabled: true },
    { id: "Qwen2.5-Coder-14B-Instruct", maxOutput: 4096, contextWindowTokens: 24000, enabled: true },
    { id: "Qwen2-VL-72B", maxOutput: 4096, contextWindowTokens: 32000, enabled: true },
    { id: "InternVL2.5-26B", maxOutput: 4096, contextWindowTokens: 32000, enabled: true },
    { id: "InternVL2-8B", maxOutput: 4096, contextWindowTokens: 32000, enabled: true },
    { id: "glm-4-9b-chat", maxOutput: 4096, contextWindowTokens: 32000, enabled: true },
    { id: "deepseek-coder-33B-instruct", maxOutput: 4096, contextWindowTokens: 8000, enabled: true },
    { id: "codegeex4-all-9b", maxOutput: 4096, contextWindowTokens: 32000, enabled: true },
  ],
};
