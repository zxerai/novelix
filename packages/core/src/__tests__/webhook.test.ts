import { describe, it, expect, vi, beforeEach } from "vitest";
import { sendWebhook, type WebhookPayload } from "../notify/webhook.js";
import { createHmac } from "node:crypto";

const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);

beforeEach(() => {
  mockFetch.mockReset();
});

const basePayload: WebhookPayload = {
  event: "chapter-complete",
  bookId: "test-book",
  chapterNumber: 5,
  timestamp: "2026-03-14T00:00:00.000Z",
  data: { title: "测试章节", wordCount: 3000 },
};

describe("sendWebhook", () => {
  it("sends POST request with JSON payload", async () => {
    mockFetch.mockResolvedValueOnce({ ok: true });

    await sendWebhook({ url: "https://example.com/hook" }, basePayload);

    expect(mockFetch).toHaveBeenCalledOnce();
    const [url, opts] = mockFetch.mock.calls[0]!;
    expect(url).toBe("https://example.com/hook");
    expect(opts.method).toBe("POST");
    expect(opts.headers["Content-Type"]).toBe("application/json");
    const body = JSON.parse(opts.body);
    expect(body.event).toBe("chapter-complete");
    expect(body.bookId).toBe("test-book");
  });

  it("includes HMAC signature when secret is configured", async () => {
    mockFetch.mockResolvedValueOnce({ ok: true });
    const secret = "my-secret-key";

    await sendWebhook({ url: "https://example.com/hook", secret }, basePayload);

    const [, opts] = mockFetch.mock.calls[0]!;
    const expectedSig = createHmac("sha256", secret)
      .update(opts.body)
      .digest("hex");
    expect(opts.headers["X-JiaOS-Signature"]).toBe(`sha256=${expectedSig}`);
  });

  it("skips event when not in subscribed events list", async () => {
    await sendWebhook(
      { url: "https://example.com/hook", events: ["audit-passed"] },
      basePayload,
    );

    expect(mockFetch).not.toHaveBeenCalled();
  });

  it("sends event when it matches subscribed events list", async () => {
    mockFetch.mockResolvedValueOnce({ ok: true });

    await sendWebhook(
      { url: "https://example.com/hook", events: ["chapter-complete"] },
      basePayload,
    );

    expect(mockFetch).toHaveBeenCalledOnce();
  });

  it("sends all events when events list is empty", async () => {
    mockFetch.mockResolvedValueOnce({ ok: true });

    await sendWebhook(
      { url: "https://example.com/hook", events: [] },
      basePayload,
    );

    expect(mockFetch).toHaveBeenCalledOnce();
  });

  it("throws on non-ok response", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 500,
      text: async () => "Internal Server Error",
    });

    await expect(
      sendWebhook({ url: "https://example.com/hook" }, basePayload),
    ).rejects.toThrow("Webhook POST to https://example.com/hook failed: 500");
  });
});
