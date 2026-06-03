import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { mkdtemp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { AGENT_TOOLS, executeAgentTool } from "../pipeline/agent.js";
import { PipelineRunner, StateManager, type PipelineConfig } from "../index.js";
import { PlannerAgent } from "../agents/planner.js";

describe("agent pipeline tools", () => {
  let root: string;
  let state: StateManager;
  let pipeline: PipelineRunner;
  let config: PipelineConfig;
  let bookId: string;

  beforeEach(async () => {
    root = await mkdtemp(join(tmpdir(), "jiaos-agent-tools-"));
    state = new StateManager(root);
    bookId = "agent-book";

    config = {
      client: {
        provider: "openai",
        apiFormat: "chat",
        stream: false,
        defaults: {
          temperature: 0.7,
          maxTokens: 4096,
          thinkingBudget: 0,
          extra: {},
        },
      },
      model: "test-model",
      projectRoot: root,
      inputGovernanceMode: "v2",
    };

    pipeline = new PipelineRunner(config);

    await state.saveBookConfig(bookId, {
      id: bookId,
      title: "Agent Book",
      platform: "tomato",
      genre: "other",
      status: "active",
      targetChapters: 20,
      chapterWordCount: 3000,
      createdAt: "2026-03-22T00:00:00.000Z",
      updatedAt: "2026-03-22T00:00:00.000Z",
    });

    const storyDir = join(state.bookDir(bookId), "story");
    await mkdir(join(storyDir, "runtime"), { recursive: true });
    await mkdir(join(state.bookDir(bookId), "chapters"), { recursive: true });
    await writeFile(join(state.bookDir(bookId), "chapters", "index.json"), "[]", "utf-8");

    vi.spyOn(PlannerAgent.prototype, "planChapter").mockImplementation(async (input) => {
      const chapterNumber = input.chapterNumber;
      // Try to read the local override from current_focus.md, mirroring the real planner logic
      let goal = input.externalContext ?? "test goal";
      try {
        const { readFile: readFs } = await import("node:fs/promises");
        const focusContent = await readFs(join(input.bookDir, "story", "current_focus.md"), "utf-8");
        const overrideMatch = focusContent.match(/## Local Override\s*\n+([^\n#]+)/);
        if (overrideMatch?.[1]?.trim()) {
          goal = overrideMatch[1].trim();
        }
      } catch { /* ignore missing file */ }
      const memo = {
        chapter: chapterNumber,
        goal,
        isGoldenOpening: false,
        body: "",
        threadRefs: [] as string[],
      };
      const intentMarkdown = [
        "# Chapter Intent",
        "",
        "## Goal",
        goal,
      ].join("\n");
      const { mkdir: mkdirFs, writeFile: writeFileFs } = await import("node:fs/promises");
      const runtimeDir = join(input.bookDir, "story", "runtime");
      await mkdirFs(runtimeDir, { recursive: true });
      const runtimePath = join(runtimeDir, `chapter-${String(chapterNumber).padStart(4, "0")}.intent.md`);
      await writeFileFs(runtimePath, intentMarkdown, "utf-8");
      return {
        intent: {
          chapter: chapterNumber,
          goal,
          mustKeep: [],
          mustAvoid: [],
          styleEmphasis: [],
        },
        memo,
        intentMarkdown,
        plannerInputs: [runtimePath],
        runtimePath,
      };
    });

    await Promise.all([
      writeFile(join(storyDir, "author_intent.md"), "# Author Intent\n\nKeep the story centered on the mentor conflict.\n", "utf-8"),
      writeFile(join(storyDir, "current_focus.md"), "# Current Focus\n\nBring focus back to the mentor conflict.\n", "utf-8"),
      writeFile(join(storyDir, "story_bible.md"), "# Story Bible\n\n- The jade seal cannot be destroyed.\n", "utf-8"),
      writeFile(join(storyDir, "volume_outline.md"), "# Volume Outline\n\n## Chapter 1\nTrack the merchant guild trail.\n", "utf-8"),
      writeFile(join(storyDir, "book_rules.md"), "---\nprohibitions:\n  - Do not reveal the mastermind\n---\n\n# Book Rules\n", "utf-8"),
      writeFile(join(storyDir, "current_state.md"), "# Current State\n\n- Lin Yue still hides the broken oath token.\n", "utf-8"),
      writeFile(join(storyDir, "pending_hooks.md"), "# Pending Hooks\n\n- Why the mentor vanished after the trial.\n", "utf-8"),
    ]);
  });

  afterEach(async () => {
    vi.restoreAllMocks();
    await rm(root, { recursive: true, force: true });
  });

  it("registers the input governance tools", () => {
    const toolNames = AGENT_TOOLS.map((tool) => tool.name);

    expect(toolNames).toContain("plan_chapter");
    expect(toolNames).toContain("compose_chapter");
    expect(toolNames).toContain("update_author_intent");
    expect(toolNames).toContain("update_current_focus");
  });

  it("plans and composes chapters through the agent tool surface", async () => {
    const planResult = JSON.parse(await executeAgentTool(
      pipeline,
      state,
      config,
      "plan_chapter",
      { bookId, guidance: "Ignore the guild chase and focus on the mentor conflict." },
    ));

    expect(planResult.intentPath).toBe("story/runtime/chapter-0001.intent.md");

    const composeResult = JSON.parse(await executeAgentTool(
      pipeline,
      state,
      config,
      "compose_chapter",
      { bookId, guidance: "Ignore the guild chase and focus on the mentor conflict." },
    ));

    expect(composeResult.contextPath).toBe("story/runtime/chapter-0001.context.json");
    expect(composeResult.ruleStackPath).toBe("story/runtime/chapter-0001.rule-stack.yaml");
    expect(composeResult.tracePath).toBe("story/runtime/chapter-0001.trace.json");
  });

  it("updates author_intent.md and current_focus.md through dedicated tools", async () => {
    await executeAgentTool(pipeline, state, config, "update_author_intent", {
      bookId,
      content: "# Author Intent\n\nMake this a colder revenge story.\n",
    });
    await executeAgentTool(pipeline, state, config, "update_current_focus", {
      bookId,
      content: "# Current Focus\n\nSpend the next two chapters on mentor fallout.\n",
    });

    await expect(readFile(join(state.bookDir(bookId), "story", "author_intent.md"), "utf-8"))
      .resolves.toContain("colder revenge story");
    await expect(readFile(join(state.bookDir(bookId), "story", "current_focus.md"), "utf-8"))
      .resolves.toContain("mentor fallout");
  });

  it("normalizes human-facing platform aliases before create_book persists config", async () => {
    const initBook = vi.spyOn(PipelineRunner.prototype, "initBook").mockResolvedValue(undefined);

    const result = JSON.parse(await executeAgentTool(
      pipeline,
      state,
      config,
      "create_book",
      {
        title: "测试书",
        genre: "urban",
        platform: "番茄小说",
        brief: "一本文娱爽文。",
      },
    ));

    expect(result).toMatchObject({ bookId: "测试书", title: "测试书", status: "created" });
    expect(initBook).toHaveBeenCalledWith(expect.objectContaining({
      id: "测试书",
      platform: "tomato",
    }));
  });

  it("keeps update_current_focus usable for explicit local overrides through the tool surface", async () => {
    await executeAgentTool(pipeline, state, config, "update_current_focus", {
      bookId,
      content: [
        "# Current Focus",
        "",
        "## Active Focus",
        "",
        "Keep the merchant guild trail visible in the background.",
        "",
        "## Local Override",
        "",
        "Stay inside the mentor debt confrontation first and delay the guild chase by one chapter.",
        "",
      ].join("\n"),
    });

    const planResult = JSON.parse(await executeAgentTool(
      pipeline,
      state,
      config,
      "plan_chapter",
      { bookId },
    ));

    const runtimePath = join(state.bookDir(bookId), planResult.intentPath);
    const intentMarkdown = await readFile(runtimePath, "utf-8");
    expect(intentMarkdown).toContain([
      "## Goal",
      "Stay inside the mentor debt confrontation first and delay the guild chase by one chapter.",
    ].join("\n"));
  });

  it("blocks write_full_pipeline when runtime progress is ahead of the chapter index", async () => {
    const chaptersDir = join(state.bookDir(bookId), "chapters");
    // Create durable chapter files for 1-3 but only index chapter 1.
    // This produces durableChapter=3, nextNum=4 while lastIndexedChapter=1,
    // triggering the sequential write guard.
    await state.saveChapterIndex(bookId, [{
      number: 1,
      title: "Existing Chapter",
      status: "approved",
      wordCount: 120,
      createdAt: "2026-03-22T00:00:00.000Z",
      updatedAt: "2026-03-22T00:00:00.000Z",
      auditIssues: [],
      lengthWarnings: [],
    }]);
    await Promise.all([
      writeFile(join(chaptersDir, "0001_Existing.md"), "# Chapter 1\n", "utf-8"),
      writeFile(join(chaptersDir, "0002_Second.md"), "# Chapter 2\n", "utf-8"),
      writeFile(join(chaptersDir, "0003_Third.md"), "# Chapter 3\n", "utf-8"),
    ]);

    const writeNextChapter = vi.spyOn(pipeline, "writeNextChapter").mockResolvedValue({
      bookId,
      chapterNumber: 4,
      title: "Should Not Run",
      wordCount: 100,
      filePath: "books/agent-book/chapters/0004_Should_Not_Run.md",
      auditResult: { passed: true, issues: [], summary: "ok" },
      revised: false,
      status: "ready-for-review",
    } as Awaited<ReturnType<typeof pipeline.writeNextChapter>>);

    const result = JSON.parse(await executeAgentTool(
      pipeline,
      state,
      config,
      "write_full_pipeline",
      { bookId, count: 1 },
    ));

    expect(result.error).toContain("write_full_pipeline");
    expect(writeNextChapter).not.toHaveBeenCalled();
  });

  it("blocks write_truth_file from hacking chapter progress inside current_state.md", async () => {
    const result = JSON.parse(await executeAgentTool(
      pipeline,
      state,
      config,
      "write_truth_file",
      {
        bookId,
        fileName: "current_state.md",
        content: "# Current State\n\n| Current Chapter | 999 |\n",
      },
    ));

    expect(result.error).toContain("章节进度");
  });

  // Phase hotfix 3: write_truth_file must accept both Chinese and English
  // role-dir paths so English-layout books are writable, not just readable.
  it("accepts roles/主要角色/<name>.md (zh locale)", async () => {
    const result = JSON.parse(await executeAgentTool(
      pipeline,
      state,
      config,
      "write_truth_file",
      {
        bookId,
        fileName: "roles/主要角色/林辞.md",
        content: "# 林辞\n核心标签：沉默",
      },
    ));
    expect(result.error).toBeUndefined();
    const written = await readFile(
      join(state.bookDir(bookId), "story", "roles/主要角色/林辞.md"),
      "utf-8",
    );
    expect(written).toContain("核心标签");
  });

  it("accepts roles/major/<name>.md (en locale)", async () => {
    const result = JSON.parse(await executeAgentTool(
      pipeline,
      state,
      config,
      "write_truth_file",
      {
        bookId,
        fileName: "roles/major/Mara.md",
        content: "# Mara\nCore tag: stoic",
      },
    ));
    expect(result.error).toBeUndefined();
    const written = await readFile(
      join(state.bookDir(bookId), "story", "roles/major/Mara.md"),
      "utf-8",
    );
    expect(written).toContain("Core tag");
  });

  it("accepts roles/minor/<name>.md (en locale)", async () => {
    const result = JSON.parse(await executeAgentTool(
      pipeline,
      state,
      config,
      "write_truth_file",
      {
        bookId,
        fileName: "roles/minor/Kit.md",
        content: "# Kit\nMinor ally",
      },
    ));
    expect(result.error).toBeUndefined();
  });

  it("rejects unknown role tier dirs (path-traversal safety preserved)", async () => {
    const result = JSON.parse(await executeAgentTool(
      pipeline,
      state,
      config,
      "write_truth_file",
      {
        bookId,
        fileName: "roles/其他/X.md",
        content: "# X",
      },
    ));
    expect(result.error).toBeDefined();
  });
});
