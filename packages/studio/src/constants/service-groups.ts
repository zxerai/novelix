import type { EndpointGroup } from "../store/service/types";

export const GROUP_ORDER: ReadonlyArray<EndpointGroup> = [
  "aggregator",
  "overseas",
  "china",
  "local",
  "codingPlan",
] as const;

export const GROUP_LABELS: Record<EndpointGroup, string> = {
  overseas: "海外原厂",
  china: "国产原厂",
  aggregator: "聚合 API",
  local: "本地 / 订阅",
  codingPlan: "CodingPlan",
};

export const GROUP_DESCRIPTIONS: Partial<Record<EndpointGroup, string>> = {
  aggregator: "聚合国内外主流模型，适合用一个 API Key 接入多模型的场景。",
};

export const GROUP_SHORT_LABELS: Record<EndpointGroup, string> = {
  overseas: "海外",
  china: "国产",
  aggregator: "聚合",
  local: "本地",
  codingPlan: "CodingPlan",
};
