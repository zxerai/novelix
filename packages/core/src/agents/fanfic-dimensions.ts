import type { FanficMode } from "../models/book.js";

export interface FanficDimensionConfig {
  readonly activeIds: ReadonlyArray<number>;
  readonly severityOverrides: ReadonlyMap<number, "critical" | "warning" | "info">;
  readonly deactivatedIds: ReadonlyArray<number>;
  readonly notes: ReadonlyMap<number, string>;
}

// Fanfic-specific audit dimensions (34-37)
export const FANFIC_DIMENSIONS: ReadonlyArray<{
  readonly id: number;
  readonly name: string;
  readonly baseNote: string;
}> = [
  {
    id: 34,
    name: "角色还原度",
    baseNote: "检查角色的语癖、说话风格、行为模式是否与 fanfic_canon.md 角色档案一致。偏离必须有情境驱动。",
  },
  {
    id: 35,
    name: "世界规则遵守",
    baseNote: "检查章节内容是否违反 fanfic_canon.md 中的世界规则（地理、力量体系、阵营关系）。",
  },
  {
    id: 36,
    name: "关系动态",
    baseNote: "检查角色之间的关系互动是否合理，是否与 fanfic_canon.md 中标注的关键关系一致或有合理发展。",
  },
  {
    id: 37,
    name: "正典事件一致性",
    baseNote: "检查章节是否与 fanfic_canon.md 关键事件时间线矛盾。",
  },
];

// Mode → dimension severity mapping
const SEVERITY_MAP: Record<FanficMode, Record<number, "critical" | "warning" | "info">> = {
  canon: { 34: "critical", 35: "critical", 36: "warning", 37: "critical" },
  au:    { 34: "critical", 35: "info",     36: "warning", 37: "info" },
  ooc:   { 34: "info",     35: "warning",  36: "warning", 37: "info" },
  cp:    { 34: "warning",  35: "warning",  36: "critical", 37: "info" },
};

// Spinoff dims (28-31) are deactivated in fanfic mode — they're for same-author spinoffs
const SPINOFF_DIMS = [28, 29, 30, 31];

// OOC mode relaxes the built-in OOC check (dim 1)
const OOC_DIM = 1;

export function getFanficDimensionConfig(
  mode: FanficMode,
  _allowedDeviations: ReadonlyArray<string> = [],
): FanficDimensionConfig {
  const severityMap = SEVERITY_MAP[mode];
  const severityOverrides = new Map<number, "critical" | "warning" | "info">();
  const notes = new Map<number, string>();

  for (const dim of FANFIC_DIMENSIONS) {
    severityOverrides.set(dim.id, severityMap[dim.id]!);

    const severity = severityMap[dim.id]!;
    const severityLabel = severity === "critical" ? "（严格检查）"
      : severity === "info" ? "（仅记录，不判定失败）"
      : "（警告级别）";
    notes.set(dim.id, `${dim.baseNote} ${severityLabel}`);
  }

  // OOC mode relaxes the built-in OOC check
  if (mode === "ooc") {
    severityOverrides.set(OOC_DIM, "info");
    notes.set(OOC_DIM, "OOC模式下角色可偏离性格底色，此维度仅记录不判定失败。参照 fanfic_canon.md 角色档案评估偏离程度。");
  }

  // Canon mode strengthens the built-in OOC check
  if (mode === "canon") {
    notes.set(OOC_DIM, "原作向同人：角色必须严格遵守性格底色。参照 fanfic_canon.md 角色档案中的性格底色和行为模式。");
  }

  return {
    activeIds: FANFIC_DIMENSIONS.map((d) => d.id),
    severityOverrides,
    deactivatedIds: SPINOFF_DIMS,
    notes,
  };
}
