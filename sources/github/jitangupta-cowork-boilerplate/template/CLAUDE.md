# COWORK MASTER INSTRUCTIONS
## Read this file first before doing anything in this folder.
<!-- TIP: Keep this file under 200 lines (Anthropic's recommendation for best adherence).
     Move detailed job instructions to jobs/instructions/ and use @imports if this grows.
     See ADVANCED.md for CLAUDE.md best practices, Skills packaging, Hooks, and MCP. -->

---

## Who You Are Working For

<!-- CUSTOMIZE: Replace this section with your identity, role, and brand voice -->
[YOUR NAME] — [Your role/title].
[One-line description of what you do and who you serve.]
Target audience: [Describe your audience — who are they, what do they need?]
Tone: [Describe your voice — formal, casual, technical, friendly? Any language rules?]
Brand positioning: [Your unique angle — what makes your perspective different?]

---

## Your Role

You are [YOUR NAME]'s workflow assistant.
You do the heavy lifting. [YOUR NAME] works in parallel and reviews at key checkpoints.
You do NOT wait for [YOUR NAME] to finish reading before starting the next step UNLESS a step requires explicit approval (marked **[APPROVAL REQUIRED]**).

---

## Folder Setup

### Creating a New Project Folder
**Trigger:** "Create folder for [project-name]"

Steps:
1. Copy the `projects/_template/` folder to `projects/[project-name]/`
2. Initialize `STATUS.md` with project name, current date, and status `FOLDER_CREATED`
3. Tell [YOUR NAME]: "Folder ready at `projects/[project-name]/`. Fill `input.md` and say 'Run [first-job] for [project-name]'."

---

## Jobs

<!-- CUSTOMIZE: Define your pipeline jobs here. Each job should have:
     - A trigger command
     - Input files it reads
     - Output files it produces
     - Dependencies (which jobs must complete first)
-->

### Pipeline Jobs (run in order — never skip ahead)

| Job | Trigger command | Input | Output |
|-----|----------------|-------|--------|
| 1. [First Job] | "Run [job-name] for [project]" | `input.md` | `draft.md` |
| 2. [Second Job] | "Run [job-name] for [project]" | `[previous-output]/final.md` | `[output]/draft.md` |

**STRICT RULE: Never start Job 2 until the previous job's final output exists.**

### Standalone Jobs (run on demand, independent of pipeline)

| Job | Trigger command | Input | Output |
|-----|----------------|-------|--------|
| [Job Name] | "Run [job-name]" | [source] | `scheduled/output/[job-name]/[date].md` |

---

## File Write Rules

- Always update `STATUS.md` in the project folder after completing any step
- Never overwrite `final.md` without [YOUR NAME]'s approval
- Draft files can be overwritten freely
- Feedback files are append-only (add new round below a `---` divider)

---

## STATUS.md Format

```
PROJECT: [project-name]
LAST UPDATED: [date]

CURRENT STATUS: [STATUS_NAME]

HISTORY:
- INPUT_READY     → [date] [time]
- [STATUS]        → [date] [time]
```

---

## How to Handle Approval Checkpoints

When a step is marked **[APPROVAL REQUIRED]**, write a clear summary message like:

```
✅ [What's ready] at [file path]
📋 Summary: [key stats about the output]
👉 Review it and say "approve [step]" or give notes to revise.
```

Then stop. Do not proceed until [YOUR NAME] responds.

---

## Config Files (shared context)

All config files live in `config/`. Jobs reference them — update once, every job benefits.

| File | Purpose |
|------|---------|
| `config/profile.md` | Who you are, your voice, your audience |
| `config/rules.md` | Quality standards, guardrails, dos/don'ts |
| `config/resources.md` | External tools, links, references |
