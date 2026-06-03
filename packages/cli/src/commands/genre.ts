import { Command } from "commander";
import { writeFile, mkdir, readFile } from "node:fs/promises";
import { join } from "node:path";
import { listAvailableGenres, readGenreProfile, getBuiltinGenresDir } from "@actalk/jiaos-core";
import { findProjectRoot, log, logError } from "../utils.js";

export const genreCommand = new Command("genre")
  .description("Manage genre profiles");

genreCommand
  .command("list")
  .description("List all available genre profiles (built-in + project)")
  .action(async () => {
    try {
      const root = findProjectRoot();
      const genres = await listAvailableGenres(root);

      if (genres.length === 0) {
        log("No genre profiles found.");
        return;
      }

      log("Available genres:\n");
      for (const g of genres) {
        const tag = g.source === "project" ? "[project]" : "[builtin]";
        log(`  ${g.id.padEnd(12)} ${g.name.padEnd(8)} ${tag}`);
      }
      log(`\nTotal: ${genres.length} genre(s)`);
    } catch (e) {
      logError(`Failed to list genres: ${e}`);
      process.exit(1);
    }
  });

genreCommand
  .command("show")
  .description("Display a genre profile")
  .argument("<id>", "Genre ID (e.g. xuanhuan, urban, horror)")
  .action(async (id: string) => {
    try {
      const root = findProjectRoot();
      const genres = await listAvailableGenres(root);
      const exactMatch = genres.some(g => g.id === id);
      if (!exactMatch) {
        logError(`Genre "${id}" not found. Available: ${genres.map(g => g.id).join(", ")}`);
        process.exit(1);
      }
      const { profile, body } = await readGenreProfile(root, id);

      log(`Genre: ${profile.name} (${profile.id})\n`);
      log(`  Chapter types:      ${profile.chapterTypes.join(", ")}`);
      log(`  Fatigue words:      ${profile.fatigueWords.join(", ")}`);
      log(`  Numerical system:   ${profile.numericalSystem}`);
      log(`  Power scaling:      ${profile.powerScaling}`);
      log(`  Era research:       ${profile.eraResearch}`);
      log(`  Pacing rule:        ${profile.pacingRule}`);
      log(`  Satisfaction types: ${profile.satisfactionTypes.join(", ")}`);
      log(`  Audit dimensions:   ${profile.auditDimensions.join(", ")}`);

      if (body) {
        log(`\n--- Body ---\n${body}`);
      }
    } catch (e) {
      logError(`Failed to show genre: ${e}`);
      process.exit(1);
    }
  });

genreCommand
  .command("create")
  .description("Scaffold a new genre profile in the project genres/ directory")
  .argument("<id>", "Genre ID (e.g. scifi, wuxia, romance)")
  .option("--name <name>", "Genre display name", "")
  .option("--numerical", "Enable numerical system", false)
  .option("--power", "Enable power scaling", false)
  .option("--era", "Enable era research", false)
  .action(async (id: string, opts) => {
    try {
      const root = findProjectRoot();
      const genresDir = join(root, "genres");
      const filePath = join(genresDir, `${id}.md`);

      // Check if already exists
      try {
        await readFile(filePath, "utf-8");
        logError(`Genre profile already exists: ${filePath}`);
        process.exit(1);
      } catch { /* file doesn't exist, good */ }

      await mkdir(genresDir, { recursive: true });

      const name = opts.name || id;
      const template = `---
name: ${name}
id: ${id}
chapterTypes: ["推进章", "布局章", "过渡章", "回收章"]
fatigueWords: ["震惊", "不可思议", "难以置信"]
numericalSystem: ${opts.numerical}
powerScaling: ${opts.power}
eraResearch: ${opts.era}
pacingRule: "每2-3章有一个明确的进展或反馈"
satisfactionTypes: ["目标达成", "困难克服", "真相揭示"]
auditDimensions: [1,2,3,6,7,8,9,10,13,14,15,16,17,18,19]
---

## 题材禁忌

- (根据题材添加禁忌)

## 叙事指导

(根据题材描述叙事重心和风格要求)
`;

      await writeFile(filePath, template, "utf-8");
      log(`Created genre profile: ${filePath}`);
      log(`Edit the file to customize chapter types, fatigue words, rules, etc.`);
    } catch (e) {
      logError(`Failed to create genre: ${e}`);
      process.exit(1);
    }
  });

genreCommand
  .command("copy")
  .description("Copy a built-in genre profile to project for customization")
  .argument("<id>", "Genre ID to copy (e.g. xuanhuan)")
  .action(async (id: string) => {
    try {
      const root = findProjectRoot();
      const builtinDir = getBuiltinGenresDir();
      const srcPath = join(builtinDir, `${id}.md`);
      const genresDir = join(root, "genres");
      const destPath = join(genresDir, `${id}.md`);

      // Check if project override already exists
      try {
        await readFile(destPath, "utf-8");
        logError(`Project genre profile already exists: ${destPath}`);
        process.exit(1);
      } catch { /* doesn't exist, good */ }

      let content: string;
      try {
        content = await readFile(srcPath, "utf-8");
      } catch {
        logError(`Built-in genre "${id}" not found. Use 'jiaos genre list' to see available genres.`);
        process.exit(1);
        return;
      }

      await mkdir(genresDir, { recursive: true });
      await writeFile(destPath, content, "utf-8");
      log(`Copied to: ${destPath}`);
      log(`This project-level copy will override the built-in profile.`);
    } catch (e) {
      logError(`Failed to copy genre: ${e}`);
      process.exit(1);
    }
  });
