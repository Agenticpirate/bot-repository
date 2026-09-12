# Playbooks

## What it does

Trigger-action automation rules for handling incoming messages. Define patterns, and your assistant automatically responds or takes action when messages match.

## Setup required

None. Works with any connected messaging channel.

## Permissions

- Inherits permissions from the actions defined in each playbook

## Common prompts

| You say...                                                                               | What happens               |
| ---------------------------------------------------------------------------------------- | -------------------------- |
| “Create a playbook: when someone emails about pricing, draft a reply with our rate card” | Trigger-action rule        |
| “Set up a rule: if I get a Slack DM with 'urgent', notify me on Telegram”                | Cross-channel automation   |
| “Show me my active playbooks”                                                            | Lists all automation rules |
| “Disable the pricing email playbook”                                                     | Pauses a rule              |

## Configuration

- Trigger patterns (message content matching)
- Action types: auto-respond, draft, notify
- Per-channel scoping
- Categories and priority ordering

## Tips & gotchas

- **If this, then that.** Think of playbooks as “if this, then that” rules for your assistant. They run automatically on incoming messages — no need to ask each time.
- **Action modes.** Actions can be “auto” (execute immediately), “draft” (prepare for your review), or “notify” (alert you).
- **Priority ordering.** Priority ordering determines which playbook fires first when multiple rules match.
