---
name: retweet
description: |
  Repost and undo reposts on X through Shift's Skill Router.
metadata:
  author: shift
  version: "1.0"
---

# X Repost

Use this managed skill for reposting and undoing reposts on X through Shift.

## When to use
- The user wants to repost a post
- The user wants to undo a repost

## How to invoke
Send a `POST` request to `${SHIFT_LOCAL_GATEWAY}/skill-router/invoke` with:

```json
{
  "skillProvider": "x",
  "skill": "retweet",
  "action": "create",
  "input": {
    "userId": "123",
    "tweetId": "456"
  }
}
```

To undo a repost, use:

```json
{
  "skillProvider": "x",
  "skill": "retweet",
  "action": "delete",
  "input": {
    "userId": "123",
    "tweetId": "456"
  }
}
```

## Notes
- This skill requires X to be connected in Shift.
- Do not ask the user to paste raw credentials into chat.
