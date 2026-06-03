import { z } from "zod";
import yaml from "js-yaml";

const ProtagonistSchema = z.object({
  name: z.string(),
  personalityLock: z.array(z.string()).default([]),
  behavioralConstraints: z.array(z.string()).default([]),
}).optional();

const GenreLockSchema = z.object({
  primary: z.string(),
  forbidden: z.array(z.string()).default([]),
}).optional();

const NumericalOverridesSchema = z.object({
  hardCap: z.union([z.number(), z.string()]).optional(),
  resourceTypes: z.array(z.string()).default([]),
}).optional();

const EraConstraintsSchema = z.object({
  enabled: z.boolean().default(false),
  period: z.string().optional(),
  region: z.string().optional(),
}).optional();

export const BookRulesSchema = z.object({
  version: z.string().default("1.0"),
  protagonist: ProtagonistSchema,
  genreLock: GenreLockSchema,
  numericalSystemOverrides: NumericalOverridesSchema,
  eraConstraints: EraConstraintsSchema,
  prohibitions: z.array(z.string()).default([]),
  chapterTypesOverride: z.array(z.string()).default([]),
  fatigueWordsOverride: z.array(z.string()).default([]),
  additionalAuditDimensions: z.array(z.union([z.number(), z.string()])).default([]),
  enableFullCastTracking: z.boolean().default(false),
  fanficMode: z.enum(["canon", "au", "ooc", "cp"]).optional(),
  allowedDeviations: z.array(z.string()).default([]),
});

export type BookRules = z.infer<typeof BookRulesSchema>;

export interface ParsedBookRules {
  readonly rules: BookRules;
  readonly body: string;
}

/**
 * Phase 5 cleanup #3: book_rules.md is now a compat pointer shim — the
 * authoritative YAML frontmatter lives on outline/story_frame.md. Detect a
 * shim by its architect-emitted heading + pointer line so we can avoid
 * treating it as a legitimate (default-empty) rules source.
 *
 * Markers (must match buildBookRulesShim() in architect.ts):
 *   - 本书规则（兼容指针——已废弃） / Book Rules (compat pointer — deprecated)
 *   - 本文件仅为外部读取保留 / This file is kept for external readers only
 */
export function isBookRulesShim(raw: string): boolean {
  return (
    /本书规则（兼容指针——已废弃）/.test(raw)
    || /Book Rules \(compat pointer — deprecated\)/.test(raw)
    || /本文件仅为外部读取保留/.test(raw)
    || /This file is kept for external readers only/.test(raw)
  );
}

export function parseBookRules(raw: string): ParsedBookRules | null {
  // Strip markdown code block wrappers if present (LLM often wraps output in ```md ... ```)
  const stripped = raw.replace(/^```(?:md|markdown|yaml)?\s*\n/, "").replace(/\n```\s*$/, "");

  // Try to find YAML frontmatter anywhere in the text (not just at the start)
  const fmMatch = stripped.match(/---\s*\n([\s\S]*?)\n---\s*\n?([\s\S]*)$/);
  if (fmMatch) {
    try {
      const frontmatter = yaml.load(fmMatch[1]) as Record<string, unknown>;
      const rules = BookRulesSchema.parse(frontmatter);
      const body = fmMatch[2].trim();
      return { rules, body };
    } catch {
      // YAML parse failed — fall through to shim/default check.
    }
  }

  // Phase hotfix 1: refuse to silently zero out rules when reading a Phase 5
  // compat shim. The shim has no real rules; pretending it parses as
  // "default empty" wipes protagonist / prohibitions / genreLock for any
  // caller that fell back to it after a broken story_frame frontmatter.
  if (isBookRulesShim(stripped)) {
    return null;
  }

  // No valid frontmatter found and not a shim — return default rules with
  // the raw content as body. Keeps backward compat for legacy book_rules.md
  // files that hold only narrow narrative guidance prose.
  const rules = BookRulesSchema.parse({});
  return { rules, body: stripped.trim() };
}

/**
 * Stricter variant of parseBookRules: returns null if the input has no valid
 * YAML frontmatter OR if the frontmatter fails to parse / validate. Unlike
 * parseBookRules, this never falls back to default rules — callers can use
 * the null return to trigger their own fallback (e.g. legacy book_rules.md).
 *
 * Phase 5 hotfix 3: readBookRules() uses this to detect a broken YAML block
 * on story_frame.md and fall back to legacy book_rules.md instead of
 * silently clearing protagonist / prohibitions / genreLock.
 */
export function tryParseBookRulesFrontmatter(
  raw: string,
  onError?: (error: unknown) => void,
): ParsedBookRules | null {
  const stripped = raw.replace(/^```(?:md|markdown|yaml)?\s*\n/, "").replace(/\n```\s*$/, "");
  const fmMatch = stripped.match(/---\s*\n([\s\S]*?)\n---\s*\n?([\s\S]*)$/);
  if (!fmMatch) return null;

  try {
    const frontmatter = yaml.load(fmMatch[1]) as Record<string, unknown>;
    const rules = BookRulesSchema.parse(frontmatter);
    const body = fmMatch[2].trim();
    return { rules, body };
  } catch (err) {
    if (onError) onError(err);
    return null;
  }
}
