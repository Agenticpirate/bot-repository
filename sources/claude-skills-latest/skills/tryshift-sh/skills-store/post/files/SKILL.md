---
name: post
description: |
  Post, reply, quote, and delete posts on X through Shift's Skill Router.
metadata:
  author: shift
  version: "1.0"
---

# X Post

Use this managed skill when the user wants to post on X, reply to a post, quote a post, or delete a post.

This skill uses Shift's local Skill Router. Do not ask the user to paste credentials into chat.

## Invocation

Base URL:

`SHIFT_LOCAL_GATEWAY`

Endpoint:

`POST /skill-router/invoke`

Request body for a new tweet:

```json
{
  "skillProvider": "x",
  "skill": "post",
  "action": "create",
  "input": {
    "text": "Hello from Shift"
  }
}
```

Request body for a reply:

```json
{
  "skillProvider": "x",
  "skill": "post",
  "action": "reply",
  "input": {
    "text": "Reply text",
    "tweetId": "1234567890"
  }
}
```

Request body for a quote tweet:

```json
{
  "skillProvider": "x",
  "skill": "post",
  "action": "quote",
  "input": {
    "text": "Quoted text",
    "tweetId": "1234567890"
  }
}
```

Request body to delete a tweet:

```json
{
  "skillProvider": "x",
  "skill": "post",
  "action": "delete",
  "input": {
    "tweetId": "1234567890"
  }
}
```

If the connection is missing, tell the user to configure X in Shift.
