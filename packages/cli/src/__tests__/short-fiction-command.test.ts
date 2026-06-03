import { describe, expect, it } from "vitest";
import { createProgram } from "../program.js";
import { extractResponsesImageBase64, resolveCoverApiKey } from "../commands/short-fiction.js";

describe("short command", () => {
  it("registers public short run command", () => {
    const program = createProgram();
    const short = program.commands.find((command) => command.name() === "short");
    expect(short).toBeDefined();
    expect(short?.commands.some((command) => command.name() === "run")).toBe(true);
  });

  it("exposes cover generation options on short run", () => {
    const program = createProgram();
    const short = program.commands.find((command) => command.name() === "short");
    const run = short?.commands.find((command) => command.name() === "run");
    const optionNames = new Set(run?.options.map((option) => option.long));

    expect(optionNames).toContain("--cover-base-url");
    expect(optionNames).toContain("--cover-endpoint");
    expect(optionNames).toContain("--cover-model");
    expect(optionNames).toContain("--cover-size");
    expect(optionNames).toContain("--cover-api-key-env");
    expect(optionNames).toContain("--no-cover");
  });

  it("extracts base64 image output from a Responses image_generation_call", () => {
    const payload = {
      output: [
        { type: "message", content: [{ type: "output_text", text: "ok" }] },
        { type: "image_generation_call", result: "iVBORw0KGgo=" },
      ],
    };

    expect(extractResponsesImageBase64(payload)).toBe("iVBORw0KGgo=");
  });

  it("requires an explicit cover API key", () => {
    const oldValue = process.env.JIAOS_TEST_MISSING_COVER_KEY;
    delete process.env.JIAOS_TEST_MISSING_COVER_KEY;
    try {
      expect(() => resolveCoverApiKey("JIAOS_TEST_MISSING_COVER_KEY")).toThrow(/API key/i);
    } finally {
      if (oldValue === undefined) delete process.env.JIAOS_TEST_MISSING_COVER_KEY;
      else process.env.JIAOS_TEST_MISSING_COVER_KEY = oldValue;
    }
  });
});
