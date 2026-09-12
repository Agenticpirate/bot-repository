> ## Documentation Index
> Fetch the complete documentation index at: https://docs.moldable.sh/llms.txt
> Use this file to discover all available pages before exploring further.

# Getting started

> Install the CLI, onboard, run, and pair your first user.

This is a quick path to a safe, local setup for your first bot.

This guide walks you through a local setup on a single machine (your "gateway host").

**Required reading:** [Security and pairing](/core/security-and-pairing) (safe defaults, recommended setups, and risks).

## Prerequisites

* The `moldable` CLI installed and available in your `PATH`
* Network access for your chosen channel and AI backend

## 1) Install the CLI

See [Install](/install), then verify:

```bash theme={null}
moldable --version
```

## 2) Run onboarding (guided)

```bash theme={null}
moldable onboard
```

Pick a recommended setup (e.g. “Just me”, “Local network”, “Telegram”, “Webhooks (e.g. WhatsApp Cloud)”), and we’ll configure safe defaults for you.\
Choose **Manual (advanced)** only if you know exactly what you’re doing.

**Safe defaults you get automatically:** local‑only access, public access off, auth required, and pairing enabled.

If you choose **Webhooks**, you’ll need a tunnel so the webhook endpoint is reachable without exposing the gateway. See [Security and pairing](/core/security-and-pairing).

## 3) Start the gateway

```bash theme={null}
moldable gateway run
```

If the startup security summary reports critical findings, the gateway will refuse to start. Fix the issues or run with `--force` if you intentionally accept the risk.

## 4) Pair a user (DMs)

When a new user sends a DM, the gateway creates a pairing request. Approve it from the CLI:

```bash theme={null}
moldable gateway pair list
moldable gateway pair approve telegram <code>
```

## 5) Check status

```bash theme={null}
moldable gateway health
moldable gateway status
```

Optional: run `moldable gateway audit` for a quick checklist-style safety scan.

## Where files live

* Config: `~/.moldable/gateway/config.json5` (JSON5 or JSON)
* State: `~/.moldable/gateway/` (local gateway data)

You can override the config path with `--config` on any CLI command.

Next: [Configuration](/core/configuration)
