import { describe, expect, it, vi } from "vitest";
import { runChapterReviewCycle } from "../pipeline/chapter-review-cycle.js";
import type { AuditResult, AuditIssue } from "../agents/continuity.js";
import type { LengthSpec } from "../models/length-governance.js";

const LENGTH_SPEC: LengthSpec = {
  target: 220,
  softMin: 190,
  softMax: 250,
  hardMin: 160,
  hardMax: 280,
  countingMode: "zh_chars",
  normalizeMode: "none",
};

const ZERO_USAGE: { promptTokens: number; completionTokens: number; totalTokens: number } = {
  promptTokens: 0,
  completionTokens: 0,
  totalTokens: 0,
};

function createAuditResult(overrides?: Partial<AuditResult>): AuditResult {
  return {
    passed: true,
    issues: [],
    summary: "clean",
    overallScore: 90,
    ...overrides,
  };
}

const baseParams = {
  book: { genre: "xuanhuan" },
  bookDir: "/tmp/book",
  chapterNumber: 1,
  lengthSpec: LENGTH_SPEC,
  reducedControlInput: undefined,
  initialUsage: ZERO_USAGE,
  assertChapterContentNotEmpty: () => undefined,
  addUsage: (left: typeof ZERO_USAGE, right?: typeof ZERO_USAGE) => ({
    promptTokens: left.promptTokens + (right?.promptTokens ?? 0),
    completionTokens: left.completionTokens + (right?.completionTokens ?? 0),
    totalTokens: left.totalTokens + (right?.totalTokens ?? 0),
  }),
  analyzeAITells: () => ({ issues: [] as AuditIssue[] }),
  analyzeSensitiveWords: () => ({ found: [] as Array<{ severity: "warn" | "block" }>, issues: [] as AuditIssue[] }),
  logWarn: () => undefined,
  logStage: () => undefined,
} as const;

describe("runChapterReviewCycle v9", () => {
  it("feeds postWriteErrors as extra issues into first assessment", async () => {
    // postWriteErrors are critical → auditResult.passed forced false
    // even though LLM says passed=true. This triggers the repair loop.
    const auditChapter = vi.fn()
      .mockResolvedValueOnce(createAuditResult({ overallScore: 90, passed: true }))
      .mockResolvedValueOnce(createAuditResult({ overallScore: 92, passed: true }));
    const reviseChapter = vi.fn().mockResolvedValue({
      revisedContent: "a".repeat(200),
      wordCount: 200,
      fixedIssues: ["fixed"],
      updatedState: "",
      updatedLedger: "",
      updatedHooks: "",
      tokenUsage: ZERO_USAGE,
    });
    const normalizeDraftLengthIfNeeded = vi.fn()
      .mockImplementation(async (content: string) => ({
        content,
        wordCount: content.length,
        applied: false,
        tokenUsage: ZERO_USAGE,
      }));

    const result = await runChapterReviewCycle({
      ...baseParams,
      initialOutput: {
        content: "b".repeat(200),
        wordCount: 200,
        postWriteErrors: [{
          rule: "chapter-number-reference",
          description: "contains chapter ref",
          suggestion: "remove it",
          severity: "error",
        }],
      },
      createReviser: () => ({ reviseChapter }),
      auditor: { auditChapter },
      normalizeDraftLengthIfNeeded,
      // Simulates: the reviser fixed the chapter-ref, so re-check returns empty
      runPostWriteChecks: (content) =>
        content === "b".repeat(200)
          ? [{ severity: "critical" as const, category: "chapter-number-reference", description: "contains chapter ref", suggestion: "remove it" }]
          : [],
    });

    // After repair, postWriteChecks on the revised content returns empty → issue gone
    expect(result.auditResult.issues.some(i => i.category === "chapter-number-reference")).toBe(false);
    // The loop should have run at least once to fix the critical postWriteError
    expect(reviseChapter).toHaveBeenCalled();
    expect(reviseChapter.mock.calls[0]?.[4]).toBe("auto");
  });

  it("runs repair loop when score is below threshold, picks best version", async () => {
    const auditChapter = vi.fn()
      .mockResolvedValueOnce(createAuditResult({
        passed: false,
        overallScore: 70,
        issues: [{ severity: "critical", category: "continuity", description: "broken", suggestion: "fix" }],
      }))
      .mockResolvedValueOnce(createAuditResult({
        passed: false,
        overallScore: 80,
        issues: [{ severity: "warning", category: "pacing", description: "slow", suggestion: "trim" }],
      }))
      .mockResolvedValueOnce(createAuditResult({
        passed: false,
        overallScore: 76,
        issues: [{ severity: "warning", category: "pacing", description: "still slow", suggestion: "trim more" }],
      }));

    const reviseChapter = vi.fn()
      .mockResolvedValueOnce({
        revisedContent: "a".repeat(200),
        wordCount: 200,
        fixedIssues: ["fixed continuity"],
        updatedState: "", updatedLedger: "", updatedHooks: "",
        tokenUsage: ZERO_USAGE,
      })
      .mockResolvedValueOnce({
        revisedContent: "b".repeat(200),
        wordCount: 200,
        fixedIssues: ["trimmed pacing"],
        updatedState: "", updatedLedger: "", updatedHooks: "",
        tokenUsage: ZERO_USAGE,
      });

    const normalizeDraftLengthIfNeeded = vi.fn()
      .mockImplementation(async (content: string) => ({
        content,
        wordCount: content.length,
        applied: false,
        tokenUsage: ZERO_USAGE,
      }));

    const result = await runChapterReviewCycle({
      ...baseParams,
      initialOutput: {
        content: "c".repeat(200),
        wordCount: 200,
        postWriteErrors: [],
      },
      createReviser: () => ({ reviseChapter }),
      auditor: { auditChapter },
      normalizeDraftLengthIfNeeded,
      maxReviewIterations: 2,
    });

    // Should have attempted 2 revisions:
    // iter 1: 70 → 80 (+10, net improvement)
    // iter 2: 80 → 76 (no net improvement, stop)
    expect(reviseChapter).toHaveBeenCalledTimes(2);
    expect(reviseChapter.mock.calls[0]?.[4]).toBe("auto");

    // Best version should be picked (score 80 from iter 1)
    expect(result.auditResult.overallScore).toBe(80);
    expect(result.finalContent).toBe("a".repeat(200));
    expect(result.revised).toBe(true);
  });

  it("defaults to one automatic repair pass", async () => {
    const auditChapter = vi.fn()
      .mockResolvedValueOnce(createAuditResult({
        passed: false,
        overallScore: 70,
        issues: [{ severity: "critical", category: "continuity", description: "broken", suggestion: "fix" }],
      }))
      .mockResolvedValueOnce(createAuditResult({
        passed: false,
        overallScore: 80,
        issues: [{ severity: "warning", category: "pacing", description: "slow", suggestion: "trim" }],
      }))
      .mockResolvedValueOnce(createAuditResult({
        passed: true,
        overallScore: 90,
      }));

    const reviseChapter = vi.fn()
      .mockResolvedValueOnce({
        revisedContent: "a".repeat(200),
        wordCount: 200,
        fixedIssues: ["fixed continuity"],
        updatedState: "", updatedLedger: "", updatedHooks: "",
        tokenUsage: ZERO_USAGE,
      })
      .mockResolvedValueOnce({
        revisedContent: "b".repeat(200),
        wordCount: 200,
        fixedIssues: ["trimmed pacing"],
        updatedState: "", updatedLedger: "", updatedHooks: "",
        tokenUsage: ZERO_USAGE,
      });

    const normalizeDraftLengthIfNeeded = vi.fn()
      .mockImplementation(async (content: string) => ({
        content,
        wordCount: content.length,
        applied: false,
        tokenUsage: ZERO_USAGE,
      }));

    const result = await runChapterReviewCycle({
      ...baseParams,
      initialOutput: {
        content: "c".repeat(200),
        wordCount: 200,
        postWriteErrors: [],
      },
      createReviser: () => ({ reviseChapter }),
      auditor: { auditChapter },
      normalizeDraftLengthIfNeeded,
    });

    expect(reviseChapter).toHaveBeenCalledTimes(1);
    expect(result.auditResult.overallScore).toBe(80);
    expect(result.finalContent).toBe("a".repeat(200));
  });

  it("stops immediately when initial score passes threshold", async () => {
    const auditChapter = vi.fn()
      .mockResolvedValue(createAuditResult({ overallScore: 88 }));
    const reviseChapter = vi.fn();
    const normalizeDraftLengthIfNeeded = vi.fn()
      .mockImplementation(async (content: string) => ({
        content,
        wordCount: content.length,
        applied: false,
        tokenUsage: ZERO_USAGE,
      }));

    const result = await runChapterReviewCycle({
      ...baseParams,
      initialOutput: {
        content: "d".repeat(200),
        wordCount: 200,
        postWriteErrors: [],
      },
      createReviser: () => ({ reviseChapter }),
      auditor: { auditChapter },
      normalizeDraftLengthIfNeeded,
    });

    // No revision should have been called
    expect(reviseChapter).not.toHaveBeenCalled();
    expect(result.auditResult.overallScore).toBe(88);
    expect(result.revised).toBe(false);
  });

  it("normalizes deterministic surface blockers before audit and repair", async () => {
    const auditChapter = vi.fn()
      .mockResolvedValue(createAuditResult({ overallScore: 90, passed: true }));
    const reviseChapter = vi.fn();
    const normalizeDraftLengthIfNeeded = vi.fn()
      .mockImplementation(async (content: string) => ({
        content,
        wordCount: content.length,
        applied: false,
        tokenUsage: ZERO_USAGE,
      }));
    const unsafe = `${"雨".repeat(100)}——${"夜".repeat(98)}`;

    const result = await runChapterReviewCycle({
      ...baseParams,
      initialOutput: {
        content: unsafe,
        wordCount: unsafe.length,
        postWriteErrors: [],
      },
      createReviser: () => ({ reviseChapter }),
      auditor: { auditChapter },
      normalizeDraftLengthIfNeeded,
      normalizePostWriteSurface: (content) => content.replace(/——+/g, "，"),
      runPostWriteChecks: (content) =>
        content.includes("——")
          ? [{ severity: "critical" as const, category: "禁止破折号", description: "出现了破折号", suggestion: "用逗号断句" }]
          : [],
    });

    expect(auditChapter.mock.calls[0]?.[1]).not.toContain("——");
    expect(result.finalContent).not.toContain("——");
    expect(result.auditResult.passed).toBe(true);
    expect(reviseChapter).not.toHaveBeenCalled();
  });
});
