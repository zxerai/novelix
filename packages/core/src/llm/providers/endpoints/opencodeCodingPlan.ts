/**
 * OpenCode CodingPlan
 *
 * - OpenCode 聚合的编码类套餐，具体后端随订阅变化。
 * - 官网：https://opencode.ai/
 */
import type { JiaosEndpoint } from "../types.js";

export const OPENCODE_CODING_PLAN: JiaosEndpoint = {
  id: "opencodeCodingPlan",
  label: "OpenCode Coding Plan",
  group: "codingPlan",
  api: "anthropic-messages",
  baseUrl: "https://opencode.ai/api/anthropic",
  checkModel: "glm-5.1",
  temperatureRange: [0, 1],
  defaultTemperature: 0.7,
  writingTemperature: 1,
  models: [
    { id: "glm-5.1", maxOutput: 32000, contextWindowTokens: 204800, enabled: true, releasedAt: "2026-04-07" },
    { id: "glm-5", maxOutput: 32000, contextWindowTokens: 204800, enabled: false, releasedAt: "2026-02-11" },
    { id: "kimi-k2.5", maxOutput: 32000, contextWindowTokens: 262144, enabled: false, releasedAt: "2026-01-27", temperature: 1 },
    { id: "mimo-v2-omni", maxOutput: 32000, contextWindowTokens: 262144, enabled: false, releasedAt: "2026-03-18" },
    { id: "qwen3.6-plus", maxOutput: 32000, contextWindowTokens: 262144, enabled: true, releasedAt: "2026-04-02" },
    { id: "minimax-m2.5", maxOutput: 32000, contextWindowTokens: 204800, enabled: false, releasedAt: "2026-02-12" },
    { id: "minimax-m2.7", maxOutput: 32000, contextWindowTokens: 204800, enabled: true, releasedAt: "2026-03-18" },
    { id: "mimo-v2-pro", maxOutput: 32000, contextWindowTokens: 1048576, enabled: false, releasedAt: "2026-03-18" },
    { id: "qwen3.5-plus", maxOutput: 32000, contextWindowTokens: 262144, enabled: false, releasedAt: "2026-02-16" },
  ],
};
