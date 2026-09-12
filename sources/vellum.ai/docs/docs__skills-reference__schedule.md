# Schedule

## What it does

Sets up recurring and one-shot scheduled actions using cron syntax, RRULE patterns, or simple timestamps. Your assistant can do things on a schedule without you asking, including recurring monitoring of a page, dashboard, or status check.

## Setup required

None. Works immediately.

## Permissions

- No special permissions needed

## Common prompts

| You say...                                                | What happens                                                                 |
| --------------------------------------------------------- | ---------------------------------------------------------------------------- |
| “Remind me to check my email every morning at 9am”        | Creates a recurring schedule                                                 |
| “Set a reminder for March 15th at 2pm”                    | One-time scheduled notification                                              |
| “Every Friday at 5pm, summarize my week”                  | Recurring task with execution                                                |
| “Watch this status page and alert me if a branch is late” | Creates a recurring schedule that checks the page and notifies on exceptions |
| “Show me my active schedules”                             | Lists all scheduled items                                                    |
| “Cancel the morning email reminder”                       | Deletes a schedule                                                           |

## Configuration

- Supports cron syntax for recurring schedules
- RRULE (RFC 5545) for complex recurrence patterns
- ISO 8601 timestamps for one-time events
- Four modes: “execute” (run a task), “notify” (send a notification), “script” (run a shell command), or “workflow” (run a saved workflow)
- Timezone-aware
- Notify mode can prefer the Vellum app used to create the schedule on macOS, Windows, or iOS when no source channel is available
- Each schedule is pinned to a model profile when it is created, so changing your default model later does not change what your existing schedules cost

## Tips & gotchas

- **Recurring monitoring.** Ask the assistant to watch a page or dashboard. It creates a schedule you can pause and edit, not a script to run yourself.
- **Persistent across conversations.** Schedules persist across conversations — set it once and it runs until you cancel it.
- **Simple reminders.** For simple reminders, just say “remind me.”
- **Complex patterns.** For complex patterns (“every other Tuesday”), the RRULE support handles it.
- **Same permission rules.** Scheduled actions run with the same permission rules as interactive actions — your assistant won't do anything it couldn't do in a normal conversation.
- **Results reach you.** A schedule that produces output — a digest, a report, a check whose answer is “nothing changed” — delivers it the way you asked: a notification, an email, a Slack post. If a run finishes with output and delivered it nowhere, the assistant sends you its final reply as a notification, so a scheduled run never finishes silently in a conversation you don't have open.
- **In-app links in Vellum chat.** In Vellum chat, schedule and conversation names the assistant mentions are links to their details. Those links work in the Vellum app only, not in Slack, Telegram, Discord, email, or notifications.
