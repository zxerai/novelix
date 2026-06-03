/**
 * Google Gemini
 *
 * - 官网：https://ai.google.dev/
 * - 控制台 / API key：https://aistudio.google.com/app/apikey
 * - API 文档：https://ai.google.dev/gemini-api/docs
 * - 模型列表：https://ai.google.dev/gemini-api/docs/models
 * - OpenAI 兼容接入：https://ai.google.dev/gemini-api/docs/openai
 */
import type { JiaosEndpoint } from "../types.js";

export const GOOGLE: JiaosEndpoint = {
  id: "google",
  label: "Google Gemini",
  group: "overseas",
  api: "google-generative-ai",
  baseUrl: "https://generativelanguage.googleapis.com/v1beta",
  modelsBaseUrl: "https://generativelanguage.googleapis.com/v1beta/openai",
  checkModel: "gemini-2.5-flash",
  temperatureRange: [0, 2],
  defaultTemperature: 1,
  writingTemperature: 1,
  models: [
    { id: "gemini-pro-latest", maxOutput: 65536, contextWindowTokens: 1114112 },
    { id: "gemini-flash-latest", maxOutput: 65536, contextWindowTokens: 1114112 },
    { id: "gemini-flash-lite-latest", maxOutput: 65536, contextWindowTokens: 1114112 },
    { id: "gemini-3.1-flash-image-preview", maxOutput: 32768, contextWindowTokens: 163840, enabled: false, status: "nonText", capabilities: { text: false, imageOutput: true }, releasedAt: "2026-02-26" },
    { id: "gemini-3.1-pro-preview", maxOutput: 65536, contextWindowTokens: 1114112, enabled: true, releasedAt: "2026-02-19" },
    { id: "gemini-3.1-flash-lite-preview", maxOutput: 65536, contextWindowTokens: 1114112, enabled: true, releasedAt: "2026-03-04" },
    { id: "gemini-3-flash-preview", maxOutput: 65536, contextWindowTokens: 1114112, enabled: true, releasedAt: "2025-12-17" },
    { id: "gemini-3-pro-image-preview", maxOutput: 32768, contextWindowTokens: 163840, enabled: false, status: "nonText", capabilities: { text: false, imageOutput: true }, releasedAt: "2025-11-20" },
    { id: "gemini-2.5-pro", maxOutput: 65536, contextWindowTokens: 1114112, releasedAt: "2025-06-17" },
    { id: "gemini-2.5-flash", maxOutput: 65536, contextWindowTokens: 1114112, releasedAt: "2025-06-17" },
    { id: "gemini-2.5-flash-image", maxOutput: 32768, contextWindowTokens: 98304, enabled: false, status: "nonText", capabilities: { text: false, imageOutput: true }, releasedAt: "2025-08-26" },
    { id: "gemini-2.5-flash-lite", maxOutput: 65536, contextWindowTokens: 1114112, releasedAt: "2025-07-22" },
    { id: "gemini-2.5-flash-lite-preview-09-2025", maxOutput: 65536, contextWindowTokens: 1114112, releasedAt: "2025-09-25" },
    { id: "gemini-2.0-flash", maxOutput: 8192, contextWindowTokens: 1056768, releasedAt: "2025-02-05" },
    { id: "gemini-2.0-flash-001", maxOutput: 8192, contextWindowTokens: 1056768, releasedAt: "2025-02-05" },
    { id: "gemini-2.0-flash-lite", maxOutput: 8192, contextWindowTokens: 1056768, releasedAt: "2025-02-05" },
    { id: "gemini-2.0-flash-lite-001", maxOutput: 8192, contextWindowTokens: 1056768, releasedAt: "2025-02-05" },
    { id: "gemini-1.5-flash-002", maxOutput: 8192, contextWindowTokens: 1008192, releasedAt: "2024-09-25" },
    { id: "gemini-1.5-pro-002", maxOutput: 8192, contextWindowTokens: 2008192, releasedAt: "2024-09-24" },
    { id: "gemini-1.5-flash-8b-latest", maxOutput: 8192, contextWindowTokens: 1008192, releasedAt: "2024-10-03" },
    { id: "gemma-3-1b-it", maxOutput: 8192, contextWindowTokens: 40960 },
    { id: "gemma-3-4b-it", maxOutput: 8192, contextWindowTokens: 40960 },
    { id: "gemma-3-12b-it", maxOutput: 8192, contextWindowTokens: 40960 },
    { id: "gemma-3-27b-it", maxOutput: 8192, contextWindowTokens: 139264 },
    { id: "gemma-3n-e2b-it", maxOutput: 2048, contextWindowTokens: 10240 },
    { id: "gemma-3n-e4b-it", maxOutput: 2048, contextWindowTokens: 10240 },
  ],
};
