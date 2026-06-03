# Contributing

## Setup

```bash
git clone https://github.com/zxerai/jiaos.git
cd jiaos
pnpm install
pnpm build
pnpm test
```

**Requirements**: Node ≥ 20, pnpm ≥ 9.

## Project Structure

```
jiaos/
├── packages/
│   ├── core/          # Agents, pipeline, state management, LLM providers
│   ├── cli/           # Commander.js CLI (30+ commands)
│   └── studio/        # Web UI (Vite + React + Hono server)
├── genres/            # User-local genre profile copies
├── skills/            # OpenClaw skill definition
├── scripts/           # Build/release tooling
└── assets/            # Logos, promotion materials
```

Monorepo managed with pnpm workspaces. `cli` depends on `core` via `workspace:*`. `studio` depends on both `core` and `cli`.

## Development

```bash
# Watch mode — auto-rebuild on changes (core + cli + studio)
pnpm dev

# Build once
pnpm build

# Run all tests
pnpm test

# Type-check without emitting
pnpm typecheck
```

### Studio Development

The Studio web UI runs on two ports when started via `pnpm dev`:

| Service | Port | Description |
|---------|------|-------------|
| Frontend (Vite) | `4567` | React app with HMR |
| Backend (Hono) | `4569` | API server |

Start individually:

```bash
cd packages/studio
pnpm dev          # Both frontend + backend
pnpm dev:client   # Vite frontend only
pnpm dev:server   # API server only
```

The API server mounts the project root at `JIAOS_PROJECT_ROOT=../..` and listens on `JIAOS_STUDIO_PORT=4569`.

### Adding a New Package

1. Create `packages/<name>/` with `package.json` (use `workspace:*` for internal deps)
2. Add to `pnpm-workspace.yaml` under `packages:`
3. Export from `packages/<name>/src/index.ts`
4. Add build and typecheck scripts to `package.json`

## Commit Convention

```
<type>: <description>

[optional body — what and why, not how]
```

**Types**: `feat`, `fix`, `refactor`, `docs`, `test`, `chore`, `perf`, `ci`

Keep commits atomic — one logical change per commit. Split new files, interface changes, tests, and docs into separate commits when they're non-trivial.

Examples:
```
feat: add batch audit endpoint for chapters
fix: prevent SSE memory leak on rapid reconnect
refactor: extract LLM client factory to core
docs: update README with Studio setup guide
```

## Pull Request Checklist

- [ ] `pnpm build` passes
- [ ] `pnpm test` passes (all existing + new tests)
- [ ] `pnpm typecheck` passes
- [ ] New features have tests
- [ ] No unrelated formatting changes (keep diffs focused)
- [ ] Commit messages follow the convention above
- [ ] `README.md` updated if CLI commands or UI change
- [ ] `CHANGELOG.md` entry added for notable changes

## Code Style

- TypeScript, strict mode (`strict: true` in tsconfig)
- 2-space indentation
- Immutable patterns: `{ ...obj, key: value }` over mutation
- Functions < 60 lines, files < 1000 lines
- Errors must surface, not be swallowed (`catch { }` without re-throw needs a comment)
- `workspace:*` stays in source `package.json` — the CI pipeline handles version replacement at publish time
- Prefer `ReadonlyArray<T>` and `readonly` for props/interfaces that should not mutate

## Adding a CLI Command

1. Create `packages/cli/src/commands/<name>.ts`
2. Export a `Command` instance from `commander`
3. Register it in `packages/cli/src/index.ts`
4. Add `--json` output support for structured/parseable output
5. Support book-id auto-detection when the project has only one book
6. Add tests in `packages/cli/src/__tests__/`

```typescript
// Example command skeleton
import { Command } from "commander";

export const myCommand = new Command("my-command")
  .argument("[id]", "book ID (auto-detected if one book)")
  .option("--json", "JSON output")
  .option("--count <number>", "number of chapters", "1")
  .action(async (id, options) => {
    // implementation
  });
```

## Adding a Genre

1. Create `packages/core/genres/<id>.md` with YAML frontmatter
2. Required frontmatter fields:

```yaml
---
name: <display name>
id: <kebab-case-id>
chapterTypes: ["战斗章", "布局章", ...]
fatigueWords: ["仿佛", "不禁", ...]    # Words the auditor flags as overused
numericalSystem: true/false            # LitRPG-style numerical stats?
powerScaling: true/false               # Realm/tier progression?
eraResearch: true/false                # Requires era research?
pacingRule: "<pacing description>"
satisfactionTypes: ["悟道突破", ...]   # Reader payoff categories
auditDimensions: [1,2,3,...]           # Which of the 33 audit dimensions apply
language: zh|en                        # Default writing language
---
```

3. Add genre body: prohibitions, language rules, narrative guidance
4. Verify: run `jiaos genre list` to confirm the new genre appears

## Adding a Studio Page (React)

1. Create `packages/studio/src/pages/<Name>.tsx`
2. Export a named component
3. Register route in `packages/studio/src/App.tsx`
4. Add navigation entry in `packages/studio/src/hooks/use-hash-route.ts`
5. Add i18n labels in `packages/studio/src/hooks/use-i18n.ts` (zh + en)
6. Vite HMR updates immediately — no rebuild needed

## Testing

Tests live next to source in `__tests__/` directories. We use Vitest.

```bash
# Per-package
pnpm --filter @actalk/jiaos-core test    # Core tests (1100+)
pnpm --filter @actalk/jiaos-studio test  # Studio tests (240+)
pnpm --filter @actalk/jiaos test         # CLI tests (170+)

# All at once
pnpm test
```

**Guidelines:**
- For features touching the LLM pipeline, mock the LLM calls — never make real API requests in tests
- CLI integration tests use a temp project directory and run real file operations
- Studio tests use Vitest + jsdom for component rendering
- Core tests are pure logic — fast, no I/O dependency
- New features should have at minimum: 1 happy-path test + 1 error-case test

## Documentation

- Update `README.md` (Chinese) and/or `README.en.md` (English) when adding features
- Update `CHANGELOG.md` with notable changes (user-facing features, breaking changes, major fixes)
- Update `skills/SKILL.md` when CLI commands or interaction patterns change
- Keep `CONTRIBUTING.md` up to date as development workflows evolve

## Release Process

1. Update version in `package.json` files (root + all packages)
2. Update `CHANGELOG.md`
3. Run `pnpm build && pnpm test && pnpm typecheck`
4. Tag and push: `git tag v<version> && git push --tags`
5. CI publishes to npm automatically

## Questions?

Open an issue or check existing ones: https://github.com/zxerai/jiaos/issues
