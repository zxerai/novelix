import { Command } from "commander";
import { ConsolidatorAgent } from "@actalk/jiaos-core";
import { loadConfig, buildPipelineConfig, findProjectRoot, resolveBookId, log, logError } from "../utils.js";

export const consolidateCommand = new Command("consolidate")
  .description("Consolidate chapter summaries into volume-level summaries (reduces context for long books)")
  .argument("[book-id]", "Book ID (auto-detected if only one book)")
  .option("--json", "Output JSON")
  .action(async (bookIdArg: string | undefined, opts) => {
    try {
      const config = await loadConfig();
      const root = findProjectRoot();
      const bookId = await resolveBookId(bookIdArg, root);

      const pipelineConfig = buildPipelineConfig(config, root);
      const consolidator = new ConsolidatorAgent({
        client: pipelineConfig.client,
        model: pipelineConfig.model,
        projectRoot: root,
      });

      const { StateManager } = await import("@actalk/jiaos-core");
      const state = new StateManager(root);
      const bookDir = state.bookDir(bookId);

      if (!opts.json) log(`Consolidating chapter summaries for "${bookId}"...`);

      const result = await consolidator.consolidate(bookDir);

      if (opts.json) {
        log(JSON.stringify(result, null, 2));
      } else {
        if (result.archivedVolumes === 0) {
          log("No completed volumes found to consolidate.");
        } else {
          log(`Consolidated ${result.archivedVolumes} volume(s).`);
          log(`Retained ${result.retainedChapters} recent chapter summaries.`);
          log(`Volume summaries saved to story/volume_summaries.md`);
          log(`Detailed summaries archived to story/summaries_archive/`);
        }
      }
    } catch (e) {
      if (opts.json) {
        log(JSON.stringify({ error: String(e) }));
      } else {
        logError(`Consolidation failed: ${e}`);
      }
      process.exit(1);
    }
  });
