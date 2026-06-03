import { describe, it, expect } from "vitest";
import { BookConfigSchema } from "../models/book.js";
import { BookRulesSchema } from "../models/book-rules.js";

describe("BookConfig fanfic fields", () => {
  const base = {
    id: "test",
    title: "Test",
    platform: "other",
    genre: "other",
    status: "outlining",
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
  };

  it("accepts fanficMode", () => {
    const config = BookConfigSchema.parse({ ...base, fanficMode: "canon" });
    expect(config.fanficMode).toBe("canon");
  });

  it("accepts all 4 fanfic modes", () => {
    for (const mode of ["canon", "au", "ooc", "cp"]) {
      const config = BookConfigSchema.parse({ ...base, fanficMode: mode });
      expect(config.fanficMode).toBe(mode);
    }
  });

  it("accepts parentBookId", () => {
    const config = BookConfigSchema.parse({ ...base, parentBookId: "parent-book" });
    expect(config.parentBookId).toBe("parent-book");
  });

  it("parses without fanfic fields (backward compatible)", () => {
    const config = BookConfigSchema.parse(base);
    expect(config.fanficMode).toBeUndefined();
    expect(config.parentBookId).toBeUndefined();
  });

  it("rejects invalid fanfic mode", () => {
    expect(() => BookConfigSchema.parse({ ...base, fanficMode: "invalid" })).toThrow();
  });
});

describe("BookRules fanfic fields", () => {
  it("accepts fanficMode and allowedDeviations", () => {
    const rules = BookRulesSchema.parse({
      fanficMode: "au",
      allowedDeviations: ["magic system changed", "timeline shifted"],
    });
    expect(rules.fanficMode).toBe("au");
    expect(rules.allowedDeviations).toEqual(["magic system changed", "timeline shifted"]);
  });

  it("defaults allowedDeviations to empty array", () => {
    const rules = BookRulesSchema.parse({});
    expect(rules.allowedDeviations).toEqual([]);
    expect(rules.fanficMode).toBeUndefined();
  });

  it("parses without fanfic fields (backward compatible)", () => {
    const rules = BookRulesSchema.parse({
      version: "1.0",
      prohibitions: ["test"],
    });
    expect(rules.fanficMode).toBeUndefined();
    expect(rules.allowedDeviations).toEqual([]);
    expect(rules.prohibitions).toEqual(["test"]);
  });
});
