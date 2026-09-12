# Contributing

Everything you need to set up the Vellum Assistant repo locally, run tests, and submit a pull request. Whether you're fixing a bug, adding a feature, or improving docs — this page has you covered.

## Prerequisites

- **[Bun](https://bun.sh)** — the only hard requirement. The setup script handles everything else.
- **macOS or Linux for the shell-based setup below.** macOS uses `sandbox-exec` for sandboxing, Linux uses `bwrap` (bubblewrap).
- **Git** — the setup script configures custom git hooks automatically.

For Windows desktop development, start with the [Windows client README](https://github.com/vellum-ai/vellum-assistant/blob/main/clients/windows/README.md). It covers Git Bash or WSL for POSIX scripts, a PowerShell development flow, and native packaging. The packaged Windows app includes its runtime and does not require this contributor setup.

Docker Desktop is optional but needed if you want full sandbox isolation on Linux. On macOS, the native `sandbox-exec` is used and requires no extra setup.

## Local Development Setup

```
git clone https://github.com/vellum-ai/vellum-assistant.git
cd vellum-assistant
./setup.sh
```

The setup script will:

1. Configure git to use `.githooks/` for pre-commit and pre-push hooks
2. Install dependencies for each package (`assistant`, `cli`, `gateway`, `credential-executor`, `scripts`)
3. Register local packages as linkable and wire them together via `bun link`
4. Link the global `vellum` CLI so it's available from anywhere
5. Install shell completions for Bash and Zsh

### Repository Structure

```
├── assistant/            # Bun-based assistant runtime (core logic, HTTP API)
├── cli/                  # Vellum CLI (multi-assistant management)
├── clients/              # Web, desktop (macOS, Windows, Linux), and mobile clients
├── gateway/              # Channel gateway (Telegram, Twilio, OAuth, reverse proxy)
├── credential-executor/  # Credential Execution Service (isolated RPC)
├── packages/             # Shared private packages
├── skills/               # Bundled skill definitions
├── scripts/              # Utility scripts (publishing, tunneling, releases)
├── benchmarking/         # Load testing scripts
├── meta/                 # Meta configuration
├── .claude/              # Claude Code slash commands and workflow tools
└── .github/              # GitHub Actions workflows
```

Each top-level package has its own `AGENTS.md` with package-specific conventions. Check the relevant one before making changes in that area.

### Running the Assistant

```
vellum hatch            # first-time setup (creates config, provisions keys)
vellum wake             # start assistant + gateway
vellum ps               # check process status
vellum sleep            # stop everything
vellum terminal         # shell into a managed assistant container
vellum doctor           # diagnose issues
```

### Running from Source

For development, you can run the assistant directly without the CLI wrapper:

```
export PATH="$HOME/.bun/bin:$PATH"
cd assistant
bun install
bun run src/index.ts assistant start
```

Some dependencies (`agentmail`, `@pydantic/logfire-node`) are optional at runtime but required for full `tsc --noEmit` type-checking.

## Testing

### Running Tests

The full test suite is large. **Never run `bun test` without specifying file paths** — it will hang or timeout.

```
# Run tests for specific files you changed
cd assistant && bun test src/path/to/file.test.ts

# Run tests matching a pattern
cd assistant && bun test src/path/to/file.test.ts --grep "pattern"

# Type-check the full project (preferred over running all tests)
cd assistant && bunx tsc --noEmit
```

The pre-push hook automatically finds and runs tests matching changed source files, so you'll get coverage feedback before pushing.

### Type Checking

```
cd assistant && bunx tsc --noEmit
```

This is the fastest way to validate your changes across the full project. The pre-push hook also runs this automatically when TypeScript files are changed.

### Writing Tests

- Place test files next to the source: `src/path/to/file.test.ts`
- Use `test.todo("description", () => {})` for tests that reproduce unfixed bugs — never commit failing `test()` cases
- Convert `test.todo` to `test` when the fix lands
- Look at existing tests in the same directory for patterns and conventions

## Code Style & Linting

```
cd assistant && bun run lint    # Run ESLint
```

### Git Hooks

Git hooks are configured automatically by `setup.sh`. They run on every commit and push:

| Hook       | What It Does                                                                                         |
| ---------- | ---------------------------------------------------------------------------------------------------- |
| pre-commit | Secret scanning, Prettier formatting, ESLint, message contract verification, tool registration guard |
| pre-push   | TypeScript type check, ESLint on changed files, runs related test files                              |

Bypass with `--no-verify` in exceptional cases, but this is strongly discouraged. See [.githooks/README.md](https://github.com/vellum-ai/vellum-assistant/blob/main/.githooks/README.md) for full details.

### Import Conventions

- All imports use `.js` extensions (NodeNext module resolution)
- Use `bun install` for dependencies — each package has its own `bun.lock`
- Ensure `PATH` includes Bun: `export PATH="$HOME/.bun/bin:$PATH"`

## Submitting a PR

### PR Conventions

- **Squash-merge only** — all PRs are squash-merged into main
- **Worktree isolation** — parallel work uses git worktrees to avoid conflicts
- **Dead code removal** — proactively remove unused code in every change. Ask yourself: “After my change, is there any code nothing calls?”
- **Linear tickets** — if your PR relates to a Linear issue, include the identifier (e.g. `JARVIS-123`) in the branch name and use `Closes JARVIS-123` in the commit body for auto-close

### Review Process

PRs go through automated review (Codex/Devin) with up to 3 fix cycles before human review. The automated reviewers check for:

- Type safety and correctness
- Test coverage for changed code
- Adherence to project conventions
- Backwards compatibility

For non-routine changes (architectural decisions, security, complex logic, deletions), leave a PR comment highlighting where to focus review and the risk level.

## Keeping Docs Current

When your PR changes behavior, update the relevant docs in the same PR:

| What Changed                             | What to Update                               |
| ---------------------------------------- | -------------------------------------------- |
| Slash commands in `.claude/commands/`    | README's “Slash Commands” section            |
| Services, modules, or data flows         | `ARCHITECTURE.md` and impacted domain docs   |
| New project-wide patterns or constraints | `AGENTS.md`                                  |
| User/assistant-facing features           | `assistant/src/prompts/templates/UPDATES.md` |

## Backwards Compatibility

Vellum has real users — maintain backwards compatibility for all interfaces, persisted state, and data. Never ship a change that silently breaks existing behavior.

When a change alters workspace file paths, directory structure, data shapes, or storage formats, include a migration in the same PR:

| What Changed                                     | Migration Type      | Location                              |
| ------------------------------------------------ | ------------------- | ------------------------------------- |
| Workspace files (renames, moves, format changes) | Workspace migration | `assistant/src/workspace/migrations/` |
| Database schema or data                          | DB migration        | `assistant/src/memory/migrations/`    |

Migrations must be idempotent (safe to re-run) and append-only (never reorder or remove existing entries). Flag breaking changes in PR descriptions.
