import { describe, expect, it } from "vitest";
import { parseLLMOverridesFromArgv } from "../utils.js";

describe("parseLLMOverridesFromArgv", () => {
  it("parses service/model/api key env and transport overrides from CLI argv", () => {
    expect(parseLLMOverridesFromArgv([
      "write",
      "next",
      "--service",
      "google",
      "--model=gemini-2.5-flash",
      "--api-key-env",
      "GOOGLE_API_KEY",
      "--api-format",
      "chat",
      "--no-stream",
    ])).toEqual({
      service: "google",
      model: "gemini-2.5-flash",
      apiKeyEnv: "GOOGLE_API_KEY",
      apiFormat: "chat",
      stream: false,
    });
  });
});
