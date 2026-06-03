/**
 * ModelScope (魔搭)
 *
 * - 官网：https://www.modelscope.cn/
 * - 控制台 / API key：https://www.modelscope.cn/my/myaccesstoken
 * - API 文档：https://www.modelscope.cn/docs/model-service/API-Inference/intro
 */
import type { JiaosEndpoint } from "../types.js";

export const MODELSCOPE: JiaosEndpoint = {
  id: "modelscope",
  label: "魔搭社区 ModelScope",
  group: "aggregator",
  api: "openai-completions",
  baseUrl: "https://api-inference.modelscope.cn/v1",
  checkModel: "Qwen/Qwen2.5-72B-Instruct",
  temperatureRange: [0, 2],
  defaultTemperature: 0.7,
  writingTemperature: 1,
  models: [
    { id: "Qwen/Qwen3-Next-80B-A3B-Thinking", maxOutput: 4096, contextWindowTokens: 131072 },
    { id: "Qwen/Qwen3-Next-80B-A3B-Instruct", maxOutput: 4096, contextWindowTokens: 131072 },
    { id: "deepseek-ai/DeepSeek-V3.2", maxOutput: 4096, contextWindowTokens: 131072, enabled: true },
    { id: "deepseek-ai/DeepSeek-V3.2-Exp", maxOutput: 4096, contextWindowTokens: 131072 },
    { id: "deepseek-ai/DeepSeek-V3.1", maxOutput: 4096, contextWindowTokens: 131072 },
    { id: "deepseek-ai/DeepSeek-R1-0528", maxOutput: 4096, contextWindowTokens: 131072 },
    { id: "Qwen/Qwen3-235B-A22B", maxOutput: 4096, contextWindowTokens: 131072 },
    { id: "Qwen/Qwen3-32B", maxOutput: 4096, contextWindowTokens: 131072 },
  ],
};
