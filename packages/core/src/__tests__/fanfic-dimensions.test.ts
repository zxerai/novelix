import { describe, it, expect } from "vitest";
import { getFanficDimensionConfig, FANFIC_DIMENSIONS } from "../agents/fanfic-dimensions.js";

describe("getFanficDimensionConfig", () => {
  it("returns 4 active fanfic dimensions for all modes", () => {
    for (const mode of ["canon", "au", "ooc", "cp"] as const) {
      const config = getFanficDimensionConfig(mode);
      expect(config.activeIds).toHaveLength(4);
      expect(config.activeIds).toEqual([34, 35, 36, 37]);
    }
  });

  it("deactivates spinoff dims 28-31 in all modes", () => {
    for (const mode of ["canon", "au", "ooc", "cp"] as const) {
      const config = getFanficDimensionConfig(mode);
      expect(config.deactivatedIds).toEqual([28, 29, 30, 31]);
    }
  });

  it("canon mode: dims 34,35,37 are critical, 36 is warning", () => {
    const config = getFanficDimensionConfig("canon");
    expect(config.severityOverrides.get(34)).toBe("critical");
    expect(config.severityOverrides.get(35)).toBe("critical");
    expect(config.severityOverrides.get(36)).toBe("warning");
    expect(config.severityOverrides.get(37)).toBe("critical");
  });

  it("au mode: dim 34 critical, dims 35,37 info, 36 warning", () => {
    const config = getFanficDimensionConfig("au");
    expect(config.severityOverrides.get(34)).toBe("critical");
    expect(config.severityOverrides.get(35)).toBe("info");
    expect(config.severityOverrides.get(37)).toBe("info");
  });

  it("ooc mode: relaxes OOC check (dim 1) to info", () => {
    const config = getFanficDimensionConfig("ooc");
    expect(config.severityOverrides.get(1)).toBe("info");
    expect(config.severityOverrides.get(34)).toBe("info");
  });

  it("cp mode: dim 36 (关系动态) is critical", () => {
    const config = getFanficDimensionConfig("cp");
    expect(config.severityOverrides.get(36)).toBe("critical");
  });

  it("canon mode: enhances OOC check note", () => {
    const config = getFanficDimensionConfig("canon");
    expect(config.notes.get(1)).toContain("fanfic_canon.md");
  });

  it("all dims have notes", () => {
    const config = getFanficDimensionConfig("canon");
    for (const dim of FANFIC_DIMENSIONS) {
      expect(config.notes.has(dim.id)).toBe(true);
      expect(config.notes.get(dim.id)!.length).toBeGreaterThan(0);
    }
  });
});
