# Start the Day

## What it does

Gives you a personalized daily briefing with weather, calendar, news, tasks, and actionable insights. Your morning rundown without opening six apps.

## Setup required

Works immediately for basic briefings (weather, news). For calendar integration, connect Google Calendar first. For email, set up AgentMail first.

## Permissions

- No macOS permissions needed for basic briefing
- Calendar access needed for schedule summary (if connected)
- Email access needed for inbox summary (if connected)

## Common prompts

| You say...                   | What happens                                          |
| ---------------------------- | ----------------------------------------------------- |
| “Start my day”               | Full morning briefing: weather, calendar, tasks, news |
| “Give me my morning rundown” | Same as above                                         |
| “What should I know today?”  | Highlights the most important items                   |
| “Briefing”                   | Quick version of the daily summary                    |

## What's in a briefing

A typical “start my day” response includes:

1. **Weather** — Current conditions and today's forecast for your location
2. **Calendar** — Today's events, upcoming meetings, any conflicts
3. **Tasks** — Open items in your task queue, overdue tasks, high-priority items
4. **Email** — Unread count, any important messages (if email is set up)
5. **News** — Top headlines relevant to your interests
6. **Insights** — Anything your assistant thinks you should know based on context

## Configuration

- Briefing content adapts based on what services you have connected
- No calendar connected? No calendar section. No email? No email section. It adjusts.
- Your location is used for weather (set in USER.md)
- Briefings get more personalized over time — your assistant learns your interests, schedule patterns, and recurring tasks to weight news and priorities accordingly

## Tips & gotchas

- **It gets better over time.** The more your assistant knows about you (projects, priorities, interests), the more personalized and useful the briefing becomes.
- **Automate it.** Set up a schedule: “Every weekday at 8am, start my day.” Then it happens automatically.
- **Customize verbosity:** “Give me the short version” for bullet points, or “give me everything” for the deep dive.
- **Weekend mode:** Briefings on weekends can be different. “On weekends, skip the work calendar and just give me weather and news.”
