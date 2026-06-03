# Novelix — 自动化小说写作 AI Agent

<p align="center">
  <a href="https://www.npmjs.com/package/@actalk/novelix"><img src="https://img.shields.io/npm/v/@actalk/novelix.svg?color=cb3837&logo=npm" alt="npm version"></a>
  <a href="LICENSE"><img src="https://img.shields.io/badge/License-AGPL%20v3-blue.svg" alt="License: AGPL-3.0"></a>
  <a href="https://github.com/zxerai/novelix/stargazers"><img src="https://img.shields.io/github/stars/zxerai/novelix?style=flat&logo=github&color=yellow" alt="GitHub stars"></a>
  <a href="https://www.npmjs.com/package/@actalk/novelix"><img src="https://img.shields.io/npm/dm/@actalk/novelix?color=cb3837&logo=npm&label=downloads" alt="npm downloads"></a>
  <a href="https://clawhub.ai/narcooo/novelix"><img src="https://img.shields.io/badge/🦞%20ClawHub-Skill-FF6B35?labelColor=1a1a1a" alt="ClawHub Skill"></a>
</p>

<p align="center">
  <a href="README.en.md">English</a> | 中文 | <a href="README.ja.md">日本語</a>
</p>

---

<p align="center">
  AI Agent 自主写小说——写、审、改，全程接管。<br>
  覆盖玄幻·仙侠·都市·科幻·LitRPG·同人·仿写。<br>
  人工审核门控确保你始终掌控全局。
</p>

<p align="center">
  <strong>v1.4.x</strong> ·
  <a href="#-quick-start">Quick Start</a> ·
  <a href="#-core-features">Features</a> ·
  <a href="#-how-it-works">How It Works</a> ·
  <a href="#-usage-modes">Usage</a> ·
  <a href="#-command-reference">Commands</a>
</p>

## 🚀 Quick Start

```bash
# 1. 安装
npm i -g @actalk/novelix

# 2. 初始化项目
novelix init my-novel

# 3. 检查配置
novelix doctor

# 4. 创建书籍 → 全自动写作
novelix book create --title "吞天魔帝" --genre xuanhuan
novelix write next 吞天魔帝 --count 10
```

打开 Studio Web 工作台（`novelix` → `http://localhost:4567`），在浏览器里管理书籍、审阅章节、看数据分析。

> **🎯 3 分钟上手**：安装 → `novelix init` → `novelix doctor` 配模型 → 写书

---

## ✨ Core Features

### 🧠 10 Agent 管线 — 写、审、改全自动
每章由 10 个 AI Agent 接力完成：规划→编排→写作→审计→修订。不依赖单个 LLM 的"超长上下文"，而是多 Agent 分工协作。

### 📋 33 维连续性审计
审计员每章对照 7 个真相文件检查 33 个维度：角色记忆、物资连续性、伏笔回收、大纲偏离、叙事节奏、情感弧线等。主角不会"凭空想起"没见过的事，也不会拿出两章前丢掉的武器。

### 🛡️ 去 AI 味（朱雀可过）
`revise --mode anti-detect` 内置 22 条改写规则：句式变异、词汇替换（消灭"仿佛/不禁/宛如/突然"等 AI 高频词）、段落呼吸、情绪外化、朱雀专项策略。疲劳词表覆盖全部 15 个题材。

### 📊 可视化分析
Studio 数据分析页面：审计通过率环形图、高频问题分类排名、Token 用量趋势。书籍详情页：每章字数柱状图。知识图谱：角色关系力导向图（60fps、可拖拽、可缩放）。

### 🎭 文风仿写
`novelix style analyze` 提取参考文本的统计指纹（句长分布、词频、节奏），`novelix style import` 注入书籍，后续章节自动采用该风格。

### 📝 创作简报
`novelix book create --brief my-ideas.md` 传入脑洞和设定，Architect 基于简报生成设定，而非凭空创作。

### 🔄 续写 + 同人
`novelix import chapters` 导入已有小说，自动逆向 7 个真相文件，无缝续写。`novelix fanfic init` 从原作创建同人书（canon/au/ooc/cp 四种模式）。

### 🎛️ 多模型路由
不同 Agent 可用不同模型：Writer 用 Claude（创意强）、Auditor 用 GPT-4o（快速便宜）、Radar 用本地模型（零成本）。

---

## ⚙️ Configuration

### Studio 配置（推荐）
```bash
novelix init my-novel && cd my-novel && novelix
```
打开 Studio →「模型配置」→ 选择服务商 → 粘贴 API Key → 测试连接 → 选模型 → 保存。

### CLI / 环境变量配置
```bash
novelix config set-global --provider openai --base-url <url> --api-key <key> --model <model>
```
或写 `.env`：`NOVELIX_LLM_BASE_URL` + `NOVELIX_LLM_API_KEY` + `NOVELIX_LLM_MODEL`。

### 多模型路由（可选）
```bash
novelix config set-model writer <model> --provider <provider>
novelix config show-models     # 查看当前路由
```

### 诊断
```bash
novelix doctor      # 检查配置、API 连通性
```

> 完整配置说明见 [Configuration Guide](#v20-llm-config-update)。Studio 与服务配置隔离，env 仅用于 CLI/daemon 覆盖。

---

## 🔬 How It Works

### 10 Agent Pipeline

| Agent | 职责 |
|-------|------|
| **雷达** | 扫描平台趋势，指导故事方向（可插拔） |
| **规划师** | 读作者意图 + 当前焦点，产出本章意图 |
| **编排师** | 从真相文件中按相关性选择上下文 |
| **建筑师** | 建书时生成世界观、规则、角色 |
| **写手** | 生成正文（字数治理 + 对话引导） |
| **观察者** | 提取 9 类事实（角色、位置、资源等） |
| **反射器** | 输出 JSON delta，Zod schema 校验后 immutable 写入 |
| **归一化器** | 字数偏离 hard range 时单 pass 纠偏 |
| **审计员** | 33 维度连续性检查 |
| **修订者** | 修复审计发现的问题（默认最多 1 轮） |

### 7 个真相文件

每本书维护 7 个 Markdown 文件作为唯一事实来源：

| 文件 | 用途 |
|------|------|
| `current_state.md` | 世界状态：角色位置、关系网络 |
| `particle_ledger.md` | 资源账本：物品、金钱、衰减 |
| `pending_hooks.md` | 伏笔池：铺垫、承诺、未解决冲突 |
| `chapter_summaries.md` | 各章摘要：出场人物、事件 |
| `subplot_board.md` | 支线进度板 |
| `emotional_arcs.md` | 按角色追踪情绪变化 |
| `character_matrix.md` | 角色交互矩阵、信息边界 |

Node 22+ 自动启用 SQLite 记忆数据库（`story/memory.db`），按相关性检索历史事实。

### 输入治理

- `story/author_intent.md` — 长期方向
- `story/current_focus.md` — 近期 1-3 章焦点
- `story/runtime/chapter-XXXX.intent.md` — 本章意图

```bash
novelix plan chapter 吞天魔帝 --context "本章先把注意力拉回师徒矛盾"
novelix compose chapter 吞天魔帝
```

---

## 🎮 Usage Modes

### 1. 完整管线（一键式）
```bash
novelix write next 吞天魔帝           # 草稿 → 审计 → 自动修订
novelix write next 吞天魔帝 --count 5 # 连续写 5 章
```

### 2. 原子命令（可组合）
```bash
novelix plan chapter 吞天魔帝 --context "师徒矛盾" --json
novelix compose chapter 吞天魔帝 --json
novelix draft 吞天魔帝 --json
novelix audit 吞天魔帝 31 --json
novelix revise 吞天魔帝 31 --json
```

### 3. 自然语言 Agent 模式
```bash
novelix agent "帮我写一本都市修仙，主角是个程序员"
novelix agent "写下一章，重点写师徒矛盾"
```

内置 18 个工具，LLM 通过 tool-use 决定调用顺序。

---

## 📖 Command Reference

| Command | Description |
|---------|-------------|
| `novelix init [name]` | 初始化项目 |
| `novelix book create` | 创建新书（`--genre`, `--brief <file>` 创作简报） |
| `novelix book list` | 列出书籍 |
| `novelix book delete <id>` | 删除书籍 |
| `novelix write next [id]` | 完整管线写下一章（`--count`, `--words`, `-q`） |
| `novelix write rewrite [id] <n>` | 重写第 N 章 |
| `novelix draft [id]` | 只写草稿 |
| `novelix audit [id] [n]` | 审计 |
| `novelix revise [id] [n]` | 修订（`--mode anti-detect` 反检测） |
| `novelix agent <instruction>` | 自然语言模式 |
| `novelix review list/approve-all [id]` | 审阅草稿 |
| `novelix status [id]` | 项目状态 |
| `novelix export [id]` | 导出（`--format txt/md/epub`） |
| `novelix short run` | 写短篇 |
| `novelix fanfic init` | 创建同人书 |
| `novelix config set-model <agent> <model>` | 多模型路由 |
| `novelix doctor` | 诊断配置 |
| `novelix detect [id] [n]` | AIGC 检测 |
| `novelix style analyze/import` | 文风分析/导入 |
| `novelix import chapters [id]` | 导入续写 |
| `novelix studio` / `novelix` | Web 工作台 |
| `novelix up / down` | 守护进程 |

`[id]` 在单书项目自动检测。所有命令支持 `--json`。

---

## 🗺️ Roadmap

- [x] ~~Studio Web UI~~ — 已发布
- [ ] 互动小说（分支叙事 + 读者选择）
- [ ] 局部干预（重写半章 + 级联更新 truth 文件）
- [ ] 自定义 agent 插件系统
- [ ] 平台格式导出（起点、番茄等）

## 🤝 Contributing

```bash
pnpm install
pnpm dev          # 监听模式
pnpm test         # 测试
pnpm typecheck    # 类型检查
```

欢迎 Issue 和 PR。详见 [CONTRIBUTING.md](CONTRIBUTING.md)。

## 📜 License

[AGPL-3.0](LICENSE)
