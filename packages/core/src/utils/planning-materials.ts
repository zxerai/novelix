import { readFile, readdir } from "node:fs/promises";
import { join } from "node:path";
import type { StoredHook, StoredSummary } from "../state/memory-db.js";
import {
  parseChapterSummariesMarkdown,
  retrieveMemorySelection,
  type MemorySelection,
} from "./memory-retrieval.js";
import {
  readStoryFrame,
  readVolumeMap,
  readCurrentStateWithFallback,
} from "./outline-paths.js";

export interface PlanningSeedMaterials {
  readonly storyDir: string;
  readonly authorIntent: string;
  readonly currentFocus: string;
  readonly storyBible: string;
  readonly volumeOutline: string;
  readonly bookRulesRaw: string;
  readonly currentState: string;
  readonly chapterSummariesRaw: string;
  readonly brief: string;
  readonly outlineNode?: string;
  readonly recentSummaries: ReadonlyArray<StoredSummary>;
  readonly previousEndingHook?: string;
  readonly previousEndingExcerpt?: string;
}

export interface PlanningMaterials extends PlanningSeedMaterials {
  readonly activeHooks: ReadonlyArray<StoredHook>;
  readonly memorySelection: MemorySelection;
  readonly plannerInputs: ReadonlyArray<string>;
}

async function readFileOrDefault(path: string): Promise<string> {
  try {
    return await readFile(path, "utf-8");
  } catch {
    return "(文件尚未创建)";
  }
}

async function readBriefFile(path: string): Promise<string> {
  try {
    return await readFile(path, "utf-8");
  } catch {
    return "";
  }
}

async function readPreviousEndingExcerpt(
  bookDir: string,
  chapterNumber: number,
): Promise<string | undefined> {
  const previousChapter = chapterNumber - 1;
  if (previousChapter < 1) {
    return undefined;
  }

  const chaptersDir = join(bookDir, "chapters");
  const padded = String(previousChapter).padStart(4, "0");
  try {
    const files = await readdir(chaptersDir);
    const match = files.find((file) => file.startsWith(padded) && file.endsWith(".md"));
    if (!match) {
      return undefined;
    }
    const markdown = await readFile(join(chaptersDir, match), "utf-8");
    const body = markdown
      .split("\n")
      .slice(1)
      .join("\n")
      .trim();
    if (!body) {
      return undefined;
    }
    return body.slice(-320).trim();
  } catch {
    return undefined;
  }
}

export async function loadPlanningSeedMaterials(params: {
  readonly bookDir: string;
  readonly chapterNumber: number;
}): Promise<PlanningSeedMaterials> {
  const storyDir = join(params.bookDir, "story");
  const sourcePaths = {
    authorIntent: join(storyDir, "author_intent.md"),
    currentFocus: join(storyDir, "current_focus.md"),
    chapterSummaries: join(storyDir, "chapter_summaries.md"),
    bookRules: join(storyDir, "book_rules.md"),
    currentState: join(storyDir, "current_state.md"),
    brief: join(storyDir, "brief.md"),
  } as const;

  // Phase 5: prefer the new prose outline files (outline/story_frame.md +
  // outline/volume_map.md). Fall back to the legacy files transparently.
  const placeholder = "(文件尚未创建)";

  const [
    authorIntent,
    currentFocus,
    storyBible,
    volumeOutline,
    chapterSummariesRaw,
    bookRulesRaw,
    currentState,
    previousEndingExcerpt,
    brief,
  ] = await Promise.all([
    readFileOrDefault(sourcePaths.authorIntent),
    readFileOrDefault(sourcePaths.currentFocus),
    readStoryFrame(params.bookDir, placeholder),
    readVolumeMap(params.bookDir, placeholder),
    readFileOrDefault(sourcePaths.chapterSummaries),
    readFileOrDefault(sourcePaths.bookRules),
    // Phase 5 consolidation: derive initial state from roles + pending_hooks
    // seed rows when current_state.md is still just the architect's placeholder.
    readCurrentStateWithFallback(params.bookDir, placeholder),
    readPreviousEndingExcerpt(params.bookDir, params.chapterNumber),
    readBriefFile(sourcePaths.brief),
  ]);

  const chapterSummaries = parseChapterSummariesMarkdown(chapterSummariesRaw)
    .filter((summary) => summary.chapter < params.chapterNumber)
    .sort((left, right) => right.chapter - left.chapter);

  return {
    storyDir,
    authorIntent,
    currentFocus,
    storyBible,
    volumeOutline,
    bookRulesRaw,
    currentState,
    chapterSummariesRaw,
    brief,
    recentSummaries: chapterSummaries.slice(0, 4).sort((left, right) => left.chapter - right.chapter),
    previousEndingHook: chapterSummaries[0]?.hookActivity || undefined,
    previousEndingExcerpt,
  };
}

export async function gatherPlanningMaterials(params: {
  readonly bookDir: string;
  readonly chapterNumber: number;
  readonly goal: string;
  readonly outlineNode?: string;
  readonly mustKeep?: ReadonlyArray<string>;
  readonly seed?: PlanningSeedMaterials;
}): Promise<PlanningMaterials> {
  const seed = params.seed ?? await loadPlanningSeedMaterials({
    bookDir: params.bookDir,
    chapterNumber: params.chapterNumber,
  });

  const memorySelection = await retrieveMemorySelection({
    bookDir: params.bookDir,
    chapterNumber: params.chapterNumber,
    goal: params.goal,
    outlineNode: params.outlineNode,
    mustKeep: params.mustKeep,
  });

  return {
    ...seed,
    outlineNode: params.outlineNode,
    activeHooks: memorySelection.activeHooks,
    memorySelection,
    plannerInputs: [
      join(seed.storyDir, "author_intent.md"),
      join(seed.storyDir, "current_focus.md"),
      join(seed.storyDir, "outline", "story_frame.md"),
      join(seed.storyDir, "outline", "volume_map.md"),
      join(seed.storyDir, "chapter_summaries.md"),
      join(seed.storyDir, "book_rules.md"),
      join(seed.storyDir, "current_state.md"),
      join(seed.storyDir, "pending_hooks.md"),
      ...(memorySelection.dbPath ? [memorySelection.dbPath] : []),
    ],
  };
}
