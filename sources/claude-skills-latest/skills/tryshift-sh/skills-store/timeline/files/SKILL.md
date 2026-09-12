---
name: timeline
description: |
  Read home timeline, mentions, and user posts on X through Shift's Skill Router.
metadata:
  author: shift
  version: "1.0"
---

# X Timeline

Use this managed skill for reading X timelines and mentions through Shift.

## When to use
- The user wants to read their home timeline
- The user wants to read a user's tweets
- The user wants to read mentions

## How to invoke
Send a `POST` request to `${SHIFT_LOCAL_GATEWAY}/skill-router/invoke`.

Home timeline:

```json
{
  "skillProvider": "x",
  "skill": "timeline",
  "action": "home",
  "input": {
    "userId": "123"
  }
}
```

User tweets:

```json
{
  "skillProvider": "x",
  "skill": "timeline",
  "action": "user-tweets",
  "input": {
    "userId": "123"
  }
}
```

Mentions:

```json
{
  "skillProvider": "x",
  "skill": "timeline",
  "action": "mentions",
  "input": {
    "userId": "123"
  }
}
```

## Notes
- This skill requires X to be connected in Shift.
- Do not ask the user to paste raw credentials into chat.
