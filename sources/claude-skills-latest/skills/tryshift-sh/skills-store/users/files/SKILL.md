---
name: users
description: |
  List workspace members and retrieve user profiles in Slack through Shift.
metadata:
  author: shift
  version: "1.0"
---

# Slack Users

Use this skill to list workspace members or look up a specific user's profile in Slack.

## When to use

- list members in a Slack workspace
- look up a user's profile, status, or contact info
- resolve a user ID to a display name

## Authentication

This skill uses the connected `slack` provider credential for the current agent.

## Invocation

All actions are called through Shift's Skill Router:

```bash
curl -X POST "$SHIFT_LOCAL_GATEWAY/skill-router/invoke" \
  -H "Content-Type: application/json" \
  -d '{
    "skillProvider": "slack",
    "skill": "users",
    "action": "list",
    "input": {
      "limit": 20
    }
  }'
```

## Examples

List workspace members:

```json
{
  "skillProvider": "slack",
  "skill": "users",
  "action": "list",
  "input": {
    "limit": 20
  }
}
```

Get a user profile:

```json
{
  "skillProvider": "slack",
  "skill": "users",
  "action": "get",
  "input": {
    "user": "U1234567890"
  }
}
```

If the connection is missing, tell the user to configure Slack in Shift.
