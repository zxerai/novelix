/**
 * Ollama (本地)
 *
 * - 官网：https://ollama.com/
 * - 模型广场：https://ollama.com/library
 * - API 文档：https://github.com/ollama/ollama/blob/main/docs/api.md
 *
 * - 默认 baseUrl 指向本地 11434，jiaos 通过 OpenAI 兼容模式 (/v1) 接入。
 */
import type { JiaosEndpoint } from "../types.js";

export const OLLAMA: JiaosEndpoint = {
  id: "ollama",
  label: "Ollama (本地)",
  group: "local",
  api: "openai-completions",
  baseUrl: "http://localhost:11434/v1",
  checkModel: "llama3.2:3b",
  models: [
    { id: "deepseek-v3.1:671b", maxOutput: 4096, contextWindowTokens: 163840 },
    { id: "gpt-oss:20b", maxOutput: 4096, contextWindowTokens: 131072, releasedAt: "2025-08-05" },
    { id: "gpt-oss:120b", maxOutput: 4096, contextWindowTokens: 131072, releasedAt: "2025-08-05" },
    { id: "qwen3-coder:480b", maxOutput: 4096, contextWindowTokens: 262144 },
    { id: "deepseek-r1", maxOutput: 4096, contextWindowTokens: 65536 },
    { id: "deepseek-v3", maxOutput: 4096, contextWindowTokens: 65536 },
    { id: "llama3.1", maxOutput: 4096, contextWindowTokens: 128000 },
    { id: "llama3.1:70b", maxOutput: 4096, contextWindowTokens: 128000 },
    { id: "llama3.1:405b", maxOutput: 4096, contextWindowTokens: 128000 },
    { id: "codellama", maxOutput: 4096, contextWindowTokens: 16384 },
    { id: "codellama:13b", maxOutput: 4096, contextWindowTokens: 16384 },
    { id: "codellama:34b", maxOutput: 4096, contextWindowTokens: 16384 },
    { id: "codellama:70b", maxOutput: 4096, contextWindowTokens: 16384 },
    { id: "qwq", maxOutput: 4096, contextWindowTokens: 128000, releasedAt: "2024-11-28" },
    { id: "qwen3", maxOutput: 4096, contextWindowTokens: 65536 },
    { id: "qwen2.5:0.5b", maxOutput: 4096, contextWindowTokens: 128000 },
    { id: "qwen2.5:1.5b", maxOutput: 4096, contextWindowTokens: 128000 },
    { id: "qwen2.5", maxOutput: 4096, contextWindowTokens: 128000 },
    { id: "qwen2.5:72b", maxOutput: 4096, contextWindowTokens: 128000 },
    { id: "codeqwen", maxOutput: 4096, contextWindowTokens: 65536 },
    { id: "qwen2:0.5b", maxOutput: 4096, contextWindowTokens: 128000 },
    { id: "qwen2:1.5b", maxOutput: 4096, contextWindowTokens: 128000 },
    { id: "qwen2", maxOutput: 4096, contextWindowTokens: 128000 },
    { id: "qwen2:72b", maxOutput: 4096, contextWindowTokens: 128000 },
    { id: "gemma2:2b", maxOutput: 4096, contextWindowTokens: 8192 },
    { id: "gemma2", maxOutput: 4096, contextWindowTokens: 8192 },
    { id: "gemma2:27b", maxOutput: 4096, contextWindowTokens: 8192 },
    { id: "codegemma:2b", maxOutput: 4096, contextWindowTokens: 8192 },
    { id: "codegemma", maxOutput: 4096, contextWindowTokens: 8192 },
    { id: "phi3", maxOutput: 4096, contextWindowTokens: 128000 },
    { id: "phi3:14b", maxOutput: 4096, contextWindowTokens: 128000 },
    { id: "wizardlm2", maxOutput: 4096, contextWindowTokens: 32768 },
    { id: "wizardlm2:8x22b", maxOutput: 4096, contextWindowTokens: 65536 },
    { id: "mathstral", maxOutput: 4096, contextWindowTokens: 32768 },
    { id: "mistral", maxOutput: 4096, contextWindowTokens: 32768 },
    { id: "mixtral", maxOutput: 4096, contextWindowTokens: 32768 },
    { id: "mixtral:8x22b", maxOutput: 4096, contextWindowTokens: 65536 },
    { id: "mistral-large", maxOutput: 4096, contextWindowTokens: 128000 },
    { id: "mistral-nemo", maxOutput: 4096, contextWindowTokens: 128000 },
    { id: "codestral", maxOutput: 4096, contextWindowTokens: 32768 },
    { id: "aya", maxOutput: 4096, contextWindowTokens: 8192 },
    { id: "aya:35b", maxOutput: 4096, contextWindowTokens: 8192 },
    { id: "command-r", maxOutput: 4096, contextWindowTokens: 131072 },
    { id: "command-r-plus", maxOutput: 4096, contextWindowTokens: 131072 },
    { id: "deepseek-v2", maxOutput: 4096, contextWindowTokens: 32768 },
    { id: "deepseek-v2:236b", maxOutput: 4096, contextWindowTokens: 128000 },
    { id: "deepseek-coder-v2", maxOutput: 4096, contextWindowTokens: 128000 },
    { id: "deepseek-coder-v2:236b", maxOutput: 4096, contextWindowTokens: 128000 },
    { id: "llava", maxOutput: 4096, contextWindowTokens: 4096 },
    { id: "llava:13b", maxOutput: 4096, contextWindowTokens: 4096 },
    { id: "llava:34b", maxOutput: 4096, contextWindowTokens: 4096 },
    { id: "minicpm-v", maxOutput: 4096, contextWindowTokens: 128000 },
  ],
};
