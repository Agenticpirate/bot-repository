# Daily Community Scout — Example

> Part of [cowork-boilerplate](../../README.md) — a folder-based workflow engine for Claude Cowork and Claude Code.

This is a real scheduled task from Jitan Gupta's workflow. It runs daily via Cowork's scheduled tasks feature, demonstrating how to build automated AI workflows with Claude's scheduled task system.

## What It Does

A single daily pipeline that searches LinkedIn, Reddit, and X for relevant posts, filters them, drafts engagement responses, validates quality, and optionally drafts original LinkedIn posts.

## How It Works

```
Phase 1: Search & Collect
  └─ LinkedIn, Reddit, X → keyword searches → capture posts with links

Phase 2: Filter & Classify
  └─ Quality filter (config/rules.md)
  └─ Engagement type classification (config/content-types.md)
  └─ Buyer persona signal check

Phase 3: Draft Enriched Engagement Briefs
  └─ For each kept post:
     ├─ Engagement strategy (why this approach)
     ├─ Key assumptions (so Jitan can course-correct)
     ├─ Draft response (ready to copy-paste)
     └─ What NOT to do (post-specific guardrails)

Phase 4: Validation Pass
  └─ Style distribution check
  └─ Experience pool rotation check
  └─ Ethics check
  └─ Banned words check

Phase 5: Original Post Draft
  └─ If themes are strong → draft 1-2 LinkedIn posts
  └─ Score against quality criteria
```

## The Scheduled Task Prompt

The scheduled task itself is minimal — it just mounts the folder, reads config, reads the prompt, and executes:

```
You are running a daily community scouting pipeline.

STEP 1: Mount the working folder.
STEP 2: Read all config files (config/*.md).
STEP 3: Read the task prompt (scheduled/prompts/community-scout.md).
STEP 4: Execute the pipeline following all instructions.
STEP 5: Save output to scheduled/output/community-scout/YYYY-MM-DD.md.
```

## Config Separation Pattern

The key architectural pattern here: **config files are updated once and referenced by every prompt.** When Jitan updates his profile, engagement rules, or quality filter, the scheduled task automatically picks up the changes on its next run. No prompt editing needed.
