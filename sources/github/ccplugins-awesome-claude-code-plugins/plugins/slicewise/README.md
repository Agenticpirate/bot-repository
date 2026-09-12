# slicewise (plugin)

A disciplined, self-verifying feature-dev loop for Claude Code. Builds one slice at a time; every
commit unit gets a full test gate plus two independent reviewers reconciled against each other; you run
the commit yourself.

> Full docs, the loop diagram, and a worked example live in the
> [repository README](https://github.com/pjw81226/slicewise).

## What's in this plugin

| Component | File | Role |
|---|---|---|
| Skill | `skills/slicewise/SKILL.md` | The discipline — triggers on "implement this", "fix this bug", "refactor this", "this PR is stuck", etc. |
| Agent | `agents/code-reviewer.md` | Read-only, lens-parameterized reviewer dispatched in parallel during the review phase. |
| Command | `commands/slicewise.md` | `/slicewise <task>` — explicit entry point. |

## Install

```
/plugin marketplace add pjw81226/slicewise
/plugin install slicewise@slicewise
```

## Use

Describe a slice and let the skill trigger, or run `/slicewise <task>` explicitly. Zero config
needed — the loop auto-detects your toolchain. To customize (custom test command, extra docs, a Codex
reviewer), add a `.slicewise.yml` at your repo root; see
[docs/configuration.md](https://github.com/pjw81226/slicewise/blob/main/docs/configuration.md).

## License

[MIT](https://github.com/pjw81226/slicewise/blob/main/LICENSE)
