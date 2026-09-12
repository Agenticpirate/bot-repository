---
name: npx-skill-install
description: >-
  Install agent skills with `npx skills` the safe, no-duplicate-work way. Before
  installing, it checks (in one shot) whether the skill is already installed and
  whether every agent's skills directory is symlinked onto one shared hub — so you
  install ONCE instead of once per agent. Use this whenever the user wants to add,
  install, or set up a skill via `npx skills` / the skills CLI, hands over a skills
  repo or a skill name to install, asks why a skill isn't showing up in some agents,
  or wants to share one skills folder across Claude Code / Codex / Cursor / Gemini /
  Copilot / OpenCode. Triggers on: "install this skill", "add the X skill",
  "npx skills add", "set up this skills repo", "安装这个技能", "装一下这个 skill",
  "把这个技能装上", "用 npx skills 安装", "让所有 agent 都能用这个技能",
  "技能装了吗 / 是不是已经安装了", "把各个 agent 的 skills 目录软链接到一起".
---

# npx-skill-install

Install skills with `npx skills` without doing redundant work. The core idea: on a
machine where every agent's `skills` directory is **symlinked onto one shared hub**,
you install a skill **once** and all agents see it. Where the directories are
**not** linked, you must install to each agent separately — or set up the links
first (recommended). This skill detects which situation you're in, then runs the
right install command.

## Background: the hub model

`npx skills` supports several agents — Claude Code, Codex, Cursor, Gemini CLI,
GitHub Copilot, OpenCode — each with its own skills directory under `$HOME`
(e.g. `~/.claude/skills`, `~/.codex/skills`). Installing the same skill into every
one of those directories is wasteful and drifts out of sync.

The fix is a **hub**: one real directory (conventionally `~/.agents/skills`) holding
the actual skill folders, with each agent's `skills` directory turned into a symlink
pointing at it. After that, a single install lands in the hub and is instantly
visible to every linked agent. That is what requirement "install only the `agents`
directory" means.

## Workflow

Follow these steps in order. Don't skip the check — it's what prevents reinstalling
something that's already there or installing to the wrong number of places.

### 1. Identify what to install

You need a **source** (a GitHub repo of skills, e.g. `vercel-labs/agent-skills` or a
full `https://github.com/...` URL) and usually a **skill name**.

- If the user gave a repo/URL, use it as the source.
- If the user gave only a name and you don't know the source, discover it:
  ```bash
  npx -y skills find "<query>"
  ```
- Note the skill name(s) you intend to install — you'll pass them to the check.

### 2. Run the one-shot check

Run the bundled diagnostic. It reports installed skills AND whether the agent
directories converge on one hub — the two checks the user asked to be combined into
a single script run.

```bash
bash scripts/check-skills-setup.sh <skill-name> [more-names...]
```

Read the `== SUMMARY ==` block at the end:

- `SKILL_INSTALLED:<name>=yes|no` — whether each requested skill is already there.
- `CONVERGED=yes|no` — whether all present agent dirs share one hub.
- `HUB=<path>` — the hub (real or recommended).
- `EXISTING_AGENTS=...` — agents whose skills dir exists and resolves to the hub.
- `NOT_CONVERGED_AGENTS=...` — agents missing or pointing elsewhere.

**If the skill is already installed**, say so and stop unless the user wants to
update it (`npx skills update <name>`) or reinstall. Don't blindly reinstall.

### 3. If not converged, offer to set up symlinks (recommended)

When `CONVERGED=no`, the agent directories aren't sharing a hub. Per the user's
preference, **ask before changing anything**, and present linking as the recommended
option — something like:

> The agent skills folders aren't linked to a shared hub yet. I recommend symlinking
> them to `~/.agents/skills` so I can install each skill once for all agents. Want me
> to set that up? (Alternative: install separately to each agent.)

Preview the changes first, then apply only if the user agrees:

```bash
bash scripts/setup-symlinks.sh --dry-run     # preview
bash scripts/setup-symlinks.sh               # apply (only after user says yes)
```

`setup-symlinks.sh` is non-destructive: a real skills directory has its contents
copied into the hub (no overwrite) and is moved aside to a timestamped `.backup-*`
before the symlink replaces it. After applying, re-run the check to confirm
`CONVERGED=yes`.

If the user declines linking, proceed to install to **multiple** agents (step 4b).

### 4. Install

Skills are global on this kind of setup; use `-g`. Add `-y` to skip prompts once
you've already decided the targets.

**4a. Converged → install once.** Target a single linked agent; the hub makes it
visible to all of them. Pick any name from `EXISTING_AGENTS`:

```bash
npx -y skills add <source> -s <skill-name> -a "<one-existing-agent>" -g -y
```

**4b. Not converged (user declined linking) → install to every agent.** Use the
all-agents wildcard so each separate directory gets it:

```bash
npx -y skills add <source> -s <skill-name> -a '*' -g -y
```

Tips:
- Multiple skills from one repo: repeat `-s name1 -s name2`, or `-s '*'` for all.
- Project scope instead of global: drop `-g` and run inside the project (skills land
  in `./.agents/...` or the project's agent dirs).
- Prefer the default symlink install over `--copy` unless the user wants independent
  copies — symlinks keep things updatable via `npx skills update`.

### 5. Confirm

Re-run the check (or `npx -y skills list -g`) to confirm the skill now shows as
installed and lists the expected agents.

```bash
bash scripts/check-skills-setup.sh <skill-name>
```

## Quick reference: useful `npx skills` commands

| Goal | Command |
|------|---------|
| List installed (machine-readable) | `npx -y skills list -g --json` |
| Search for a skill | `npx -y skills find "<query>"` |
| List skills in a repo without installing | `npx -y skills add <source> -l` |
| Install one skill to one agent | `npx -y skills add <source> -s <name> -a "Codex" -g -y` |
| Install one skill to all agents | `npx -y skills add <source> -s <name> -a '*' -g -y` |
| Update | `npx -y skills update <name>` |
| Remove | `npx -y skills remove <name> -g -y` |

The first `npx skills` call downloads the CLI; it's cached afterward. If a network
call fails, retry once via the local proxy (`export {HTTP_PROXY,HTTPS_PROXY,ALL_PROXY,http_proxy,https_proxy,all_proxy}=http://127.0.0.1:7890`).

## Files

- `scripts/check-skills-setup.sh` — one-shot diagnostic: installed skills +
  hub-convergence verdict. Read-only. Pass skill names to check them specifically.
- `scripts/setup-symlinks.sh` — converge agent skills dirs onto the hub. Supports
  `--dry-run` and `--hub <path>`. Run only after the user agrees.
