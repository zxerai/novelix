import type { Hono } from "hono";
import type {
  StateManager,
  PipelineConfig,
  ProjectConfig,
  LogSink,
  LogEntry,
} from "@actalk/jiaos-core";

export interface RouterContext {
  readonly app: Hono;
  readonly state: StateManager;
  readonly root: string;
  cachedConfig: ProjectConfig;

  readonly sseSink: LogSink;
  readonly consoleSink: LogSink;
  readonly fileSink: LogSink;

  readonly bookCreateStatus: Map<
    string,
    { status: "creating" | "error"; error?: string }
  >;
  readonly bookWriteStatus: Map<
    string,
    { status: string; chapterNumber?: number; startedAt: number }
  >;
  readonly modelListCache: Map<
    string,
    { models: Array<{ id: string; name: string }>; at: number }
  >;

  readonly broadcast: (event: string, data: unknown) => void;
  readonly loadCurrentProjectConfig: (options?: {
    readonly requireApiKey?: boolean;
  }) => Promise<ProjectConfig>;
  readonly buildPipelineConfig: (
    overrides?: Record<string, unknown>,
  ) => Promise<PipelineConfig>;
}
