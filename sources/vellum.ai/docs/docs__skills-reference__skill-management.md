# Skill Management

## What it does

Creates and deletes custom managed skills. The meta-skill that lets you extend your assistant with new capabilities.

## Setup required

None. Works immediately.

## Permissions

- Skill creation/deletion is classified as high-risk and always requires approval

## Common prompts

| You say...                                                     | What happens                    |
| -------------------------------------------------------------- | ------------------------------- |
| “Build me a skill that checks Hacker News for trending posts”  | Scaffolds a new custom skill    |
| “Create a skill for managing my project's deployment pipeline” | Creates a domain-specific skill |
| “Delete the Hacker News skill”                                 | Removes a custom skill          |
| “Show me my custom skills”                                     | Lists managed skills            |

## Configuration

- Creates a skill folder: SKILL.md (instructions) plus optional companion files, such as references/\*.md for failure modes and cached values, and scripts/\* for reusable code the skill runs (invoked with python3 or bun)
- Companion scripts are plain files the assistant runs from the terminal; skills built this way cannot register executable skill tools (TOOLS.json ships only with built-in and community-installed skills)
- Skills are saved to \~/.vellum/workspace/skills/

## Tips & gotchas

- **Extend your assistant.** Custom skills are how you add capabilities beyond the built-in set.
- **Fully automated.** The assistant writes the code, tests it, and packages it — you just describe what you want.
- **High-risk classification.** Skill source file modifications always require approval to prevent privilege escalation.
- **Review before approving.** Check the generated code before granting approval. You can also edit skill files directly if you prefer.
- **Scripts come from proven runs.** When the assistant stores a scripts/ file in a skill, it saves the exact code it already ran successfully, so reusing the skill later runs the script instead of rewriting the code from scratch.
