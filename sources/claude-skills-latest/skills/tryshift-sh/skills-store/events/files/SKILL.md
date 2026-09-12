---
name: events
description: |
  Read upcoming events, create calendar events, and reschedule existing events in Google Calendar through Shift's Skill Router.
metadata:
  author: shift
  version: "1.0"
---

# Google Calendar Events

Use this managed skill when the user wants to inspect an agenda, create a calendar event, or move an existing event in Google Calendar.

This skill uses Shift's local Skill Router. Do not ask the user to paste Google credentials into chat.

It also ships a precompiled local helper that can summarize an agenda window by calling the same authenticated provider action through `SHIFT_LOCAL_GATEWAY`.

## Invocation

Base URL:

`SHIFT_LOCAL_GATEWAY`

Endpoint:

`POST /skill-router/invoke`

Request body to fetch an agenda window:

```json
{
  "skillProvider": "google-calendar",
  "skill": "events",
  "action": "agenda",
  "input": {
    "timeMin": "2026-03-13T00:00:00Z",
    "timeMax": "2026-03-20T00:00:00Z",
    "maxResults": 10
  }
}
```

Request body to create an event:

```json
{
  "skillProvider": "google-calendar",
  "skill": "events",
  "action": "create",
  "input": {
    "summary": "Product sync",
    "description": "Review launch checklist",
    "startDateTime": "2026-03-13T09:00:00+08:00",
    "endDateTime": "2026-03-13T09:30:00+08:00",
    "timeZone": "Asia/Shanghai",
    "attendees": ["teammate@example.com"]
  }
}
```

Request body to reschedule an event:

```json
{
  "skillProvider": "google-calendar",
  "skill": "events",
  "action": "reschedule",
  "input": {
    "eventId": "abc123def456",
    "startDateTime": "2026-03-13T11:00:00+08:00",
    "endDateTime": "2026-03-13T11:30:00+08:00",
    "timeZone": "Asia/Shanghai"
  }
}
```

Precompiled code-skill helper:

```bash
node dist/index.js '{
  "timeMin": "2026-03-13T00:00:00Z",
  "timeMax": "2026-03-14T00:00:00Z",
  "maxResults": 10,
  "timeZone": "Asia/Shanghai"
}'
```

Example response shape:

```json
{
  "count": 2,
  "summary": "1. Product sync (2026-03-13T09:00:00+08:00 - 2026-03-13T09:30:00+08:00)\n2. Design review (2026-03-13T13:00:00+08:00 - 2026-03-13T14:00:00+08:00)",
  "items": []
}
```

## Authentication

This skill requires a Google Calendar connection configured in Shift.

## Agent behavior

1. Ask for a clear time window before using `agenda`.
2. Use ISO 8601 date-time strings for create and reschedule actions.
3. Assume the primary calendar unless the product later adds explicit calendar selection.
4. Use `node dist/index.js '<json payload>'` only for the summary helper; authenticated provider access still goes through `SHIFT_LOCAL_GATEWAY`.
