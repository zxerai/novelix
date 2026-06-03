/**
 * Kimi Code
 *
 * Kimi's coding endpoint uses Anthropic-compatible messages, separate from the
 * regular Moonshot OpenAI-compatible API.
 */
import type { JiaosEndpoint } from "../types.js";

export const KIMI_CODE: JiaosEndpoint = {
  id: "kimicode",
  label: "Kimi Code",
  group: "codingPlan",
  api: "anthropic-messages",
  baseUrl: "https://api.kimi.com/coding",
  modelsBaseUrl: "https://api.kimi.com/coding/v1",
  checkModel: "kimi-for-coding",
  temperatureRange: [0, 2],
  defaultTemperature: 1,
  writingTemperature: 1,
  models: [
    { id: "kimi-for-coding", maxOutput: 32768, contextWindowTokens: 262144, enabled: true },
  ],
};
