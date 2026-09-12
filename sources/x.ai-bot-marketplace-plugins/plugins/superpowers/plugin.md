# superpowers

- Marketplace: Grok Build Plugin Marketplace (Plugins catalog)
- Source of truth: https://github.com/xai-org/plugin-marketplace
- Catalog revision: `9963e48f7a4a641d4f3a791cec55b089dd4aefa6`
- Category: development
- Homepage: https://github.com/obra/superpowers
- Keywords: superpowers
- Domains: (none)

## Description

Core skills library for software development: test-driven development, systematic debugging, collaboration patterns, and proven engineering workflows and techniques.

## Source pin

```json
{
  "source": "url",
  "url": "https://github.com/obra/superpowers.git",
  "sha": "b36e0829c6d0140e93cfef2ca599b1b07d4a7797"
}
```

## Components (plugin-index.json)

### hooks

- **SessionStart**: startup|clear|compact

### skills

- **brainstorming**: You MUST use this before any creative work - creating features, building components, adding functionality, or modifying…
- **dispatching-parallel-agents**: Use when facing 2+ independent tasks that can be worked on without shared state or sequential dependencies
- **executing-plans**: Use when you have a written implementation plan to execute in a separate session with review checkpoints
- **finishing-a-development-branch**: Use when implementation is complete, all tests pass, and you need to decide how to integrate the work
- **receiving-code-review**: Use when receiving code review feedback, before implementing suggestions, especially if feedback seems unclear or techn…
- **requesting-code-review**: Use when completing tasks, implementing major features, or before merging to verify work meets requirements
- **subagent-driven-development**: Use when executing implementation plans with independent tasks in the current session
- **systematic-debugging**: Use when encountering any bug, test failure, or unexpected behavior, before proposing fixes
- **test-driven-development**: Use when implementing any feature or bugfix, before writing implementation code
- **using-git-worktrees**: Use when starting feature work that needs isolation from current workspace or before executing implementation plans - e…
- **using-superpowers**: Use when starting any conversation - establishes how to find and use skills, requiring skill invocation before ANY resp…
- **verification-before-completion**: Use when about to claim work is complete, fixed, or passing, before committing or creating PRs - requires running verif…
- **writing-plans**: Use when you have a spec or requirements for a multi-step task, before touching code
- **writing-skills**: Use when creating new skills, editing existing skills, or verifying skills work before deployment
