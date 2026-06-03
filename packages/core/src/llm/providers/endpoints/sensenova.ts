/**
 * 商汤日日新 (SenseNova)
 *
 * - 官网：https://platform.sensenova.cn/
 * - 控制台 / API key：https://console.sensecore.cn/aistudio/management/access-key
 * - API 文档：https://platform.sensenova.cn/doc
 */
import type { JiaosEndpoint } from "../types.js";

export const SENSENOVA: JiaosEndpoint = {
  id: "sensenova",
  label: "商汤日日新",
  group: "china",
  api: "openai-completions",
  baseUrl: "https://api.sensenova.cn/compatible-mode/v1",
  checkModel: "SenseChat-Turbo",
  temperatureRange: [0, 2],
  defaultTemperature: 0.7,
  writingTemperature: 1,
  models: [
    { id: "SenseNova-V6-5-Pro", maxOutput: 4096, contextWindowTokens: 131072, enabled: true, releasedAt: "2025-07-23" },
    { id: "SenseNova-V6-5-Turbo", maxOutput: 4096, contextWindowTokens: 131072, enabled: true, releasedAt: "2025-07-23" },
    { id: "Qwen3-235B", maxOutput: 4096, contextWindowTokens: 32768, releasedAt: "2025-05-27" },
    { id: "Qwen3-32B", maxOutput: 4096, contextWindowTokens: 32768, releasedAt: "2025-05-27" },
    { id: "SenseNova-V6-Reasoner", maxOutput: 4096, contextWindowTokens: 32768, releasedAt: "2025-04-14" },
    { id: "SenseNova-V6-Turbo", maxOutput: 4096, contextWindowTokens: 32768, releasedAt: "2025-04-14" },
    { id: "SenseNova-V6-Pro", maxOutput: 4096, contextWindowTokens: 32768, releasedAt: "2025-04-14" },
    { id: "SenseChat-5-beta", maxOutput: 4096, contextWindowTokens: 32768 },
    { id: "SenseChat-5-1202", maxOutput: 4096, contextWindowTokens: 32768, releasedAt: "2024-12-30" },
    { id: "SenseChat-Turbo-1202", maxOutput: 4096, contextWindowTokens: 32768, releasedAt: "2024-12-30" },
    { id: "SenseChat-5", maxOutput: 131072, contextWindowTokens: 131072 },
    { id: "SenseChat-Vision", maxOutput: 16384, contextWindowTokens: 16384, releasedAt: "2024-09-12" },
    { id: "SenseChat-Turbo", maxOutput: 32768, contextWindowTokens: 32768 },
    { id: "SenseChat-128K", maxOutput: 131072, contextWindowTokens: 131072 },
    { id: "SenseChat-32K", maxOutput: 32768, contextWindowTokens: 32768 },
    { id: "SenseChat", maxOutput: 4096, contextWindowTokens: 4096 },
    { id: "SenseChat-5-Cantonese", maxOutput: 32768, contextWindowTokens: 32768 },
    { id: "SenseChat-Character", maxOutput: 1024, contextWindowTokens: 8192 },
    { id: "SenseChat-Character-Pro", maxOutput: 4096, contextWindowTokens: 32768 },
    { id: "DeepSeek-V3", maxOutput: 4096, contextWindowTokens: 32768 },
    { id: "DeepSeek-R1", maxOutput: 4096, contextWindowTokens: 32768 },
    { id: "DeepSeek-R1-Distill-Qwen-14B", maxOutput: 4096, contextWindowTokens: 32768 },
    { id: "DeepSeek-R1-Distill-Qwen-32B", maxOutput: 4096, contextWindowTokens: 8192 },
  ],
};
