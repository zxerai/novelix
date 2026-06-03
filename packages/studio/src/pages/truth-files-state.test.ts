import { describe, expect, it } from "vitest";
import { deriveFilePresentation, SHIM_AUTHORITATIVE_PATH } from "./TruthFiles";

describe("deriveFilePresentation", () => {
  it("allows editing for non-legacy outline files", () => {
    const result = deriveFilePresentation("outline/story_frame.md", {
      content: "# frame",
      legacy: false,
    });
    expect(result.legacy).toBe(false);
    expect(result.canEdit).toBe(true);
    expect(result.authoritativePath).toBeNull();
  });

  it("allows editing when legacy flag is absent", () => {
    const result = deriveFilePresentation("outline/volume_map.md", {
      content: "map",
    });
    expect(result.canEdit).toBe(true);
    expect(result.legacy).toBe(false);
  });

  it("blocks editing and surfaces authoritative path when legacy: true", () => {
    const result = deriveFilePresentation("book_rules.md", {
      content: "# Legacy shim",
      legacy: true,
    });
    expect(result.legacy).toBe(true);
    expect(result.canEdit).toBe(false);
    expect(result.authoritativePath).toBe("outline/story_frame.md");
  });

  it("blocks editing for story_bible.md shim and links to story_frame.md", () => {
    const result = deriveFilePresentation("story_bible.md", {
      content: "# bible shim",
      legacy: true,
    });
    expect(result.legacy).toBe(true);
    expect(result.canEdit).toBe(false);
    expect(result.authoritativePath).toBe("outline/story_frame.md");
  });

  it("blocks editing when no file is selected", () => {
    const result = deriveFilePresentation(null, undefined);
    expect(result.canEdit).toBe(false);
  });

  it("blocks editing when file has no content (e.g. 404)", () => {
    const result = deriveFilePresentation("outline/story_frame.md", {
      content: null,
    });
    expect(result.canEdit).toBe(false);
  });
});

describe("SHIM_AUTHORITATIVE_PATH", () => {
  it("maps every shim file to its outline replacement", () => {
    expect(SHIM_AUTHORITATIVE_PATH["story_bible.md"]).toBe("outline/story_frame.md");
    expect(SHIM_AUTHORITATIVE_PATH["book_rules.md"]).toBe("outline/story_frame.md");
  });
});
