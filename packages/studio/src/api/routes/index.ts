import type { Hono } from "hono";
import type { RouterContext } from "./context.js";
import { isSafeBookId } from "../safety.js";

/**
 * Register all route groups on the app.
 *
 * This is the entry point for route modularization.
 * As routes are extracted from server.ts into route files,
 * they are registered here instead.
 *
 * Current migration status:
 *   ✅ context.ts   — shared state interface
 *   ⏳ books.ts     — book CRUD, chapters, truth files (biggest group)
 *   ⏳ services.ts  — LLM services, model discovery
 *   ⏳ sessions.ts  — chat sessions, agent interactions
 *   ⏳ genres.ts    — genre management
 *   ⏳ project.ts   — project config, files
 *   ⏳ cover.ts     — cover image service
 *   ⏳ daemon.ts    — background writer
 *   ⏳ misc.ts      — logs, events, doctor
 *
 * Migration guide:
 * 1. Create routes/<name>.ts with register<Name>Routes(ctx) function
 * 2. Each function takes RouterContext and calls ctx.app.get/post/...
 * 3. Import and call it here
 * 4. Remove the corresponding handler from server.ts
 */
import { registerBookRoutes, loadStudioBookListSummary } from "./books.js";
import { getBookWriteStatus } from "./books.js";

import { registerServiceRoutes } from "./services.js";

export function registerAllRoutes(ctx: RouterContext): void {
  registerBookRoutes(ctx);
  registerServiceRoutes(ctx);
}

export { loadStudioBookListSummary, getBookWriteStatus };
