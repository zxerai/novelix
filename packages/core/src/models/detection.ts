/** A single detection/rewrite event recorded in detection_history.json. */
export interface DetectionHistoryEntry {
  readonly chapterNumber: number;
  readonly timestamp: string;
  readonly provider: string;
  readonly score: number;
  readonly action: "detect" | "rewrite";
  readonly attempt: number;
}

/** Aggregated detection statistics. */
export interface DetectionStats {
  readonly totalDetections: number;
  readonly totalRewrites: number;
  readonly avgOriginalScore: number;
  readonly avgFinalScore: number;
  readonly avgScoreReduction: number;
  readonly passRate: number;
  readonly chapterBreakdown: ReadonlyArray<{
    readonly chapterNumber: number;
    readonly originalScore: number;
    readonly finalScore: number;
    readonly rewriteAttempts: number;
  }>;
}
