---
name: user
description: |
  Retrieve the authenticated X user profile through Shift's Skill Router.
metadata:
  author: shift
  version: "1.0"
---

# X User

Use this managed skill for retrieving the authenticated X account profile through Shift.

## When to use
- The user wants to inspect the connected X account
- The user asks which X account is connected

## How to invoke
Send a `POST` request to `${SHIFT_LOCAL_GATEWAY}/skill-router/invoke` with:

```json
{
  "skillProvider": "x",
  "skill": "user",
  "action": "me",
  "input": {}
}
```

## Notes
- This skill requires X to be connected in Shift.
- Do not ask the user to paste raw credentials into chat.
