/**
 * PPIO (派欧云)
 *
 * - 官网：https://ppinfra.com/
 * - 控制台 / API key：https://ppinfra.com/user/api-keys
 * - 模型广场：https://ppinfra.com/model
 * - API 文档：https://ppinfra.com/docs/model-api
 *
 * 聚合型推理平台，代理 DeepSeek / Qwen / Moonshot / MiniMax / GLM / 百度 ERNIE 等，
 * 模型更新频繁（每周都有新 id），bank 只维护主流文本 chat 模型，
 * 元数据以 live /models probe 为准。
 */
import type { JiaosEndpoint } from "../types.js";

export const PPIO: JiaosEndpoint = {
  id: "ppio",
  label: "PPIO",
  group: "aggregator",
  api: "openai-completions",
  baseUrl: "https://api.ppinfra.com/v3/openai",
  checkModel: "deepseek/deepseek-v3.2",
  temperatureRange: [0, 2],
  defaultTemperature: 0.7,
  writingTemperature: 1,
  models: [
    // --- DeepSeek 系列 ---
    { id: "deepseek/deepseek-v3.2", maxOutput: 8192, contextWindowTokens: 131072, enabled: true },
    { id: "deepseek/deepseek-v3.2-exp", maxOutput: 8192, contextWindowTokens: 131072 },
    { id: "deepseek/deepseek-v3.1-terminus", maxOutput: 8192, contextWindowTokens: 131072 },
    { id: "deepseek/deepseek-v3.1", maxOutput: 8192, contextWindowTokens: 131072 },
    { id: "deepseek/deepseek-v3-0324", maxOutput: 8192, contextWindowTokens: 65536 },
    { id: "deepseek/deepseek-v3-turbo", maxOutput: 8192, contextWindowTokens: 131072 },
    { id: "deepseek/deepseek-r1-0528", maxOutput: 65536, contextWindowTokens: 131072 },
    { id: "deepseek/deepseek-r1-turbo", maxOutput: 65536, contextWindowTokens: 131072 },
    { id: "deepseek/deepseek-prover-v2-671b", maxOutput: 32768, contextWindowTokens: 131072 },
    // --- Moonshot Kimi 系列 ---
    { id: "moonshotai/kimi-k2.6", maxOutput: 32768, contextWindowTokens: 262144, enabled: true, releasedAt: "2026-04-21", temperature: 1 },
    { id: "moonshotai/kimi-k2.5", maxOutput: 32768, contextWindowTokens: 262144, releasedAt: "2026-01-27", temperature: 1 },
    { id: "moonshotai/kimi-k2-thinking", maxOutput: 65536, contextWindowTokens: 262144, temperature: 1 },
    { id: "moonshotai/kimi-k2-0905", maxOutput: 8192, contextWindowTokens: 262144 },
    { id: "moonshotai/kimi-k2-instruct", maxOutput: 8192, contextWindowTokens: 131072 },
    // --- MiniMax ---
    { id: "minimax/minimax-m2.7", maxOutput: 32768, contextWindowTokens: 204800, enabled: true },
    { id: "minimax/minimax-m2.7-highspeed", maxOutput: 32768, contextWindowTokens: 204800 },
    { id: "minimax/minimax-m2.5", maxOutput: 32768, contextWindowTokens: 196608 },
    { id: "minimax/minimax-m2.5-highspeed", maxOutput: 32768, contextWindowTokens: 196608 },
    { id: "minimax/minimax-m2.1", maxOutput: 32768, contextWindowTokens: 204800 },
    { id: "minimax/minimax-m2", maxOutput: 32768, contextWindowTokens: 204800 },
    // --- 智谱 GLM ---
    { id: "zai-org/glm-5.1", maxOutput: 16384, contextWindowTokens: 202752, enabled: true, releasedAt: "2026-04-23" },
    { id: "zai-org/glm-5", maxOutput: 16384, contextWindowTokens: 202752 },
    { id: "zai-org/glm-5-turbo", maxOutput: 16384, contextWindowTokens: 131072 },
    { id: "zai-org/glm-4.7", maxOutput: 16384, contextWindowTokens: 202752 },
    { id: "zai-org/glm-4.7-flash", maxOutput: 16384, contextWindowTokens: 131072 },
    { id: "zai-org/glm-4.6", maxOutput: 16384, contextWindowTokens: 202752 },
    { id: "zai-org/glm-4.5", maxOutput: 16384, contextWindowTokens: 131072 },
    { id: "zai-org/glm-4.5-air", maxOutput: 16384, contextWindowTokens: 131072 },
    // --- Qwen 系列 ---
    { id: "qwen/qwen3.6-27b", maxOutput: 65536, contextWindowTokens: 262144, enabled: true, releasedAt: "2026-04-23" },
    { id: "qwen/qwen3.5-plus", maxOutput: 65536, contextWindowTokens: 1000000, enabled: true },
    { id: "qwen/qwen3.5-397b-a17b", maxOutput: 65536, contextWindowTokens: 262144 },
    { id: "qwen/qwen3.5-122b-a10b", maxOutput: 65536, contextWindowTokens: 262144 },
    { id: "qwen/qwen3.5-35b-a3b", maxOutput: 65536, contextWindowTokens: 262144 },
    { id: "qwen/qwen3.5-27b", maxOutput: 65536, contextWindowTokens: 262144 },
    { id: "qwen/qwen3-coder-next", maxOutput: 65536, contextWindowTokens: 262144 },
    { id: "qwen/qwen3-coder-480b-a35b-instruct", maxOutput: 65536, contextWindowTokens: 262144 },
    { id: "qwen/qwen3-next-80b-a3b-instruct", maxOutput: 32768, contextWindowTokens: 131072 },
    { id: "qwen/qwen3-next-80b-a3b-thinking", maxOutput: 32768, contextWindowTokens: 131072 },
    { id: "qwen/qwen3-235b-a22b-instruct-2507", maxOutput: 32768, contextWindowTokens: 131072 },
    { id: "qwen/qwen3-235b-a22b-thinking-2507", maxOutput: 32768, contextWindowTokens: 131072 },
    { id: "qwen/qwen3-235b-a22b-fp8", maxOutput: 8192, contextWindowTokens: 131072 },
    { id: "qwen/qwen3-32b-fp8", maxOutput: 8192, contextWindowTokens: 131072 },
    { id: "qwen/qwen3-30b-a3b-fp8", maxOutput: 8192, contextWindowTokens: 131072 },
    { id: "qwen/qwen-2.5-72b-instruct", maxOutput: 8192, contextWindowTokens: 32768 },
    // --- 百度 ERNIE 4.5 ---
    { id: "baidu/ernie-4.5-300b-a47b-paddle", maxOutput: 8192, contextWindowTokens: 131072 },
    { id: "baidu/ernie-4.5-21B-a3b", maxOutput: 8192, contextWindowTokens: 131072 },
    { id: "baidu/ernie-4.5-21b-a3b-thinking", maxOutput: 32768, contextWindowTokens: 131072 },
    // --- 小米 MiMo ---
    { id: "xiaomimimo/mimo-v2-pro", maxOutput: 16384, contextWindowTokens: 131072 },
    { id: "xiaomimimo/mimo-v2-flash", maxOutput: 16384, contextWindowTokens: 131072 },
    // --- PPIO 自研 ---
    { id: "ppio-4b", maxOutput: 8192, contextWindowTokens: 32768 },
    { id: "kat-coder", maxOutput: 32768, contextWindowTokens: 131072 },
  ],
};
