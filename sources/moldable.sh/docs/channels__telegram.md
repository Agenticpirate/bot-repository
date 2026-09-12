> ## Documentation Index
> Fetch the complete documentation index at: https://docs.moldable.sh/llms.txt
> Use this file to discover all available pages before exploring further.

# Telegram

> Configure the Telegram channel adapter.

This enables you to use Telegram to securely connect with your local computer via the gateway.

The Telegram adapter uses the Bot API to poll Telegram for new messages so your computer does not need to be publicly accessible (e.g. to listen for incoming messages from Telegram). It supports DMs and groups.

## Requirements

* A Telegram bot token from BotFather.
* The bot must be added to any group you want to handle.

## Get a bot token (BotFather)

1. Open Telegram and start a chat with **@BotFather**.
2. Send `/newbot` and follow the prompts (name + username).
3. Copy the **bot token** it gives you and keep it private.
4. (Optional) If you want the bot to read all group messages, send `/setprivacy` and turn **privacy mode off**.

## Basic configuration

```json theme={null}
{
  "channels": {
    "telegram": {
      "enabled": true,
      "bot_token": "<telegram-bot-token>",
      "allow_from": [],
      "groups": [],
      "require_mention": true
    }
  }
}
```

## Recommended setup (safe defaults)

Telegram uses outbound polling, so you do **not** need a public webhook or tunnel just to receive messages.
We recommend keeping the gateway local-only unless you explicitly need remote access.

```json theme={null}
{
  "gateway": {
    "bind": "loopback",
    "public_access": false,
    "auth": { "mode": "token", "token": "<gateway-token>" }
  },
  "channels": {
    "telegram": {
      "enabled": true,
      "bot_token": "<telegram-bot-token>",
      "require_mention": true
    }
  }
}
```

Need to use the gateway from another device (same Wi-Fi)?\
Set `gateway.bind=lan` and keep `gateway.public_access=false`.

## Security tips

* Keep `gateway.public_access=false` unless you truly need internet exposure.
* Use `pairing.dm_policy=pairing` so unknown senders must be approved.
* If you only want a few people to message the bot, add them to `allow_from`.

## Group mention gating

If `require_mention` is enabled, the adapter only processes messages that mention the bot (or slash commands). This helps avoid noisy group traffic.
If you add the bot to a large group, **anyone in that group can message it**, which may expose it to untrusted prompts. Keep `require_mention=true`, use pairing/allowlists, and avoid adding the bot to public or untrusted groups.

## Pairing and allowlists

Telegram uses the shared pairing and allowlist rules. See [Security and pairing](/core/security-and-pairing).

## Notes

* If you want the bot to read all group messages, disable privacy mode in BotFather.
