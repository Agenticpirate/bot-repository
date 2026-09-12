---
name: messaging
description: |
  List Slack channels, read messages, send messages, reply in threads, and manage reactions through Shift.
metadata:
  author: shift
  version: "1.0"
---

# Slack Messaging

Use this skill to interact with Slack channels and messages: list channels, read conversation history, send messages, reply in threads, and add or remove reactions.

## When to use

- list channels in a Slack workspace
- read recent messages in a channel
- read thread replies
- send a message to a channel or DM
- reply to a thread
- add or remove emoji reactions

## Authentication

This skill uses the connected `slack` provider credential for the current agent.

## Invocation

All actions are called through Shift's Skill Router:

```bash
curl -X POST "$SHIFT_LOCAL_GATEWAY/skill-router/invoke" \
  -H "Content-Type: application/json" \
  -d '{
    "skillProvider": "slack",
    "skill": "messaging",
    "action": "list-channels",
    "input": {
      "limit": 20
    }
  }'
```

## Examples

List channels:

```json
{
  "skillProvider": "slack",
  "skill": "messaging",
  "action": "list-channels",
  "input": {
    "types": "public_channel,private_channel",
    "limit": 20
  }
}
```

Get channel info:

```json
{
  "skillProvider": "slack",
  "skill": "messaging",
  "action": "get-channel",
  "input": {
    "channel": "C1234567890"
  }
}
```

List messages in a channel:

```json
{
  "skillProvider": "slack",
  "skill": "messaging",
  "action": "list-messages",
  "input": {
    "channel": "C1234567890",
    "limit": 20
  }
}
```

Get thread replies:

```json
{
  "skillProvider": "slack",
  "skill": "messaging",
  "action": "get-thread",
  "input": {
    "channel": "C1234567890",
    "ts": "1234567890.123456"
  }
}
```

Send a message:

```json
{
  "skillProvider": "slack",
  "skill": "messaging",
  "action": "send",
  "input": {
    "channel": "C1234567890",
    "text": "Hello from Shift!"
  }
}
```

Reply in a thread:

```json
{
  "skillProvider": "slack",
  "skill": "messaging",
  "action": "send",
  "input": {
    "channel": "C1234567890",
    "text": "This is a thread reply.",
    "threadTs": "1234567890.123456"
  }
}
```

Add a reaction:

```json
{
  "skillProvider": "slack",
  "skill": "messaging",
  "action": "react",
  "input": {
    "channel": "C1234567890",
    "timestamp": "1234567890.123456",
    "name": "thumbsup"
  }
}
```

Remove a reaction:

```json
{
  "skillProvider": "slack",
  "skill": "messaging",
  "action": "remove-react",
  "input": {
    "channel": "C1234567890",
    "timestamp": "1234567890.123456",
    "name": "thumbsup"
  }
}
```

If the connection is missing, tell the user to configure Slack in Shift.
