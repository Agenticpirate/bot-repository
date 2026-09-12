# Cowork Boilerplate

A folder-based workflow engine for [Claude Cowork](https://claude.ai) — Anthropic's desktop agent for automating file and task workflows. Define your process once, run it on demand or on schedule.

> **Works with:** Claude Cowork (desktop app) · Claude Code (CLI) · Any Claude-based agent that reads files from a folder

## What This Is

This is a ready-to-use folder structure that turns Claude's Cowork mode into a repeatable workflow engine. Instead of explaining your process from scratch every Cowork session, you define it once in config files and instruction files — using `CLAUDE.md` as the orchestrator. Cowork reads them and follows your pipeline.

It works for any workflow: content creation, research pipelines, data processing, report generation, client work, community management — anything that follows a repeatable process.

**Use cases people have built with this pattern:**
- YouTube video production (script → titles → description → thumbnail)
- Daily social media scouting and engagement drafting
- Client report generation pipelines
- Research → analysis → deliverable workflows
- Scheduled content curation and summarization

**Aligned with Anthropic's official patterns:** This boilerplate follows the [CLAUDE.md conventions](https://code.claude.com/docs/en/memory), [Agent Skills specification](https://github.com/anthropics/skills), and [Claude Code best practices](https://code.claude.com/docs/en/best-practices) published by Anthropic. See [ADVANCED.md](ADVANCED.md) for Skills packaging, Hooks, MCP integration, and context management.

## How It Works

The system has three layers:

**Config** (who you are) — `config/` files define your identity, voice, audience, rules, and resources. Write once, every job references them. Update your profile once and all prompts benefit.

**Jobs** (what to do) — `jobs/instructions/` files define step-by-step pipelines with triggers, approval gates, and output formats. `jobs/prompts/` files contain the actual prompts that shape the work.

**Projects** (where work happens) — `projects/` contains a copyable template folder for each unit of work. Each project tracks its own status and moves through your pipeline.

For automated work, `scheduled/` contains task prompts that Cowork runs on a schedule — same config, no manual triggers.

## Quick Start

### 1. Copy the template

Copy the `template/` folder to your computer. This is your working copy.

### 2. Customize it

Open Cowork, select the folder, and paste the prompt from [CUSTOMIZE.md](CUSTOMIZE.md). Cowork will interview you about your workflow and fill in all the placeholder files.

Or fill them in manually:
- `config/profile.md` — who you are, your voice, your audience
- `config/rules.md` — quality standards, guardrails, dos and don'ts
- `config/resources.md` — tools, links, references
- `CLAUDE.md` — replace all `[PLACEHOLDER]` markers with your specifics
- `jobs/instructions/` — define your pipeline jobs
- `jobs/prompts/` — write the prompts for each job

### 3. Run it

Select the folder in Cowork and use trigger commands:
- "Create folder for [project-name]" — sets up a new project
- "Run [job-name] for [project-name]" — executes a pipeline step

For scheduled tasks, create a scheduled task in Cowork that mounts your folder, reads config, reads the prompt from `scheduled/prompts/`, and executes.

## Folder Structure

```
your-workflow/
├── CLAUDE.md                        # Master instructions — Cowork reads this first
├── config/
│   ├── profile.md                   # Who you are, your voice, your audience
│   ├── rules.md                     # Quality standards, guardrails, dos/don'ts
│   └── resources.md                 # Tools, links, API references
├── jobs/
│   ├── instructions/
│   │   └── [job-name].md            # Step-by-step job definitions
│   └── prompts/
│       └── [job-name].md            # Prompts that shape the actual work
├── projects/
│   └── _template/                   # Copy this for each new project
│       ├── input.md                 # Your brief / raw material
│       ├── draft.md                 # Work in progress
│       └── STATUS.md                # Progress tracking
├── scheduled/
│   ├── prompts/
│   │   └── [task-name].md           # Prompts for automated tasks
│   └── output/
│       └── [task-name]/             # Date-stamped outputs
│           └── YYYY-MM-DD.md
└── .env.example                     # Environment variable template
```

## Key Patterns

### Config Separation
Config files contain context that prompts reference. Update once, every prompt benefits automatically. This means you can change your bio, your rules, or your quality standards without touching any prompt files.

### Draft → Approval → Final
Jobs produce drafts first, then wait for your approval before finalizing. This keeps you in control while Cowork does the heavy lifting.

### Status Tracking
Each project has a `STATUS.md` that tracks where it is in the pipeline. This prevents jobs from running out of order.

### Scheduled Tasks
The scheduled task prompt is minimal — it just mounts the folder, reads config, reads the task prompt, executes, and saves output. All the intelligence lives in the config and prompt files, not in the scheduled task definition.

### CLAUDE.md as Orchestrator
Anthropic recommends keeping `CLAUDE.md` under 200 lines for best adherence. This boilerplate separates instructions (CLAUDE.md) from context (config/) and job details (jobs/) to stay within that limit. For advanced patterns like `@imports`, `.claude/` subdirectory, and auto-memory, see [ADVANCED.md](ADVANCED.md).

## Real Examples

The `examples/` folder contains two battle-tested implementations from a real production workflow:

### YouTube Content Pipeline (`examples/youtube-content-pipeline/`)
A 4-job manual pipeline: Script → Titles → Description → Thumbnail. Each job has approval gates, optional external review (GPT/Gemini), and strict ordering rules. This is the actual system behind [Jitan Gupta's YouTube channel](https://youtube.com/@jitangupta).

### Daily Community Scout (`examples/daily-community-scout/`)
A scheduled task that searches LinkedIn, Reddit, and X daily for relevant posts, filters them by quality, drafts engagement responses, validates style distribution, and optionally drafts original LinkedIn posts. Runs automatically every morning.

## Adding a New Job

1. Create `jobs/instructions/[job-name].md` — define trigger, steps, and output format (use `_template.md` as a starting point)
2. Create `jobs/prompts/[job-name].md` — write the prompt (use `_template.md` as a starting point)
3. Add the job to the pipeline table in `CLAUDE.md`
4. If the job needs new project folders, add them to `projects/_template/`

## Adding a Scheduled Task

1. Create `scheduled/prompts/[task-name].md` — write the full task prompt
2. Create `scheduled/output/[task-name]/` — output directory
3. In Cowork, create a scheduled task with a minimal prompt that mounts the folder, reads config, reads the prompt file, and executes

## Going Further

See [ADVANCED.md](ADVANCED.md) for:
- **CLAUDE.md best practices** — file location, length limits, `@imports`, what goes where
- **Agent Skills packaging** — convert your jobs to Anthropic's official SKILL.md format for sharing
- **Hooks** — auto-validate outputs, sync status, send notifications after jobs complete
- **MCP integration** — connect to Slack, Google Drive, Notion, GitHub from your workflow
- **Context management** — tips on `/clear`, `/compact`, and subagents for long sessions

## Related Resources

- [Claude Code Best Practices](https://code.claude.com/docs/en/best-practices) — Anthropic's official guide to working with Claude agents
- [CLAUDE.md Memory Guide](https://code.claude.com/docs/en/memory) — How Claude reads and uses project instructions
- [Agent Skills Specification](https://github.com/anthropics/skills) — Anthropic's official skills repository
- [Model Context Protocol](https://modelcontextprotocol.io/) — Connect Claude to external tools and services
- [Claude Code Hooks](https://code.claude.com/docs/en/hooks) — Deterministic automation at lifecycle points

## Built by

[Jitan Gupta](https://jitangupta.com) — Senior Platform Engineer, YouTube educator at [@jitangupta](https://youtube.com/@jitangupta). Building AI workflows from real production experience.

## License

MIT — use it, fork it, make it yours.
