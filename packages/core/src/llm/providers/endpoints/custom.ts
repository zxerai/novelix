/**
 * 自定义 OpenAI 兼容端点
 *
 * - 任意兼容 OpenAI /v1/chat/completions 协议的服务都可通过此 endpoint 接入。
 * - 模型列表走 live /models probe，bank 不预置任何条目。
 */
import type { JiaosEndpoint } from "../types.js";

/**
 * custom 是"用户自填 baseUrl 的中转站"的锚点 provider。
 * models 为空——lookup 对 custom service 走 Layer 2 全局扫。
 * checkModel 为 undefined——verifyService 对 custom 只做 probe 不做 chat hello。
 * listModelsForService 对 custom 用用户填的 baseUrl 走 live /models probe，
 * 失败再 fallback 到全局 bank 反查补元数据。
 */
export const CUSTOM: JiaosEndpoint = {
  id: "custom",
  label: "自定义端点",
  api: "openai-completions",
  baseUrl: "",
  models: [],
};
