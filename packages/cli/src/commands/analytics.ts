import { Command } from "commander";
import { StateManager, computeAnalytics } from "@actalk/jiaos-core";
import { loadConfig, findProjectRoot, resolveBookId, log, logError } from "../utils.js";

export const analyticsCommand = new Command("analytics")
  .alias("stats")
  .description("Show analytics and token stats for a book")
  .argument("[book-id]", "Book ID (auto-detected if only one book)")
  .option("--json", "Output JSON")
  .action(async (bookIdArg: string | undefined, opts) => {
    try {
      await loadConfig();
      const root = findProjectRoot();
      const bookId = await resolveBookId(bookIdArg, root);
      const state = new StateManager(root);
      const chapters = await state.loadChapterIndex(bookId);

      const analytics = computeAnalytics(bookId, chapters);

      if (opts.json) {
        log(JSON.stringify(analytics, null, 2));
      } else {
        log(`Analytics for "${bookId}":`);
        log("");
        log(`  Total chapters: ${analytics.totalChapters}`);
        log(`  Total words: ${analytics.totalWords.toLocaleString()}`);
        log(`  Avg words/chapter: ${analytics.avgWordsPerChapter.toLocaleString()}`);
        log(`  Audit pass rate: ${analytics.auditPassRate}%`);
        log("");

        if (Object.keys(analytics.statusDistribution).length > 0) {
          log("  Status distribution:");
          for (const [status, count] of Object.entries(analytics.statusDistribution)) {
            log(`    ${status}: ${count}`);
          }
          log("");
        }

        if (analytics.tokenStats) {
          log("  Token usage:");
          log(`    Total tokens: ${analytics.tokenStats.totalTokens.toLocaleString()}`);
          log(`    Prompt tokens: ${analytics.tokenStats.totalPromptTokens.toLocaleString()}`);
          log(`    Completion tokens: ${analytics.tokenStats.totalCompletionTokens.toLocaleString()}`);
          log(`    Avg tokens/chapter: ${analytics.tokenStats.avgTokensPerChapter.toLocaleString()}`);
          if (analytics.tokenStats.recentTrend.length > 0) {
            log("    Recent trend:");
            for (const { chapter, totalTokens } of analytics.tokenStats.recentTrend) {
              log(`      Ch.${chapter}: ${totalTokens.toLocaleString()} tokens`);
            }
          }
          log("");
        }

        if (analytics.topIssueCategories.length > 0) {
          log("  Most common issue categories:");
          for (const { category, count } of analytics.topIssueCategories) {
            log(`    ${category}: ${count}`);
          }
          log("");
        }

        if (analytics.chaptersWithMostIssues.length > 0) {
          log("  Chapters with most issues:");
          for (const { chapter, issueCount } of analytics.chaptersWithMostIssues) {
            log(`    Ch.${chapter}: ${issueCount} issues`);
          }
        }
      }
    } catch (e) {
      if (opts.json) {
        log(JSON.stringify({ error: String(e) }));
      } else {
        logError(`Analytics failed: ${e}`);
      }
      process.exit(1);
    }
  });
