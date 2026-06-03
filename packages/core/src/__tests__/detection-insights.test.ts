import { describe, it, expect } from "vitest";
import { analyzeDetectionInsights } from "../agents/detection-insights.js";
import type { DetectionHistoryEntry } from "../models/detection.js";

describe("analyzeDetectionInsights", () => {
  it("returns zeros for empty history", () => {
    const stats = analyzeDetectionInsights([]);
    expect(stats.totalDetections).toBe(0);
    expect(stats.totalRewrites).toBe(0);
    expect(stats.avgOriginalScore).toBe(0);
    expect(stats.chapterBreakdown).toHaveLength(0);
  });

  it("correctly counts detections and rewrites", () => {
    const history: DetectionHistoryEntry[] = [
      { chapterNumber: 1, timestamp: "2026-01-01T00:00:00Z", provider: "custom", score: 0.8, action: "detect", attempt: 0 },
      { chapterNumber: 1, timestamp: "2026-01-01T00:01:00Z", provider: "custom", score: 0.6, action: "rewrite", attempt: 1 },
      { chapterNumber: 1, timestamp: "2026-01-01T00:02:00Z", provider: "custom", score: 0.4, action: "rewrite", attempt: 2 },
      { chapterNumber: 2, timestamp: "2026-01-02T00:00:00Z", provider: "custom", score: 0.3, action: "detect", attempt: 0 },
    ];

    const stats = analyzeDetectionInsights(history);
    expect(stats.totalDetections).toBe(2);
    expect(stats.totalRewrites).toBe(2);
  });

  it("calculates per-chapter breakdown", () => {
    const history: DetectionHistoryEntry[] = [
      { chapterNumber: 1, timestamp: "2026-01-01T00:00:00Z", provider: "custom", score: 0.9, action: "detect", attempt: 0 },
      { chapterNumber: 1, timestamp: "2026-01-01T00:01:00Z", provider: "custom", score: 0.5, action: "rewrite", attempt: 1 },
      { chapterNumber: 2, timestamp: "2026-01-02T00:00:00Z", provider: "custom", score: 0.3, action: "detect", attempt: 0 },
    ];

    const stats = analyzeDetectionInsights(history);
    expect(stats.chapterBreakdown).toHaveLength(2);

    const ch1 = stats.chapterBreakdown.find((c) => c.chapterNumber === 1);
    expect(ch1?.originalScore).toBe(0.9);
    expect(ch1?.finalScore).toBe(0.5);
    expect(ch1?.rewriteAttempts).toBe(1);

    const ch2 = stats.chapterBreakdown.find((c) => c.chapterNumber === 2);
    expect(ch2?.originalScore).toBe(0.3);
    expect(ch2?.finalScore).toBe(0.3);
    expect(ch2?.rewriteAttempts).toBe(0);
  });

  it("calculates score reduction average", () => {
    const history: DetectionHistoryEntry[] = [
      { chapterNumber: 1, timestamp: "2026-01-01T00:00:00Z", provider: "custom", score: 0.8, action: "detect", attempt: 0 },
      { chapterNumber: 1, timestamp: "2026-01-01T00:01:00Z", provider: "custom", score: 0.4, action: "rewrite", attempt: 1 },
    ];

    const stats = analyzeDetectionInsights(history);
    expect(stats.avgOriginalScore).toBe(0.8);
    expect(stats.avgFinalScore).toBe(0.4);
    expect(stats.avgScoreReduction).toBe(0.4);
  });
});
