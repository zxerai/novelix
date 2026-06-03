import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { probeModelsFromUpstream } from "../llm/providers/probe.js";

describe("probeModelsFromUpstream", () => {
  const origFetch = globalThis.fetch;

  beforeEach(() => {
    globalThis.fetch = vi.fn();
  });

  afterEach(() => {
    globalThis.fetch = origFetch;
  });

  it("正常响应返回 ProbedModel 数组", async () => {
    (globalThis.fetch as any).mockResolvedValue({
      ok: true,
      json: async () => ({ data: [{ id: "gpt-4" }, { id: "gpt-3.5" }] }),
    });
    const result = await probeModelsFromUpstream("https://api.example.com/v1", "sk-test");
    expect(result).toEqual([
      { id: "gpt-4", name: "gpt-4", contextWindow: 0 },
      { id: "gpt-3.5", name: "gpt-3.5", contextWindow: 0 },
    ]);
  });

  it("非 2xx 返回空数组", async () => {
    (globalThis.fetch as any).mockResolvedValue({ ok: false });
    const result = await probeModelsFromUpstream("https://api.example.com/v1", "sk-test");
    expect(result).toEqual([]);
  });

  it("fetch 抛错返回空数组", async () => {
    (globalThis.fetch as any).mockRejectedValue(new Error("network down"));
    const result = await probeModelsFromUpstream("https://api.example.com/v1", "sk-test");
    expect(result).toEqual([]);
  });

  it("响应 json.data 不是数组返回空数组", async () => {
    (globalThis.fetch as any).mockResolvedValue({
      ok: true,
      json: async () => ({ data: "not-an-array" }),
    });
    const result = await probeModelsFromUpstream("https://api.example.com/v1", "sk-test");
    expect(result).toEqual([]);
  });

  it("baseUrl 空直接返回空数组,不发请求", async () => {
    const r1 = await probeModelsFromUpstream("", "sk-test");
    expect(r1).toEqual([]);
    expect(globalThis.fetch).not.toHaveBeenCalled();
  });

  it("apiKey 空时仍可探测不需要鉴权的本地模型端点", async () => {
    (globalThis.fetch as any).mockResolvedValue({
      ok: true,
      json: async () => ({ data: [{ id: "qwen3.6:35b-a3b" }] }),
    });

    const result = await probeModelsFromUpstream("http://localhost:11434/v1", "");

    expect(result).toEqual([{ id: "qwen3.6:35b-a3b", name: "qwen3.6:35b-a3b", contextWindow: 0 }]);
    expect(globalThis.fetch).toHaveBeenCalledWith(
      "http://localhost:11434/v1/models",
      expect.objectContaining({ headers: {} }),
    );
  });

  it("过滤掉 id 非字符串的 entry", async () => {
    (globalThis.fetch as any).mockResolvedValue({
      ok: true,
      json: async () => ({ data: [{ id: "valid" }, { id: null }, { id: 123 }, {}] }),
    });
    const result = await probeModelsFromUpstream("https://api.example.com/v1", "sk-test");
    expect(result).toEqual([{ id: "valid", name: "valid", contextWindow: 0 }]);
  });
});
