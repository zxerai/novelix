import { describe, expect, it } from "vitest";
import { deriveActiveBookId, isBookCreateChatRoute } from "./App";

describe("deriveActiveBookId", () => {
  it("returns the current book across book-centered routes", () => {
    expect(deriveActiveBookId({ page: "book", bookId: "alpha" })).toBe("alpha");
    expect(deriveActiveBookId({ page: "chapter", bookId: "beta", chapterNumber: 3 })).toBe("beta");
    expect(deriveActiveBookId({ page: "truth", bookId: "gamma" })).toBe("gamma");
    expect(deriveActiveBookId({ page: "analytics", bookId: "delta" })).toBe("delta");
    expect(deriveActiveBookId({ page: "book-settings", bookId: "epsilon" })).toBe("epsilon");
  });

  it("returns undefined for non-book routes", () => {
    expect(deriveActiveBookId({ page: "dashboard" })).toBeUndefined();
    expect(deriveActiveBookId({ page: "services" })).toBeUndefined();
    expect(deriveActiveBookId({ page: "style" })).toBeUndefined();
  });
});

describe("isBookCreateChatRoute", () => {
  it("routes new-book creation through chat instead of the standalone form page", () => {
    expect(isBookCreateChatRoute({ page: "book-create" })).toBe(true);
    expect(isBookCreateChatRoute({ page: "book", bookId: "alpha" })).toBe(false);
  });
});
