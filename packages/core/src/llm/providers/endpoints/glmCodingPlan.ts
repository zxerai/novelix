/**
 * 智谱 GLM CodingPlan
 *
 * - 官网：https://bigmodel.cn/coding-plan
 * - 订阅套餐，针对编程场景优化过的 GLM 变体。
 */
import type { JiaosEndpoint } from "../types.js";

export const GLM_CODING_PLAN: JiaosEndpoint = {
  id: "glmCodingPlan",
  label: "GLM Coding Plan",
  group: "codingPlan",
  api: "anthropic-messages",
  baseUrl: "https://api.z.ai/api/anthropic",
  checkModel: "glm-5.1",
  temperatureRange: [0, 1],
  defaultTemperature: 0.95,
  writingTemperature: 0.95,
  models: [
    { id: "GLM-5.1", maxOutput: 131072, contextWindowTokens: 204800, enabled: true, releasedAt: "2026-03-27" },
    { id: "GLM-5", maxOutput: 131072, contextWindowTokens: 200000, enabled: true, releasedAt: "2026-02-12" },
    { id: "GLM-5-Turbo", maxOutput: 131072, contextWindowTokens: 200000, enabled: true, releasedAt: "2026-02-12" },
    { id: "GLM-4.7", maxOutput: 131072, contextWindowTokens: 200000, enabled: true, releasedAt: "2025-12-01" },
    { id: "GLM-4.6", maxOutput: 65536, contextWindowTokens: 202752, releasedAt: "2025-12-01" },
    { id: "GLM-4.5", maxOutput: 65536, contextWindowTokens: 202752, releasedAt: "2025-12-01" },
    { id: "GLM-4.5-Air", maxOutput: 65536, contextWindowTokens: 202752, releasedAt: "2025-12-01" },
  ],
};
