import type { RouterContext } from "./context.js";
import type { StateManager } from "@actalk/jiaos-core";

// ---- 书籍概要辅助函数 ----

interface StudioBookListSummary {
  readonly id: string;
  readonly title: string;
  readonly genre: string;
  readonly status: string;
  readonly chaptersWritten: number;
  readonly [key: string]: unknown;
}

export async function loadStudioBookListSummary(
  state: StateManager,
  bookId: string,
): Promise<StudioBookListSummary> {
  const book = await state.loadBookConfig(bookId);
  const nextChapter = await state.getNextChapterNumber(bookId);
  return { ...book, chaptersWritten: nextChapter - 1 };
}

// ---- 写作状态缓存 ----

type WriteStatus = "writing" | "drafting" | "reviewing" | "done" | "error";

const bookWriteStatus = new Map<
  string,
  {
    status: WriteStatus;
    chapterNumber?: number;
    stage?: string;
    error?: string;
    startedAt: number;
  }
>();

// 10 分钟清理一次已完成/错误的记录
setInterval(
  () => {
    const cutoff = Date.now() - 10 * 60 * 1000;
    for (const [id, s] of bookWriteStatus) {
      if (
        (s.status === "done" || s.status === "error") &&
        s.startedAt < cutoff
      ) {
        bookWriteStatus.delete(id);
      }
    }
  },
  5 * 60 * 1000,
);

// ---- 活跃操作查询 ----

export function getBookWriteStatus(): Map<
  string,
  { status: string; startedAt: number }
> {
  return bookWriteStatus;
}

// ---- 路由注册 ----

export function registerBookRoutes(ctx: RouterContext): void {
  const { app, state, broadcast, buildPipelineConfig } = ctx;

  // --- 书籍列表 ---

  app.get("/api/v1/books", async (c) => {
    const bookIds = await state.listBooks();
    const books = await Promise.all(
      bookIds.map((id) => loadStudioBookListSummary(state, id)),
    );
    return c.json({ books });
  });

  // --- 获取单本书 ---

  app.get("/api/v1/books/:id", async (c) => {
    const id = c.req.param("id");
    try {
      const book = await state.loadBookConfig(id);
      const chapters = await state.loadChapterIndex(id);
      const nextChapter = await state.getNextChapterNumber(id);
      return c.json({ book, chapters, nextChapter });
    } catch {
      return c.json({ error: `Book "${id}" not found` }, 404);
    }
  });

  // --- 更新书籍设置 ---

  app.put("/api/v1/books/:id", async (c) => {
    const id = c.req.param("id");
    const updates = await c.req.json<{
      chapterWordCount?: number;
      targetChapters?: number;
      status?: string;
      language?: string;
    }>();
    try {
      const book = await state.loadBookConfig(id);
      const updated = {
        ...book,
        ...(updates.chapterWordCount !== undefined
          ? { chapterWordCount: Number(updates.chapterWordCount) }
          : {}),
        ...(updates.targetChapters !== undefined
          ? { targetChapters: Number(updates.targetChapters) }
          : {}),
        ...(updates.status !== undefined
          ? { status: updates.status as typeof book.status }
          : {}),
        ...(updates.language !== undefined
          ? { language: updates.language as "zh" | "en" }
          : {}),
        updatedAt: new Date().toISOString(),
      };
      await state.saveBookConfig(id, updated);
      return c.json({ ok: true, book: updated });
    } catch (e) {
      return c.json({ error: String(e) }, 500);
    }
  });

  // --- 删除书籍 ---

  app.delete("/api/v1/books/:id", async (c) => {
    const id = c.req.param("id");
    const bookDir = state.bookDir(id);
    try {
      const { rm } = await import("node:fs/promises");
      await rm(bookDir, { recursive: true, force: true });
      broadcast("book:deleted", { bookId: id });
      return c.json({ ok: true, bookId: id });
    } catch (e) {
      return c.json({ error: String(e) }, 500);
    }
  });

  // --- 写入状态 ---

  app.get("/api/v1/books/:id/write-status", (c) => {
    const id = c.req.param("id");
    const status = bookWriteStatus.get(id);
    return c.json(status ?? { status: "idle" });
  });

  // --- 活跃操作（页面刷新恢复） ---

  app.get("/api/v1/active-operations", (c) => {
    const active: Record<string, { status: string; startedAt: number }> = {};
    for (const [bookId, s] of bookWriteStatus) {
      if (s.status === "writing" || s.status === "drafting") {
        active[bookId] = { status: s.status, startedAt: s.startedAt };
      }
    }
    return c.json({ active });
  });

  // --- 写下一章 ---

  app.post("/api/v1/books/:id/write-next", async (c) => {
    const id = c.req.param("id");
    const body = await c.req
      .json<{ wordCount?: number }>()
      .catch(() => ({ wordCount: undefined }));

    bookWriteStatus.set(id, { status: "writing", startedAt: Date.now() });
    broadcast("write:start", { bookId: id });

    // Fire and forget — progress/completion/errors pushed via SSE
    const { PipelineRunner } = await import("@actalk/jiaos-core");
    const pipeline = new PipelineRunner(await buildPipelineConfig());
    pipeline.writeNextChapter(id, body.wordCount).then(
      (result) => {
        bookWriteStatus.set(id, {
          status: "done",
          chapterNumber: result.chapterNumber,
          startedAt: bookWriteStatus.get(id)?.startedAt ?? Date.now(),
        });
        broadcast("write:complete", {
          bookId: id,
          chapterNumber: result.chapterNumber,
          status: result.status,
          title: result.title,
          wordCount: result.wordCount,
        });
      },
      (e) => {
        bookWriteStatus.set(id, {
          status: "error",
          error: e instanceof Error ? e.message : String(e),
          startedAt: bookWriteStatus.get(id)?.startedAt ?? Date.now(),
        });
        broadcast("write:error", {
          bookId: id,
          error: e instanceof Error ? e.message : String(e),
        });
      },
    );

    return c.json({ status: "writing", bookId: id });
  });

  // --- 草稿 ---

  app.post("/api/v1/books/:id/draft", async (c) => {
    const id = c.req.param("id");
    const body = await c.req
      .json<{ wordCount?: number; context?: string }>()
      .catch(() => ({ wordCount: undefined, context: undefined }));

    bookWriteStatus.set(id, { status: "drafting", startedAt: Date.now() });
    broadcast("draft:start", { bookId: id });

    (async () => {
      try {
        const { PipelineRunner } = await import("@actalk/jiaos-core");
        const pipeline = new PipelineRunner(await buildPipelineConfig());
        const result = await pipeline.writeDraft(
          id,
          body.context,
          body.wordCount,
        );
        bookWriteStatus.set(id, {
          status: "done",
          chapterNumber: result.chapterNumber,
          startedAt: bookWriteStatus.get(id)?.startedAt ?? Date.now(),
        });
        broadcast("draft:complete", {
          bookId: id,
          chapterNumber: result.chapterNumber,
          title: result.title,
          wordCount: result.wordCount,
        });
      } catch (e) {
        bookWriteStatus.set(id, {
          status: "error",
          error: e instanceof Error ? e.message : String(e),
          startedAt: bookWriteStatus.get(id)?.startedAt ?? Date.now(),
        });
        broadcast("draft:error", {
          bookId: id,
          error: e instanceof Error ? e.message : String(e),
        });
      }
    })();

    return c.json({ status: "drafting", bookId: id });
  });
}
