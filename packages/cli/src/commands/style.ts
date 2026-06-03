import { Command } from "commander";
import { StateManager, analyzeStyle, PipelineRunner } from "@actalk/jiaos-core";
import { loadConfig, buildPipelineConfig, findProjectRoot, resolveBookId, log, logError } from "../utils.js";
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { join, resolve } from "node:path";

export const styleCommand = new Command("style")
  .description("Style fingerprint analysis and import");

styleCommand
  .command("analyze")
  .description("Analyze a text file and extract style profile")
  .argument("<file>", "Text file to analyze")
  .option("--name <name>", "Source name for the profile")
  .option("--json", "Output JSON only")
  .action(async (file: string, opts) => {
    try {
      const text = await readFile(resolve(file), "utf-8");
      const profile = analyzeStyle(text, opts.name ?? file);

      if (opts.json) {
        log(JSON.stringify(profile, null, 2));
      } else {
        log("Style Profile:");
        log(`  Source: ${profile.sourceName ?? "unknown"}`);
        log(`  Avg sentence length: ${profile.avgSentenceLength} chars`);
        log(`  Sentence length std dev: ${profile.sentenceLengthStdDev}`);
        log(`  Avg paragraph length: ${profile.avgParagraphLength} chars`);
        log(`  Paragraph range: ${profile.paragraphLengthRange.min}-${profile.paragraphLengthRange.max} chars`);
        log(`  Vocabulary diversity (TTR): ${profile.vocabularyDiversity}`);
        if (profile.topPatterns.length > 0) {
          log(`  Top patterns: ${profile.topPatterns.join(", ")}`);
        }
        if (profile.rhetoricalFeatures.length > 0) {
          log(`  Rhetorical features: ${profile.rhetoricalFeatures.join(", ")}`);
        }
      }
    } catch (e) {
      logError(`Analysis failed: ${e}`);
      process.exit(1);
    }
  });

styleCommand
  .command("import")
  .description("Import style profile + generate style guide (LLM) into a book")
  .argument("<file>", "Text file to analyze and import")
  .argument("[book-id]", "Book ID (auto-detected if only one book)")
  .option("--name <name>", "Source name for the profile")
  .option("--stats-only", "Only save statistical profile, skip LLM style guide generation")
  .option("--json", "Output JSON")
  .action(async (file: string, bookIdArg: string | undefined, opts) => {
    try {
      const root = findProjectRoot();
      const bookId = await resolveBookId(bookIdArg, root);
      const state = new StateManager(root);
      const bookDir = state.bookDir(bookId);

      const text = await readFile(resolve(file), "utf-8");
      const profile = analyzeStyle(text, opts.name ?? file);

      const storyDir = join(bookDir, "story");
      await mkdir(storyDir, { recursive: true });
      await writeFile(
        join(storyDir, "style_profile.json"),
        JSON.stringify(profile, null, 2),
        "utf-8",
      );

      if (!opts.json) log(`Statistical profile saved (TTR: ${profile.vocabularyDiversity})`);

      // LLM-powered style guide generation
      if (!opts.statsOnly) {
        if (!opts.json) log("Generating qualitative style guide via LLM...");
        const config = await loadConfig();
        const pipeline = new PipelineRunner(buildPipelineConfig(config, root));
        await pipeline.generateStyleGuide(bookId, text, opts.name ?? file);
        if (!opts.json) log("Style guide (style_guide.md) generated.");
      }

      if (opts.json) {
        log(JSON.stringify({
          bookId,
          file,
          statsProfile: `story/style_profile.json`,
          styleGuide: opts.statsOnly ? null : `story/style_guide.md`,
        }, null, 2));
      } else {
        log(`Style imported to "${bookId}" from "${file}"`);
      }
    } catch (e) {
      if (opts.json) {
        log(JSON.stringify({ error: String(e) }));
      } else {
        logError(`Import failed: ${e}`);
      }
      process.exit(1);
    }
  });
