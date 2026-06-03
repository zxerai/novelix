/**
 * GitHub Copilot
 *
 * - 官网：https://github.com/features/copilot
 * - 通过 GitHub OAuth 获取 token 后走 Copilot API，jiaos 用它作为 LLM 入口需要用户已有 Copilot 订阅。
 * - 接入细节：https://docs.github.com/en/copilot
 */
import type { JiaosEndpoint } from "../types.js";

export const GITHUB_COPILOT: JiaosEndpoint = {
  id: "githubCopilot",
  label: "GitHub Copilot",
  group: "local",
  api: "openai-responses",
  baseUrl: "https://api.githubcopilot.com",
  checkModel: "gpt-4o",
  temperatureRange: [0, 2],
  defaultTemperature: 1,
  writingTemperature: 1,
  models: [
    { id: "gpt-5.4", maxOutput: 4096, contextWindowTokens: 400000, enabled: true, releasedAt: "2026-03-05" },
    { id: "gpt-5.4-mini", maxOutput: 4096, contextWindowTokens: 400000, enabled: true, releasedAt: "2026-03-18" },
    { id: "gpt-5.3-codex", maxOutput: 4096, contextWindowTokens: 400000, releasedAt: "2026-02-05" },
    { id: "gpt-5.2", maxOutput: 4096, contextWindowTokens: 192000, releasedAt: "2025-12-11" },
    { id: "gpt-5.2-codex", maxOutput: 4096, contextWindowTokens: 400000, releasedAt: "2025-12-18" },
    { id: "gpt-5.1", maxOutput: 4096, contextWindowTokens: 192000, releasedAt: "2025-11-13" },
    { id: "gpt-5-mini", maxOutput: 4096, contextWindowTokens: 192000, releasedAt: "2025-08-07" },
    { id: "gpt-4.1", maxOutput: 4096, contextWindowTokens: 128000, releasedAt: "2025-04-14" },
    { id: "claude-opus-4.6", maxOutput: 4096, contextWindowTokens: 139000, enabled: true, releasedAt: "2026-02-05" },
    { id: "claude-opus-4.6-fast", maxOutput: 4096, contextWindowTokens: 139000, releasedAt: "2026-02-05" },
    { id: "claude-sonnet-4.6", maxOutput: 4096, contextWindowTokens: 139000, enabled: true, releasedAt: "2026-02-17" },
    { id: "claude-opus-4.5", maxOutput: 4096, contextWindowTokens: 139000, releasedAt: "2025-11-24" },
    { id: "claude-sonnet-4.5", maxOutput: 4096, contextWindowTokens: 139000, releasedAt: "2025-09-29" },
    { id: "claude-haiku-4.5", maxOutput: 4096, contextWindowTokens: 139000, enabled: true, releasedAt: "2025-10-16" },
    { id: "claude-sonnet-4", maxOutput: 4096, contextWindowTokens: 139000, releasedAt: "2025-05-23" },
    { id: "gemini-3.1-pro-preview", maxOutput: 4096, contextWindowTokens: 173000, enabled: true, releasedAt: "2026-02-19" },
    { id: "gemini-3-flash-preview", maxOutput: 4096, contextWindowTokens: 173000, releasedAt: "2025-12-17" },
    { id: "gemini-2.5-pro", maxOutput: 4096, contextWindowTokens: 173000, releasedAt: "2025-06-17" },
    { id: "grok-code-fast-1", maxOutput: 4096, contextWindowTokens: 173000, enabled: true, releasedAt: "2025-08-27" },
    { id: "oswe-vscode-prime", maxOutput: 4096, contextWindowTokens: 264000, enabled: true },
    { id: "oswe-vscode-secondary", maxOutput: 4096, contextWindowTokens: 264000 },
  ],
};
