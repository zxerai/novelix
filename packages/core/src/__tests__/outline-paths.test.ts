import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  readCharacterContext,
  readRhythmPrinciples,
  readRoleCards,
  readStoryFrame,
  readVolumeMap,
} from "../utils/outline-paths.js";

let bookDir: string;

beforeEach(async () => {
  bookDir = await mkdtemp(join(tmpdir(), "jiaos-outline-paths-"));
  await mkdir(join(bookDir, "story"), { recursive: true });
});

afterEach(async () => {
  await rm(bookDir, { recursive: true, force: true });
});

describe("outline-paths", () => {
  it("prefers outline/story_frame.md over legacy story_bible.md", async () => {
    await mkdir(join(bookDir, "story", "outline"), { recursive: true });
    await writeFile(join(bookDir, "story", "outline", "story_frame.md"), "NEW frame prose", "utf-8");
    await writeFile(join(bookDir, "story", "story_bible.md"), "OLD bible table", "utf-8");

    const content = await readStoryFrame(bookDir, "(missing)");
    expect(content).toBe("NEW frame prose");
  });

  it("falls back to legacy story_bible.md when outline/story_frame.md absent", async () => {
    await writeFile(join(bookDir, "story", "story_bible.md"), "legacy bible", "utf-8");

    const content = await readStoryFrame(bookDir, "(missing)");
    expect(content).toBe("legacy bible");
  });

  it("returns placeholder when no story-frame source exists", async () => {
    const content = await readStoryFrame(bookDir, "(missing)");
    expect(content).toBe("(missing)");
  });

  it("prefers outline/volume_map.md over legacy volume_outline.md", async () => {
    await mkdir(join(bookDir, "story", "outline"), { recursive: true });
    await writeFile(join(bookDir, "story", "outline", "volume_map.md"), "NEW map prose", "utf-8");
    await writeFile(join(bookDir, "story", "volume_outline.md"), "OLD outline", "utf-8");

    const content = await readVolumeMap(bookDir, "(missing)");
    expect(content).toBe("NEW map prose");
  });

  it("reads role cards one-file-per-character from both tiers", async () => {
    const majorDir = join(bookDir, "story", "roles", "主要角色");
    const minorDir = join(bookDir, "story", "roles", "次要角色");
    await mkdir(majorDir, { recursive: true });
    await mkdir(minorDir, { recursive: true });
    await writeFile(join(majorDir, "林辞.md"), "主角核心卡", "utf-8");
    await writeFile(join(majorDir, "沈默.md"), "对手卡", "utf-8");
    await writeFile(join(minorDir, "老张.md"), "次要卡", "utf-8");

    const cards = await readRoleCards(bookDir);
    expect(cards).toHaveLength(3);
    const byName = Object.fromEntries(cards.map((card) => [card.name, card]));
    expect(byName["林辞"]?.tier).toBe("major");
    expect(byName["沈默"]?.tier).toBe("major");
    expect(byName["老张"]?.tier).toBe("minor");
  });

  it("composes role cards into character-context prose grouped by tier", async () => {
    const majorDir = join(bookDir, "story", "roles", "主要角色");
    await mkdir(majorDir, { recursive: true });
    await writeFile(join(majorDir, "林辞.md"), "## 核心标签\n沉静的观察者\n", "utf-8");

    const context = await readCharacterContext(bookDir, "(empty)");
    expect(context).toContain("林辞");
    expect(context).toContain("主要角色");
    expect(context).toContain("沉静的观察者");
  });

  it("falls back to legacy character_matrix.md when no role cards exist", async () => {
    await writeFile(join(bookDir, "story", "character_matrix.md"), "legacy matrix table", "utf-8");

    const context = await readCharacterContext(bookDir, "(empty)");
    expect(context).toBe("legacy matrix table");
  });

  it("reads 节奏原则.md and falls back to rhythm_principles.md", async () => {
    await mkdir(join(bookDir, "story", "outline"), { recursive: true });
    await writeFile(join(bookDir, "story", "outline", "节奏原则.md"), "六条原则", "utf-8");

    const content = await readRhythmPrinciples(bookDir);
    expect(content).toBe("六条原则");
  });
});
