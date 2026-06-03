/**
 * Detection feedback loop — analyze detection_history.json to extract insights.
 */

import type { DetectionHistoryEntry, DetectionStats } from "../models/detection.js";

/**
 * Analyze detection history and produce aggregated statistics.
 */
export function analyzeDetectionInsights(
  history: ReadonlyArray<DetectionHistoryEntry>,
): DetectionStats {
  if (history.length === 0) {
    return {
      totalDetections: 0,
      totalRewrites: 0,
      avgOriginalScore: 0,
      avgFinalScore: 0,
      avgScoreReduction: 0,
      passRate: 0,
      chapterBreakdown: [],
    };
  }

  const detections = history.filter((h) => h.action === "detect");
  const rewrites = history.filter((h) => h.action === "rewrite");

  // Group by chapter
  const chapterMap = new Map<number, DetectionHistoryEntry[]>();
  for (const entry of history) {
    const existing = chapterMap.get(entry.chapterNumber) ?? [];
    chapterMap.set(entry.chapterNumber, [...existing, entry]);
  }

  const chapterBreakdown: Array<{
    chapterNumber: number;
    originalScore: number;
    finalScore: number;
    rewriteAttempts: number;
  }> = [];

  let totalOriginal = 0;
  let totalFinal = 0;

  for (const [chapterNumber, entries] of chapterMap) {
    const sorted = [...entries].sort((a, b) => a.attempt - b.attempt);
    const originalScore = sorted[0]?.score ?? 0;
    const finalScore = sorted[sorted.length - 1]?.score ?? originalScore;
    const rewriteAttempts = sorted.filter((e) => e.action === "rewrite").length;

    chapterBreakdown.push({ chapterNumber, originalScore, finalScore, rewriteAttempts });
    totalOriginal += originalScore;
    totalFinal += finalScore;
  }

  const chapterCount = chapterBreakdown.length;
  const avgOriginalScore = chapterCount > 0 ? totalOriginal / chapterCount : 0;
  const avgFinalScore = chapterCount > 0 ? totalFinal / chapterCount : 0;

  // Pass rate = chapters where final score decreased (or no rewrite needed)
  const passedChapters = chapterBreakdown.filter((c) => c.finalScore <= c.originalScore).length;

  return {
    totalDetections: detections.length,
    totalRewrites: rewrites.length,
    avgOriginalScore: Math.round(avgOriginalScore * 1000) / 1000,
    avgFinalScore: Math.round(avgFinalScore * 1000) / 1000,
    avgScoreReduction: Math.round((avgOriginalScore - avgFinalScore) * 1000) / 1000,
    passRate: chapterCount > 0 ? Math.round((passedChapters / chapterCount) * 100) / 100 : 0,
    chapterBreakdown,
  };
}
