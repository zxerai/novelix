/**
 * 阶跃星辰 (StepFun)
 *
 * - 官网：https://www.stepfun.com/
 * - 控制台 / API key：https://platform.stepfun.com/interface-key
 * - API 文档：https://platform.stepfun.com/docs/overview/concept
 */
import type { JiaosEndpoint } from "../types.js";

export const STEPFUN: JiaosEndpoint = {
  id: "stepfun",
  label: "阶跃星辰",
  group: "china",
  api: "openai-completions",
  baseUrl: "https://api.stepfun.com/v1",
  checkModel: "step-1-8k",
  temperatureRange: [0, 1],
  defaultTemperature: 0.7,
  writingTemperature: 1,
  models: [
    { id: "step-3.5-flash", maxOutput: 4096, contextWindowTokens: 256000, enabled: true },
    { id: "step-3", maxOutput: 4096, contextWindowTokens: 64000, enabled: true },
    { id: "step-r1-v-mini", maxOutput: 4096, contextWindowTokens: 100000 },
    { id: "step-1-8k", maxOutput: 4096, contextWindowTokens: 8000 },
    { id: "step-1-32k", maxOutput: 4096, contextWindowTokens: 32000 },
    { id: "step-1-256k", maxOutput: 4096, contextWindowTokens: 256000 },
    { id: "step-2-mini", maxOutput: 4096, contextWindowTokens: 8000, releasedAt: "2025-01-14" },
    { id: "step-2-16k", maxOutput: 4096, contextWindowTokens: 16000 },
    { id: "step-2-16k-exp", maxOutput: 4096, contextWindowTokens: 16000, releasedAt: "2025-01-15" },
    { id: "step-1v-8k", maxOutput: 4096, contextWindowTokens: 8000 },
    { id: "step-1v-32k", maxOutput: 4096, contextWindowTokens: 32000 },
    { id: "step-1o-vision-32k", maxOutput: 4096, contextWindowTokens: 32000, releasedAt: "2025-01-22" },
    { id: "step-1o-turbo-vision", maxOutput: 4096, contextWindowTokens: 32000, releasedAt: "2025-02-14" },
  ],
};
