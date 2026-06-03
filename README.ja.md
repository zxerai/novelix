# Novelix — 自律型小説執筆 AIエージェント

<p align="center">
  <a href="https://www.npmjs.com/package/@actalk/novelix"><img src="https://img.shields.io/npm/v/@actalk/novelix.svg?color=cb3837&logo=npm" alt="npm version"></a>
  <a href="LICENSE"><img src="https://img.shields.io/badge/License-AGPL%20v3-blue.svg" alt="License: AGPL-3.0"></a>
  <a href="https://github.com/zxerai/novelix/stargazers"><img src="https://img.shields.io/github/stars/zxerai/novelix?style=flat&logo=github&color=yellow" alt="GitHub stars"></a>
  <a href="https://www.npmjs.com/package/@actalk/novelix"><img src="https://img.shields.io/npm/dm/@actalk/novelix?color=cb3837&logo=npm&label=downloads" alt="npm downloads"></a>
  <a href="https://clawhub.ai/narcooo/novelix"><img src="https://img.shields.io/badge/🦞%20ClawHub-Skill-FF6B35?labelColor=1a1a1a" alt="ClawHub Skill"></a>
</p>

<p align="center">
  <a href="README.md">中文</a> | <a href="README.en.md">English</a> | 日本語
</p>

---

<p align="center">
  小説の執筆・監査・修正を自律的に行うオープンソースCLIエージェント。<br>
  LitRPG · プログレッションファンタジー · 異世界転生 · ロマンタジー · SF · 二次創作 · 文体模倣。<br>
  人間によるレビューゲートで常にコントロールを維持。
</p>

<p align="center">
  <strong>v1.4.x</strong> ·
  <a href="#-quick-start">Quick Start</a> ·
  <a href="#-core-features">Features</a> ·
  <a href="#-how-it-works">仕組み</a> ·
  <a href="#-usage-modes">使い方</a> ·
  <a href="#-command-reference">コマンド</a>
</p>

## 🚀 Quick Start

```bash
# 1. インストール
npm i -g @actalk/novelix

# 2. プロジェクト初期化
novelix init my-novel

# 3. 設定チェック
novelix doctor

# 4. 書籍作成 → 自動執筆
novelix book create --title "最強の賢者" --genre progression
novelix write next 最強の賢者 --count 10
```

Studio Web ワークベンチを起動（`novelix` → `http://localhost:4567`）すると、ブラウザで書籍管理やチャプターレビューが可能です。

> **🎯 3分でセットアップ**：インストール → `novelix init` → `novelix doctor` → 執筆開始

---

## ✨ Core Features

### 🧠 10エージェントパイプライン
各章を10のAIエージェントが連携して生成：計画→編集→執筆→監査→修正。単一LLMのコンテキスト飽和に頼らず、専門エージェントが各責務を担当。

### 📋 33次元継続性監査
毎章の下書きを7つの真実ファイルと照合し33次元でチェック：キャラクター記憶、資源の継続性、伏線回収、物語テンポ、感情アーク。キャラが目撃していないことを「覚えて」いたり、2章前に失った武器を使おうとすると監査員が捕捉。

### 🛡️ AI臭除去（朱雀対応）
`revise --mode anti-detect` は22の書き換えルールを適用：文型変異、語彙置換（「彷彿」「不禁」「突然」「瞬間」等のAI高頻出語を排除）、段落呼吸、感情の外在化、句読点多様性。全15ジャンルに疲労語リストを搭載。

### 📊 ビジュアル分析
Studio分析ページ：監査合格率ゲージ、問題カテゴリランキング、Token使用量トレンド。書籍詳細：チャプター別文字数棒グラフ。知識グラフ：キャラクター関係の力指向グラフ（60fps、ドラッグ可能、ズーム可能）。

### 🎭 文体模倣
`novelix style analyze` が参考テキストから統計的指紋（文長分布、語彙頻度、リズム）を抽出。`novelix style import` で対象書籍に注入し、以降の全章がそのスタイルを採用。

### 📝 クリエイティブブリーフ
`novelix book create --brief my-ideas.md` で発想メモや設定資料を渡すと、アーキテクトエージェントがそれに基づいて世界観設定を生成。

### 🔄 続編 + 二次創作
`novelix import chapters` で既存小説テキストから7つの真実ファイルを自動リバースエンジニアリングし継続執筆。`novelix fanfic init` で二次創作（canon/au/ooc/cp）。

### 🎛️ マルチモデルルーティング
エージェントごとに異なるモデルを割り当て可能：Writer は Claude、Auditor は GPT-4o、Radar はローカルモデル。

---

## ⚙️ Configuration

### Studio設定（推奨）
```bash
novelix init my-novel && cd my-novel && novelix
```
Studio →「モデル設定」→ プロバイダー選択 → API Key 入力 → テスト接続 → 保存。

### CLI / 環境変数設定
```bash
novelix config set-global --provider openai --base-url <url> --api-key <key> --model <model>
```
または `.env` に `NOVELIX_LLM_BASE_URL` + `NOVELIX_LLM_API_KEY` + `NOVELIX_LLM_MODEL` を記述。

### マルチモデルルーティング（任意）
```bash
novelix config set-model writer <model> --provider <provider>
novelix config show-models
```

### 診断
```bash
novelix doctor    # 設定とAPI接続をチェック
```

---

## 🔬 How It Works

### 10エージェントパイプライン

| エージェント | 責務 |
|-------------|------|
| **レーダー** | プラットフォームトレンドをスキャン（省略可能） |
| **プランナー** | 作者意図＋現在の焦点から本章の目標を生成 |
| **コンポーザー** | 真実ファイルから関連コンテキストを選択 |
| **アーキテクト** | 初期設定を生成（世界観、ルール、キャラクター） |
| **ライター** | 精選コンテキストから本文を生成 |
| **オブザーバー** | 9種類の事実を抽出（キャラ、位置、資源等） |
| **リフレクター** | JSONデルタ出力、Zodスキーマ検証後にimmutable書込 |
| **ノーマライザー** | 文字数逸脱時に1パスで圧縮/補完 |
| **監査員** | 33次元継続性チェック |
| **修正者** | 監査の問題を修正（デフォルト1ラウンド） |

### 7つの真実ファイル

全書籍が7つのファイルを唯一の事実ソースとして維持：

| ファイル | 用途 |
|---------|------|
| `current_state.md` | 世界状態：キャラ位置、関係、感情 |
| `particle_ledger.md` | 資源台帳：アイテム数量と減衰 |
| `pending_hooks.md` | 未回収の伏線 |
| `chapter_summaries.md` | 各章の要約：登場人物、出来事 |
| `subplot_board.md` | サブプロット進捗ボード |
| `emotional_arcs.md` | キャラ別感情変化トラッキング |
| `character_matrix.md` | キャラクター相関行列、情報境界 |

Node 22+ では SQLite 時系列記憶データベース（`story/memory.db`）が自動有効化。

### 入力ガバナンス

- `story/author_intent.md` — 長期的な執筆意図
- `story/current_focus.md` — 直近1-3章の焦点
- `story/runtime/chapter-XXXX.intent.md` — 本章の目標

```bash
novelix plan chapter 最強の賢者 --context "師弟対立に焦点を戻す"
novelix compose chapter 最強の賢者
```

---

## 🎮 Usage Modes

### 1. フルパイプライン（一発実行）
```bash
novelix write next 最強の賢者           # 草稿→監査→自動修正
novelix write next 最強の賢者 --count 5 # 5章連続執筆
```

### 2. アトミックコマンド（組み合わせ可能）
```bash
novelix plan chapter 最強の賢者 --context "師弟対立" --json
novelix compose chapter 最強の賢者 --json
novelix draft 最強の賢者 --json
novelix audit 最強の賢者 5 --json
novelix revise 最強の賢者 5 --json
```

### 3. 自然言語エージェントモード
```bash
novelix agent "ダンジョン世界のヒーラーが主人公のLitRPGを書いて"
novelix agent "次章を書いて、ボス戦に焦点を当てて"
```

18のビルトインツール、LLMがtool-useで呼び出し順を決定。

---

## 📖 Command Reference

| コマンド | 説明 |
|---------|------|
| `novelix init [name]` | プロジェクト初期化 |
| `novelix book create` | 書籍作成（`--genre`, `--brief <file>`） |
| `novelix book list` | 一覧表示 |
| `novelix book delete <id>` | 削除 |
| `novelix write next [id]` | フルパイプライン執筆（`--count`, `--words`） |
| `novelix write rewrite [id] <n>` | N章を書き直し |
| `novelix draft [id]` | 下書きのみ |
| `novelix audit [id] [n]` | 監査 |
| `novelix revise [id] [n]` | 修正（`--mode anti-detect`） |
| `novelix agent <instruction>` | 自然言語モード |
| `novelix review list/approve-all [id]` | レビュー |
| `novelix status [id]` | 状態表示 |
| `novelix export [id]` | エクスポート（`--format txt/md/epub`） |
| `novelix short run` | 短編執筆 |
| `novelix fanfic init` | 二次創作作成 |
| `novelix config set-model <agent> <model>` | マルチモデル設定 |
| `novelix doctor` | 診断 |
| `novelix detect [id] [n]` | AIGC検出 |
| `novelix style analyze/import` | 文体分析/取込 |
| `novelix import chapters [id]` | 取込して続編 |
| `novelix studio` / `novelix` | Webワークベンチ |
| `novelix up / down` | デーモン制御 |

`[id]` は単一書籍プロジェクトで自動検出。全コマンド `--json` 対応。

## 🗺️ ロードマップ

- [x] ~~Studio Web UI~~ — リリース済
- [ ] インタラクティブ小説（分岐ストーリー）
- [ ] 部分的な章の介入
- [ ] カスタムエージェントプラグイン

## 🤝 コントリビュート

```bash
pnpm install
pnpm dev          # ウォッチモード
pnpm test         # テスト
pnpm typecheck    # 型チェック
```

Issue・PR お待ちしています。

## 📜 ライセンス

[AGPL-3.0](LICENSE)
