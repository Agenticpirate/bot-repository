# Development Workflow

This repo uses Claude Code slash commands (in `.claude/commands/`) for agent-driven development. All workflows use squash-merge, worktree isolation for parallel work, and track state in `.private/TODO.md` and `.private/UNREVIEWED_PRS.md`.

## Single-task Commands

| Command                   | Purpose                                                                                  |
| ------------------------- | ---------------------------------------------------------------------------------------- |
| `/do <description>`       | Implement a change in an isolated worktree, create a PR, squash-merge to main, clean up. |
| `/safe-do <description>`  | Like `/do` but pauses for human review — no auto-merge.                                  |
| `/mainline`               | Ship uncommitted changes to main via a squash-merged PR.                                 |
| `/ship-and-merge [title]` | Ship via PR with automated review feedback loop (up to 3 rounds), then squash-merge.     |
| `/work`                   | Pick up the next task from `.private/TODO.md`, implement, PR, merge.                     |

## Multi-task / Parallel Commands

| Command                         | Purpose                                                                                           |
| ------------------------------- | ------------------------------------------------------------------------------------------------- |
| `/brainstorm`                   | Deep-read codebase, generate prioritized improvements, update `TODO.md`.                          |
| `/swarm [workers] [max-tasks]`  | Parallel execution — spawns agents (default: 12) working through `TODO.md` in isolated worktrees. |
| `/blitz <feature>`              | End-to-end feature delivery — plan → issues → swarm → review sweep → merge to main.               |
| `/safe-blitz <feature>`         | Same as `/blitz` but on a feature branch with a final PR for manual review.                       |
| `/safe-blitz-done [PR\|branch]` | Finalize a safe-blitz — squash-merge feature branch to main.                                      |
| `/execute-plan <file>`          | Sequential multi-PR rollout from a plan file.                                                     |

## Plan Execution (Human-in-the-loop)

A three-command workflow for executing plans one PR at a time with human review between each step.

| Command                     | Purpose                                                                                       |
| --------------------------- | --------------------------------------------------------------------------------------------- |
| `/safe-execute-plan <file>` | Create PR, auto-handle Codex/Devin reviews (up to 3 cycles), then await human merge approval. |
| `/safe-check-review [file]` | Check active PR for feedback from all reviewers + CI. Automated feedback loop.                |
| `/resume-plan [file]`       | Merge current PR, implement next one, stop for review. Repeat until done.                     |

## Utility & Review

| Command                             | Purpose                                                   |
| ----------------------------------- | --------------------------------------------------------- |
| `/plan-html <topic>`                | Create a rollout plan with markdown + HTML view.          |
| `/release [version]`                | Cut a release — tag, notes, GitHub Release, CI trigger.   |
| `/triage [user\|assistant\|device]` | Search Sentry errors, cross-reference with Linear issues. |
| `/update`                           | Pull main, rebuild, launch macOS app.                     |
| `/check-reviews [--namespace]`      | Sweep PRs for review feedback, create follow-up tasks.    |

## Typical Flow

```
/brainstorm  →  /swarm  →  /check-reviews  →  /swarm  (repeat)
```

Or for a focused feature: `/blitz <feature>` handles everything in one shot. Use `/safe-blitz <feature>` for a feature branch with a final PR for manual review, then `/safe-blitz-done` to merge.

For controlled, sequential execution: `/safe-execute-plan <file>` → `/resume-plan` → repeat.

**Note:** Slash commands do not run tests, type-checking, or linting by default. These steps are only performed when the task specifically requires it.

## Release Pipeline

Run `/release [version]` in Claude Code. If no version is provided, the patch version auto-increments from the latest tag.

Creating a GitHub Release triggers three workflows in parallel:

1. **macOS App** — build from source, compile Bun binary, code-sign with Developer ID, notarize with Apple, create DMG, publish to the public updates repo (\~15–20 min).
2. **npm** — publish the `velly` CLI package with provenance.
3. **Slack** — post release summary with threaded changelog.

Existing macOS installations auto-update via Sparkle's `appcast.xml` feed. New users download the latest DMG from the [public updates repo](https://github.com/vellum-ai/vellum-assistant/releases/latest).
