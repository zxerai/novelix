---
name: git-push-workflow
description: Git push workflow - always create branch, push, then create PR
metadata:
  type: feedback
---

用户要求的 Git 推送流程：

1. `git checkout -b <branch-name>` — 先创建分支
2. `git add -A && git commit -m "..."` — 改代码、提交
3. `git push origin <branch-name>` — 推送分支
4. `gh pr create --title "..." --body "..."` — 创建 PR

**Why:** 用户希望所有更改都通过 PR 合并到 main，而不是直接推送到 main。

**How to apply:** 每次需要推送代码时，必须先创建分支，走 PR 流程。
