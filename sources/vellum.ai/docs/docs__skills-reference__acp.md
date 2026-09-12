# ACP

## What it does

Sets up, authenticates, and runs external coding tools such as Claude Code, Codex, and Gemini CLI through the Agent Client Protocol, so your assistant can hand development tasks to them.

## Setup required

The protocol adapter is installed automatically the first time you use an agent, at the version your Assistant pins, and an adapter already on your PATH is left as it is. For Claude Code that is everything: sign-in runs through an in-app Connect card, so there is nothing to install yourself. The Codex adapter, @agentclientprotocol/codex-acp, includes Codex and reuses your existing Codex login. Say “Set up ACP” to walk through authentication. Naming Claude Code or Codex is also enough: the assistant offers once to connect it here, then continues.

## Permissions

- Host shell access for spawning external processes

## Common prompts

| You say...                                    | What happens                                            |
| --------------------------------------------- | ------------------------------------------------------- |
| “Claude Code will do it”                      | Offers once to connect Claude Code here, then continues |
| “Use Claude Code to fix the bug in server.ts” | Delegates to Claude Code agent                          |
| “Ask Codex to refactor this module”           | Delegates to Codex                                      |
| “Run Claude Code on sonnet for this”          | Starts the session on the model you named               |
| “Check on my coding agent”                    | Gets agent status                                       |
| “Cancel the coding agent”                     | Aborts the agent                                        |

## Configuration

- Supports multiple external development tools (Claude Code, Codex, Gemini CLI)
- Agents run as separate processes with their own context
- Status tracking: pending, running, completed, failed, aborted

## Tips & gotchas

- **Name it to connect.** Mentioning Claude Code or Codex is enough for a one-time offer to connect and run it here. The assistant does not start the agent unless you accept.
- **Fully independent.** ACP agents are separate processes with their own context window and tools.
- **Self-contained tasks.** Best for tasks like fixing a bug, refactoring a file, or writing tests.
- **Coordinated results.** Your assistant coordinates with the agent and reports back results.
- **Choose the right agent.** Claude Code for general development, Codex for code generation, Gemini CLI for Google ecosystem integration.
- **Ask for a model.** Claude Code runs on Opus unless you name a model, and every other agent starts on its own default. Say which model a session should run on, for example “use sonnet”, and it starts there. A session keeps the model it started on, so ask for a new one to change it. A standing default per agent lives in your Assistant config as `acp.agents.<id>.model`. The spawn result reports both the requested model and the model the top-level ACP session says it is actually using. The latter is authoritative.
