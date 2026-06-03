import { afterEach, describe, expect, it, vi } from "vitest";

afterEach(() => {
  vi.doUnmock("../notify/telegram.js");
  vi.resetModules();
});

describe("core root exports", () => {
  it("does not load Telegram notification transport during root import", async () => {
    vi.resetModules();
    vi.doMock("../notify/telegram.js", () => {
      throw new Error("telegram module should not load during root import");
    });

    const core = await import("../index.js");

    expect(core).toHaveProperty("PipelineRunner");
    expect(core).toHaveProperty("sendTelegram");
  }, 10_000);
});
