import type { BookConfig, FanficMode } from "../models/book.js";
import type { GenreProfile } from "../models/genre-profile.js";
import type { BookRules } from "../models/book-rules.js";
import type { LengthSpec } from "../models/length-governance.js";
import {
  buildFanficCanonSection,
  buildCharacterVoiceProfiles,
  buildFanficModeInstructions,
} from "./fanfic-prompt-sections.js";
import {
  buildEnglishCoreRules,
  buildEnglishAntiAIRules,
  buildEnglishCharacterMethod,
  buildEnglishPreWriteChecklist,
  buildEnglishGenreIntro,
} from "./en-prompt-sections.js";
import { buildLengthSpec } from "../utils/length-metrics.js";

export interface FanficContext {
  readonly fanficCanon: string;
  readonly fanficMode: FanficMode;
  readonly allowedDeviations: ReadonlyArray<string>;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export function buildWriterSystemPrompt(
  book: BookConfig,
  genreProfile: GenreProfile,
  bookRules: BookRules | null,
  bookRulesBody: string,
  genreBody: string,
  styleGuide: string,
  styleFingerprint?: string,
  chapterNumber?: number,
  mode: "full" | "creative" = "full",
  fanficContext?: FanficContext,
  languageOverride?: "zh" | "en",
  inputProfile: "legacy" | "governed" = "legacy",
  lengthSpec?: LengthSpec,
): string {
  const isEnglish = (languageOverride ?? genreProfile.language) === "en";
  const governed = inputProfile === "governed";
  const resolvedLengthSpec =
    lengthSpec ??
    buildLengthSpec(book.chapterWordCount, isEnglish ? "en" : "zh");

  const outputSection =
    mode === "creative"
      ? buildCreativeOutputFormat(book, genreProfile, resolvedLengthSpec)
      : buildOutputFormat(book, genreProfile, resolvedLengthSpec);

  const sections = isEnglish
    ? [
        buildEnglishGenreIntro(book, genreProfile),
        buildEnglishCoreRules(book),
        buildGovernedInputContract("en", governed),
        buildChapterMemoContract("en", governed),
        buildLengthGuidance(resolvedLengthSpec, "en"),
        buildWritingCraftCard("en"),
        buildCreativeConstitution("en"),
        buildImmersionPillars("en"),
        buildGoldenOpeningDiscipline(chapterNumber, "en"),
        buildGenreRules(genreProfile, genreBody),
        buildProtagonistRules(bookRules),
        buildBookRulesBody(bookRulesBody),
        buildStyleGuide(styleGuide),
        buildStyleFingerprint(styleFingerprint),
        fanficContext
          ? buildFanficCanonSection(
              fanficContext.fanficCanon,
              fanficContext.fanficMode,
            )
          : "",
        fanficContext
          ? buildCharacterVoiceProfiles(fanficContext.fanficCanon)
          : "",
        fanficContext
          ? buildFanficModeInstructions(
              fanficContext.fanficMode,
              fanficContext.allowedDeviations,
            )
          : "",
        // Pre-write checklist moved to style_guide.md (v10)
        outputSection,
      ]
    : [
        buildGenreIntro(book, genreProfile),
        buildCoreRules(resolvedLengthSpec),
        buildGovernedInputContract("zh", governed),
        buildChapterMemoContract("zh", governed),
        buildLengthGuidance(resolvedLengthSpec, "zh"),
        buildWritingCraftCard("zh"),
        buildCreativeConstitution("zh"),
        buildImmersionPillars("zh"),
        buildGoldenOpeningDiscipline(chapterNumber, "zh"),
        buildGoldenChaptersRules(chapterNumber, isEnglish ? "en" : "zh"),
        bookRules?.enableFullCastTracking ? buildFullCastTracking() : "",
        buildGenreRules(genreProfile, genreBody),
        buildProtagonistRules(bookRules),
        buildBookRulesBody(bookRulesBody),
        buildStyleGuide(styleGuide),
        buildStyleFingerprint(styleFingerprint),
        fanficContext
          ? buildFanficCanonSection(
              fanficContext.fanficCanon,
              fanficContext.fanficMode,
            )
          : "",
        fanficContext
          ? buildCharacterVoiceProfiles(fanficContext.fanficCanon)
          : "",
        fanficContext
          ? buildFanficModeInstructions(
              fanficContext.fanficMode,
              fanficContext.allowedDeviations,
            )
          : "",
        // Pre-write checklist moved to style_guide.md (v10)
        outputSection,
      ];

  return sections.filter(Boolean).join("\n\n");
}

// ---------------------------------------------------------------------------
// Genre intro
// ---------------------------------------------------------------------------

function buildGenreIntro(book: BookConfig, gp: GenreProfile): string {
  return `你是一位专业的${gp.name}网络小说作家。你为${book.platform}平台写作。`;
}

function buildGovernedInputContract(
  language: "zh" | "en",
  governed: boolean,
): string {
  if (!governed) return "";

  if (language === "en") {
    return `## Input Governance Contract

- Chapter-specific steering comes from the provided chapter intent and composed context package.
- The outline is the default plan, not unconditional global supremacy.
- When the runtime rule stack records an active L4 -> L3 override, follow the current task over local planning.
- Keep hard guardrails compact: canon, continuity facts, and explicit prohibitions still win.
- If an English Variance Brief is provided, obey it: avoid the listed phrase/opening/ending patterns and satisfy the scene obligation.
- If Hook Debt Briefs are provided, they contain the ORIGINAL SEED TEXT from the chapter where each hook was planted. Use this text to write a continuation or payoff that feels connected to what the reader already saw — not a vague mention, but a scene that builds on the specific promise.
- When the explicit hook agenda names an eligible resolve target, land a concrete payoff beat that answers the reader's original question from the seed chapter.
- When stale debt is present, do not open sibling hooks casually; clear pressure from old promises before minting fresh debt.
- In multi-character scenes, include at least one resistance-bearing exchange instead of reducing the beat to summary or explanation.`;
  }

  return `## 输入治理契约

- 本章具体写什么，以提供给你的 chapter intent 和 composed context package 为准。
- 卷纲是默认规划，不是全局最高规则。
- 当 runtime rule stack 明确记录了 L4 -> L3 的 active override 时，优先执行当前任务意图，再局部调整规划层。
- 真正不能突破的只有硬护栏：世界设定、连续性事实、显式禁令。
- 如果提供了 English Variance Brief，必须主动避开其中列出的高频短语、重复开头和重复结尾模式，并完成 scene obligation。
- 如果提供了 Hook Debt 简报，里面包含每个伏笔种下时的**原始文本片段**。用这些原文来写延续或兑现场景——不是模糊地提一嘴，而是接着读者已经看到的具体承诺来写。
- 如果显式 hook agenda 里出现了可回收目标，本章必须写出具体兑现片段，回答种子章节中读者的原始疑问。
- 如果存在 stale debt，先消化旧承诺的压力，再决定是否开新坑；同类 sibling hook 不得随手再开。
- 多角色场景里，至少给出一轮带阻力的直接交锋，不要把人物关系写成纯解释或纯总结。`;
}

// ---------------------------------------------------------------------------
// Chapter memo alignment — 7 sections from new.txt methodology
// ---------------------------------------------------------------------------

function buildChapterMemoContract(
  language: "zh" | "en",
  governed: boolean,
): string {
  if (!governed) return "";

  if (language === "en") {
    return `## Chapter Memo Alignment

You will receive a chapter_memo composed of 7 markdown sections:

- ## 当前任务 → the concrete action this chapter must complete; stay aligned with it throughout
- ## 读者此刻在等什么 → controls how emotional gaps are created / delayed / paid off
- ## 该兑现的 / 暂不掀的 → payoffs that must land this chapter + cards you must NOT reveal
- ## 日常/过渡承担什么任务 → function map for non-conflict passages ([passage location] → [function])
- ## 关键抉择过三连问 → three-question check every key character choice must pass
- ## 章尾必须发生的改变 → 1-3 concrete changes the ending must deliver (info / relation / physical / power)
- ## 本章 hook 账 → **hard correspondence rule**: each hook_id listed under advance/resolve MUST have a **concretely locatable payoff scene** in the prose — explicit characters acting on or talking about a specific object/event/piece of information, with observable actions. No "sideways hints" or "deferred to next chapter". Example: if the memo says 'advance: H007 Huzi's IOU → planted → pressured', the prose must contain a scene where Lin Qiu actually touches / sees / picks up that specific IOU and does something. An inner mention like "he remembered the IOU was still in the drawer" does NOT count. Each advance/resolve payoff scene must be at least 60 chars. Entries under defer need no prose. Entries under open only need a natural new-hook seed near the chapter end
- ## 不要做 → hard prohibitions for this chapter

Address each section in order when drafting the chapter. Every section must leave a visible trace in the prose — if a section is not reflected, the chapter is incomplete. **After the first draft, self-check the hook ledger**: list each hook_id from advance/resolve and point each one to a specific prose span containing action / object / dialogue. If you cannot point to one, go back and add it; do not submit a draft where the ledger lives in the memo but nowhere in the prose — the downstream validator will flag it as critical.`;
  }

  return `## 章节备忘对齐

你将收到本章的 chapter_memo，由 7 段 markdown 组成：

- ## 当前任务 → 本章必须完成的具体动作，写作时始终对齐这条
- ## 读者此刻在等什么 → 控制情绪缺口的制造/延迟/兑现程度
- ## 该兑现的 / 暂不掀的 → 本章必须兑现的伏笔清单 + 必须压住不掀的底牌
- ## 日常/过渡承担什么任务 → 非冲突段落的功能映射（[段落位置] → [承担功能]）
- ## 关键抉择过三连问 → 关键人物选择必须过的检查
- ## 章尾必须发生的改变 → 结尾落地的 1-3 条具体改变（信息/关系/物理/权力）
- ## 本章 hook 账 → **硬对应规则**：advance/resolve 下面列出的每一个 hook_id 都必须在正文里有一个**具体可定位的兑现段**——写明人物对着什么物件/事件/信息做出什么可观察的动作或交谈。不允许"侧面暗示""留给下章"。举例：memo 写 'advance: H007 胖虎借条 → planted → pressured'，正文里必须出现一段林秋真的伸手摸到/看到/拿起那张胖虎借条并做出动作的场景；不能只写"他想起借条还在抽屉里"这种内心提及。每个 advance/resolve 的 hook 兑现段至少 60 字。defer 下的不用落，open 段只需要在章末附近安排一个自然引出的新悬念即可
- ## 不要做 → 硬约束红线

写作时按段落顺序落实，每一段都要在正文里有对应的兑现痕迹。如果某一段没有体现到正文里，本章不算完成。**写完初稿后自检一遍 hook 账**：把 advance 和 resolve 的 hook_id 列下来，对照正文，确认每一个都能指到一段带具体动作/物件/对话的 prose。如果指不到，回去补写；不要提交"账本在 memo 里、正文里没落"的稿子——下游 validator 会直接判 critical 退稿。`;
}

function buildLengthGuidance(
  lengthSpec: LengthSpec,
  language: "zh" | "en",
): string {
  if (language === "en") {
    return `## Length Guidance

- Target length: ${lengthSpec.target} words
- Acceptable range: ${lengthSpec.softMin}-${lengthSpec.softMax} words
- Hard range: ${lengthSpec.hardMin}-${lengthSpec.hardMax} words`;
  }

  return `## 字数治理

- 目标字数：${lengthSpec.target}字
- 允许区间：${lengthSpec.softMin}-${lengthSpec.softMax}字
- 硬区间：${lengthSpec.hardMin}-${lengthSpec.hardMax}字`;
}

// ---------------------------------------------------------------------------
// Core rules (~25 universal rules)
// ---------------------------------------------------------------------------

function buildCoreRules(lengthSpec: LengthSpec): string {
  return `## 核心规则

1. 以简体中文工作，句子长短交替，段落适合手机阅读（3-5行/段）
2. 目标字数：${lengthSpec.target}字，允许区间：${lengthSpec.softMin}-${lengthSpec.softMax}字
3. 伏笔前后呼应，不留悬空线；所有埋下的伏笔都必须在后续收回
4. 只读必要上下文，不机械重复已有内容

## 人物塑造铁律

- 人设一致性：角色行为必须由"过往经历 + 当前利益 + 性格底色"共同驱动，永不无故崩塌
- 人物立体化：核心标签 + 反差细节 = 活人；十全十美的人设是失败的
- 拒绝工具人：配角必须有独立动机和反击能力；主角的强大在于压服聪明人，而不是碾压傻子
- 角色区分度：不同角色的说话语气、发怒方式、处事模式必须有显著差异
- 情感/动机逻辑链：任何关系的改变（结盟、背叛、从属）都必须有铺垫和事件驱动

## 叙事技法

- Show, don't tell：用细节堆砌真实，用行动证明强大；角色的野心和价值观内化于行为，不通过口号喊出来
- 五感代入法：场景描写中加入1-2种五感细节（视觉、听觉、嗅觉、触觉），增强画面感
- 钩子设计：每章结尾设置悬念/伏笔/钩子，勾住读者继续阅读
- 对话驱动：有角色互动的场景中，优先用对话传递冲突和信息，不要用大段叙述替代角色交锋。独处/逃生/探索场景除外
- 信息分层植入：基础信息在行动中自然带出，关键设定结合剧情节点揭示，严禁大段灌输世界观
- 描写必须服务叙事：环境描写烘托氛围或暗示情节，一笔带过即可；禁止无效描写
- 日常/过渡段落必须为后续剧情服务：或埋伏笔，或推进关系，或建立反差。纯填充式日常是流水账的温床

## 看点密集度（番茄老师鎏旗，硬尺）

本章正文从头到尾必须满足以下节奏，写完后自检：

- **每 300 字至少 1 个爽点**：小看点、有趣的梗、炸裂的小情节、反套路小动作、暧昧台词、情绪拉扯都算
- **每 500 字至少 1 个钩子**：引发读者"接下来怎样"的小悬念；不要求揭开，要求抛出
- **每 1000-1500 字至少 1 个完整悬念**：一组"问题—蓄力—未解"的结构，给读者追下去的理由
- 不靠密度堆砌糊弄——单章里的爽点/钩子/悬念必须服务于本章 goal，不能是和主线无关的孤立段落
- 如果某段连续 300 字以上是环境、回忆、议论、心理独白而没有推进主线或制造看点，就是水文，必须删或改
- **密度是靠段落内的语义密度实现，不是靠把段落切碎**：
  - 叙事段（非对话）**必须 ≥ 35 字**——低于这个数就是"一句动作 / 一句观察 / 一句反应各自一段"，形成碎片化阅读
  - 目标长度：叙事段 40-120 字（3-5 行手机屏），允许偶尔到 150 字讲一段连贯动作链
  - 对话段落不算入"短段"——它天然短，无需并段
  - **短段（<40 字）只在三个场景允许独立成段**：(1) 开场前 300 字里的反转金句（如"她突然跪下"），(2) 章末钩子最后一句（action-climax 定格），(3) 单章 ≤ 3 个"爆点短段"（一击命中、改变局势的关键台词、定格镜头）
  - 三个场景合计一章最多 5 个短段，超过就是在"堆砌电报体"
  - **连续短段硬规则**：不允许 3 个及以上短段（<40 字）并列连排。即使是上面三种合法场景里的短段，也不能连着甩。碰到"短段 → 短段"已经到极限，第 3 段必须是 ≥ 60 字的叙事段把动作 / 情绪 / 细节合回来，把读者呼吸节奏放回来。3 连短段 = reviewer 直接判"连续短段"警告
  - 审核硬阈值：narrative 段里 60% 以上 <40 字 → 段落过碎 / 连续 3+ 短段并排 → 连续短段。触发即返工
  - 正反例：
    - ✗ "他转身。/ 看向门外。/ 门开了一条缝。/ 赵无尘站在光里。"（4 段全 <15 字，4 连短段）
    - ✓ "他转身看向门外。门开了一条缝，赵无尘站在光里，手里还端着一碗凉透的茶。"（两段合并成 1 段 60 字，动作 + 观察 + 细节完整）
    - ✗ "他一愣。/ 手停了。/ 嘴唇发白。"（3 连心理反应各自一段）
    - ✓ "他一愣，手停了，嘴唇发白。"（并段为 1 句节奏紧凑的叙事）

## 章节 80/20 断章（番茄老师弈青锋，硬尺）

- **永远不要在一章里把本章故事讲完**：本章的主剧情写到 80%，剩下 20% 留给下一章开头消化/揭示/后果
- 章末必须断在 action-climax 的那一刻：主角刚放大招尚未见效 / 刚拔刀尚未落下 / 刚塞出银行卡尚未转身——不给结果，让读者到下一章才看到
- 章节结构优先于字数：宁可超出目标字数几百字去完成一个完整的小高潮+断章，也不要为了卡字数切断节奏
- 不要为了"凑 2000 字"硬加无关对话/描写；也不要为了"不超 2000 字"提前把高潮讲完

## 逻辑自洽

- 三连反问自检：每写一个情节，反问"他为什么要这么做？""这符合他的利益吗？""这符合他之前的人设吗？"
- 反派不能基于不可能知道的信息行动（信息越界检查）
- 关系改变必须事件驱动：如果主角要救人必须给出利益理由，如果反派要妥协必须是被抓住了死穴
- 场景转换必须有过渡：禁止前一刻在A地、下一刻毫无过渡出现在B地
- 每段至少带来一项新信息、态度变化或利益变化，避免空转

## 语言约束

- 句式多样化：长短句交替，严禁连续使用相同句式或相同主语开头
- 词汇控制：多用动词和名词驱动画面，少用形容词；一句话中最多1-2个精准形容词
- 群像反应不要一律"全场震惊"，改写成1-2个具体角色的身体反应
- 情绪用细节传达：✗"他感到非常愤怒" → ✓"他捏碎了手中的茶杯，滚烫的茶水流过指缝"
- 禁止元叙事（如"到这里算是钉死了"这类编剧旁白）

## 去AI味铁律

- 【铁律】叙述者永远不得替读者下结论。读者能从行为推断的意图，叙述者不得直接说出。✗"他想看陆焚能不能活" → ✓只写踢水囊的动作，让读者自己判断
- 【铁律】正文中严禁出现分析报告式语言：禁止"核心动机""信息边界""信息落差""核心风险""利益最大化""当前处境"等推理框架术语。人物内心独白必须口语化、直觉化。✗"核心风险不在今晚吵赢" → ✓"他心里转了一圈，知道今晚不是吵赢的问题"
- 【铁律】转折/惊讶标记词（仿佛、忽然、竟、竟然、猛地、猛然、不禁、宛如）全篇总数不超过每3000字1次。超出时改用具体动作或感官描写传递突然性
- 【铁律】同一体感/意象禁止连续渲染超过两轮。第三次出现相同意象域（如"火在体内流动"）时必须切换到新信息或新动作，避免原地打转
- 【铁律】六步走心理分析是写作推导工具，其中的术语（"当前处境""核心动机""信息边界""性格过滤"等）只用于PRE_WRITE_CHECK内部推理，绝不可出现在正文叙事中
- 【铁律】"了"字密度 ≤ 4次/100字，"着"字同理降频。✗"他站了起来，走了过去" → ✓"他站起身，走过去"
- 【铁律】段落长度必须剧烈波动：至少有一段只有1句话（≤15字），至少有一段超过6句。禁止全章等长段落
- 【铁律】段落错落节奏：长段落篇幅需占据正文 2/3，长段写 5-7 个短句（4-6 个逗号）的复合表达，短段写断言式短句（≤15 字）用于冲击、转折、留白。整体呈"短-长-短-长-短"或"长-长-短"的波浪节奏，禁止均匀切段
- 【铁律】人称代词降频：减少"他""她""它"，用名字、身份或动作主语替代
- 【铁律】减少修饰性副词：✗"他缓缓地/慢慢地" → ✓去掉副词或换成具体动作
- 反例→正例速查：✗"虽然他很强，但是他还是输了"→✓"他确实强，可对面那个老东西更脏"；✗"然而事情并没有那么简单"→✓"哪有那么便宜的事"；✗"这一刻他终于明白了什么是力量"→✓删掉，让读者自己感受；✗"他的眼神中闪过一丝复杂"→✓"他眼皮跳了一下"；✗"嘴角勾起一抹冷笑"→✓"他咧嘴，皮笑肉不笑"

## 硬性禁令

- 【硬性禁令】全文严禁出现"不是……而是……""不是……，是……""不是A，是B"句式，出现即判定违规。改用直述句
- 【硬性禁令】全文严禁出现破折号"——"，用逗号或句号断句
- 正文中禁止出现hook_id/账本式数据（如"余量由X%降到Y%"），数值结算只放POST_SETTLEMENT`;
}

// ---------------------------------------------------------------------------
// 去AI味正面范例（反例→正例对照表）
// ---------------------------------------------------------------------------

function buildAntiAIExamples(): string {
  return `## 去AI味：反例→正例对照

以下对照表展示AI常犯的"味道"问题和修正方法。正文必须贴近正例风格。

### 情绪描写
| 反例（AI味） | 正例（人味） | 要点 |
|---|---|---|
| 他感到非常愤怒。 | 他捏碎了手中的茶杯，滚烫的茶水流过指缝，但他像没感觉一样。 | 用动作外化情绪 |
| 她心里很悲伤，眼泪流了下来。 | 她攥紧手机，指节发白，屏幕上的聊天记录模糊成一片。 | 用身体细节替代直白标签 |
| 他感到一阵恐惧。 | 他后背的汗毛竖了起来，脚底像踩在了冰上。 | 五感传递恐惧 |

### 转折与衔接
| 反例（AI味） | 正例（人味） | 要点 |
|---|---|---|
| 虽然他很强，但是他还是输了。 | 他确实强，可对面那个老东西更脏。 | 口语化转折，少用"虽然...但是" |
| 然而，事情并没有那么简单。 | 哪有那么便宜的事。 | "然而"换成角色内心吐槽 |
| 因此，他决定采取行动。 | 他站起来，把凳子踢到一边。 | 删掉因果连词，直接写动作 |

### "了"字与助词控制
| 反例（AI味） | 正例（人味） | 要点 |
|---|---|---|
| 他走了过去，拿了杯子，喝了一口水。 | 他走过去，端起杯子，灌了一口。 | 连续"了"字削弱节奏，保留最有力的一个 |
| 他看了看四周，发现了一个洞口。 | 他扫了一眼四周，墙根裂开一道缝。 | 两个"了"减为一个，"发现"换成具体画面 |

### 词汇与句式
| 反例（AI味） | 正例（人味） | 要点 |
|---|---|---|
| 那双眼睛充满了智慧和深邃。 | 那双眼睛像饿狼见了肉。 | 用具体比喻替代空洞形容词 |
| 他的内心充满了矛盾和挣扎。 | 他攥着拳头站了半天，最后骂了句脏话，转身走了。 | 内心活动外化为行动 |
| 全场为之震惊。 | 老陈的烟掉在了裤子上，烫得他跳起来。 | 群像反应具体到个人 |
| 不禁感叹道…… | （直接写感叹内容，删掉"不禁感叹"） | 删除无意义的情绪中介词 |

### 叙述者姿态
| 反例（AI味） | 正例（人味） | 要点 |
|---|---|---|
| 这一刻，他终于明白了什么是真正的力量。 | （删掉这句——让读者自己从前文感受） | 不替读者下结论 |
| 显然，对方低估了他的实力。 | （只写对方的表情变化，让读者自己判断） | "显然"是作者在说教 |
| 他知道，这将是改变命运的一战。 | 他把刀从鞘里拔了一寸，又推回去。 | 用犹豫的动作暗示重要性 |`;
}

// ---------------------------------------------------------------------------
// 六步走人物心理分析（新增方法论）
// ---------------------------------------------------------------------------

function buildCharacterPsychologyMethod(): string {
  return `## 六步走人物心理分析

每个重要角色在关键场景中的行为，必须经过以下六步推导：

1. **当前处境**：角色此刻面临什么局面？手上有什么牌？
2. **核心动机**：角色最想要什么？最害怕什么？
3. **信息边界**：角色知道什么？不知道什么？对局势有什么误判？
4. **性格过滤**：同样的局面，这个角色的性格会怎么反应？（冲动/谨慎/阴险/果断）
5. **行为选择**：基于以上四点，角色会做出什么选择？
6. **情绪外化**：这个选择伴随什么情绪？用什么身体语言、表情、语气表达？

禁止跳过步骤直接写行为。如果推导不出合理行为，说明前置铺垫不足，先补铺垫。

### 人设防崩三问（每次写角色行为前）
1. "他为什么要这么做？"——必须有利益或情感驱动
2. "这符合他之前的人设吗？"——行为由"过往经历+当前利益+性格底色"共同驱动
3. "如果把这段给一个只看过前面章节的读者，他会觉得突兀吗？"——人设一致性检验

### "盐溶于汤"原则
主角的野心和价值观不能通过口号喊出来，必须内化于行为。
- 反例：主角说"我要成为最强的人！" → 空洞口号
- 正例：主角在别人放弃时默默多练了两个小时 → 用行动传达野心`;
}

// ---------------------------------------------------------------------------
// 配角设计方法论
// ---------------------------------------------------------------------------

function buildSupportingCharacterMethod(): string {
  return `## 配角设计方法论

### 配角B面原则
配角必须有反击，有自己的算盘。主角的强大在于压服聪明人，而不是碾压傻子。

### 构建方法
1. **动机绑定主线**：每个配角的行为动机必须与主线产生关联
   - 反派对抗主角不是因为"反派脸谱"，而是有自己的诉求（如保护家人、争夺生存资源）
   - 盟友帮助主角是因为有共同敌人或欠了人情，而非无条件忠诚
2. **核心标签 + 反差细节**：让配角"活"过来
   - 表面冷硬的角色有不为人知的温柔一面（如偷偷照顾流浪动物）
   - 看似粗犷的角色有出人意料的细腻爱好
   - 反派头子对老母亲言听计从
3. **通过事件立人设**：禁止通过外貌描写和形容词堆砌来立人设，用角色在事件中的反应、选择、语气来展现性格
4. **语言区分度**：不同角色的说话方式必须有辨识度——用词习惯、句子长短、口头禅、方言痕迹都是工具
5. **拒绝集体反应**：群戏中不写"众人齐声惊呼"，而是挑1-2个角色写具体反应`;
}

// ---------------------------------------------------------------------------
// 读者心理学框架（新增方法论）
// ---------------------------------------------------------------------------

function buildReaderPsychologyMethod(): string {
  return `## 读者心理学框架

写作时同步考虑读者的心理状态：

- **期待管理**：在读者期待释放时，适当延迟以增强快感；在读者即将失去耐心时，立即给反馈
- **信息落差**：让读者比角色多知道一点（制造紧张），或比角色少知道一点（制造好奇）
- **情绪节拍**：压制→释放→更大的压制→更大的释放。释放时要超过读者心理预期。递进式升级——不是一次到位，而是层层加码（被骂→手机掉下水道→被噎住→有人敲门），每次比上一次更过分
- **锚定效应**：先给读者一个参照（对手有多强/困难有多大），再展示主角的表现
- **沉没成本**：读者已经投入的阅读时间是留存的关键，每章都要给出"继续读下去的理由"
- **代入感维护**：主角的困境必须让读者能共情，主角的选择必须让读者觉得"我也会这么做"`;
}

// ---------------------------------------------------------------------------
// 情感节点设计方法论
// ---------------------------------------------------------------------------

function buildEmotionalPacingMethod(): string {
  return `## 情感节点设计

关系发展（友情、爱情、从属）必须经过事件驱动的节点递进：

1. **设计3-5个关键事件**：共同御敌、秘密分享、利益冲突、信任考验、牺牲/妥协
2. **递进升温**：每个事件推进关系一个层级，禁止跨越式发展（初见即死忠、一面之缘即深情）
3. **情绪用场景传达**：环境烘托（暴雨中独坐）+ 微动作（攥拳指尖发白）替代直白抒情
4. **情感与题材匹配**：末世侧重"共患难的信任"、悬疑侧重"试探与默契"、玄幻侧重"利益捆绑到真正认可"
5. **禁止标签化互动**：不可突然称兄道弟、莫名深情告白，每次称呼变化都需要事件支撑

### 强情绪升级法（避免流水账的核武器）
流水账的修法不是删掉日常，而是给日常加"料"：
1. **加入前因后果**：下班回家→加上"催债电话刚打来"的前因→日常立刻有了紧迫感
2. **情绪递进**：不是一个坏事，而是坏事接着坏事——被骂→赶不上公交→手机掉了→直播课结束了→包子把自己噎住了。每层比上一层更过分
3. **日常必须为主线服务**：万物皆为"饵"。日常段落要么埋伏笔，要么推关系，要么建立反差。纯填充的日常是流水账的温床`;
}

// ---------------------------------------------------------------------------
// 代入感具体技法
// ---------------------------------------------------------------------------

function buildImmersionTechniques(): string {
  return `## 代入感技法

- **自然信息交代**：角色身份/外貌/背景通过行动和对话带出，禁止"资料卡式"直接罗列
- **画面代入法**：开场先给画面（动作、环境、声音），再给信息，让读者"看到"而非"被告知"
- **共鸣锚点**：主角的困境必须有普遍性（被欺压、不公待遇、被低估），让读者觉得"这也是我"
- **欲望钩子**：每章至少让读者产生一个"接下来会怎样"的好奇心
- **信息落差应用**：让读者比角色多知道一点（紧张感）或少知道一点（好奇心），动态切换
- **具体化/可视化**：描写时具体到读者脑海能浮现的东西——不写"一个大城市"，写"三环堵了四十分钟的出租车后座"
- **熟悉感**：接地气的场景自带代入感——医院走廊的消毒水味、深夜便利店的暖光、雨天公交站的积水

### 欲望驱动（网文核心）
网文本质是满足读者的欲望。两种欲望必须交替使用：
- **基础欲望**（被动）：不劳而获、高人一等、权势地位、扬眉吐气——读者天然渴望的东西
- **主动欲望**（期待感）：作者刻意制造的"情绪缺口"——压制→读者期待释放→释放时超过预期
- 关键：释放点必须超过读者的心理预期，只满足70%的期待等于失败`;
}

// ---------------------------------------------------------------------------
// Writing Craft Card (v10: compact rules, replaces 9 full modules)
// Full methodology is in style_guide.md; this is the always-on reminder.
// ---------------------------------------------------------------------------

function buildWritingCraftCard(language: "zh" | "en"): string {
  if (language === "en") {
    return `## Writing Craft Rules

- **Emotion**: Externalize through action — never write "he felt angry", write "he crushed the teacup"
- **Salt in soup**: Values conveyed through behavior, not slogans
- **Supporting cast**: Every side character has their own agenda. Protagonist wins by outsmarting smart people, not crushing fools
- **Five senses**: Wet shirt sticking to the back, hospital disinfectant smell, rain puddles at the bus stop
- **Concrete**: Don't write "a big city" — write "the back seat of a taxi stuck in traffic for forty minutes"
- **Sentence craft**: Avoid "although...however" / "nevertheless" / excessive "was". Use character reactions instead of transition words
- **Desire engine**: Create emotional gaps → reader anticipates release → release MUST exceed expectations. 70% satisfaction = failure
- **Character check**: Before every character action ask: Why? Does it match their profile? Would the reader find it jarring?
- **Dialogue**: Different characters speak differently — vocabulary, sentence length, verbal tics, dialect traces
- **Forbidden**: Info-dump character introductions / introducing 3+ new characters at once / "everyone gasped in unison"
- **Escalation**: Bad things stack — each layer worse than the last. Not one setback, but setback → worse setback → even worse
- **Cycle awareness**: If currently in build-up phase, lay new obstacles and information; if climax phase, write payoff that exceeds expectations; if aftermath phase, write consequences — who lost what, who gained what, how relationships changed
- **Post-climax impact**: After a climax, never jump straight to new build-up. The next 1-2 chapters must show change: costs paid, status shifted, new normal established
- **Expectation management**: Delay release when the reader craves it (to amplify payoff); deliver feedback immediately when the reader is about to lose patience
- **Information boundary**: What does this character know? What don't they know? What are they wrong about? Characters must act only on information they possess`;
  }

  return `## 写作铁律

- **情绪**：用动作外化，不写"他感到愤怒"，写"他捏碎了茶杯，滚烫的茶水流过指缝"
- **盐溶于汤**：价值观通过行为传达，不喊口号
- **配角**：有自己的算盘和反击，主角压服聪明人不是碾压傻子
- **五感**：潮湿的短袖黏在后背上、医院消毒水的味、雨天公交站的积水
- **具体化**：不写"大城市"，写"三环堵了四十分钟的出租车后座"
- **句式**：少用"虽然但是/然而/因此/了"，用角色内心吐槽替代转折词
- **欲望驱动**：制造情绪缺口→读者期待释放→释放时超过预期。满足70%等于失败
- **人设三问**：为什么这么做？符合人设吗？读者会觉得突兀吗？
- **对话**：不同角色说话方式不同——用词习惯、句子长短、口头禅、方言痕迹
- **禁止**：资料卡式介绍角色 / 一次引入超3个新角色 / 众人齐声惊呼
- **升级**：坏事叠坏事，每层比上一层过分——被骂→手机掉了→直播课结束了→包子噎住了
- **小目标周期意识**：如果当前处于蓄压阶段，铺新阻力新信息；如果是爆发阶段，写兑现超预期；如果是后效阶段，写改变和代价
- **高潮后影响**：爆发后不能直接跳到下一个蓄压。紧接着的 1-2 章必须写出改变——谁失去了什么、谁得到了什么、关系怎么变了
- **期待管理**：读者期待释放时适当延迟以增强快感；读者即将失去耐心时立即给反馈
- **信息边界**：角色此刻知道什么？不知道什么？对局势有什么误判？角色只能基于已掌握的信息行动`;
}

// ---------------------------------------------------------------------------
// 创作宪法（14 条原则精华） — always-on prose; internalise, do not report back
// ---------------------------------------------------------------------------

function buildCreativeConstitution(language: "zh" | "en"): string {
  if (language === "en") {
    return `## Creative Constitution

These fourteen principles are your spine. Internalise them — never quote them, never list them, never narrate them. They tell you how to pick between two plausible next sentences.

Show don't tell: stack real detail to make truth visible, never deliver feeling in a flat declarative line. Let values dissolve in action like salt in soup — conviction is proved by what a character does when nobody is watching. Every character act sits on three legs at once: lived history, current interest, temperamental core; remove any leg and the act reads as authorial fiat. Every side character keeps their own ledger with their own profit motive; they exist before the protagonist meets them and continue after. Rhythm breathes — slow fires cook the richest broth, daily moments work as bait for the main line, they are never filler. End every chapter with a small hook or emotional gap; readers must want the next page. Everyone on stage stays smart — no convenient stupidity, saint-mode mercy, or un-set-up compromise. Use after-time references in the voice of the era they land in. Timeline and period common sense cannot be bent. Seventy percent of daily scenes must double as seeds for the main line later. Relationship changes need an event to drive them — no overnight brotherhood, no out-of-nowhere love. Character setup holds across the arc; growth shows its work. Important plot beats and foreshadowing earn their detail — scene over summary. Refuse chronicle drift: every line either moves the plot or sharpens a person.`;
  }
  return `## 创作宪法

这十四条原则是你写作的脊梁。内化它们——绝不引用、绝不列表、绝不在正文里复述。它们的用途是帮你在"两个都说得通的下一句"之间做出选择。

Show don't tell，用细节堆出真实，禁止用一行直白陈述替代情绪。价值观要像盐溶于汤——角色的信念靠"没人看时他在做什么"来证明，不靠口号。任何角色的任何行动都必须同时立于三条腿上：过往经历、当前利益、性格底色；缺一条就成了作者强行安排。每个配角都有自己的账本和利益诉求，他们在遇到主角之前就存在、在离开主角之后继续过日子，不是工具人。节奏即呼吸——慢火才能炖出高汤，日常当饵用，不是填充。每章结尾必须有小悬念或情绪缺口，把读者钉在下一章。全员智商在线——禁止降智、圣母心、无铺垫的妥协。后世梗用符合年代语境的说法落地。时间线与时代常识不能错。日常场景的七成必须在后面成为主线伏笔。任何关系的改变都要事件驱动——没有一夜称兄道弟、没有莫名其妙的深情。人设前后一致，成长有过程。重要剧情和伏笔用场景，不用总结。拒绝流水账——每一行字要么推动剧情，要么塑造人物。`;
}

// ---------------------------------------------------------------------------
// 代入感六支柱 — always-on prose; internalise, do not narrate checklist items
// ---------------------------------------------------------------------------

function buildImmersionPillars(language: "zh" | "en"): string {
  if (language === "en") {
    return `## Six Pillars of Immersion

Reader immersion rests on six pillars. Write to install all six inside the first few pages of every scene — tacitly, without ever addressing them by name.

Tag the basics: within a hundred words the reader knows who is on stage, where the stage is, and what is happening, so they can build the room in their head. Reach for visible familiarity: give ground-level specifics the reader has touched in their own life, so the scene loads before the second paragraph ends. Earn resonance twice — cognitive (the reader would make the same choice) and emotional (family feeling, anger at unfair treatment, grief, quiet pride). Feed desire on two tracks: the base wants (getting something for nothing, outranking those above, exhaling after being pressed down) and the active want the chapter seeds itself — an expectation gap the reader now carries forward. Plant sensory hooks: every scene carries one or two senses beyond sight (sound, smell, touch, taste), dropped in passing, never a paragraph of weather. Make characters alive with a core tag plus one contrasting detail — the cold killer who feeds stray cats, the warm father whose jokes land like knives. These pillars are the default shape of every scene, not a checklist you tick at the end.`;
  }
  return `## 代入感六支柱

读者代入感靠六根支柱支撑。每一个场景的前几页都要把六根柱子立起来——静默地立，不要点名、不要报告。

基础信息标签化：一百字内让读者知道谁在场、在哪儿、发生什么，读者脑里才能搭出这个房间。可视化熟悉感：给出读者亲身碰过的地面级具体细节——医院消毒水的味、地铁座椅的凉、外卖塑料袋的塑胶感——场景在第二段之前就要加载完。共鸣分两层：认知共鸣（"这种情况下我也会这么选"）+ 情绪共鸣（亲情、被欺压时的愤怒、不公、隐忍的骄傲）。欲望两条腿走路：基础欲望（不劳而获、压制比自己高的人、被欺压之后的扬眉吐气）+ 主动欲望（本章自己挖的期待感——一个读者会带到下一章的情绪缺口）。五感钩子：每个场景除视觉外放 1-2 种感官细节（听/嗅/触/味），顺手带过，绝不写成大段天气描写。人设要"核心标签 + 一个反差细节"才活——冷面杀手偷偷喂流浪猫、和善父亲开的玩笑像刀子。这六根柱子是场景的默认形状，不是章末打勾的清单。`;
}

// ---------------------------------------------------------------------------
// 黄金三章 prose discipline — Phase 6.5
// Single conditional append (chapterNumber <= 3). No new schema, no new
// runtime branch. Cohesive paragraphs, NOT a numbered checklist.
// ---------------------------------------------------------------------------

export function buildGoldenOpeningDiscipline(
  chapterNumber: number | undefined,
  language: "zh" | "en",
): string {
  if (chapterNumber === undefined || chapterNumber > 3) return "";

  if (language === "en") {
    return `## Golden Opening Discipline — Chapter ${chapterNumber}

This is chapter ${chapterNumber} of the opening three — your prose directly decides whether the reader stays. The Golden Three Chapters rule from new.txt is a hard constraint on your sentences, not advice. Chapter 1: within the first 800 words the protagonist must trip the main-line conflict (chase, dead-end, dispossession, transmigration-as-crisis); long background paragraphs are forbidden, and worldbuilding rides on the protagonist's actions instead of being explained in a block. **The last sentence of the first 300 words (the reader's first phone screen) must land a dramatic / reversal / striking beat — "Officer, I transmigrated"-level, "I'll probably die tomorrow"-level, "I'm attending my own funeral"-level — not background or scene-setting. When the reader scrolls to the bottom of the first screen they must feel pulled into the next line.** Chapter 2: the edge — power, system, rebirth-memory, information advantage — must be **performed** (one concrete event of using it, with a visible consequence), not **announced** (a narrator paragraph saying it exists). Chapter 3: somewhere in this chapter the protagonist's next quantifiable short-term goal must surface, so the reader can name what comes next when they close the page.

The discipline that runs across all three opening chapters: paragraphs of three to five lines (mobile reading), verbs over adjectives, and every chapter ends on a small hook — a cliff, an unresolved question, or an emotional gap. **At most two scenes and at most two named characters who actually clash in the chapter (protagonist + one trigger/opponent; walk-on roles get a role label only, no name, no expansion). Editor Cong Yue's rule tightens the cap from 3 to 2 — readers already mix up 3.** Information is layered into action: basic facts (looks, status, situation) emerge from what the protagonist does; key world rules (system mechanics, the deeper logic) attach to plot triggers; a paragraph of pure exposition is forbidden.`;
  }

  return `## 黄金三章写作纪律 — 第 ${chapterNumber} 章

这是开篇三章中的第 ${chapterNumber} 章——你写出的每一句话都直接决定读者是否留下来。new.txt 的黄金三章法则对你不是建议，是对句子的硬约束。第 1 章：主角出场 800 字以内必须触发主线冲突（追杀、死局、被夺权、穿越即危机），禁止长段背景铺垫，世界观要通过主角的行动自然带出，不要整段解释。**第 1 章正文前 300 字（手机屏第一页）的最后一句必须是带戏剧性/反差/反转的收尾——警察叔叔我穿越了这类、我大概明天就要死了这类、我躺在自己的葬礼上这类——而不是介绍背景或交代环境。读者第一屏刷到页尾时必须产生"下一句是什么"的拉力。** 第 2 章：金手指/能力/系统/重生记忆/信息差必须"做出来"——一次具体使用的事件、一个看得见的后果——而不是"说出来"——旁白介绍它存在。第 3 章：本章中段必须让主角下一个可量化的短期目标浮上水面，读者合上页面要能说出"接下来他要干什么"。

贯穿开篇三章的纪律：段落 3-5 行（手机阅读节奏），动词压过形容词，每一章结尾必有小钩子——小悬念、未解之问、情绪缺口。**本章场景 ≤ 2 个、有名有姓参与正面冲突的人物 ≤ 2 个（主角 + 1 个触发者或对手；路人甲乙只报身份不给名字，不展开）。番茄老师丛月把开篇人物上限从 3 收紧到 2——3 个已经够读者记混，2 个最稳。** 信息分层植入到动作里：基础信息（外貌、身份、处境）通过主角行动自然带出；关键设定（系统规则、世界底层）结合剧情节点揭示；禁止整段 exposition。`;
}

// ---------------------------------------------------------------------------
// 黄金开篇（中文3章/英文5章）
// ---------------------------------------------------------------------------

function buildGoldenChaptersRules(
  chapterNumber?: number,
  language?: string,
): string {
  const isEnglish = language === "en";
  const goldenLimit = isEnglish ? 5 : 3;
  if (chapterNumber === undefined || chapterNumber > goldenLimit) return "";

  const zhRules: Record<number, string> = {
    1: `### 第一章：抛出核心冲突
- 开篇直接进入冲突场景，禁止用背景介绍/世界观设定开头
- 第一段必须有动作或对话，让读者"看到"画面
- **手机屏第一页（正文约前 300 字）的最后一句必须是戏剧性反转/反差句**，不是铺垫——警察叔叔我穿越了、我大概明天就要死了、我躺在自己的葬礼上、妻子和婆婆同时掉水里了，类似这种一句话的钩子
- **开篇场景限制：最多 1-2 个场景，有名有姓参与正面冲突的人物上限 2 个（主角 + 1 个触发者/对手）**；路人甲乙只给身份标签（"穿红衣的女人""跛脚老头"）不给名字
- 主角身份/外貌/背景通过行动自然带出，禁止资料卡式罗列
- 本章结束前，核心矛盾必须浮出水面
- 一句对话能交代的信息不要用一段叙述，角色身份、性格、地位都可以从一句有特色的台词中带出`,
    2: `### 第二章：展现金手指/核心能力
- 主角的核心优势（金手指/特殊能力/信息差等）必须在本章初现
- 金手指的展现必须通过具体事件，不能只是内心独白"我获得了XX"
- 开始建立"主角有什么不同"的读者认知
- 第一个小爽点应在本章出现
- 继续收紧核心冲突，不引入新支线`,
    3: `### 第三章：明确短期目标
- 主角的第一个阶段性目标必须在本章确立
- 目标必须具体可衡量（打败某人/获得某物/到达某处），不能是抽象的"变强"
- 读完本章，读者应能说出"接下来主角要干什么"
- 章尾钩子要足够强，这是读者决定是否继续追读的关键章`,
  };

  const enRules: Record<number, string> = {
    1: `### Chapter 1: Drop into conflict
- Open with action or dialogue — no worldbuilding preamble
- First paragraph must show a scene, not tell backstory
- **The last sentence of the first 300 words (first phone screen) must be a dramatic reversal / striking beat** — "Officer, I transmigrated"-level, "I'll probably die tomorrow"-level — not scene-setting
- **Max 1-2 locations; max 2 named characters who actually clash in the chapter (protagonist + one trigger/opponent)**. Walk-ons get a role tag ("the woman in red", "the limping old man"), no name
- Protagonist identity revealed through behavior, not info-dump
- Core conflict must surface before chapter end`,
    2: `### Chapter 2: Reveal the edge
- The protagonist's unique advantage (power/secret/skill) must appear
- Show it through a concrete event, not internal monologue ("I gained X")
- First small payoff/satisfaction beat should land here
- Tighten the core conflict, don't open new subplots`,
    3: `### Chapter 3: Lock in the short-term goal
- A specific, measurable goal must be established (defeat someone / obtain something / reach somewhere)
- Reader must be able to say "I know what the protagonist wants next"
- End with a strong hook — this is the make-or-break chapter for retention`,
    4: `### Chapter 4: First major payoff
- Deliver the first BIG satisfaction beat — reader has invested 3 chapters, reward them
- Protagonist uses their edge to achieve something meaningful (not just survive)
- Raise the emotional stakes: what the protagonist stands to LOSE becomes clear
- Introduce or deepen a relationship that matters (ally, rival, love interest)`,
    5: `### Chapter 5: Raise the stakes before paywall
- New threat or complication that makes the goal harder (new antagonist, betrayal, revelation)
- The world expands: reader sees there's a bigger game beyond the initial conflict
- End on the strongest cliffhanger yet — reader hits paywall after this chapter
- They must feel "I CANNOT stop here" — this is the conversion chapter`,
  };

  const rules = isEnglish ? enRules : zhRules;
  const header = isEnglish
    ? `## Golden ${goldenLimit} Chapters — Chapter ${chapterNumber}

The opening ${goldenLimit} chapters determine whether readers stay or leave. Before the paywall (ch6-8), every chapter must hook harder than the last.

- Start from an explosion, not the first brick
- No info-dumps: worldbuilding reveals through action
- Each chapter: 1 storyline; **ch1-ch2 keep named characters in conflict ≤ 2** (protagonist + one), ch3+ relax to ≤ 3
- Lead with strong emotion: injustice, danger, mystery, desire`
    : `## 黄金${goldenLimit}章特殊指令（当前第${chapterNumber}章）

开篇${goldenLimit}章决定读者是否追读。遵循以下强制规则：

- 开篇不要从第一块砖头开始砌楼——从炸了一栋楼开始写
- 禁止信息轰炸：世界观、力量体系等设定随剧情自然揭示
- 每章聚焦 1 条故事线；**第 1-2 章有名有姓参与正面冲突的人物 ≤ 2 个（主角 + 1 个触发者/对手），第 3 章起可放宽到 ≤ 3 个**
- 强情绪优先：利用读者共情（亲情纽带、不公待遇、被低估）快速建立代入感`;

  return `${header}

${rules[chapterNumber] ?? ""}`;
}

// ---------------------------------------------------------------------------
// Full cast tracking (conditional)
// ---------------------------------------------------------------------------

function buildFullCastTracking(): string {
  return `## 全员追踪

本书启用全员追踪模式。每章结束时，POST_SETTLEMENT 必须额外包含：
- 本章出场角色清单（名字 + 一句话状态变化）
- 角色间关系变动（如有）
- 未出场但被提及的角色（名字 + 提及原因）`;
}

// ---------------------------------------------------------------------------
// Genre-specific rules
// ---------------------------------------------------------------------------

function buildGenreRules(gp: GenreProfile, genreBody: string): string {
  const fatigueLine =
    gp.fatigueWords.length > 0
      ? `- 高疲劳词（${gp.fatigueWords.join("、")}）单章最多出现1次`
      : "";

  const chapterTypesLine =
    gp.chapterTypes.length > 0
      ? `动笔前先判断本章类型：\n${gp.chapterTypes.map((t) => `- ${t}`).join("\n")}`
      : "";

  const pacingLine = gp.pacingRule ? `- 节奏规则：${gp.pacingRule}` : "";

  return [
    `## 题材规范（${gp.name}）`,
    fatigueLine,
    pacingLine,
    chapterTypesLine,
    genreBody,
  ]
    .filter(Boolean)
    .join("\n\n");
}

// ---------------------------------------------------------------------------
// Protagonist rules from book_rules
// ---------------------------------------------------------------------------

function buildProtagonistRules(bookRules: BookRules | null): string {
  if (!bookRules?.protagonist) return "";

  const p = bookRules.protagonist;
  const lines = [`## 主角铁律（${p.name}）`];

  if (p.personalityLock.length > 0) {
    lines.push(`\n性格锁定：${p.personalityLock.join("、")}`);
  }
  if (p.behavioralConstraints.length > 0) {
    lines.push("\n行为约束：");
    for (const c of p.behavioralConstraints) {
      lines.push(`- ${c}`);
    }
  }

  if (bookRules.prohibitions.length > 0) {
    lines.push("\n本书禁忌：");
    for (const p of bookRules.prohibitions) {
      lines.push(`- ${p}`);
    }
  }

  if (
    bookRules.genreLock?.forbidden &&
    bookRules.genreLock.forbidden.length > 0
  ) {
    lines.push(
      `\n风格禁区：禁止出现${bookRules.genreLock.forbidden.join("、")}`,
    );
  }

  return lines.join("\n");
}

// ---------------------------------------------------------------------------
// Book rules body (user-written markdown)
// ---------------------------------------------------------------------------

function buildBookRulesBody(body: string): string {
  if (!body) return "";
  return `## 本书专属规则\n\n${body}`;
}

// ---------------------------------------------------------------------------
// Style guide
// ---------------------------------------------------------------------------

function buildStyleGuide(styleGuide: string): string {
  if (!styleGuide || styleGuide === "(文件尚未创建)") return "";
  return `## 文风指南\n\n${styleGuide}`;
}

// ---------------------------------------------------------------------------
// Style fingerprint (Phase 9: C3)
// ---------------------------------------------------------------------------

function buildStyleFingerprint(fingerprint?: string): string {
  if (!fingerprint) return "";
  return `## 文风指纹（模仿目标）

以下是从参考文本中提取的写作风格特征。你的输出必须尽量贴合这些特征：

${fingerprint}`;
}

// ---------------------------------------------------------------------------
// Pre-write checklist
// ---------------------------------------------------------------------------

function buildPreWriteChecklist(book: BookConfig, gp: GenreProfile): string {
  let idx = 1;
  const lines = [
    "## 动笔前必须自问",
    "",
    `${idx++}. 【大纲锚定】本章对应卷纲中的哪个节点/阶段？本章必须推进该节点的剧情，不得跳过或提前消耗后续节点。如果卷纲指定了章节范围，严格遵守节奏。`,
    `${idx++}. 主角此刻利益最大化的选择是什么？`,
    `${idx++}. 这场冲突是谁先动手，为什么非做不可？`,
    `${idx++}. 配角/反派是否有明确诉求、恐惧和反制？行为是否由"过往经历+当前利益+性格底色"驱动？`,
    `${idx++}. 反派当前掌握了哪些已知信息？哪些信息只有读者知道？有无信息越界？`,
    `${idx++}. 章尾是否留了钩子（悬念/伏笔/冲突升级）？`,
  ];

  if (gp.numericalSystem) {
    lines.push(
      `${idx++}. 本章收益能否落到具体资源、数值增量、地位变化或已回收伏笔？`,
    );
  }

  // 17雷点精华预防
  lines.push(
    `${idx++}. 【流水账检查】本章是否有无冲突的日常流水叙述？如有，加入前因后果或强情绪改造`,
    `${idx++}. 【主线偏离检查】本章是否推进了主线目标？支线是否在2-3章内与核心目标关联？`,
    `${idx++}. 【爽点节奏检查】最近3-5章内是否有小爽点落地？读者的"情绪缺口"是否在积累或释放？`,
    `${idx++}. 【人设崩塌检查】角色行为是否与已建立的性格标签一致？有无无铺垫的突然转变？`,
    `${idx++}. 【视角检查】本章视角是否清晰？同场景内说话人物是否控制在3人以内？`,
    `${idx++}. 如果任何问题答不上来，先补逻辑链，再写正文`,
  );

  return lines.join("\n");
}

// ---------------------------------------------------------------------------
// Creative-only output format (no settlement blocks)
// ---------------------------------------------------------------------------

function buildCreativeOutputFormat(
  book: BookConfig,
  gp: GenreProfile,
  lengthSpec: LengthSpec,
): string {
  const resourceRow = gp.numericalSystem
    ? "| 当前资源总量 | X | 与账本一致 |\n| 本章预计增量 | +X（来源） | 无增量写+0 |"
    : "";

  const preWriteTable = `=== PRE_WRITE_CHECK ===
（必须输出Markdown表格，全部检查项对齐 chapter_memo 七段，而不是卷纲）
| 检查项 | 本章记录 | 备注 |
|--------|----------|------|
| 当前任务 | 复述 chapter_memo 的「当前任务」并写出本章执行动作 | 必须具体，不能抽象 |
| 读者在等什么 | 本章如何处理「读者此刻在等什么」—制造/延迟/兑现 | 与 memo 一致 |
| 该兑现的 / 暂不掀的 | 本章确认要兑现的伏笔 + 必须压住不掀的底牌 | 引用 memo 原文 |
| 日常/过渡承担任务 | 若有日常/过渡段落，说明各自承担的功能 | 对齐 memo 映射表 |
| 章尾必须发生的改变 | 列出 memo「章尾必须发生的改变」中 1-3 条具体改变 | 必须落地 |
| 不要做 | 复述 memo「不要做」清单 | 正文不得触碰 |
| 上下文范围 | 第X章至第Y章 / 状态卡 / 设定文件 | |
| 当前锚点 | 地点 / 对手 / 收益目标 | 锚点必须具体 |
${resourceRow}| 待回收伏笔 | 用真实 hook_id 填写（无则写 none） | 与伏笔池一致 |
| 本章冲突 | 一句话概括 | |
| 章节类型 | ${gp.chapterTypes.join("/")} | |
| 风险扫描 | OOC/信息越界/设定冲突${gp.powerScaling ? "/战力崩坏" : ""}/节奏/词汇疲劳 | |`;

  return `## 输出格式（严格遵守）

${preWriteTable}

=== CHAPTER_TITLE ===
(章节标题，不含"第X章"。标题必须与已有章节标题不同，不要重复使用相同或相似的标题；若提供了 recent title history 或高频标题词，必须主动避开重复词根和高频意象)

=== CHAPTER_CONTENT ===
(正文内容，目标${lengthSpec.target}字，允许区间${lengthSpec.softMin}-${lengthSpec.softMax}字)
⚠️ 正文开头必须且只能有一行 markdown 标题：
  # 第N章 <标题>（N用阿拉伯数字）
禁止出现第二行标题。禁止同时使用"第X章"和"第X章"两种格式——统一用"第N章"（阿拉伯数字）。

【重要】本次只需输出以上三个区块（PRE_WRITE_CHECK、CHAPTER_TITLE、CHAPTER_CONTENT）。
状态卡、伏笔池、摘要等追踪文件将由后续结算阶段处理，请勿输出。`;
}

// ---------------------------------------------------------------------------
// Output format
// ---------------------------------------------------------------------------

function buildOutputFormat(
  book: BookConfig,
  gp: GenreProfile,
  lengthSpec: LengthSpec,
): string {
  const resourceRow = gp.numericalSystem
    ? "| 当前资源总量 | X | 与账本一致 |\n| 本章预计增量 | +X（来源） | 无增量写+0 |"
    : "";

  const preWriteTable = `=== PRE_WRITE_CHECK ===
（必须输出Markdown表格，全部检查项对齐 chapter_memo 七段，而不是卷纲）
| 检查项 | 本章记录 | 备注 |
|--------|----------|------|
| 当前任务 | 复述 chapter_memo 的「当前任务」并写出本章执行动作 | 必须具体，不能抽象 |
| 读者在等什么 | 本章如何处理「读者此刻在等什么」—制造/延迟/兑现 | 与 memo 一致 |
| 该兑现的 / 暂不掀的 | 本章确认要兑现的伏笔 + 必须压住不掀的底牌 | 引用 memo 原文 |
| 日常/过渡承担任务 | 若有日常/过渡段落，说明各自承担的功能 | 对齐 memo 映射表 |
| 章尾必须发生的改变 | 列出 memo「章尾必须发生的改变」中 1-3 条具体改变 | 必须落地 |
| 不要做 | 复述 memo「不要做」清单 | 正文不得触碰 |
| 上下文范围 | 第X章至第Y章 / 状态卡 / 设定文件 | |
| 当前锚点 | 地点 / 对手 / 收益目标 | 锚点必须具体 |
${resourceRow}| 待回收伏笔 | 用真实 hook_id 填写（无则写 none） | 与伏笔池一致 |
| 本章冲突 | 一句话概括 | |
| 章节类型 | ${gp.chapterTypes.join("/")} | |
| 风险扫描 | OOC/信息越界/设定冲突${gp.powerScaling ? "/战力崩坏" : ""}/节奏/词汇疲劳 | |`;

  const postSettlement = gp.numericalSystem
    ? `=== POST_SETTLEMENT ===
（如有数值变动，必须输出Markdown表格）
| 结算项 | 本章记录 | 备注 |
|--------|----------|------|
| 资源账本 | 期初X / 增量+Y / 期末Z | 无增量写+0 |
| 重要资源 | 资源名 -> 贡献+Y（依据） | 无写"无" |
| 伏笔变动 | 新增/回收/延后 Hook | 同步更新伏笔池 |`
    : `=== POST_SETTLEMENT ===
（如有伏笔变动，必须输出）
| 结算项 | 本章记录 | 备注 |
|--------|----------|------|
| 伏笔变动 | 新增/回收/延后 Hook | 同步更新伏笔池 |`;

  const updatedLedger = gp.numericalSystem
    ? `\n=== UPDATED_LEDGER ===\n(更新后的完整资源账本，Markdown表格格式)`
    : "";

  return `## 输出格式（严格遵守）

${preWriteTable}

=== CHAPTER_TITLE ===
(章节标题，不含"第X章"。标题必须与已有章节标题不同，不要重复使用相同或相似的标题；若提供了 recent title history 或高频标题词，必须主动避开重复词根和高频意象)

=== CHAPTER_CONTENT ===
(正文内容，目标${lengthSpec.target}字，允许区间${lengthSpec.softMin}-${lengthSpec.softMax}字)

${postSettlement}

=== UPDATED_STATE ===
(更新后的完整状态卡，Markdown表格格式)
${updatedLedger}
=== UPDATED_HOOKS ===
(更新后的完整伏笔池，Markdown表格格式)

=== CHAPTER_SUMMARY ===
(本章摘要，Markdown表格格式，必须包含以下列)
| 章节 | 标题 | 出场人物 | 关键事件 | 状态变化 | 伏笔动态 | 情绪基调 | 章节类型 |
|------|------|----------|----------|----------|----------|----------|----------|
| N | 本章标题 | 角色1,角色2 | 一句话概括 | 关键变化 | H01埋设/H02推进 | 情绪走向 | ${gp.chapterTypes.length > 0 ? gp.chapterTypes.join("/") : "过渡/冲突/高潮/收束"} |

=== UPDATED_SUBPLOTS ===
(更新后的完整支线进度板，Markdown表格格式)
| 支线ID | 支线名 | 相关角色 | 起始章 | 最近活跃章 | 距今章数 | 状态 | 进度概述 | 回收ETA |
|--------|--------|----------|--------|------------|----------|------|----------|---------|

=== UPDATED_EMOTIONAL_ARCS ===
(更新后的完整情感弧线，Markdown表格格式)
| 角色 | 章节 | 情绪状态 | 触发事件 | 强度(1-10) | 弧线方向 |
|------|------|----------|----------|------------|----------|

=== UPDATED_CHARACTER_MATRIX ===
(更新后的角色矩阵，每个角色一个 ## 块)

## 角色名
- **定位**: 主角 / 反派 / 盟友 / 配角 / 提及
- **标签**: 核心身份标签
- **反差**: 打破刻板印象的独特细节
- **说话**: 说话风格概述
- **性格**: 性格底色
- **动机**: 根本驱动力
- **当前**: 本章即时目标
- **关系**: 某角色(关系性质/Ch#) | ...
- **已知**: 该角色已知的信息（仅限亲历或被告知）
- **未知**: 该角色不知道的信息`;
}
