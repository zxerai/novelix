/**
 * 360 智脑 (360 AI)
 *
 * - 官网：https://ai.360.com/
 * - 控制台 / API key：https://ai.360.com/platform/keys
 * - API 文档：https://ai.360.com/platform/docs
 */
import type { JiaosEndpoint } from "../types.js";

export const AI360: JiaosEndpoint = {
  id: "ai360",
  label: "360 智脑",
  group: "china",
  api: "openai-completions",
  baseUrl: "https://api.360.cn/v1",
  checkModel: "360gpt2-pro",
  temperatureRange: [0, 2],
  defaultTemperature: 0.5,
  writingTemperature: 1,
  models: [
    { id: "360zhinao3-o1.5", maxOutput: 4096, contextWindowTokens: 128000, enabled: true },
    { id: "360zhinao2-o1.5", maxOutput: 4096, contextWindowTokens: 128000 },
    { id: "360zhinao2-o1", maxOutput: 4096, contextWindowTokens: 128000 },
    { id: "360zhinao-pro-32k-thinking-vision", maxOutput: 4096, contextWindowTokens: 32000, enabled: true },
    { id: "360zhinao-turbo", maxOutput: 4096, contextWindowTokens: 32000, enabled: true },
    { id: "360zhinao-turbo-qwen-plus", maxOutput: 4096, contextWindowTokens: 32000 },
    { id: "360gpt2-o1", maxOutput: 4096, contextWindowTokens: 128000 },
    { id: "360gpt2-pro", maxOutput: 4096, contextWindowTokens: 32000 },
    { id: "360gpt-pro", maxOutput: 4096, contextWindowTokens: 32000 },
    { id: "360gpt-pro-trans", maxOutput: 4096, contextWindowTokens: 4096 },
    { id: "360gpt-turbo", maxOutput: 4096, contextWindowTokens: 32000 },
    { id: "deepseek-v3.2", maxOutput: 4096, contextWindowTokens: 65536 },
    { id: "paratera/deepseek-v3.2", maxOutput: 4096, contextWindowTokens: 4096 },
    { id: "sophnet/deepseek-v3.2", maxOutput: 4096, contextWindowTokens: 4096 },
    { id: "deepseek-v3.2-speciale", maxOutput: 4096, contextWindowTokens: 65536 },
    { id: "360/deepseek-r1", maxOutput: 4096, contextWindowTokens: 65536 },
    { id: "volcengine/doubao-seed-2-0-lite", maxOutput: 4096, contextWindowTokens: 32000 },
    { id: "volcengine/doubao-seed-2-0-mini", maxOutput: 4096, contextWindowTokens: 32000 },
    { id: "volcengine/doubao-seed-2-0-pro", maxOutput: 4096, contextWindowTokens: 32000 },
    { id: "volcengine/doubao-seed-2-0-code", maxOutput: 4096, contextWindowTokens: 32000 },
  ],
};
