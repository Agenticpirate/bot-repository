# Advanced Patterns

This guide covers advanced features that integrate with Anthropic's official Claude Code and Cowork capabilities. These patterns are optional — the basic boilerplate works without them — but they unlock more power as your workflows mature.

---

## CLAUDE.md Best Practices

Your `CLAUDE.md` file is the brain of the system. Claude reads it at the start of every session and uses it to understand your workflow. Here are Anthropic's official recommendations:

### Keep it under 200 lines

Anthropic recommends targeting under 200 lines per CLAUDE.md file. Longer files consume context and reduce adherence. If your instructions grow beyond this, split them using the `@import` pattern:

```markdown
# CLAUDE.md

## Core Instructions
[Your main workflow rules — keep this tight]

## Job Definitions
@jobs/instructions/script-job.md
@jobs/instructions/titles-job.md
```

Claude will load referenced files on demand, keeping the main CLAUDE.md focused.

### File location options

Claude supports CLAUDE.md in multiple locations with different scopes:

| Location | Scope | Shared via git? |
|----------|-------|-----------------|
| `./CLAUDE.md` (project root) | This project | Yes |
| `./.claude/CLAUDE.md` | This project (alternative) | Yes |
| `~/.claude/CLAUDE.md` | All your projects (personal) | No |

**This boilerplate uses root `CLAUDE.md`** for simplicity. If you prefer the `.claude/` subdirectory (Anthropic's newer convention), move it there — Claude reads both locations.

### What to put in CLAUDE.md vs. config files

| CLAUDE.md | config/ files |
|-----------|--------------|
| Workflow rules (job triggers, ordering, approval gates) | Identity and voice (profile.md) |
| File write rules (what can be overwritten, what needs approval) | Quality standards and guardrails (rules.md) |
| Folder conventions (how projects are structured) | External tools and links (resources.md) |
| Status tracking format | Domain-specific rules (content types, filters) |

**Rule of thumb:** If it controls *how Claude behaves*, put it in CLAUDE.md. If it provides *context Claude references*, put it in config.

---

## Converting Jobs to Agent Skills

Anthropic has an official [Agent Skills specification](https://github.com/anthropics/skills). If you want to share your jobs as reusable skills that others can install, here's how to convert them.

### Skills directory structure

```
.claude/skills/
├── script-writer/
│   └── SKILL.md
├── title-generator/
│   └── SKILL.md
└── thumbnail-planner/
    └── SKILL.md
```

### SKILL.md format

Each skill needs YAML frontmatter that tells Claude when to activate it:

```yaml
---
name: script-writer
description: >
  Generate a structured video script from input notes.
  Use when the user says "Run script job" or asks to
  write a script for a video. Reads input.md and produces
  a draft with hook, sections, demos, and key insights.
---

# Script Writer

## When to Use
Trigger: "Run script job for [project-name]"

## Steps
[Your job instructions here — same content as jobs/instructions/]

## Prompt
[Your base prompt here — same content as jobs/prompts/]
```

### Key rules from Anthropic's spec

- **Name and description are critical** — Claude decides whether to activate a skill based primarily on these fields. Make the description specific and action-oriented.
- **Progressive loading** — Claude loads skill metadata (name + description) first, then the full SKILL.md content only when the skill is relevant. Keep descriptions concise.
- **Security** — if distributing skills, audit all bundled files. Check for external network calls in instructions.

### When to use Skills vs. this boilerplate

| Use this boilerplate when... | Use Skills when... |
|------------------------------|-------------------|
| You want a full workflow engine with config, projects, and status tracking | You want to share a single reusable capability |
| Your jobs reference shared config files | Your job is self-contained |
| You need project-level state (STATUS.md, draft/final flow) | You need Claude to auto-detect when to use it |
| You're the primary user | You're distributing to others |

You can use both — the boilerplate for your full workflow, and Skills for individual jobs you want to share.

---

## Hooks for Auto-Validation

Claude Code supports [hooks](https://code.claude.com/docs/en/hooks) — deterministic shell commands that run at specific lifecycle points. You can use hooks to automatically validate outputs after each job completes.

### Example: Post-job validation hook

Create `.claude/hooks.json`:

```json
{
  "hooks": [
    {
      "event": "post-tool-use",
      "matcher": {
        "tool_name": "write"
      },
      "command": "python validate_output.py \"$FILE_PATH\"",
      "description": "Validate output files after writing"
    }
  ]
}
```

### Practical hook ideas for workflows

| Hook | What it does |
|------|-------------|
| **Word count check** | After writing a draft, validate it's within target length |
| **Status sync** | After any file write, auto-update STATUS.md |
| **Format validator** | Check that output files follow the expected structure |
| **Notification** | Send a Slack/email notification when a job completes |
| **Backup** | Auto-backup files before overwriting |

### When to use Hooks vs. job instructions

- **Hooks** = deterministic, always runs, no LLM involved. Use for mechanical checks (file exists, word count, format validation).
- **Job instructions** = LLM-driven, flexible, context-aware. Use for quality judgments (is this draft good enough? does the hook create curiosity?).

---

## MCP Integration

The [Model Context Protocol (MCP)](https://modelcontextprotocol.io/) lets Claude connect to external services through a standardized interface. This is useful when your workflow needs data from or sends data to external tools.

### Common MCP integrations for content workflows

| MCP Server | What it enables |
|------------|----------------|
| **Slack** | Post notifications when jobs complete, share drafts for team review |
| **Google Drive** | Read input documents, save final outputs to shared folders |
| **GitHub** | Create issues for content ideas, track production in project boards |
| **Notion** | Read content briefs, update editorial calendars |
| **Calendar** | Check deadlines, schedule publishing dates |

### How to add MCP to your workflow

1. Configure MCP servers in your Claude Code or Cowork settings
2. Reference them in your job instructions:

```markdown
### Step 6 — Notify Team (optional)
If Slack MCP is connected, post a summary to #content-pipeline:
- What was produced
- Link to the draft
- What approval is needed
```

3. MCP tools become available to Claude alongside file operations — no special syntax needed in your prompts.

### MCP in scheduled tasks

Scheduled tasks benefit the most from MCP. For example, a daily scout task could:
- Read from Slack channels for content ideas (MCP: Slack)
- Search the web for trending topics (built-in web search)
- Save the digest to Google Drive (MCP: Google Drive)
- Post a summary to Slack (MCP: Slack)

The config separation pattern still applies — your `config/` files define *what* to look for, the prompt defines *how* to process it, and MCP handles *where* data comes from and goes to.

---

## Context Management Tips

From [Anthropic's best practices](https://code.claude.com/docs/en/best-practices):

- **Run `/clear` between unrelated tasks** — don't let context from one job bleed into another
- **Use `/compact` aggressively** — if a session is getting long, compact to free up context. CLAUDE.md gets re-injected fresh after compaction.
- **Delegate research to subagents** — if a job needs extensive research (like the community scout), consider using subagents to avoid filling your main context
- **One job per session** — for best results, start a fresh Cowork session for each pipeline job rather than running the entire pipeline in one session

---

## Further Reading

- [Claude Code Best Practices](https://code.claude.com/docs/en/best-practices)
- [CLAUDE.md Memory Guide](https://code.claude.com/docs/en/memory)
- [Agent Skills Specification](https://github.com/anthropics/skills)
- [Agent Skills Blog Post](https://claude.com/blog/equipping-agents-for-the-real-world-with-agent-skills)
- [Model Context Protocol](https://modelcontextprotocol.io/)
- [Claude Code Hooks](https://code.claude.com/docs/en/hooks)
