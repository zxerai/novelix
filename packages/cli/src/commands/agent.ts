import { Command } from "commander";
import { runAgentLoop } from "@actalk/jiaos-core";
import { loadConfig, createClient, findProjectRoot, resolveContext, log, logError } from "../utils.js";

export const agentCommand = new Command("agent")
  .description("Natural language agent mode (LLM orchestrates via tool-use)")
  .argument("<instruction>", "Natural language instruction")
  .option("--context <text>", "Additional context (natural language)")
  .option("--context-file <path>", "Read additional context from file")
  .option("--max-turns <n>", "Maximum agent turns", "20")
  .option("--json", "Output JSON (suppress progress messages)")
  .option("--quiet", "Suppress tool call logs")
  .action(async (instruction: string, opts) => {
    try {
      const config = await loadConfig();
      const client = createClient(config);
      const root = findProjectRoot();
      const context = await resolveContext(opts);

      const fullInstruction = context
        ? `${instruction}\n\n补充信息：${context}`
        : instruction;

      const maxTurns = parseInt(opts.maxTurns, 10);

      const result = await runAgentLoop(
        {
          client,
          model: config.llm.model,
          projectRoot: root,
        },
        fullInstruction,
        {
          maxTurns,
          onToolCall: opts.quiet || opts.json
            ? undefined
            : (name, args) => {
                log(`  [tool] ${name}(${JSON.stringify(args)})`);
              },
          onToolResult: opts.quiet || opts.json
            ? undefined
            : (name, result) => {
                const preview = result.length > 200 ? `${result.slice(0, 200)}...` : result;
                log(`  [result] ${name} → ${preview}`);
              },
          onMessage: opts.json
            ? undefined
            : (content) => {
                log(`\n${content}`);
              },
        },
      );

      if (opts.json) {
        log(JSON.stringify({ result }));
      }
    } catch (e) {
      if (opts.json) {
        log(JSON.stringify({ error: String(e) }));
      } else {
        logError(`Agent failed: ${e}`);
      }
      process.exit(1);
    }
  });
