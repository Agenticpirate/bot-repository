# Slack

## What it does

Scan channels, summarize threads, manage reactions, and configure Slack integration with privacy-aware context sharing.

## Setup required

Slack Bot + App tokens. Say “Set up Slack.” Creates a Slack app with Socket Mode.

## Permissions

- Slack Bot Token + App Token
- No macOS permissions needed

## Common prompts

| You say...                                      | What happens                          |
| ----------------------------------------------- | ------------------------------------- |
| “What happened in #engineering today?”          | Scans and summarizes channel activity |
| “Summarize that thread about the API migration” | Thread-level summary with attribution |
| “React with 👍 to Alice's message”              | Adds emoji reaction                   |
| “What are the most active channels this week?”  | Channel activity digest               |
| “Set up channel permissions for #general”       | Configures tool access per channel    |

## Configuration

- Per-channel permission profiles let you control which tools are available in which Slack channels
- Socket Mode means no public webhook URL needed

## Tips & gotchas

- **Privacy guardrails.** The assistant won't share Slack context outside Slack without explicit instruction.
- **Thread attribution.** Thread summaries include attribution so you know who said what.
- **Channel permission profiles.** Use them to restrict sensitive tools in public channels.
