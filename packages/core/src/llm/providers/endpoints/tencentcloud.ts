/**
 * 腾讯云 TI-ONE / LKE
 *
 * - 官网：https://cloud.tencent.com/product/lkeap
 * - 控制台 / API key：https://console.cloud.tencent.com/lkeap/api
 * - API 文档：https://cloud.tencent.com/document/product/1772
 */
import type { JiaosEndpoint } from "../types.js";

export const TENCENTCLOUD: JiaosEndpoint = {
  id: "tencentcloud",
  label: "腾讯云 (lkeap)",
  group: "china",
  api: "openai-completions",
  baseUrl: "https://api.lkeap.cloud.tencent.com/v1",
  checkModel: "deepseek-v3",
  temperatureRange: [0, 2],
  defaultTemperature: 0.7,
  writingTemperature: 1,
  models: [
    { id: "deepseek-r1", maxOutput: 16000, contextWindowTokens: 65536, enabled: true },
    { id: "deepseek-v3-0324", maxOutput: 16000, contextWindowTokens: 65536, enabled: true },
    { id: "deepseek-v3", maxOutput: 16000, contextWindowTokens: 65536 },
  ],
};
