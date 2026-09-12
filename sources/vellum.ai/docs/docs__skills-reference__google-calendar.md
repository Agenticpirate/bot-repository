# Google Calendar

## What it does

Connects to your Google Calendar so your assistant can view your schedule, create events, check availability, and help manage your time.

## Setup required

OAuth2 connection to your Google account. Say:

> “Connect my Google Calendar.”

Your assistant opens a Google authorization page. Log in, grant access, done. One-time setup.

## Permissions

- Requires OAuth2 authorization with Google
- Calendar read/write access (scoped to calendar only, not your entire Google account)
- No macOS permissions needed

## Common prompts

| You say...                                               | What happens                                |
| -------------------------------------------------------- | ------------------------------------------- |
| “What's on my calendar today?”                           | Shows today's events in a clean summary     |
| “Am I free Thursday afternoon?”                          | Checks your availability for the time range |
| “Schedule a meeting with the design team Tuesday at 2pm” | Creates a new calendar event                |
| “Move my 3pm to 4pm”                                     | Reschedules an existing event               |
| “What does my week look like?”                           | Overview of the entire week's events        |
| “Find a 30-minute slot for a call this week”             | Searches for open windows in your schedule  |
| “Cancel my Friday standup”                               | Removes an event                            |

## Configuration

- Connected to your default Google Calendar
- Supports multiple calendars — your assistant can view events from any calendar on your account and check availability across all of them

## Tips & gotchas

- **Time zones:** Your assistant uses your local timezone (set in USER.md or inferred from your location). If you're scheduling across timezones, be explicit: “Schedule at 2pm EST.”
- **Recurring events:** Creating and modifying recurring events works, but be specific about what you want changed (“just this one” vs. “all future events”).
- **Multiple calendars:** Your assistant can view events from any calendar on your Google account. Just mention the calendar by name: “What's on my work calendar tomorrow?”
- **Other calendar providers:** Only Google Calendar is supported right now. Outlook, Apple Calendar, and others are on the roadmap.
