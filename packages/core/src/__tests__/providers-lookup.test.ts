import { describe, it, expect } from "vitest";
import { lookupModel, listEnabledModels } from "../llm/providers/lookup.js";

describe("lookupModel", () => {
  describe("Layer 1（已知 provider 精确查）", () => {
    it("anthropic 下 claude-sonnet-4-6 命中 provider.models", () => {
      const hit = lookupModel("anthropic", "claude-sonnet-4-6");
      expect(hit).toBeDefined();
      expect(hit?.maxOutput).toBe(64_000);
      expect(hit?.contextWindowTokens).toBe(1_000_000);
    });

    it("openai 下 gpt-4o 命中", () => {
      const hit = lookupModel("openai", "gpt-4o");
      expect(hit).toBeDefined();
      expect(hit?.maxOutput).toBe(4096);
      expect(hit?.contextWindowTokens).toBe(128_000);
    });

    it("大小写不敏感", () => {
      const hit = lookupModel("anthropic", "CLAUDE-SONNET-4-6");
      expect(hit?.maxOutput).toBe(64_000);
    });
  });

  describe("Layer 2（全局扫按优先级）", () => {
    it("custom 下 gpt-4o 命中 openai provider", () => {
      const hit = lookupModel("custom", "gpt-4o");
      expect(hit?.maxOutput).toBe(4096);
    });

    it("custom 下 claude-sonnet-4-6 命中 anthropic provider", () => {
      const hit = lookupModel("custom", "claude-sonnet-4-6");
      expect(hit?.maxOutput).toBe(64_000);
    });

    it("未知 id 返回 undefined", () => {
      const hit = lookupModel("custom", "my-private-llm-does-not-exist");
      expect(hit).toBeUndefined();
    });
  });

  describe("Layer 2 优先级排序（B 组之后会覆盖更多场景）", () => {
    it("当同 id 在多个 provider 都存在时按 PROVIDER_PRIORITY 排序", () => {
      const hit = lookupModel("custom", "deepseek-chat");
      expect(hit?.maxOutput).toBeGreaterThan(0);
    });
  });
});

describe("Layer 2 优先级（聚合入口精简后）", () => {
  it("deepseek/deepseek-r1-0528 命中保留的 OpenRouter provider", () => {
    const hit = lookupModel("custom", "deepseek/deepseek-r1-0528");
    expect(hit).toBeDefined();
    expect(hit?.maxOutput).toBe(4096);
  });

  it("OpenRouter 专属带后缀 id（:free）命中 openrouter provider", () => {
    const hit = lookupModel("custom", "google/gemma-2-9b-it:free");
    expect(hit).toBeDefined();
    expect(hit?.maxOutput).toBe(4096);
  });

  it("已下架默认入口的 PPIO 不再参与 provider 精确查找", () => {
    const hit = lookupModel("ppio", "deepseek/deepseek-v3.2");
    expect(hit).toBeUndefined();
  });
});

describe("listEnabledModels", () => {
  it("返回 provider 里 enabled !== false 的 models", () => {
    const models = listEnabledModels("anthropic");
    expect(models.length).toBeGreaterThan(0);
    expect(models.every((m) => m.enabled !== false)).toBe(true);
  });

  it("未知 service 返回空数组", () => {
    const models = listEnabledModels("nope");
    expect(models).toEqual([]);
  });
});
