/**
 * 智谱 GLM (Zhipu AI)
 *
 * - 官网：https://www.bigmodel.cn/
 * - 控制台：https://open.bigmodel.cn/
 * - API key：https://open.bigmodel.cn/usercenter/proj-mgmt/apikeys
 * - API 文档：https://docs.bigmodel.cn/cn/api/normal-model/glm-4
 * - 模型列表：https://open.bigmodel.cn/dev/howuse/model
 */
import type { JiaosEndpoint } from "../types.js";

export const ZHIPU: JiaosEndpoint = {
  id: "zhipu",
  label: "智谱 GLM",
  group: "china",
  api: "openai-completions",
  baseUrl: "https://open.bigmodel.cn/api/paas/v4",
  checkModel: "glm-4-flash",
  temperatureRange: [0, 1],
  defaultTemperature: 0.95,
  writingTemperature: 0.95,
  models: [
    { id: "glm-5.1", maxOutput: 131072, contextWindowTokens: 200000, enabled: true, releasedAt: "2026-03-27" },
    { id: "glm-5-turbo", maxOutput: 131072, contextWindowTokens: 200000, releasedAt: "2026-03-15" },
    { id: "glm-5", maxOutput: 131072, contextWindowTokens: 200000, enabled: true, releasedAt: "2026-02-12" },
    { id: "glm-4.7", maxOutput: 131072, contextWindowTokens: 200000, releasedAt: "2025-12-22" },
    { id: "glm-4.7-flash", maxOutput: 131072, contextWindowTokens: 200000, enabled: true, releasedAt: "2026-01-19" },
    { id: "glm-4.7-flashx", maxOutput: 131072, contextWindowTokens: 200000, releasedAt: "2026-01-19" },
    { id: "glm-5v-turbo", maxOutput: 131072, contextWindowTokens: 200000, enabled: true, releasedAt: "2026-04-02" },
    { id: "glm-4.6v", maxOutput: 32768, contextWindowTokens: 131072, releasedAt: "2025-12-08" },
    { id: "glm-4.6v-flashx", maxOutput: 32768, contextWindowTokens: 131072, releasedAt: "2025-12-08" },
    { id: "glm-4.6v-flash", maxOutput: 32768, contextWindowTokens: 131072, releasedAt: "2025-12-08" },
    { id: "glm-4.6", maxOutput: 131072, contextWindowTokens: 200000, releasedAt: "2025-09-08" },
    { id: "glm-4.5v", maxOutput: 16384, contextWindowTokens: 65536 },
    { id: "glm-4.5", maxOutput: 98304, contextWindowTokens: 131072 },
    { id: "glm-4.5-x", maxOutput: 98304, contextWindowTokens: 131072 },
    { id: "glm-4.5-air", maxOutput: 98304, contextWindowTokens: 131072 },
    { id: "glm-4.5-airx", maxOutput: 98304, contextWindowTokens: 131072 },
    { id: "glm-4.1v-thinking-flashx", maxOutput: 32768, contextWindowTokens: 65536 },
    { id: "glm-4.1v-thinking-flash", maxOutput: 32768, contextWindowTokens: 65536 },
    { id: "glm-zero-preview", maxOutput: 4096, contextWindowTokens: 16384 },
    { id: "glm-z1-air", maxOutput: 32768, contextWindowTokens: 131072 },
    { id: "glm-z1-airx", maxOutput: 32768, contextWindowTokens: 32768 },
    { id: "glm-z1-flashx", maxOutput: 32768, contextWindowTokens: 131072 },
    { id: "glm-z1-flash", maxOutput: 32768, contextWindowTokens: 131072 },
    { id: "glm-4-flash", maxOutput: 32768, contextWindowTokens: 131072, enabled: true },
    { id: "glm-4-flash-250414", maxOutput: 32768, contextWindowTokens: 131072 },
    { id: "glm-4-flashx", maxOutput: 4095, contextWindowTokens: 131072 },
    { id: "glm-4-long", maxOutput: 4095, contextWindowTokens: 1024000 },
    { id: "glm-4-air-250414", maxOutput: 16384, contextWindowTokens: 131072 },
    { id: "glm-4-airx", maxOutput: 4095, contextWindowTokens: 8192 },
    { id: "glm-4-plus", maxOutput: 4095, contextWindowTokens: 131072 },
    { id: "glm-4-0520", maxOutput: 4096, contextWindowTokens: 131072 },
    { id: "glm-4v-flash", maxOutput: 1024, contextWindowTokens: 4096, releasedAt: "2024-12-09" },
    { id: "glm-4v-plus-0111", maxOutput: 8192, contextWindowTokens: 16000 },
    { id: "glm-4v", maxOutput: 1024, contextWindowTokens: 4096 },
    { id: "codegeex-4", maxOutput: 32768, contextWindowTokens: 131072 },
    { id: "charglm-4", maxOutput: 4000, contextWindowTokens: 8192 },
    { id: "emohaa", maxOutput: 4000, contextWindowTokens: 8192 },
  ],
};
