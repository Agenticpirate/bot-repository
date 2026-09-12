# Watcher

## What it does

Polls external services for changes and notifies you when something happens. Monitors Gmail, Google Calendar, GitHub, Linear, and other services on a schedule.

## Setup required

Requires connected services (OAuth for Gmail, Calendar, etc.).

## Permissions

- Requires OAuth connections to the services being watched

## Common prompts

| You say...                                               | What happens                    |
| -------------------------------------------------------- | ------------------------------- |
| “Watch my Gmail for emails from investors”               | Creates a Gmail watcher         |
| “Monitor this GitHub repo for new PRs”                   | Sets up GitHub monitoring       |
| “Alert me when my next calendar event changes”           | Calendar watcher                |
| “Show me my active watchers”                             | Lists all running watchers      |
| “Give me a digest of everything my watchers found today” | Summarizes all watcher activity |
| “Stop watching my inbox”                                 | Disables a watcher              |

## Configuration

- Configurable poll intervals
- Each watcher runs independently
- Digest summaries aggregate findings
- Watchers can be enabled/disabled without deletion

## Tips & gotchas

- **Not Screen Watch.** Watchers monitor external services (APIs), not your screen.
- **Schedule-based.** Watchers run on a schedule, not continuously.
- **Stay on top of things.** Great for new PRs, important emails, calendar changes, and Linear ticket updates without constantly checking.
- **Digest command.** Gives you a summary of everything watchers found.
