---
name: telegram-topic-setup
description: Automate Telegram forum topic creation and bind agents to topics in an OpenClaw multi-agent supergroup. Use when setting up or reorganizing team topic channels.
version: "1.0.0"
---

## Install

Copy to `agents/<orchestrator>/skills/telegram-topic-setup/SKILL.md`. Requires a Telegram supergroup with forum mode enabled and bot admin permissions.

# Telegram Topic Setup Skill

## Topic Creation

Use the `topic-create` action to create a new forum topic:

```
action: topic-create
channel: telegram
target: telegram:<chatId>
name: <topic-name>
icon_custom_emoji_id: <emoji-id>
```

Returns a `topicId` on success.

## Initial Message

After creating a topic, send a first message immediately using:

```
threadId: <topicId>
```

Telegram may not display the topic in the list until the first message is posted.

## Icon Selection

Only custom emoji IDs from Telegram's forum topic sticker set are valid as `icon_custom_emoji_id`. There are 38 valid IDs. Common ones:

| Emoji | ID                  |
|-------|---------------------|
| 💻    | 5350554349074391003 |
| 🔥    | 5312241539987020022 |
| 📈    | 5350305691942788490 |
| 💡    | 5312536423851630001 |

If an invalid ID is used, Telegram ignores it and assigns a default icon.

## Recording Topic IDs

Capture every returned `topicId` and record it in `SUPERGROUP-MAP.md` under the corresponding team and agent entry. This mapping drives config generation and agent routing.

## Binding Agents

Wire each topic to an agent in `openclaw.json`:

```json
{
  "topics": {
    "<TOPIC_ID>": {
      "requireMention": true,
      "enabled": true
    }
  }
}
```

Rules:
- Multi-agent topics: all bots must have `requireMention: true`
- Single-agent topics: the sole agent can use `requireMention: false`
- Orchestrator: set `enabled: false` on topics owned by other agents
