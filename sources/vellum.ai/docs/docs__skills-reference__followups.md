# Followups

## What it does

Tracks messages you've sent that are awaiting responses across all communication channels. Knows when you're waiting on someone and can nudge them.

## Setup required

None. Works with any connected messaging channel.

## Permissions

- Requires connected messaging channels (Gmail, Slack, etc.) for tracking

## Common prompts

| You say...                                              | What happens                |
| ------------------------------------------------------- | --------------------------- |
| “Track my email to Alice — I need a response by Friday” | Creates a follow-up tracker |
| “What messages am I still waiting on?”                  | Lists pending follow-ups    |
| “Mark Alice's response as received”                     | Resolves a follow-up        |
| “Nudge Jake about the proposal I sent last week”        | Sends a follow-up message   |

## Configuration

- Lifecycle states: pending, overdue, nudged, resolved
- Set expected response deadlines
- Automatic tracking of response status

## Tips & gotchas

- **Cross-channel tracking.** Works across channels — track an email, a Slack DM, or a phone call.
- **Automatic nudges.** The assistant can schedule automatic nudges if someone hasn't responded by the deadline.
- **Grace periods.** Contact-based grace periods prevent over-nudging.
- **Auto-resolve.** Follow-ups resolve automatically when the person replies.
