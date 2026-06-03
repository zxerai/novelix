import { useApi } from "../hooks/use-api";
import type { Theme } from "../hooks/use-theme";
import type { TFunction } from "../hooks/use-i18n";
import { useColors } from "../hooks/use-colors";

interface TokenStats {
  readonly totalPromptTokens: number;
  readonly totalCompletionTokens: number;
  readonly totalTokens: number;
  readonly avgTokensPerChapter: number;
  readonly recentTrend: ReadonlyArray<{
    readonly chapter: number;
    readonly totalTokens: number;
  }>;
}

interface AnalyticsData {
  readonly bookId: string;
  readonly totalChapters: number;
  readonly totalWords: number;
  readonly avgWordsPerChapter: number;
  readonly auditPassRate: number;
  readonly topIssueCategories: ReadonlyArray<{
    readonly category: string;
    readonly count: number;
  }>;
  readonly chaptersWithMostIssues: ReadonlyArray<{
    readonly chapter: number;
    readonly issueCount: number;
  }>;
  readonly statusDistribution: Record<string, number>;
  readonly tokenStats?: TokenStats;
}

interface Nav {
  toBook: (id: string) => void;
  toDashboard: () => void;
}

const STATUS_LABELS: Record<string, { zh: string; en: string }> = {
  drafted: { zh: "草稿", en: "Drafted" },
  "ready-for-review": { zh: "待审阅", en: "Ready for Review" },
  approved: { zh: "已通过", en: "Approved" },
  "needs-revision": { zh: "需修订", en: "Needs Revision" },
  "audit-failed": { zh: "审计未过", en: "Audit Failed" },
  imported: { zh: "已导入", en: "Imported" },
};

function statusLabel(status: string, isZh: boolean): string {
  return STATUS_LABELS[status]?.[isZh ? "zh" : "en"] ?? status;
}

const STATUS_COLORS: Record<string, string> = {
  drafted: "#6b7280",
  "ready-for-review": "#f59e0b",
  approved: "#10b981",
  "needs-revision": "#ef4444",
  "audit-failed": "#ef4444",
  imported: "#3b82f6",
};

export function Analytics({
  bookId,
  nav,
  theme,
  t,
}: {
  bookId: string;
  nav: Nav;
  theme: Theme;
  t: TFunction;
}) {
  const c = useColors(theme);
  const { data, loading, error } = useApi<AnalyticsData>(
    `/books/${bookId}/analytics`,
  );
  const isZh = t("nav.connected") === "已连接";

  if (loading) return <div className={c.muted}>{t("common.loading")}</div>;
  if (error)
    return (
      <div className="text-red-400">
        {t("common.error")}: {error}
      </div>
    );
  if (!data) return null;

  const statuses = Object.entries(data.statusDistribution);
  const totalFromDist = statuses.reduce((sum, [, count]) => sum + count, 0);

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Breadcrumb */}
      <div className={`flex items-center gap-2 text-sm ${c.muted}`}>
        <button onClick={nav.toDashboard} className={c.link}>
          {t("bread.books")}
        </button>
        <span>/</span>
        <button onClick={() => nav.toBook(bookId)} className={c.link}>
          {bookId}
        </button>
        <span>/</span>
        <span className={c.subtle}>{t("analytics.title")}</span>
      </div>

      <h1 className="text-2xl font-semibold">{t("analytics.title")}</h1>

      {/* Key Metrics Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatCard
          label={t("analytics.totalChapters")}
          value={data.totalChapters.toString()}
          c={c}
        />
        <StatCard
          label={t("analytics.totalWords")}
          value={data.totalWords.toLocaleString()}
          c={c}
        />
        <StatCard
          label={t("analytics.avgWords")}
          value={data.avgWordsPerChapter.toLocaleString()}
          c={c}
        />
        <StatCard
          label={isZh ? "审计通过率" : "Audit Pass Rate"}
          value={`${data.auditPassRate}%`}
          c={c}
          highlight={
            data.auditPassRate >= 80
              ? "text-emerald-500"
              : data.auditPassRate >= 50
                ? "text-amber-500"
                : "text-red-500"
          }
        />
      </div>

      {/* Status Distribution */}
      {statuses.length > 0 && (
        <div className={`border ${c.cardStatic} rounded-lg p-5`}>
          <h2 className={`text-sm font-medium ${c.subtle} mb-4`}>
            {t("analytics.statusDist")}
          </h2>
          <div className="space-y-3">
            {statuses.map(([status, count]) => {
              const pct = totalFromDist > 0 ? (count / totalFromDist) * 100 : 0;
              const color = STATUS_COLORS[status] ?? "#6b7280";
              return (
                <div key={status}>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="flex items-center gap-2">
                      <span
                        className="w-2.5 h-2.5 rounded-full"
                        style={{ backgroundColor: color }}
                      />
                      <span className={c.subtle}>
                        {statusLabel(status, isZh)}
                      </span>
                    </span>
                    <span className={`${c.muted} tabular-nums`}>
                      {count}
                      <span className="text-[11px] ml-1">
                        ({pct.toFixed(0)}%)
                      </span>
                    </span>
                  </div>
                  <div
                    className={`h-2 ${c.btnSecondary} rounded-full overflow-hidden`}
                  >
                    <div
                      className="h-full rounded-full transition-all"
                      style={{ width: `${pct}%`, backgroundColor: color }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Audit Pass Rate Gauge */}
      <div className={`border ${c.cardStatic} rounded-lg p-5`}>
        <h2 className={`text-sm font-medium ${c.subtle} mb-4`}>
          {isZh ? "审计通过率" : "Audit Pass Rate"}
        </h2>
        <div className="flex items-center gap-4">
          <div className="relative w-20 h-20 shrink-0">
            <svg viewBox="0 0 36 36" className="w-full h-full -rotate-90">
              <path
                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                fill="none"
                stroke="currentColor"
                strokeWidth="3"
                className="text-zinc-700"
              />
              <path
                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                fill="none"
                stroke={
                  data.auditPassRate >= 80
                    ? "#10b981"
                    : data.auditPassRate >= 50
                      ? "#f59e0b"
                      : "#ef4444"
                }
                strokeWidth="3"
                strokeDasharray={`${data.auditPassRate} ${100 - data.auditPassRate}`}
                strokeLinecap="round"
              />
            </svg>
            <span className="absolute inset-0 flex items-center justify-center text-lg font-semibold tabular-nums">
              {data.auditPassRate}%
            </span>
          </div>
          <div className="text-sm text-muted-foreground">
            {data.auditPassRate >= 80
              ? isZh
                ? "质量良好，审计通过率较高"
                : "Good quality, high audit pass rate"
              : data.auditPassRate >= 50
                ? isZh
                  ? "部分章节需关注，建议逐个复核"
                  : "Some chapters need attention, review individually"
                : isZh
                  ? "审计通过率偏低，建议检查模型配置或调整修订策略"
                  : "Low pass rate, check model config or adjust revision strategy"}
          </div>
        </div>
      </div>

      {/* Top Issue Categories */}
      {data.topIssueCategories.length > 0 && (
        <div className={`border ${c.cardStatic} rounded-lg p-5`}>
          <h2 className={`text-sm font-medium ${c.subtle} mb-4`}>
            {isZh ? "高频问题分类" : "Top Issue Categories"}
          </h2>
          <div className="space-y-2">
            {data.topIssueCategories.map(({ category, count }, i) => {
              const maxCount = data.topIssueCategories[0]?.count ?? 1;
              const pct = (count / maxCount) * 100;
              const colors = [
                "#f43f5e",
                "#f97316",
                "#eab308",
                "#22c55e",
                "#3b82f6",
                "#8b5cf6",
                "#ec4899",
              ];
              return (
                <div key={category} className="flex items-center gap-3">
                  <span className="w-5 text-xs text-muted-foreground text-right tabular-nums">
                    {i + 1}
                  </span>
                  <div className="flex-1">
                    <div className="flex justify-between text-xs mb-0.5">
                      <span className="truncate max-w-[200px]">{category}</span>
                      <span className="text-muted-foreground tabular-nums">
                        {count}
                        {isZh ? " 次" : ""}
                      </span>
                    </div>
                    <div className="h-1.5 bg-zinc-800/50 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full"
                        style={{
                          width: `${pct}%`,
                          backgroundColor: colors[i % colors.length],
                        }}
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Chapters With Most Issues */}
      {data.chaptersWithMostIssues.length > 0 && (
        <div className={`border ${c.cardStatic} rounded-lg p-5`}>
          <h2 className={`text-sm font-medium ${c.subtle} mb-4`}>
            {isZh ? "问题最多的章节" : "Chapters with Most Issues"}
          </h2>
          <div className="space-y-1">
            {data.chaptersWithMostIssues.map(({ chapter, issueCount }) => (
              <button
                key={chapter}
                onClick={() => nav.toBook(bookId)}
                className="w-full flex items-center justify-between py-1.5 px-2 rounded-md hover:bg-zinc-800/30 transition-colors"
              >
                <span className="text-sm">
                  {isZh ? `第 ${chapter} 章` : `Chapter ${chapter}`}
                </span>
                <span className="text-xs text-muted-foreground tabular-nums">
                  {issueCount}{" "}
                  {isZh ? "个问题" : issueCount === 1 ? "issue" : "issues"}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Token Stats */}
      {data.tokenStats && (
        <div className={`border ${c.cardStatic} rounded-lg p-5`}>
          <h2 className={`text-sm font-medium ${c.subtle} mb-4`}>
            {isZh ? "Token 用量统计" : "Token Usage"}
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
            <MiniStat
              label={isZh ? "总 Token" : "Total Tokens"}
              value={data.tokenStats.totalTokens.toLocaleString()}
            />
            <MiniStat
              label={isZh ? "Prompt Token" : "Prompt"}
              value={data.tokenStats.totalPromptTokens.toLocaleString()}
            />
            <MiniStat
              label={isZh ? "Completion Token" : "Completion"}
              value={data.tokenStats.totalCompletionTokens.toLocaleString()}
            />
            <MiniStat
              label={isZh ? "平均/章" : "Avg/Chapter"}
              value={data.tokenStats.avgTokensPerChapter.toLocaleString()}
            />
          </div>
          {data.tokenStats.recentTrend.length > 0 && (
            <div>
              <div className={`text-xs ${c.subtle} mb-2`}>
                {isZh ? "近 5 章 Token 趋势" : "Recent 5-Chapter Token Trend"}
              </div>
              <div className="flex items-end gap-2 h-16">
                {data.tokenStats.recentTrend.map((point) => {
                  const maxTokens = Math.max(
                    ...data.tokenStats!.recentTrend.map((p) => p.totalTokens),
                    1,
                  );
                  const height = (point.totalTokens / maxTokens) * 100;
                  return (
                    <div
                      key={point.chapter}
                      className="flex-1 flex flex-col items-center gap-1"
                    >
                      <div
                        className="w-full rounded-t transition-all duration-300"
                        style={{
                          height: `${Math.max(height, 4)}%`,
                          backgroundColor: "#6366f1",
                          minHeight: "4px",
                        }}
                      />
                      <span className="text-[10px] text-muted-foreground">
                        {isZh ? `第${point.chapter}章` : `Ch${point.chapter}`}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Empty state when no chapters */}
      {data.totalChapters === 0 && (
        <div className={`border ${c.cardStatic} rounded-lg p-8 text-center`}>
          <p className={`text-sm ${c.muted}`}>
            {isZh
              ? "暂无章节数据。开始写作后将在此显示分析。"
              : "No chapter data yet. Analytics will appear once you start writing."}
          </p>
        </div>
      )}
    </div>
  );
}

function StatCard({
  label,
  value,
  c,
  highlight,
}: {
  label: string;
  value: string;
  c: ReturnType<typeof useColors>;
  highlight?: string;
}) {
  return (
    <div className={`border ${c.cardStatic} rounded-lg p-4`}>
      <div className={`text-xs ${c.muted} mb-1`}>{label}</div>
      <div className={`text-xl font-semibold tabular-nums ${highlight ?? ""}`}>
        {value}
      </div>
    </div>
  );
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="p-2 rounded-md bg-zinc-800/30">
      <div className="text-[10px] text-muted-foreground">{label}</div>
      <div className="text-sm font-semibold tabular-nums">{value}</div>
    </div>
  );
}
