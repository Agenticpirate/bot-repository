# Changelog

All notable changes to claude-code-plugins are documented here.

## [2.1.0] - 2026-06-04

### Summary

31 new skills ported from the Claude Code Ultimate Guide catalog, bringing the total to 212 templates across 8 plugins. This release also includes a hooks compatibility update for Claude Code >= 2.1 and a skills quality pass.

### New Skills

**devops-pipeline** (+11): ci-all, ci-pipeline, ci-status, ci-tests, canary, land-and-deploy, sandbox-status, git-worktree, git-worktree-clean, git-worktree-remove, git-worktree-status

**code-quality** (+5): validate-changes, audit-codebase, check-cache-bugs, recipe-template, diagnose

**session-tools** (+6): explain, handoff-create, handoff-resume, handoff-update, session-save, catchup

**ai-methodology** (+5): eval-agents, eval-hooks, methodology-advisor, autoresearch, routines-discover

**pr-workflow** (+3): plan-pipeline, review-plan, review-pr

**release-automation** (+1): release-notes

### Fixes and Improvements

- **Hooks compatibility**: migrate all hooks.json to record format required by Claude Code >= 2.1
- **Skills quality pass**: em dashes removed, allowed-tools format corrected, effort levels and trigger phrasing audited
- **eval-rules and eval-skills**: updated from guide source with latest content

### Statistics

- Templates: 181 → 212
- New skills: 31
- Plugins updated: 6/8

---

## [2.0.0] - 2026-05-XX

### Summary

Initial public release. 7 focused plugins with 181 templates covering DevOps, security, code quality, PR workflow, session tooling, release automation, and AI methodology.

### Plugins

- **security-suite**: OWASP auditing, cyber-defense pipeline, 13 protective hooks
- **devops-pipeline**: CI/CD, git worktrees, deploy automation, GitHub Actions
- **release-automation**: Changelog, release notes (3 formats), social content
- **code-quality**: SOLID refactoring, TDD, GoF patterns, 6 review agents
- **pr-workflow**: Planning gates, PR/issue triage, handoffs
- **session-tools**: ccboard monitoring, voice refinement, 11 session hooks
- **ai-methodology**: Scaffolding, 6-stage talk pipeline, context-engineering
- **session-summary**: Session analytics dashboard, 15 configurable sections
