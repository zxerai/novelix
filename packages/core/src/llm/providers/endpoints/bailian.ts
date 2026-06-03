/**
 * 阿里云百炼（DashScope）— Anthropic 通道
 *
 * - 控制台：https://bailian.console.aliyun.com/
 * - API key：https://bailian.console.aliyun.com/?tab=model#/api-key
 * - 模型列表：https://help.aliyun.com/zh/model-studio/getting-started/models
 * - Anthropic 兼容接入：https://help.aliyun.com/zh/model-studio/developer-reference/use-anthropic-sdk
 *
 * jiaos 用 /apps/anthropic 接入（agent 场景工具调用更稳）。
 *
 * **重要**：百炼有两条通道，模型清单**不完全对等**：
 *   - OpenAI 兼容（/compatible-mode/v1）：全量 236+ 模型（qwen3.6、kimi-k2.6、deepseek-v3.2 等）
 *   - Anthropic 兼容（/apps/anthropic）：精选 20+ 模型，主要是 qwen 主力 + 少数代理（kimi-k2.5、
 *     kimi-k2-thinking、MiniMax-M2.5/2.1、glm-5/5.1/4.7/4.6）
 *
 * 下面的清单是 2026-04-23 对 /apps/anthropic 通道逐一 live 验证过的子集，
 * 不能从 OpenAI 通道的 /models 清单直接抄——kimi-k2.6、deepseek-v3.2、
 * qwen3-235b / qwen3-32b 等 OpenAI 通道支持的 id，Anthropic 通道会 400。
 *
 * 同理：不设 modelsBaseUrl 让 live /models probe 走 OpenAI 通道，那会拉到
 * 大量 Anthropic 通道不支持的 id，用户选了就 400。这里宁可只用 bank 兜底。
 */
import type { JiaosEndpoint } from "../types.js";

export const BAILIAN: JiaosEndpoint = {
  id: "bailian",
  label: "百炼 (通义千问)",
  group: "china",
  api: "anthropic-messages",
  baseUrl: "https://dashscope.aliyuncs.com/apps/anthropic",
  checkModel: "qwen-turbo",
  temperatureRange: [0, 2],
  defaultTemperature: 0.7,
  writingTemperature: 1,
  models: [
    // --- Qwen3.6 系列（2026-04 发布，Anthropic 通道已放开） ---
    { id: "qwen3.6-max-preview", maxOutput: 65536, contextWindowTokens: 262144, enabled: true, releasedAt: "2026-04-21" },
    { id: "qwen3.6-plus", maxOutput: 65536, contextWindowTokens: 1000000, enabled: true, releasedAt: "2026-04-09" },
    { id: "qwen3.6-flash", maxOutput: 65536, contextWindowTokens: 1000000, enabled: true, releasedAt: "2026-04-17" },
    { id: "qwen3.6-27b", maxOutput: 65536, contextWindowTokens: 262144, releasedAt: "2026-04-23" },
    // --- Qwen3.5 系列 ---
    { id: "qwen3.5-plus", maxOutput: 65536, contextWindowTokens: 1000000, enabled: true, releasedAt: "2026-02-15" },
    { id: "qwen3.5-flash", maxOutput: 65536, contextWindowTokens: 1000000, enabled: true, releasedAt: "2026-02-24" },
    { id: "qwen3.5-397b-a17b", maxOutput: 65536, contextWindowTokens: 262144, releasedAt: "2026-02-16" },
    { id: "qwen3.5-122b-a10b", maxOutput: 65536, contextWindowTokens: 262144, releasedAt: "2026-02-24" },
    { id: "qwen3.5-35b-a3b", maxOutput: 65536, contextWindowTokens: 262144, releasedAt: "2026-02-24" },
    { id: "qwen3.5-27b", maxOutput: 65536, contextWindowTokens: 262144, releasedAt: "2026-02-24" },
    // --- Qwen 通用 ---
    { id: "qwen3-max", maxOutput: 65536, contextWindowTokens: 262144, enabled: true, releasedAt: "2026-01-23" },
    { id: "qwen3-max-preview", maxOutput: 65536, contextWindowTokens: 262144, releasedAt: "2025-10-30" },
    { id: "qwen-max", maxOutput: 8192, contextWindowTokens: 131072 },
    { id: "qwen-plus", maxOutput: 32768, contextWindowTokens: 1000000 },
    { id: "qwen-flash", maxOutput: 32768, contextWindowTokens: 1000000, releasedAt: "2025-07-28" },
    { id: "qwen-turbo", maxOutput: 16384, contextWindowTokens: 1000000, releasedAt: "2025-07-15" },
    // --- 第三方代理（Anthropic 通道放开的那部分） ---
    { id: "kimi-k2.5", maxOutput: 32768, contextWindowTokens: 262144, temperature: 1 },
    { id: "kimi-k2-thinking", maxOutput: 16384, contextWindowTokens: 262144, releasedAt: "2025-11-10", temperature: 1 },
    { id: "MiniMax-M2.5", maxOutput: 32768, contextWindowTokens: 196608 },
    { id: "MiniMax-M2.1", maxOutput: 32768, contextWindowTokens: 204800 },
    { id: "glm-5.1", maxOutput: 16384, contextWindowTokens: 202752, enabled: true, releasedAt: "2026-04-23" },
    { id: "glm-5", maxOutput: 16384, contextWindowTokens: 202752 },
    { id: "glm-4.7", maxOutput: 16384, contextWindowTokens: 202752 },
    { id: "glm-4.6", maxOutput: 16384, contextWindowTokens: 202752 },
  ],
};
