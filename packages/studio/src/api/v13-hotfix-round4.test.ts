/**
 * v13 hotfix round 4 — Studio server tests for Issue 1:
 *   Old book (no outline/story_frame.md): GET/PUT/list treat story_bible.md
 *   and book_rules.md as normal editable files (no legacy tag).
 *   New book (has outline/story_frame.md): GET returns legacy:true, PUT returns 400.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { access } from "node:fs/promises";

// ---------------------------------------------------------------------------
// Mock — we need isNewLayoutBook to actually work (it stats the filesystem),
// so we re-export the real implementation while mocking the rest of core.
// ---------------------------------------------------------------------------

const loadProjectConfigMock = vi.fn();
const logger = {
  child: () => logger,
  info: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
};

vi.mock("@actalk/jiaos-core", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@actalk/jiaos-core")>();

  class MockStateManager {
    constructor(private readonly root: string) {}
    async listBooks(): Promise<string[]> { return []; }
    async loadBookConfig(): Promise<never> { throw new Error("not implemented"); }
    async loadChapterIndex(): Promise<[]> { return []; }
    async getNextChapterNumber(): Promise<number> { return 1; }
    bookDir(id: string): string { return join(this.root, "books", id); }
  }
  class MockPipelineRunner {
    constructor(_config: unknown) {}
    initBook = vi.fn();
    runRadar = vi.fn();
  }
  class MockScheduler {
    constructor(_config: unknown) {}
    async start(): Promise<void> {}
    stop(): void {}
    get isRunning(): boolean { return false; }
  }

  // Real isNewLayoutBook — needs filesystem access
  async function isNewLayoutBook(bookDir: string): Promise<boolean> {
    const { access: accessFs } = await import("node:fs/promises");
    const { join: joinPath } = await import("node:path");
    try {
      await accessFs(joinPath(bookDir, "story", "outline", "story_frame.md"));
      return true;
    } catch {
      return false;
    }
  }

  return {
    StateManager: MockStateManager,
    PipelineRunner: MockPipelineRunner,
    Scheduler: MockScheduler,
    isNewLayoutBook,
    createLLMClient: vi.fn(() => ({})),
    createLogger: vi.fn(() => logger),
    computeAnalytics: vi.fn(() => ({})),
    isSafeBookId: actual.isSafeBookId,
    chatCompletion: vi.fn(),
    loadProjectConfig: loadProjectConfigMock,
    GLOBAL_ENV_PATH: join(tmpdir(), "jiaos-global.env"),
  };
});

const projectConfig = {
  name: "studio-v13-hf4",
  version: "0.1.0",
  language: "zh" as const,
  llm: {
    provider: "openai",
    baseUrl: "https://api.example.com/v1",
    apiKey: "sk-test",
    model: "gpt-5.4",
    temperature: 0.7,
    maxTokens: 4096,
    stream: false,
  },
  daemon: {
    schedule: { radarCron: "0 */6 * * *", writeCron: "*/15 * * * *" },
    maxConcurrentBooks: 1,
    chaptersPerCycle: 1,
    retryDelayMs: 30000,
    cooldownAfterChapterMs: 0,
    maxChaptersPerDay: 50,
  },
  modelOverrides: {},
  notify: [],
};

function cloneProjectConfig(): typeof projectConfig {
  return structuredClone(projectConfig);
}

// ---------------------------------------------------------------------------
// Old book (no outline/story_frame.md)
// ---------------------------------------------------------------------------

describe("Issue 1 — Studio: old book (no outline/story_frame.md)", () => {
  let root: string;
  let storyDir: string;

  beforeEach(async () => {
    root = await mkdtemp(join(tmpdir(), "studio-old-book-"));
    await writeFile(join(root, "jiaos.json"), JSON.stringify(projectConfig, null, 2), "utf-8");
    storyDir = join(root, "books", "old-book", "story");
    await mkdir(storyDir, { recursive: true });
    await writeFile(join(storyDir, "story_bible.md"), "# Old Bible\nAuthoritative content", "utf-8");
    await writeFile(join(storyDir, "book_rules.md"), "# Old Rules\nAuthoritative rules", "utf-8");
    loadProjectConfigMock.mockReset();
    loadProjectConfigMock.mockResolvedValue(cloneProjectConfig());
  });

  afterEach(async () => {
    await rm(root, { recursive: true, force: true });
  });

  it("GET story_bible.md has no legacy flag", async () => {
    const { createStudioServer } = await import("./server.js");
    const app = createStudioServer(cloneProjectConfig() as never, root);

    const res = await app.request("http://localhost/api/v1/books/old-book/truth/story_bible.md");
    expect(res.status).toBe(200);
    const body = await res.json() as { file: string; content: string; legacy?: boolean };
    expect(body.content).toContain("Authoritative content");
    expect(body.legacy).toBeUndefined();
  });

  it("PUT story_bible.md succeeds", async () => {
    const { createStudioServer } = await import("./server.js");
    const app = createStudioServer(cloneProjectConfig() as never, root);

    const res = await app.request("http://localhost/api/v1/books/old-book/truth/story_bible.md", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content: "# Updated Bible" }),
    });
    expect(res.status).toBe(200);
    const saved = await readFile(join(storyDir, "story_bible.md"), "utf-8");
    expect(saved).toBe("# Updated Bible");
  });

  it("list endpoint shows story_bible.md without legacy tag", async () => {
    const { createStudioServer } = await import("./server.js");
    const app = createStudioServer(cloneProjectConfig() as never, root);

    const res = await app.request("http://localhost/api/v1/books/old-book/truth");
    expect(res.status).toBe(200);
    const body = await res.json() as { files: ReadonlyArray<{ name: string; legacy?: true }> };
    const bibleEntry = body.files.find((f) => f.name === "story_bible.md");
    expect(bibleEntry).toBeDefined();
    expect(bibleEntry!.legacy).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// New book (has outline/story_frame.md)
// ---------------------------------------------------------------------------

describe("Issue 1 — Studio: new book (has outline/story_frame.md)", () => {
  let root: string;
  let storyDir: string;

  beforeEach(async () => {
    root = await mkdtemp(join(tmpdir(), "studio-new-book-"));
    await writeFile(join(root, "jiaos.json"), JSON.stringify(projectConfig, null, 2), "utf-8");
    storyDir = join(root, "books", "new-book", "story");
    await mkdir(join(storyDir, "outline"), { recursive: true });
    await writeFile(join(storyDir, "outline", "story_frame.md"), "# Frame", "utf-8");
    await writeFile(join(storyDir, "story_bible.md"), "# Shim bible", "utf-8");
    await writeFile(join(storyDir, "book_rules.md"), "# Shim rules", "utf-8");
    loadProjectConfigMock.mockReset();
    loadProjectConfigMock.mockResolvedValue(cloneProjectConfig());
  });

  afterEach(async () => {
    await rm(root, { recursive: true, force: true });
  });

  it("GET story_bible.md has legacy:true", async () => {
    const { createStudioServer } = await import("./server.js");
    const app = createStudioServer(cloneProjectConfig() as never, root);

    const res = await app.request("http://localhost/api/v1/books/new-book/truth/story_bible.md");
    expect(res.status).toBe(200);
    const body = await res.json() as { legacy?: boolean };
    expect(body.legacy).toBe(true);
  });

  it("PUT story_bible.md returns 400", async () => {
    const { createStudioServer } = await import("./server.js");
    const app = createStudioServer(cloneProjectConfig() as never, root);

    const res = await app.request("http://localhost/api/v1/books/new-book/truth/story_bible.md", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content: "# Attempt" }),
    });
    expect(res.status).toBe(400);
    const body = await res.json() as { error: string };
    expect(body.error).toMatch(/Legacy compat shim/);
  });

  it("list endpoint shows story_bible.md with legacy tag", async () => {
    const { createStudioServer } = await import("./server.js");
    const app = createStudioServer(cloneProjectConfig() as never, root);

    const res = await app.request("http://localhost/api/v1/books/new-book/truth");
    expect(res.status).toBe(200);
    const body = await res.json() as { files: ReadonlyArray<{ name: string; legacy?: true }> };
    const bibleEntry = body.files.find((f) => f.name === "story_bible.md");
    expect(bibleEntry).toBeDefined();
    expect(bibleEntry!.legacy).toBe(true);
  });
});
