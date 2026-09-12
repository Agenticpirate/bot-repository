> ## Documentation Index
> Fetch the complete documentation index at: https://docs.moldable.sh/llms.txt
> Use this file to discover all available pages before exploring further.

# Configuration

> Configure the gateway, channels, AI adapters, and routing.

One config file controls how the gateway runs, which channels are enabled, and which AI backend is used.

Use the guided onboarding flow to generate a safe starting configuration:

```bash theme={null}
moldable onboard
```

You can also point the CLI at a specific config path:

```bash theme={null}
moldable gateway status --config /path/to/config.json5
```

## Where the config lives

* macOS/Linux default: `~/.moldable/gateway/config.json5`
* Windows default: `%APPDATA%\\Moldable Gateway\\config.json5`

## What you typically configure

* **Gateway auth**: a local token used by the CLI and any enabled HTTP endpoints.
* **Channels**: enable Telegram/WhatsApp and provide credentials.
* **AI backend**: choose which backend the gateway will call for responses.
* **Pairing/allowlists**: control who is allowed to message the gateway.
* **Optional HTTP endpoints**: enable OpenAI-compatible HTTP endpoints if you need them.

## Minimal example

This is enough to run locally with a token, Telegram, and an AI backend:

```json theme={null}
{
  "gateway": {
    "auth": { "mode": "token", "token": "replace-me" }
  },
  "channels": {
    "telegram": {
      "enabled": true,
      "bot_token": "<telegram-bot-token>",
      "require_mention": true
    }
  },
  "ai": {
    "default_adapter": "ai-server",
    "adapters": [
      { "type": "ai-server", "name": "ai-server", "base_url": "http://127.0.0.1:39200" }
    ]
  }
}
```

For secure setup guidance (pairing rules, tunnels, and safe defaults), see [Security and pairing](/core/security-and-pairing).
