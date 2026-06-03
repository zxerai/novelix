# JiaOS — Autonomous Novel Writing AI Agent

<p align="center">
  <a href="https://www.npmjs.com/package/@actalk/jiaos"><img src="https://img.shields.io/npm/v/@actalk/jiaos.svg?color=cb3837&logo=npm" alt="npm version"></a>
  <a href="LICENSE"><img src="https://img.shields.io/badge/License-AGPL%20v3-blue.svg" alt="License: AGPL-3.0"></a>
  <a href="https://github.com/zxerai/jiaos/stargazers"><img src="https://img.shields.io/github/stars/zxerai/jiaos?style=flat&logo=github&color=yellow" alt="GitHub stars"></a>
  <a href="https://www.npmjs.com/package/@actalk/jiaos"><img src="https://img.shields.io/npm/dm/@actalk/jiaos?color=cb3837&logo=npm&label=downloads" alt="npm downloads"></a>
  <a href="https://clawhub.ai/narcooo/jiaos"><img src="https://img.shields.io/badge/🦞%20ClawHub-Skill-FF6B35?labelColor=1a1a1a" alt="ClawHub Skill"></a>
</p>

<p align="center">
  <a href="README.md">中文</a> | English | <a href="README.ja.md">日本語</a>
</p>

---

<p align="center">
  Open-source AI Agent that autonomously writes, audits, and revises novels.<br>
  Supports LitRPG · Progression Fantasy · Isekai · Romantasy · Sci-Fi · Fanfic · Style Clone.<br>
  Human review gates keep you in control.
</p>

<p align="center">
  <a href="#-quick-start">Quick Start</a> ·
  <a href="#-core-features">Features</a> ·
  <a href="#-how-it-works">How It Works</a> ·
  <a href="#-usage-modes">Usage</a> ·
  <a href="#-command-reference">Commands</a>
</p>

## 🚀 Quick Start

```bash
# 1. Install
npm i -g @actalk/jiaos

# 2. Initialize project
jiaos init my-novel

# 3. Check config
jiaos doctor

# 4. Create a book → start writing
jiaos book create --title "The Last Delver" --genre litrpg
jiaos write next my-book --count 10
```

Launch Studio web workbench (`jiaos` → `http://localhost:4567`) for visual book management, chapter review, and analytics.

> **🎯 3-minute setup**: Install → `jiaos init` → `jiaos doctor` → Write

---

## ✨ Core Features

### 🧠 10-Agent Pipeline
Each chapter is produced by 10 AI agents working in sequence: Plan → Compose → Write → Audit → Revise. No single-LLM context bloat — specialized agents handle each concern.

### 📋 33-Dimension Continuity Audit
Every draft is checked against 7 canonical truth files across 33 dimensions: character memory, resource continuity, hook payoff, narrative pacing, emotional arcs. Characters won't "remember" events they never witnessed or use items lost two chapters ago.

### 🛡️ Anti-AI-Detection
`revise --mode anti-detect` employs 22 rewrite rules: sentence variation, vocabulary substitution (banishing "delve/tapestry/testament/resonate/shatter"), paragraph breathing, emotion externalization, and punctuation diversity. Fatigue word lists cover all 15 genre profiles.

### 📊 Visual Analytics
Studio Analytics page: audit pass rate gauge, top issue categories, token usage trends. Book Detail: per-chapter word count bar chart. Knowledge Graph: force-directed character relationship graph (60fps, draggable, zoomable).

### 🎭 Style Cloning
`jiaos style analyze` extracts statistical fingerprint (sentence length, word frequency, rhythm) from reference text. `jiaos style import` injects it into a book — all future chapters adopt the style.

### 📝 Creative Brief
`jiaos book create --brief my-ideas.md` passes your notes and worldbuilding to the Architect agent, which builds from your ideas instead of inventing from scratch.

### 🔄 Continuation + Fanfic
`jiaos import chapters` imports existing novel text, reverse-engineers 7 truth files, and seamlessly continues. `jiaos fanfic init` creates fanfic books (canon/au/ooc/cp modes).

### 🎛️ Multi-Model Routing
Different agents can use different models: Writer on Claude (stronger creative), Auditor on GPT-4o (cheaper and fast), Radar on a local model (zero cost).

---

## ⚙️ Configuration

### Studio Setup (recommended)
```bash
jiaos init my-novel && cd my-novel && jiaos
```
Open Studio → "Model Config" → Select provider → Paste API key → Test → Save.

### CLI / Environment Config
```bash
jiaos config set-global --provider openai --base-url <url> --api-key <key> --model <model>
```
Or write `.env` with `JIAOS_LLM_BASE_URL` + `JIAOS_LLM_API_KEY` + `JIAOS_LLM_MODEL`.

### Multi-Model Routing
```bash
jiaos config set-model writer <model> --provider <provider>
jiaos config show-models
```

### Diagnostics
```bash
jiaos doctor      # Check config and API connectivity
```

### English Genre Profiles

| Genre | Key Mechanics |
|-------|--------------|
| **LitRPG** | Numerical system, power scaling, stat progression |
| **Progression Fantasy** | Power scaling, no numerical system |
| **Isekai** | Era research, culture clash |
| **Cultivation** | Realm progression, tribulations |
| **System Apocalypse** | Numerical system, survival |
| **Dungeon Core** | Territory management, minion evolution |
| **Romantasy** | Emotional arcs, dual POV |
| **Sci-Fi** | Tech consistency, era research |
| **Tower Climber** | Floor progression, boss fights |
| **Cozy Fantasy** | Low-stakes, community bonds |

Every genre includes a **fatigue word list** — the auditor flags overused AI words automatically.

---

## 🔬 How It Works

### 10-Agent Pipeline

| Agent | Responsibility |
|-------|---------------|
| **Radar** | Scans platform trends (pluggable, skippable) |
| **Planner** | Reads intent + focus, produces chapter goal |
| **Composer** | Selects relevant context from truth files |
| **Architect** | Generates foundation: story frame, rules, characters |
| **Writer** | Produces prose from composed context |
| **Observer** | Extracts 9 fact categories (characters, resources, etc.) |
| **Reflector** | Outputs JSON delta, Zod-validated immutable write |
| **Normalizer** | Single-pass compress/expand on length deviation |
| **Auditor** | 33-dimension continuity check |
| **Reviser** | Fixes issues found by auditor (default: 1 pass) |

### Canonical Truth Files

Every book maintains 7 truth files as the single source of truth:

| File | Purpose |
|------|---------|
| `current_state.md` | World state, character locations, relationships |
| `particle_ledger.md` | Resource accounting, item decay |
| `pending_hooks.md` | Open plot threads, foreshadowing |
| `chapter_summaries.md` | Per-chapter events and state changes |
| `subplot_board.md` | A/B/C subplot progress |
| `emotional_arcs.md` | Per-character emotion tracking |
| `character_matrix.md` | Character interaction records, info boundaries |

On Node 22+, a SQLite temporal memory database (`story/memory.db`) enables relevance-based retrieval of historical facts.

### Control Surface

- `story/author_intent.md` — long-horizon direction
- `story/current_focus.md` — next 1-3 chapter steering
- `story/runtime/chapter-XXXX.intent.md` — chapter-specific goals

```bash
jiaos plan chapter my-book --context "Focus on the mentor conflict"
jiaos compose chapter my-book
```

---

## 🎮 Usage Modes

### 1. Full Pipeline (One Command)
```bash
jiaos write next my-book              # Draft → audit → auto-revise
jiaos write next my-book --count 5    # 5 chapters in sequence
```

### 2. Atomic Commands (Composable)
```bash
jiaos plan chapter my-book --context "Mentor conflict" --json
jiaos compose chapter my-book --json
jiaos draft my-book --json
jiaos audit my-book 31 --json
jiaos revise my-book 31 --json
```

### 3. Natural Language Agent Mode
```bash
jiaos agent "Write a LitRPG novel where the MC is a healer in a dungeon world"
jiaos agent "Write the next chapter, focus on the boss fight"
```

18 built-in tools with LLM tool-use for call ordering.

---

## 📖 Command Reference

| Command | Description |
|---------|-------------|
| `jiaos init [name]` | Initialize project |
| `jiaos book create` | Create a book (`--genre`, `--brief <file>`) |
| `jiaos book list` | List all books |
| `jiaos book delete <id>` | Delete a book |
| `jiaos write next [id]` | Full pipeline: draft → audit → revise (`--count`, `--words`) |
| `jiaos write rewrite [id] <n>` | Rewrite chapter N |
| `jiaos draft [id]` | Write draft only |
| `jiaos audit [id] [n]` | Audit a chapter |
| `jiaos revise [id] [n]` | Revise (`--mode anti-detect`) |
| `jiaos agent <instruction>` | Natural language agent mode |
| `jiaos review list/approve-all [id]` | Review drafts |
| `jiaos status [id]` | Project status |
| `jiaos export [id]` | Export (`--format txt/md/epub`) |
| `jiaos short run` | Write short fiction |
| `jiaos fanfic init` | Create fanfic book |
| `jiaos config set-model <agent> <model>` | Multi-model routing |
| `jiaos doctor` | Diagnose setup |
| `jiaos detect [id] [n]` | AIGC detection |
| `jiaos style analyze/import` | Style cloning |
| `jiaos import chapters [id]` | Import for continuation |
| `jiaos studio` / `jiaos` | Web workbench |
| `jiaos up / down` | Daemon control |

`[id]` auto-detected for single-book projects. All commands support `--json`.

---

## 🗺️ Roadmap

- [x] ~~Studio Web UI~~ — shipped
- [ ] Interactive fiction (branching narrative)
- [ ] Partial chapter intervention (rewrite half-chapter + cascade truth updates)
- [ ] Custom agent plugin system

## 🤝 Contributing

```bash
pnpm install
pnpm dev          # Watch mode
pnpm test         # Run tests
pnpm typecheck    # Type check
```

Issues and PRs welcome. See [CONTRIBUTING.md](CONTRIBUTING.md).

## 📜 License

[AGPL-3.0](LICENSE)
