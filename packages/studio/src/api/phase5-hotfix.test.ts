import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";

// ---------------------------------------------------------------------------
// Phase 5 hotfix 1 — Studio truth-file endpoints must reach the authoritative
// outline/* and roles/** paths, refuse path traversal, and surface legacy
// compat shims as read-only (legacy: true).
// ---------------------------------------------------------------------------

const createLLMClientMock = vi.fn(() => ({}));
const chatCompletionMock = vi.fn();
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
    async listBooks(): Promise<string[]> {
      return [];
    }
    async loadBookConfig(): Promise<never> {
      throw new Error("not implemented");
    }
    async loadChapterIndex(): Promise<[]> {
      return [];
    }
    async getNextChapterNumber(): Promise<number> {
      return 1;
    }
    bookDir(id: string): string {
      return join(this.root, "books", id);
    }
  }

  class MockPipelineRunner {
    constructor(_config: unknown) {}
    initBook = vi.fn();
    runRadar = vi.fn();
  }

  class MockScheduler {
    constructor(_config: unknown) {}
    async start(): Promise<void> { /* noop */ }
    stop(): void { /* noop */ }
    get isRunning(): boolean { return false; }
  }

  // Real isNewLayoutBook — needs filesystem access for per-book detection
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
    createLLMClient: createLLMClientMock,
    createLogger: vi.fn(() => logger),
    computeAnalytics: vi.fn(() => ({})),
    isSafeBookId: actual.isSafeBookId,
    chatCompletion: chatCompletionMock,
    loadProjectConfig: loadProjectConfigMock,
    GLOBAL_ENV_PATH: join(tmpdir(), "jiaos-global.env"),
  };
});

const projectConfig = {
  name: "studio-hotfix-test",
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

describe("Phase 5 hotfix 1 — Studio truth file endpoints", () => {
  let root: string;
  let bookDir: string;
  let storyDir: string;

  beforeEach(async () => {
    root = await mkdtemp(join(tmpdir(), "studio-hotfix-"));
    await writeFile(join(root, "jiaos.json"), JSON.stringify(projectConfig, null, 2), "utf-8");
    bookDir = join(root, "books", "hotfix-book");
    storyDir = join(bookDir, "story");
    await mkdir(join(storyDir, "outline"), { recursive: true });
    await mkdir(join(storyDir, "roles/主要角色"), { recursive: true });
    await mkdir(join(storyDir, "roles/次要角色"), { recursive: true });
    loadProjectConfigMock.mockReset();
    loadProjectConfigMock.mockResolvedValue(cloneProjectConfig());
  });

  afterEach(async () => {
    await rm(root, { recursive: true, force: true });
  });

  it("serves outline/story_frame.md content (Phase 5 authoritative path)", async () => {
    await writeFile(
      join(storyDir, "outline/story_frame.md"),
      "---\nversion: \"1.0\"\n---\n\n# Frame prose",
      "utf-8",
    );
    const { createStudioServer } = await import("./server.js");
    const app = createStudioServer(cloneProjectConfig() as never, root);

    const response = await app.request(
      "http://localhost/api/v1/books/hotfix-book/truth/outline/story_frame.md",
    );
    expect(response.status).toBe(200);
    const body = await response.json() as { file: string; content: string; legacy?: boolean };
    expect(body.file).toBe("outline/story_frame.md");
    expect(body.content).toContain("# Frame prose");
    expect(body.legacy).toBeUndefined();
  });

  it("serves roles/主要角色/<name>.md content", async () => {
    await writeFile(
      join(storyDir, "roles/主要角色/主角甲.md"),
      "# 主角甲\n核心标签：沉默",
      "utf-8",
    );
    const { createStudioServer } = await import("./server.js");
    const app = createStudioServer(cloneProjectConfig() as never, root);

    const response = await app.request(
      "http://localhost/api/v1/books/hotfix-book/truth/roles/主要角色/主角甲.md",
    );
    expect(response.status).toBe(200);
    const body = await response.json() as { file: string; content: string };
    expect(body.content).toContain("核心标签");
  });

  it("tags legacy shim files (story_bible.md, book_rules.md) with legacy: true on GET for new-layout book", async () => {
    // New-layout book: outline/story_frame.md must exist for shims to be tagged
    await writeFile(join(storyDir, "outline/story_frame.md"), "# Frame", "utf-8");
    await writeFile(join(storyDir, "story_bible.md"), "# Legacy bible shim", "utf-8");
    await writeFile(join(storyDir, "book_rules.md"), "# Legacy rules shim", "utf-8");
    const { createStudioServer } = await import("./server.js");
    const app = createStudioServer(cloneProjectConfig() as never, root);

    for (const file of ["story_bible.md", "book_rules.md"]) {
      const res = await app.request(`http://localhost/api/v1/books/hotfix-book/truth/${file}`);
      expect(res.status).toBe(200);
      const body = await res.json() as { legacy?: boolean };
      expect(body.legacy).toBe(true);
    }
  });

  it("rejects path traversal attempts (..)", async () => {
    const { createStudioServer } = await import("./server.js");
    const app = createStudioServer(cloneProjectConfig() as never, root);

    // Encoded form — the :file{.+} pattern accepts this; resolveTruthFilePath
    // must reject the resolved path regardless.
    const response = await app.request(
      "http://localhost/api/v1/books/hotfix-book/truth/outline/..%2F..%2Fetc%2Fpasswd",
    );
    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({ error: "Invalid truth file" });
  });

  it("rejects files outside the whitelist", async () => {
    const { createStudioServer } = await import("./server.js");
    const app = createStudioServer(cloneProjectConfig() as never, root);

    // Unknown flat file
    const response1 = await app.request(
      "http://localhost/api/v1/books/hotfix-book/truth/random.md",
    );
    expect(response1.status).toBe(400);

    // Unknown subdir
    const response2 = await app.request(
      "http://localhost/api/v1/books/hotfix-book/truth/outline/unknown.md",
    );
    expect(response2.status).toBe(400);

    // roles/ with unknown tier
    const response3 = await app.request(
      "http://localhost/api/v1/books/hotfix-book/truth/roles/其他/x.md",
    );
    expect(response3.status).toBe(400);
  });

  it("refuses to PUT legacy shim files (story_bible.md / book_rules.md) for new-layout book", async () => {
    // New-layout book: outline/story_frame.md must exist for PUT rejection
    await writeFile(join(storyDir, "outline/story_frame.md"), "# Frame", "utf-8");
    const { createStudioServer } = await import("./server.js");
    const app = createStudioServer(cloneProjectConfig() as never, root);

    const response = await app.request(
      "http://localhost/api/v1/books/hotfix-book/truth/book_rules.md",
      {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: "# new" }),
      },
    );
    expect(response.status).toBe(400);
    const body = await response.json() as { error: string };
    expect(body.error).toMatch(/Legacy compat shim/);
  });

  it("writes outline/story_frame.md via PUT", async () => {
    const { createStudioServer } = await import("./server.js");
    const app = createStudioServer(cloneProjectConfig() as never, root);

    const response = await app.request(
      "http://localhost/api/v1/books/hotfix-book/truth/outline/story_frame.md",
      {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: "---\nversion: \"1.0\"\n---\n\n# Updated" }),
      },
    );
    expect(response.status).toBe(200);
    const saved = await readFile(join(storyDir, "outline/story_frame.md"), "utf-8");
    expect(saved).toContain("# Updated");
  });

  // Phase hotfix 3: en-locale role dirs (roles/major, roles/minor) must be
  // first-class — readable, writable, listable. Previously the runtime
  // could read them but Studio could not surface them.
  it("serves roles/major/<name>.md (en locale)", async () => {
    await mkdir(join(storyDir, "roles/major"), { recursive: true });
    await writeFile(
      join(storyDir, "roles/major/Mara.md"),
      "# Mara\nCore tag: stoic",
      "utf-8",
    );
    const { createStudioServer } = await import("./server.js");
    const app = createStudioServer(cloneProjectConfig() as never, root);

    const response = await app.request(
      "http://localhost/api/v1/books/hotfix-book/truth/roles/major/Mara.md",
    );
    expect(response.status).toBe(200);
    const body = await response.json() as { content: string };
    expect(body.content).toContain("Core tag");
  });

  it("writes roles/minor/<name>.md (en locale) via PUT", async () => {
    await mkdir(join(storyDir, "roles/minor"), { recursive: true });
    const { createStudioServer } = await import("./server.js");
    const app = createStudioServer(cloneProjectConfig() as never, root);

    const response = await app.request(
      "http://localhost/api/v1/books/hotfix-book/truth/roles/minor/Kit.md",
      {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: "# Kit\nMinor ally" }),
      },
    );
    expect(response.status).toBe(200);
    const saved = await readFile(join(storyDir, "roles/minor/Kit.md"), "utf-8");
    expect(saved).toContain("Minor ally");
  });

  it("lists en-locale role dirs alongside zh-locale dirs", async () => {
    await mkdir(join(storyDir, "roles/major"), { recursive: true });
    await mkdir(join(storyDir, "roles/minor"), { recursive: true });
    await writeFile(join(storyDir, "roles/major/Mara.md"), "major", "utf-8");
    await writeFile(join(storyDir, "roles/minor/Kit.md"), "minor", "utf-8");
    await writeFile(join(storyDir, "roles/主要角色/主角甲.md"), "zh-major", "utf-8");

    const { createStudioServer } = await import("./server.js");
    const app = createStudioServer(cloneProjectConfig() as never, root);

    const response = await app.request("http://localhost/api/v1/books/hotfix-book/truth");
    const body = await response.json() as { files: ReadonlyArray<{ name: string }> };
    const names = body.files.map((f) => f.name);
    expect(names).toContain("roles/major/Mara.md");
    expect(names).toContain("roles/minor/Kit.md");
    expect(names).toContain("roles/主要角色/主角甲.md");
  });

  it("lists outline/* and roles/**/*.md files in the truth browser", async () => {
    await writeFile(join(storyDir, "outline/story_frame.md"), "frame", "utf-8");
    await writeFile(join(storyDir, "outline/volume_map.md"), "map", "utf-8");
    await writeFile(join(storyDir, "roles/主要角色/主角甲.md"), "major", "utf-8");
    await writeFile(join(storyDir, "roles/次要角色/朋友乙.md"), "minor", "utf-8");
    await writeFile(join(storyDir, "book_rules.md"), "shim", "utf-8");
    const { createStudioServer } = await import("./server.js");
    const app = createStudioServer(cloneProjectConfig() as never, root);

    const response = await app.request("http://localhost/api/v1/books/hotfix-book/truth");
    expect(response.status).toBe(200);
    const body = await response.json() as { files: ReadonlyArray<{ name: string; legacy?: true }> };
    const names = body.files.map((f) => f.name).sort();
    expect(names).toContain("outline/story_frame.md");
    expect(names).toContain("outline/volume_map.md");
    expect(names).toContain("roles/主要角色/主角甲.md");
    expect(names).toContain("roles/次要角色/朋友乙.md");
    const shimEntry = body.files.find((f) => f.name === "book_rules.md");
    expect(shimEntry?.legacy).toBe(true);
  });
});
