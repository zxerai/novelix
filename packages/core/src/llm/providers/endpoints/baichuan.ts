/**
 * 百川智能 (Baichuan AI)
 *
 * - 官网：https://www.baichuan-ai.com/
 * - 控制台 / API key：https://platform.baichuan-ai.com/console/apikey
 * - API 文档：https://platform.baichuan-ai.com/docs/api
 */
import type { JiaosEndpoint } from "../types.js";

export const BAICHUAN: JiaosEndpoint = {
  id: "baichuan",
  label: "百川智能",
  group: "china",
  api: "openai-completions",
  baseUrl: "https://api.baichuan-ai.com/v1",
  checkModel: "Baichuan4",
  temperatureRange: [0, 1],
  defaultTemperature: 0.3,
  writingTemperature: 1,
  models: [
    { id: "Baichuan4", maxOutput: 4096, contextWindowTokens: 32768, enabled: true },
    { id: "Baichuan4-Turbo", maxOutput: 4096, contextWindowTokens: 32768, enabled: true },
    { id: "Baichuan4-Air", maxOutput: 4096, contextWindowTokens: 32768, enabled: true },
    { id: "Baichuan3-Turbo", maxOutput: 8192, contextWindowTokens: 32768 },
    { id: "Baichuan3-Turbo-128k", maxOutput: 4096, contextWindowTokens: 128000 },
    { id: "Baichuan2-Turbo", maxOutput: 8192, contextWindowTokens: 32768 },
  ],
};
