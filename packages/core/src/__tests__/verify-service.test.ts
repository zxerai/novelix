import { describe, it, expect, vi, afterEach } from "vitest";
import { verifyService } from "../llm/providers/verify.js";

describe("verifyService (B9)", () => {
  const originalFetch = global.fetch;

  afterEach(() => {
    global.fetch = originalFetch;
    vi.restoreAllMocks();
  });

  it("probe 成功 → probe.ok=true + chat 字段非 null（chat 步骤被执行）", async () => {
    global.fetch = vi.fn()
      // probe /models 成功
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: [{ id: "gpt-4o" }, { id: "gpt-4o-mini" }] }),
      } as any)
      // 后续 chat 请求失败（测试环境没真实 openai SDK 支持），但这 OK —— 只要 chat 被尝试了就行
      .mockRejectedValue(new Error("test: no real chat backend"));

    const result = await verifyService("openai", "sk-test");
    expect(result.probe.ok).toBe(true);
    expect(result.probe.models).toBe(2);
    // chat 字段不为 null 说明 checkModel 存在 + chat 步骤被执行（ok=true/false 都可以）
    expect(result.chat).not.toBeNull();
    expect(typeof result.chat?.ok).toBe("boolean");
    expect(result.chat?.latencyMs).toBeGreaterThanOrEqual(0);
  });

  it("probe 401 → probe.ok=false, error 带 401", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 401,
      statusText: "Unauthorized",
    } as any) as typeof fetch;

    const result = await verifyService("openai", "wrong-key");
    expect(result.probe.ok).toBe(false);
    expect(result.probe.error).toContain("401");
  });

  it("probe 网络挂 → probe.ok=false, error 是 fetch 错误", async () => {
    global.fetch = vi.fn().mockRejectedValue(new Error("ECONNREFUSED")) as typeof fetch;
    const result = await verifyService("openai", "sk-test");
    expect(result.probe.ok).toBe(false);
    expect(result.probe.error).toContain("ECONNREFUSED");
  });

  it("probe 使用显式 proxyUrl 连接 /models", async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: [{ id: "gpt-4o" }] }),
      } as any)
      .mockRejectedValue(new Error("test: no real chat backend"));
    global.fetch = fetchMock as typeof fetch;

    const result = await verifyService("openai", "sk-test", { proxyUrl: "http://127.0.0.1:9910" });
    expect(result.probe.ok).toBe(true);
    expect(fetchMock.mock.calls[0]?.[1]).toMatchObject({
      dispatcher: expect.any(Object),
    });
  });

  it("provider 没 checkModel（custom baseUrl 空）→ chat 字段返回 null，不发 chat 请求", async () => {
    // custom 没 checkModel，verifyService 跳过 chat step
    const result = await verifyService("custom", "sk-x");
    expect(result.chat).toBeNull();
  });

  it("未知 service → probe 报 '无 baseUrl'", async () => {
    const result = await verifyService("nonexistent-xyz", "sk-test");
    expect(result.probe.ok).toBe(false);
    expect(result.probe.error).toContain("baseUrl");
  });
});
