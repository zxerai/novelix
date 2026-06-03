import { describe, it, expect, vi, beforeEach } from "vitest";
import { detectAIContent } from "../agents/detector.js";
import type { DetectionConfig } from "../models/project.js";

const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);

beforeEach(() => {
  mockFetch.mockReset();
  vi.stubEnv("TEST_API_KEY", "test-key-123");
});

const baseConfig: DetectionConfig = {
  provider: "custom",
  apiUrl: "https://api.detect.test/v1/detect",
  apiKeyEnv: "TEST_API_KEY",
  threshold: 0.5,
  enabled: true,
  autoRewrite: false,
  maxRetries: 3,
};

describe("detectAIContent", () => {
  it("throws when API key env is not set", async () => {
    vi.stubEnv("MISSING_KEY", "");
    delete process.env.MISSING_KEY;
    const config = { ...baseConfig, apiKeyEnv: "MISSING_KEY" };
    await expect(detectAIContent(config, "test")).rejects.toThrow("Detection API key not found");
  });

  it("calls custom API with correct headers and body", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ score: 0.75 }),
    });

    const result = await detectAIContent(baseConfig, "test content");

    expect(mockFetch).toHaveBeenCalledOnce();
    const [url, opts] = mockFetch.mock.calls[0]!;
    expect(url).toBe("https://api.detect.test/v1/detect");
    expect(opts.headers.Authorization).toBe("Bearer test-key-123");
    expect(result.score).toBe(0.75);
    expect(result.provider).toBe("custom");
  });

  it("handles GPTZero provider format", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        documents: [{ completely_generated_prob: 0.92 }],
      }),
    });

    const gptzeroConfig = { ...baseConfig, provider: "gptzero" as const };
    const result = await detectAIContent(gptzeroConfig, "test content");

    expect(result.score).toBe(0.92);
    expect(result.provider).toBe("gptzero");
  });

  it("handles Originality provider format", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        score: { ai: 0.3, original: 0.7 },
      }),
    });

    const origConfig = { ...baseConfig, provider: "originality" as const };
    const result = await detectAIContent(origConfig, "test content");

    expect(result.score).toBe(0.3);
    expect(result.provider).toBe("originality");
  });

  it("throws on non-ok response", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 429,
      text: async () => "Rate limited",
    });

    await expect(detectAIContent(baseConfig, "test")).rejects.toThrow("Detection API failed: 429");
  });
});
