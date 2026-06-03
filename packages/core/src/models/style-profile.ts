/** Style fingerprint profile extracted from reference text. */
export interface StyleProfile {
  readonly avgSentenceLength: number;
  readonly sentenceLengthStdDev: number;
  readonly avgParagraphLength: number;
  readonly paragraphLengthRange: {
    readonly min: number;
    readonly max: number;
  };
  readonly vocabularyDiversity: number; // TTR (Type-Token Ratio)
  readonly topPatterns: ReadonlyArray<string>;
  readonly rhetoricalFeatures: ReadonlyArray<string>;
  readonly sourceName?: string;
  readonly analyzedAt?: string;
}
