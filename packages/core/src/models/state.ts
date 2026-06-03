/**
 * Canonical state files — the three sources of truth per book.
 * These are persisted as markdown files but parsed/validated here.
 */

export interface CurrentState {
  readonly chapter: number;
  readonly location: string;
  readonly protagonist: {
    readonly status: string;
    readonly currentGoal: string;
    readonly constraints: string;
  };
  readonly enemies: ReadonlyArray<{
    readonly name: string;
    readonly relationship: string;
    readonly threat: string;
  }>;
  readonly knownTruths: ReadonlyArray<string>;
  readonly currentConflict: string;
  readonly anchor: string;
}

export interface LedgerEntry {
  readonly chapter: number;
  readonly openingValue: number;
  readonly source: string;
  readonly resourceCompleteness: string;
  readonly delta: number;
  readonly closingValue: number;
  readonly basis: string;
}

export interface ParticleLedger {
  readonly hardCap: number;
  readonly currentTotal: number;
  readonly entries: ReadonlyArray<LedgerEntry>;
}

export interface PendingHook {
  readonly id: string;
  readonly originChapter: number;
  readonly type: string;
  readonly status: "open" | "progressing" | "resolved";
  readonly lastProgress: string;
  readonly expectedResolution: string;
  readonly note: string;
}

export interface PendingHooks {
  readonly hooks: ReadonlyArray<PendingHook>;
}
