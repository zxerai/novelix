/**
 * NewAPI (自建网关)
 *
 * - New API (one-api fork)：https://github.com/Calcium-Ion/new-api
 * - 自建 OpenAI 兼容网关，模型清单由部署方自定义，jiaos 只提供协议对接。
 */
import type { JiaosEndpoint } from "../types.js";

/**
 * newapi 是 OneAPI / new-api 中转网关的锚点 provider。
 * 跟 custom 类似：baseUrl 由用户在 Studio 填（指向自己部署的 new-api 网关），
 * models 默认为空，实际可走 live /models probe（跟 custom 共用逻辑）。
 */
export const NEWAPI: JiaosEndpoint = {
  id: "newapi",
  label: "New API (中转网关)",
  group: "aggregator",
  api: "openai-completions",
  baseUrl: "",
  models: [],
};
