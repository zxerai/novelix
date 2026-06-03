import { useState } from "react";

interface VolumeNode {
  readonly volume: number;
  readonly title: string;
  readonly range: string;
  readonly chapters: string;
  readonly theme: string;
  readonly highlight: string;
  readonly okrs: ReadonlyArray<string>;
  readonly hooks: ReadonlyArray<string>;
}

interface PlotMindMapProps {
  readonly volumes: ReadonlyArray<VolumeNode>;
}

const VOLUME_COLORS = [
  { bg: "#e74c3c22", border: "#e74c3c", text: "#e74c3c" },
  { bg: "#3498db22", border: "#3498db", text: "#3498db" },
  { bg: "#2ecc7122", border: "#2ecc71", text: "#27ae60" },
  { bg: "#f39c1222", border: "#f39c12", text: "#e67e22" },
  { bg: "#9b59b622", border: "#9b59b6", text: "#8e44ad" },
];

export function PlotMindMap({ volumes }: PlotMindMapProps) {
  const [expandedVol, setExpandedVol] = useState<number | null>(1);
  const [hoveredVol, setHoveredVol] = useState<number | null>(null);

  if (!volumes || volumes.length === 0) {
    return (
      <div className="flex items-center justify-center h-full min-h-[300px] text-muted-foreground text-sm">
        暂无卷纲数据
      </div>
    );
  }

  return (
    <div className="w-full space-y-4">
      <div className="text-center py-3">
        <span className="text-sm font-bold uppercase tracking-widest text-muted-foreground">
          故事卷纲
        </span>
      </div>

      <div className="relative pl-8">
        <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-border/50" />

        {volumes.map((vol, i) => {
          const colors = VOLUME_COLORS[i % VOLUME_COLORS.length];
          const isExpanded = expandedVol === vol.volume;
          const isHovered = hoveredVol === vol.volume;

          return (
            <div key={vol.volume} className="relative mb-3">
              <div
                className="absolute -left-6 top-3 w-3 h-3 rounded-full border-2 cursor-pointer transition-all"
                style={{
                  borderColor: colors.border,
                  backgroundColor: isExpanded ? colors.border : "transparent",
                }}
                onClick={() => setExpandedVol(isExpanded ? null : vol.volume)}
                onMouseEnter={() => setHoveredVol(vol.volume)}
                onMouseLeave={() => setHoveredVol(null)}
              />

              <div
                className="rounded-lg border p-3 cursor-pointer transition-all"
                style={{
                  borderColor:
                    isHovered || isExpanded ? colors.border : undefined,
                  backgroundColor: isExpanded ? colors.bg : "transparent",
                }}
                onClick={() => setExpandedVol(isExpanded ? null : vol.volume)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span
                      className="text-xs font-bold px-1.5 py-0.5 rounded"
                      style={{ backgroundColor: colors.bg, color: colors.text }}
                    >
                      卷{vol.volume}
                    </span>
                    <span className="font-semibold text-sm">{vol.title}</span>
                    <span className="text-[10px] text-muted-foreground font-mono">
                      {vol.range}
                    </span>
                  </div>
                  <span className="text-[10px] text-muted-foreground">
                    {isExpanded ? "收起" : "展开"}
                  </span>
                </div>
                <div className="text-xs text-muted-foreground mt-1">
                  {vol.theme}
                </div>
              </div>

              {isExpanded && (
                <div
                  className="ml-6 mt-2 space-y-2 pl-4 border-l-2"
                  style={{ borderColor: `${colors.border}44` }}
                >
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <span>📄 {vol.chapters}</span>
                    <span
                      className="font-medium"
                      style={{ color: colors.text }}
                    >
                      {vol.highlight}
                    </span>
                  </div>

                  {vol.okrs.length > 0 && (
                    <div className="space-y-1">
                      <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                        📋 目标
                      </div>
                      <ul className="space-y-0.5">
                        {vol.okrs.map((okr, j) => (
                          <li
                            key={j}
                            className="text-[11px] text-muted-foreground flex gap-1.5"
                          >
                            <span className="shrink-0 mt-0.5">•</span>
                            <span>{okr}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {vol.hooks.length > 0 && (
                    <div className="space-y-1">
                      <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                        🪝 伏笔
                      </div>
                      <ul className="space-y-0.5">
                        {vol.hooks.map((hook, j) => (
                          <li
                            key={j}
                            className="text-[11px] text-muted-foreground flex gap-1.5"
                          >
                            <span className="shrink-0 mt-0.5">•</span>
                            <span>{hook}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
