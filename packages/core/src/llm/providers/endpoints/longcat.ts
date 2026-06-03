/**
 * LongCat (美团)
 *
 * - 官网：https://longcat.chat/
 * - API 文档：https://longcat.chat/platform/docs
 */
import type { JiaosEndpoint } from "../types.js";

export const LONGCAT: JiaosEndpoint = {
  id: "longcat",
  label: "美团 LongCat",
  group: "china",
  api: "openai-completions",
  baseUrl: "https://api.longcat.chat/openai/v1",
  checkModel: "LongCat-Flash-Chat",
  temperatureRange: [0, 2],
  defaultTemperature: 0.7,
  writingTemperature: 1,
  models: [
    { id: "LongCat-Flash-Lite", maxOutput: 4096, contextWindowTokens: 327680, enabled: true, releasedAt: "2026-02-05" },
    { id: "LongCat-Flash-Thinking-2601", maxOutput: 4096, contextWindowTokens: 262144, enabled: true, releasedAt: "2026-01-14" },
    { id: "LongCat-Flash-Thinking", maxOutput: 4096, contextWindowTokens: 262144, releasedAt: "2025-09-22" },
    { id: "LongCat-Flash-Chat", maxOutput: 4096, contextWindowTokens: 262144, enabled: true, releasedAt: "2025-12-12" },
  ],
};
