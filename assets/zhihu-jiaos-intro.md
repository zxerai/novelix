# 我写了个 10 Agent 协作的 AI 小说引擎，跑了 45 万字审计通过率 100%

大概两个月前，我决定用 AI 写一本网文。

试了一圈市面上的工具——NovelAI、Sudowrite、直接让 ChatGPT 写——发现一个共同的问题：**写了 10 章之后，前面埋的伏笔忘了收，角色的实力忽高忽低，上章丢掉的武器下章又出现了。**

大模型只有上下文窗口，没有"长期记忆"。不解决这个问题，AI 写小说永远只能写短篇。

于是我写了个东西：**Novelix**。

## 它不是"让 ChatGPT 写小说"

传统做法是写一个超长的 prompt，把设定、角色、剧情全塞进去，让 LLM 一次生成。但 token 有限，写不了几章就开始丢三落四。

Novelix 换了一种思路：**用 10 个 AI Agent 分工协作，每个管一件事。**

| Agent | 管什么 |
|-------|--------|
| **写手 Writer** | 生成正文 |
| **规划师 Planner** | 决定本章写什么 |
| **审计员 Auditor** | 检查 33 个维度的连贯性 |
| **修订者 Reviser** | 修复审计发现的问题 |
| **观察者 Observer** | 提取本章事实 |
| **反射器 Reflector** | 更新状态文件 |
| …… | 还有 4 个 |

每个 Agent 只做自己的事，管线串起来。写完一章自动审，审完不过就改，改完再审。

## 核心：7 个真相文件

每本书维护 7 个 Markdown 文件作为"唯一事实来源"：

- `current_state.md` — 角色在哪里、什么关系、知道什么
- `particle_ledger.md` — 身上有什么物品、剩下多少
- `pending_hooks.md` — 埋了哪些伏笔、哪些还没收
- `chapter_summaries.md` — 每章干了什么
- `subplot_board.md` — 支线走到哪了
- `emotional_arcs.md` — 谁对谁什么情绪
- `character_matrix.md` — 谁认识谁

审计员每章对照这些文件检查。如果主角"想起"了从没见过的事，或者拿出了两章前已经丢掉的武器，审计员会当场抓出来。

## 去 AI 味

AI 写的东西很容易被朱雀这类工具检测出来。我花了大量时间迭代了一套反检测策略，核心思路是**破坏 AI 的统计特征**：

- 消灭"仿佛、不禁、宛如、突然、忽然、瞬间、顿时"等高频词
- 长短句剧烈交替，禁止连续同长度
- "了"字每 100 字不超过 4 个
- 段落长度必须剧烈波动
- 禁止叙述者替读者下结论

这些规则不是写在博客里的——是直接写进 Writer agent 的 prompt 里，每章生成时自动遵守。也内置了一个 `revise --mode anti-detect` 命令，对已有章节做反检测改写。

## 实测数据

全自动跑了本玄幻小说，45 万字，150 章：

- 平均每章 ~300 字
- 审计通过率 100%
- 零人工干预

## 不只是命令行

如果不喜欢终端，也有一个 Web 工作台：

```bash
novelix
# 打开 http://localhost:4567
```

浏览器里可以：管理书籍、审阅章节、看字数趋势图、数据分析、角色关系图谱。

## 开源地址

项目完全开源，AGPL-3.0 协议：

**GitHub**: [github.com/zxerai/novelix](https://github.com/zxerai/novelix)

```bash
npm i -g @actalk/novelix
novelix init my-novel
novelix doctor
novelix book create --title "我的第一本书" --genre xianxia
novelix write next 我的第一本书 --count 10
```

---

如果你对多 Agent 系统、LLM 应用或者 AI 小说感兴趣，欢迎来 GitHub 点个 Star ⭐，也欢迎提 Issue 和 PR。

*写于 2026 年 6 月*
