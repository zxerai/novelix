export interface SpotFixPatch {
  readonly targetText: string;
  readonly replacementText: string;
}

export interface SpotFixPatchApplyResult {
  readonly applied: boolean;
  readonly revisedContent: string;
  readonly rejectedReason?: string;
  readonly appliedPatchCount: number;
  readonly skippedPatchCount: number;
  readonly touchedChars: number;
}

export function parseSpotFixPatches(raw: string): SpotFixPatch[] {
  const normalized = raw.includes("=== PATCHES ===")
    ? raw.slice(raw.indexOf("=== PATCHES ===") + "=== PATCHES ===".length)
    : raw;

  const patches: SpotFixPatch[] = [];
  const regex = /--- PATCH(?:\s+\d+)? ---\s*TARGET_TEXT:\s*([\s\S]*?)\s*REPLACEMENT_TEXT:\s*([\s\S]*?)\s*--- END PATCH ---/g;

  let match: RegExpExecArray | null;
  while ((match = regex.exec(normalized)) !== null) {
    patches.push({
      targetText: trimField(match[1] ?? ""),
      replacementText: trimField(match[2] ?? ""),
    });
  }

  return patches.filter((patch) => patch.targetText.length > 0);
}

/**
 * Apply patches to original content. Uses best-effort per-patch strategy:
 * - Try exact match first
 * - Fall back to fuzzy match (whitespace-normalized) if exact fails
 * - Skip individual patches that can't be matched instead of rejecting all
 */
export function applySpotFixPatches(
  original: string,
  patches: ReadonlyArray<SpotFixPatch>,
): SpotFixPatchApplyResult {
  if (patches.length === 0) {
    return {
      applied: false,
      revisedContent: original,
      rejectedReason: "No valid patches returned.",
      appliedPatchCount: 0,
      skippedPatchCount: 0,
      touchedChars: 0,
    };
  }

  let current = original;
  let appliedPatchCount = 0;
  let skippedPatchCount = 0;
  let touchedChars = 0;

  for (const patch of patches) {
    const result = tryApplyPatch(current, patch);
    if (result) {
      current = result.content;
      touchedChars += patch.targetText.length;
      appliedPatchCount++;
    } else {
      skippedPatchCount++;
    }
  }

  return {
    applied: appliedPatchCount > 0 && current !== original,
    revisedContent: current,
    appliedPatchCount,
    skippedPatchCount,
    touchedChars,
    rejectedReason: appliedPatchCount === 0
      ? "No patches could be matched to the chapter content."
      : undefined,
  };
}

function tryApplyPatch(
  content: string,
  patch: SpotFixPatch,
): { content: string } | null {
  // 1. Try exact match
  const exactResult = tryExactMatch(content, patch.targetText);
  if (exactResult) {
    return {
      content: content.slice(0, exactResult.start) +
        patch.replacementText +
        content.slice(exactResult.start + patch.targetText.length),
    };
  }

  // 2. Try fuzzy match (normalize whitespace for comparison)
  const fuzzyResult = tryFuzzyMatch(content, patch.targetText);
  if (fuzzyResult) {
    return {
      content: content.slice(0, fuzzyResult.start) +
        patch.replacementText +
        content.slice(fuzzyResult.end),
    };
  }

  return null;
}

function tryExactMatch(
  content: string,
  target: string,
): { start: number } | null {
  const start = content.indexOf(target);
  if (start === -1) return null;

  // Ensure unique match
  const another = content.indexOf(target, start + target.length);
  if (another !== -1) return null;

  return { start };
}

function tryFuzzyMatch(
  content: string,
  target: string,
): { start: number; end: number } | null {
  const normalizedTarget = normalizeWhitespace(target);
  if (normalizedTarget.length < 10) return null; // Too short to fuzzy match safely

  // Build a sliding window over the content using normalized comparison.
  // Strategy: normalize both sides, find the normalized target in the
  // normalized content, then map back to original positions.
  const contentChars = [...content];
  const normalizedContent = normalizeWhitespace(content);

  const matchStart = normalizedContent.indexOf(normalizedTarget);
  if (matchStart === -1) return null;

  // Ensure unique
  const anotherMatch = normalizedContent.indexOf(normalizedTarget, matchStart + normalizedTarget.length);
  if (anotherMatch !== -1) return null;

  // Map normalized position back to original position
  const originalStart = mapNormalizedToOriginal(content, matchStart);
  const originalEnd = mapNormalizedToOriginal(content, matchStart + normalizedTarget.length);

  if (originalStart === -1 || originalEnd === -1) return null;

  return { start: originalStart, end: originalEnd };
}

function normalizeWhitespace(text: string): string {
  return text.replace(/\s+/g, " ").trim();
}

/**
 * Map a position in normalized (whitespace-collapsed) text back to
 * the corresponding position in the original text.
 */
function mapNormalizedToOriginal(original: string, normalizedPos: number): number {
  let ni = 0; // position in normalized text
  let inWhitespace = false;
  let leadingSkipped = false;

  // Skip leading whitespace in original (matches trim())
  let oi = 0;
  while (oi < original.length && /\s/.test(original[oi]!)) oi++;

  for (; oi <= original.length && ni < normalizedPos; oi++) {
    if (oi === original.length) break;
    const ch = original[oi]!;
    if (/\s/.test(ch)) {
      if (!inWhitespace) {
        ni++; // one space in normalized
        inWhitespace = true;
      }
    } else {
      ni++;
      inWhitespace = false;
    }
  }

  return oi <= original.length ? oi : -1;
}

function trimField(value: string): string {
  return value.replace(/^\s*\n/, "").replace(/\n\s*$/, "").trim();
}
