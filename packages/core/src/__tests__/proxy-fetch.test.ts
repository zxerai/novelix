import { afterEach, describe, expect, it, vi } from "vitest";

const proxyAgentMock = vi.fn((url: string) => ({ kind: "proxy-agent", url }));

vi.mock("undici", () => ({
  ProxyAgent: proxyAgentMock,
}));

describe("proxy fetch helpers", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.clearAllMocks();
  });

  it("prefers explicit llm proxyUrl over environment proxy variables", async () => {
    const { fetchWithProxy, resolveProxyUrl } = await import("../utils/proxy-fetch.js");
    const fetchMock = vi.fn().mockResolvedValue({ ok: true });
    vi.stubGlobal("fetch", fetchMock);

    const env = {
      JIAOS_LLM_PROXY_URL: "http://jiaos-env-proxy:9910",
      HTTPS_PROXY: "http://standard-proxy:9910",
    };

    expect(resolveProxyUrl("http://explicit-proxy:9910", env)).toBe("http://explicit-proxy:9910");
    await fetchWithProxy("https://api.example/v1/chat/completions", { method: "POST" }, "http://explicit-proxy:9910", env);

    expect(proxyAgentMock).toHaveBeenCalledWith("http://explicit-proxy:9910");
    expect(fetchMock).toHaveBeenCalledWith(
      "https://api.example/v1/chat/completions",
      expect.objectContaining({
        method: "POST",
        dispatcher: { kind: "proxy-agent", url: "http://explicit-proxy:9910" },
      }),
    );
  });

  it("uses JIAOS_LLM_PROXY_URL before standard HTTPS_PROXY/HTTP_PROXY env vars", async () => {
    const { fetchWithProxy, resolveProxyUrl } = await import("../utils/proxy-fetch.js");
    const fetchMock = vi.fn().mockResolvedValue({ ok: true });
    vi.stubGlobal("fetch", fetchMock);

    const env = {
      JIAOS_LLM_PROXY_URL: "http://jiaos-proxy:9910",
      HTTPS_PROXY: "http://standard-proxy:9910",
      HTTP_PROXY: "http://http-proxy:9910",
    };

    expect(resolveProxyUrl(undefined, env)).toBe("http://jiaos-proxy:9910");
    await fetchWithProxy("https://api.example/v1/models", {}, undefined, env);

    expect(proxyAgentMock).toHaveBeenCalledWith("http://jiaos-proxy:9910");
    expect(fetchMock).toHaveBeenCalledWith(
      "https://api.example/v1/models",
      expect.objectContaining({
        dispatcher: { kind: "proxy-agent", url: "http://jiaos-proxy:9910" },
      }),
    );
  });

  it("does not attach a dispatcher when no proxy is configured", async () => {
    const { fetchWithProxy, resolveProxyUrl } = await import("../utils/proxy-fetch.js");
    const fetchMock = vi.fn().mockResolvedValue({ ok: true });
    vi.stubGlobal("fetch", fetchMock);

    expect(resolveProxyUrl(undefined, {})).toBeUndefined();
    await fetchWithProxy("https://api.example/v1/models", { headers: { Authorization: "Bearer test" } }, undefined, {});

    expect(proxyAgentMock).not.toHaveBeenCalled();
    expect(fetchMock).toHaveBeenCalledWith(
      "https://api.example/v1/models",
      { headers: { Authorization: "Bearer test" } },
    );
  });
});
