/**
 * MiniMax CodingPlan
 *
 * - 官网：https://platform.minimaxi.com/
 * - MiniMax 针对编程场景的订阅套餐。
 */
import type { JiaosEndpoint } from "../types.js";

export const MINIMAX_CODING_PLAN: JiaosEndpoint = {
  id: "minimaxCodingPlan",
  label: "MiniMax Coding Plan",
  group: "codingPlan",
  api: "anthropic-messages",
  baseUrl: "https://api.minimaxi.com/anthropic",
  checkModel: "MiniMax-M2.7",
  transportDefaults: { stream: false },
  temperatureRange: [0, 2],
  defaultTemperature: 0.9,
  writingTemperature: 0.9,
  models: [
    { id: "MiniMax-M2.7", maxOutput: 131072, contextWindowTokens: 204800, enabled: true, releasedAt: "2026-03-18" },
    { id: "MiniMax-M2.7-highspeed", maxOutput: 131072, contextWindowTokens: 204800, releasedAt: "2026-03-18" },
    { id: "MiniMax-M2.5", maxOutput: 131072, contextWindowTokens: 204800, enabled: true, releasedAt: "2026-02-12" },
    { id: "MiniMax-M2.5-highspeed", maxOutput: 131072, contextWindowTokens: 204800, releasedAt: "2026-02-12" },
    { id: "MiniMax-M2.1", maxOutput: 131072, contextWindowTokens: 204800, releasedAt: "2025-12-23" },
    { id: "MiniMax-M2", maxOutput: 131072, contextWindowTokens: 204800, releasedAt: "2025-12-23" },
  ],
};
