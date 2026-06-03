/**
 * 小米 MiMo
 *
 * - 官网：https://api-ai.xiaomi.com/
 * - API 端点：https://api-ai.xiaomi.com/v1 (OpenAI 兼容)
 * - 模型卡 (HuggingFace)：https://huggingface.co/XiaomiMiMo
 *
 * MiMo 是小米自研模型系列，除小米官方 /v1 外，也在 PPIO / 百炼等第三方平台开放。
 */
import type { JiaosEndpoint } from "../types.js";

export const XIAOMI_MIMO: JiaosEndpoint = {
  id: "xiaomimimo",
  label: "小米 MiMo",
  group: "china",
  api: "openai-completions",
  baseUrl: "https://api-ai.xiaomi.com/v1",
  temperatureRange: [0, 2],
  defaultTemperature: 0.7,
  writingTemperature: 1,
  models: [
    { id: "mimo-v2-pro", maxOutput: 131072, contextWindowTokens: 1000000, enabled: true, releasedAt: "2026-03-18" },
    { id: "mimo-v2-omni", maxOutput: 131072, contextWindowTokens: 262144, enabled: true, releasedAt: "2026-03-18" },
    { id: "mimo-v2-flash", maxOutput: 65536, contextWindowTokens: 262144, enabled: true, releasedAt: "2026-03-03" },
  ],
};
