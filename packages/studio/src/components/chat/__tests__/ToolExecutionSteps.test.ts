import { describe, it, expect } from "vitest";
import type { ToolExecution } from "../../../store/chat/types";
import { getGeneratedArtifactDetails, groupToolExecutionsChronologically } from "../ToolExecutionSteps";

const makeExec = (overrides: Partial<ToolExecution> & { id: string; tool: string }): ToolExecution => ({
  label: "test",
  status: "completed",
  startedAt: Date.now(),
  ...overrides,
});

describe("groupChronologically", () => {
  it("keeps read before pipeline when read happened first", () => {
    const execs: ToolExecution[] = [
      makeExec({ id: "1", tool: "read", label: "读取文件" }),
      makeExec({ id: "2", tool: "sub_agent", agent: "writer", label: "写作" }),
    ];

    const groups = groupToolExecutionsChronologically(execs);

    expect(groups).toHaveLength(2);
    expect(groups[0].type).toBe("utilities");
    expect(groups[1].type).toBe("pipeline");
  });

  it("groups consecutive utility tools together", () => {
    const execs: ToolExecution[] = [
      makeExec({ id: "1", tool: "read", label: "读取文件" }),
      makeExec({ id: "2", tool: "grep", label: "搜索" }),
      makeExec({ id: "3", tool: "read", label: "读取文件" }),
    ];

    const groups = groupToolExecutionsChronologically(execs);

    expect(groups).toHaveLength(1);
    expect(groups[0].type).toBe("utilities");
    if (groups[0].type === "utilities") {
      expect(groups[0].execs).toHaveLength(3);
    }
  });

  it("interleaves utility groups around pipeline ops", () => {
    const execs: ToolExecution[] = [
      makeExec({ id: "1", tool: "read", label: "读取文件" }),
      makeExec({ id: "2", tool: "sub_agent", agent: "writer", label: "写作" }),
      makeExec({ id: "3", tool: "read", label: "读取文件" }),
      makeExec({ id: "4", tool: "grep", label: "搜索" }),
    ];

    const groups = groupToolExecutionsChronologically(execs);

    expect(groups).toHaveLength(3);
    expect(groups[0].type).toBe("utilities");
    expect(groups[1].type).toBe("pipeline");
    expect(groups[2].type).toBe("utilities");
    if (groups[2].type === "utilities") {
      expect(groups[2].execs).toHaveLength(2);
    }
  });

  it("handles pipeline-only executions", () => {
    const execs: ToolExecution[] = [
      makeExec({ id: "1", tool: "sub_agent", agent: "writer", label: "写作" }),
    ];

    const groups = groupToolExecutionsChronologically(execs);

    expect(groups).toHaveLength(1);
    expect(groups[0].type).toBe("pipeline");
  });

  it("handles empty array", () => {
    expect(groupToolExecutionsChronologically([])).toHaveLength(0);
  });

  it("renders short fiction and cover tools as visible pipeline cards", () => {
    const execs: ToolExecution[] = [
      makeExec({ id: "1", tool: "read", label: "读取文件" }),
      makeExec({ id: "2", tool: "generate_cover", label: "生成封面" }),
      makeExec({ id: "3", tool: "short_fiction_run", label: "短篇生产" }),
      makeExec({ id: "4", tool: "grep", label: "搜索" }),
    ];

    const groups = groupToolExecutionsChronologically(execs);

    expect(groups).toHaveLength(4);
    expect(groups.map((group) => group.type)).toEqual(["utilities", "pipeline", "pipeline", "utilities"]);
    expect(groups[1].type === "pipeline" ? groups[1].exec.tool : "").toBe("generate_cover");
    expect(groups[2].type === "pipeline" ? groups[2].exec.tool : "").toBe("short_fiction_run");
  });

  it("extracts generated cover details from public short fiction tools", () => {
    const exec = makeExec({
      id: "short-1",
      tool: "short_fiction_run",
      label: "短篇生产",
      details: {
        kind: "short_fiction_created",
        storyId: "demo-story",
        finalMarkdownPath: "shorts/demo-story/final/full.md",
        salesPackagePath: "shorts/demo-story/final/sales-package.md",
        coverImagePath: "shorts/demo-story/final/cover.png",
      },
    });

    expect(getGeneratedArtifactDetails(exec)).toMatchObject({
      kind: "short_fiction_created",
      storyId: "demo-story",
      finalMarkdownPath: "shorts/demo-story/final/full.md",
      salesPackagePath: "shorts/demo-story/final/sales-package.md",
      coverImagePath: "shorts/demo-story/final/cover.png",
    });
  });
});
