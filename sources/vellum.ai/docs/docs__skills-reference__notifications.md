# Notifications

## What it does

Sends notifications through a unified routing system across your connected channels. One notification, delivered to the right place.

## Setup required

None. Uses whatever channels you have connected.

## Permissions

- Requires at least one connected channel for delivery

## Common prompts

| You say...                                      | What happens                           |
| ----------------------------------------------- | -------------------------------------- |
| “Notify me when the deployment finishes”        | Sets up a triggered notification       |
| “Send me a notification on Telegram about this” | Routes to a specific channel           |
| “Alert me if anything urgent comes up”          | Configures priority-based notification |

## Configuration

- Urgency levels: low, medium, high
- Deduplication prevents repeated notifications
- Channel routing hints let you prefer specific delivery channels

## Tips & gotchas

- **Outbound counterpart to channels.** Notifications use your connected channels (Telegram, Slack, desktop) to reach you.
- **Smart routing.** The system picks the best channel based on your preferences and what's available.
- **Automatic deduplication.** Notifications deduplicate automatically so you won't get spammed.
