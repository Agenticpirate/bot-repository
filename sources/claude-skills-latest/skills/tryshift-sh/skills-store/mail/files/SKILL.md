---
name: mail
description: |
  List Gmail threads, inspect thread details, and send email through Shift.
metadata:
  author: shift
  version: "1.0"
---

# Gmail Mail

Use this skill to list recent Gmail threads, inspect a thread in detail, or send a new email.

## When to use

- review recent inbox threads
- inspect a thread before replying manually
- send a plain text or HTML email

## Authentication

This skill uses the connected `gmail` provider credential for the current agent.

## Invocation

Read actions can be called through Shift's Skill Router:

```bash
curl -X POST "$SHIFT_LOCAL_GATEWAY/skill-router/invoke" \
  -H "Content-Type: application/json" \
  -d '{
    "skillProvider": "gmail",
    "skill": "mail",
    "action": "list-threads",
    "input": {
      "maxResults": 10
    }
  }'
```

For sending email, use the precompiled code skill:

```bash
node dist/index.js '{"operation":"send","to":"user@example.com","subject":"Hello","text":"Hi from Shift."}'
```

## Examples

List threads:

```json
{
  "skillProvider": "gmail",
  "skill": "mail",
  "action": "list-threads",
  "input": {
    "query": "label:inbox newer_than:7d",
    "maxResults": 10
  }
}
```

Get a thread:

```json
{
  "skillProvider": "gmail",
  "skill": "mail",
  "action": "get-thread",
  "input": {
    "threadId": "THREAD_ID"
  }
}
```

Send plain text:

```bash
node dist/index.js '{"operation":"send","to":"user@example.com","subject":"Launch update","text":"The launch is on track."}'
```

Send HTML:

```bash
node dist/index.js '{"operation":"send","to":["user@example.com"],"subject":"Weekly Digest","html":"<h1>Weekly Digest</h1><p>Everything is on track.</p>"}'
```
