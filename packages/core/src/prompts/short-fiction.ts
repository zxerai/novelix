export interface ShortFictionReferencePromptInput {
  readonly text?: string;
}

export interface ShortFictionOutlinePromptInput {
  readonly direction: string;
  readonly chapterCount: number;
  readonly charsPerChapter: number;
  readonly reference?: ShortFictionReferencePromptInput;
}

export interface ShortFictionOutlineReviewPromptInput {
  readonly direction: string;
  readonly outline: {
    readonly rawContent: string;
  };
  readonly reference?: ShortFictionReferencePromptInput;
}

export interface ShortFictionOutlineRevisionPromptInput extends ShortFictionOutlineReviewPromptInput {
  readonly review: string;
  readonly chapterCount: number;
  readonly charsPerChapter: number;
}

export interface ShortFictionDraftPromptInput {
  readonly direction: string;
  readonly outlineMarkdown: string;
  readonly chapterCount: number;
  readonly charsPerChapter: number;
}

export interface ShortFictionDraftReviewPromptInput extends ShortFictionDraftPromptInput {
  readonly draftMarkdown: string;
}

export interface ShortFictionDraftRevisionPromptInput extends ShortFictionDraftPromptInput {
  readonly review: string;
}

export interface ShortFictionPackagePromptInput {
  readonly direction: string;
  readonly outlineMarkdown: string;
  readonly draftMarkdown: string;
  readonly draftTitle: string;
}

export function buildShortFictionOutlineSystemPrompt(): string {
  return [
    "你是商业短篇小说总编，负责把一个商业方向做成完整短篇故事方案。",
    "只基于本次商业方向和用户提供的参考文本创作；没有提供的资料，不要声称读过、引用过或继承过。",
    "目标是内容优先：标题、开篇、人物压力、证据/关系/身份杠杆、升级链、反转链和回报落点必须能支撑一次写完整篇。",
    "不要过度结构化，不要输出 JSON/YAML。用人能读的 Markdown，但章节方案必须足够密，写手拿到后能直接一次写完。",
    "短篇默认 12-18 章，每章约 900-1200 字。故事要完整，不是长篇前 5 章启动包。",
  ].join("\n");
}

export function buildShortFictionOutlineUserPrompt(input: ShortFictionOutlinePromptInput): string {
  return [
    "## 商业方向",
    input.direction,
    "",
    "## 目标规格",
    `完整短篇 ${input.chapterCount} 章，每章约 ${input.charsPerChapter} 字。`,
    "",
    input.reference?.text ? "## 可选参考文本\n" + trimForPrompt(input.reference.text, 12000) + "\n" : "",
    "## 产出要求",
    "先给一个平台感标题，再给完整故事方案。大纲要讲清楚主角为什么被压住、读者想看什么回报、主角靠什么翻盘、证据/关系/身份/规则如何递进、反派为什么会反扑、结尾如何落地。",
    "章节方案必须逐章写清：章节标题方向、当章发生的关键场面、角色动作、压力升级或回报、章尾继续读的理由。",
    "可以给标签，但不要穷举标签表；标签服务选题和写作，不替代故事。",
    "",
    "## 输出格式",
    "=== SHORT_FICTION_PLAN_TITLE ===",
    "只写一行平台感标题",
    "=== SHORT_FICTION_PLAN ===",
    "用 Markdown 写完整故事方案，包含：题材/受众、标题打法、开篇小钩子、人物与关系、核心压力、主角赢法、升级链、反转链、结尾回报、逐章方案。",
  ].filter(Boolean).join("\n");
}

export function buildShortFictionOutlineReviewSystemPrompt(): string {
  return [
    "你是商业短篇审纲编辑。你不负责打分，也不负责判抄。",
    "你的任务是判断这个故事方案能不能支撑一次写完整篇：题材发动机是否清楚、人物动机是否成立、压力链是否递进、反派反扑是否可信、结尾回报是否够。",
    "审稿要像真实读者和编辑，不要只列工程检查项。",
    "输出 Markdown，直接指出会导致成稿不好看的硬伤和可保留优点。",
  ].join("\n");
}

export function buildShortFictionOutlineReviewUserPrompt(input: ShortFictionOutlineReviewPromptInput): string {
  return [
    "## 商业方向",
    input.direction,
    "",
    input.reference?.text ? "## 可选参考文本\n" + trimForPrompt(input.reference.text, 8000) + "\n" : "",
    "## 待审故事方案",
    input.outline.rawContent,
    "",
    "## 审查重点",
    "- 这是不是完整短篇故事，而不是局部试写方案。",
    "- 标题、开篇、前三章是否有点击和追读理由。",
    "- 大纲是否足够密，写手是否会在后半段泄气。",
    "- 关键场面有没有人物行动、反扑和回报，不是纯结果摘要。",
    "- 读者会不会因为时间线、人物关系、证据权限、身体状态、常识问题出戏。",
  ].join("\n");
}

export function buildShortFictionOutlineRevisionFollowup(input: ShortFictionOutlineRevisionPromptInput): string {
  return [
    "根据上面的审纲意见，继续给出第二版完整故事方案。",
    "这是同一次创作的第二轮，不要另起炉灶，不要只写修改说明。",
    `仍然按 ${input.chapterCount} 章、每章约 ${input.charsPerChapter} 字来组织。`,
    "保留能打的题材发动机和人物关系，修掉会导致成稿不好看的硬伤。",
    "",
    "## 审纲意见",
    input.review.trim(),
    "",
    "## 输出格式",
    "=== SHORT_FICTION_PLAN_TITLE ===",
    "只写一行平台感标题",
    "=== SHORT_FICTION_PLAN ===",
    "用 Markdown 写完整第二版故事方案。",
  ].join("\n");
}

export function buildShortFictionWriterSystemPrompt(): string {
  return [
    "你是中文商业短篇 BatchWriter。你要根据故事方案一次 API 写完整短篇正文。",
    "这不是长篇连载续写，也不是章节梗概。每章都要有当场发生的戏：人物行动、对话或反应、局面变化、章尾继续读的理由。",
    "网文戏剧性要足：现实压力可以放大到读者愿意信的程度，但不能荒诞到失去代入。",
    "标题和章节标题要像平台内容，不要文艺化总结。正文保持移动端节奏，段落短但不要写成电报体。",
    "字数是校准，不是平均数学题。大场面可略长，过渡章可略短；明显偏短通常说明写成了梗概，必须补有效场面。",
    "输出必须严格使用指定 block，不要写作者说明、字数说明、审稿意见或格式解释。",
  ].join("\n");
}

export function buildShortFictionWriterUserPrompt(input: ShortFictionDraftPromptInput): string {
  return [
    "## 任务",
    `一次写完整 ${input.chapterCount} 章，每章约 ${input.charsPerChapter} 字。`,
    "先读完整故事方案，再写正文。正文要承接大纲的压力链、证据链、反转链和情绪回报，不要临时改成另一种故事。",
    "",
    buildShortFictionCraftPrompt(),
    "",
    "## 商业方向",
    input.direction,
    "",
    "## 故事方案",
    input.outlineMarkdown,
    "",
    "## 输出格式",
    "=== SHORT_FICTION_TITLE ===",
    "短篇标题，只写纯文本平台标题",
    "=== SHORT_FICTION_OPENING_HOOK ===",
    "可选正文前小钩子，约 200 字；如果不需要独立引子，也要写第 1 章第一屏的入局小场面",
    ...Array.from({ length: input.chapterCount }, (_, index) => {
      const chapter = index + 1;
      return [
        `=== CHAPTER ${chapter} TITLE ===`,
        "章节标题，只写纯文本，不要 #，不要第几章前缀",
        `=== CHAPTER ${chapter} CONTENT ===`,
        `第${chapter}章正文，写完整场面，不要梗概，不要作者备注`,
      ].join("\n");
    }),
  ].join("\n");
}

export function buildShortFictionDraftReviewSystemPrompt(): string {
  return [
    "你是商业短篇成稿审稿编辑。",
    "你只看内容是否能卖、是否顺、是否有继续读的欲望；不要把审稿变成确定性打分。",
    "重点看标题、章节标题、开篇、人物动机、时间线、人物关系、证据/权限、压力递进、反派反扑、后半段是否泄气、结尾回报是否落地。",
    "输出 Markdown，写清哪些问题会明显影响读者读下去，哪些只是可接受的小瑕疵。",
  ].join("\n");
}

export function buildShortFictionDraftReviewUserPrompt(input: ShortFictionDraftReviewPromptInput): string {
  return [
    "## 商业方向",
    input.direction,
    "",
    "## 原故事方案",
    input.outlineMarkdown,
    "",
    "## 待审正文",
    input.draftMarkdown,
    "",
    "## 审稿要求",
    "直接说人话：这本读起来哪里有欲望、哪里出戏、哪里像梗概、哪里后半段泄气、哪里标题或章节标题不想点。",
    "不要因为某章略短或略长就判死；先判断内容是否完整、有戏、有回报。",
  ].join("\n");
}

export function buildShortFictionDraftRevisionFollowup(input: ShortFictionDraftRevisionPromptInput): string {
  return [
    "根据审稿意见，继续写第二版完整正文。",
    "这是同一篇的第二轮写作：保留上一版能打的地方，修掉会让读者出戏或不想读的问题。",
    "不要只列修改建议，不要只改几章片段，输出完整正文。",
    "",
    "## 审稿意见",
    input.review.trim(),
    "",
    "## 第二轮重点",
    "- 修时间线、逻辑、人物关系、证据权限、身体状态等会让读者出戏的问题。",
    "- 补后半段有效场面，不要用结果摘要收尾。",
    "- 保持标题、开篇、章节标题和正文主标题一致，但标题可以基于正文重新压得更有平台点击感。",
    "- 字数只做校准：偏短补有效场面，偏长删解释和重复反应。",
    "",
    "## 输出格式",
    "=== SHORT_FICTION_TITLE ===",
    "短篇标题，只写纯文本平台标题",
    "=== SHORT_FICTION_OPENING_HOOK ===",
    "可选正文前小钩子，约 200 字；如果不需要独立引子，也要写第 1 章第一屏的入局小场面",
    ...Array.from({ length: input.chapterCount }, (_, index) => {
      const chapter = index + 1;
      return [
        `=== CHAPTER ${chapter} TITLE ===`,
        "章节标题，只写纯文本，不要 #，不要第几章前缀",
        `=== CHAPTER ${chapter} CONTENT ===`,
        `第${chapter}章正文，写完整场面，不要梗概，不要作者备注`,
      ].join("\n");
    }),
  ].join("\n");
}

export function buildShortFictionPackageSystemPrompt(): string {
  return [
    "你是短篇小说包装编辑，负责根据最终正文生成简介、卖点和封面提示词。",
    "不要另起一个和正文不同的主标题。包装必须围绕正文实际标题和剧情。",
    "封面提示词按手机端平台书封思考：3:4 竖图、大标题区、强人物情绪、少量一眼可识别道具、高对比商业色彩，不要影视海报感。",
  ].join("\n");
}

export function buildShortFictionPackageUserPrompt(input: ShortFictionPackagePromptInput): string {
  return [
    "## 商业方向",
    input.direction,
    "",
    "## 故事方案",
    trimForPrompt(input.outlineMarkdown, 6000),
    "",
    "## 最终正文",
    trimForPrompt(input.draftMarkdown, 16000),
    "",
    "## 输出格式",
    "=== SHORT_FICTION_PACKAGE_TITLE ===",
    input.draftTitle,
    "=== SHORT_FICTION_INTRO ===",
    "100-180字平台简介，直接抓冲突、压迫和回报，不要剧透成流水账。",
    "=== SHORT_FICTION_SELLING_POINTS ===",
    "- 3到6条卖点，每条一行",
    "=== SHORT_FICTION_COVER_PROMPT ===",
    "中文封面生成提示词：3:4竖图，主标题区，人物情绪，道具，配色，字体风格，避免事项。",
  ].join("\n");
}

function buildShortFictionCraftPrompt(): string {
  return [
    "## 写法提醒",
    "- 盐溶于汤：人物价值观和野心靠行动表现，不靠口号。",
    "- Show don't tell：用行为、证据、细节和场景让读者自己感到人物状态。",
    "- 反注水：每个场景都推动冲突、因果、情绪、证据、压迫、回报或关系。",
    "- 回报要有铺垫：反转、打脸、和解、复仇、身份揭露都要有证据链和因果链。",
    "- 配角要有动机：压迫者也有利益、误判或恐惧，不要写成无脑工具人。",
    "- 日常细节要变成饵：细节承担证据、情绪、人物差异或后续反转功能。",
    "- 移动端优先：段落短，信息密，少写空泛抒情和装饰性废话。",
  ].join("\n");
}

function trimForPrompt(text: string, maxChars: number): string {
  const trimmed = text.trim();
  if (trimmed.length <= maxChars) return trimmed;
  return `${trimmed.slice(0, maxChars)}\n\n……（已截断）`;
}
