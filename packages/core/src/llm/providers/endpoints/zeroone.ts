/**
 * 零一万物 (01.AI / Yi)
 *
 * - 官网：https://www.lingyiwanwu.com/
 * - 控制台 / API key：https://platform.lingyiwanwu.com/apikeys
 * - API 文档：https://platform.lingyiwanwu.com/docs
 */
import type { JiaosEndpoint } from "../types.js";

export const ZEROONE: JiaosEndpoint = {
  id: "zeroone",
  label: "零一万物 (01.AI)",
  group: "china",
  api: "openai-completions",
  baseUrl: "https://api.lingyiwanwu.com/v1",
  checkModel: "yi-lightning",
  temperatureRange: [0, 2],
  defaultTemperature: 0.3,
  writingTemperature: 1,
  models: [
    { id: "yi-lightning", maxOutput: 4096, contextWindowTokens: 16384, enabled: true },
    { id: "yi-vision-v2", maxOutput: 4096, contextWindowTokens: 16384, enabled: true },
    { id: "yi-spark", maxOutput: 4096, contextWindowTokens: 16384 },
    { id: "yi-medium", maxOutput: 4096, contextWindowTokens: 16384 },
    { id: "yi-medium-200k", maxOutput: 4096, contextWindowTokens: 200000 },
    { id: "yi-large-turbo", maxOutput: 4096, contextWindowTokens: 16384 },
    { id: "yi-large-rag", maxOutput: 4096, contextWindowTokens: 16384 },
    { id: "yi-large-fc", maxOutput: 4096, contextWindowTokens: 32768 },
    { id: "yi-large", maxOutput: 4096, contextWindowTokens: 32768 },
    { id: "yi-vision", maxOutput: 4096, contextWindowTokens: 16384 },
    { id: "yi-large-preview", maxOutput: 4096, contextWindowTokens: 16384 },
    { id: "yi-lightning-lite", maxOutput: 4096, contextWindowTokens: 16384 },
  ],
};
