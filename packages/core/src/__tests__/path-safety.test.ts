import { describe, expect, it } from "vitest";
import { join, resolve } from "node:path";
import { safeChildPath } from "../utils/path-safety.js";

describe("path safety", () => {
  const root = resolve("/tmp/jiaos/books");

  it("allows paths inside the root", () => {
    expect(safeChildPath(root, "book-a/story/book_rules.md"))
      .toBe(join(root, "book-a/story/book_rules.md"));
  });

  it("blocks parent traversal", () => {
    expect(() => safeChildPath(root, "../books2/secret.md"))
      .toThrow("Path traversal blocked");
  });

  it("blocks sibling-prefix bypasses", () => {
    expect(() => safeChildPath(root, "/tmp/jiaos/books2/secret.md"))
      .toThrow("Path traversal blocked");
  });
});
