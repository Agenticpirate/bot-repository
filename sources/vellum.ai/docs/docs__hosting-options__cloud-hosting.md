# Cloud hosting

Vellum Cloud is the hosted, always-on home for your assistant. You sign in, your assistant runs in its own sandboxed environment on Vellum's infrastructure, and you reach it from web, desktop, voice, and chat channels. No servers to manage, no ports to open, no laptop you have to keep awake.

It's the option we recommend for most users, and it's the one we use to run our own assistants.

## Overview

- **Always on.** Your assistant runs 24/7. Schedules fire on time, channels stay connected, and conversations survive your laptop being closed.
- **Sandboxed per account.** Each assistant runs in its own isolated container with its own private storage. It cannot read other users' data or infrastructure.
- **Managed model access.** Vellum-managed API keys for the default model (Anthropic Claude) are included, so you don't have to bring your own to get started.
- **Reachable everywhere.** Web, desktop app, voice, phone, Telegram, Slack, email. All authenticated to the same underlying assistant.
- **Same workspace, same memory.** The IDENTITY, SOUL, USER, NOW files, the PKB, conversations, memories, skills, all live in your assistant's cloud workspace and are accessible from any surface you sign in on.

## What's included

A Vellum Cloud assistant ships with the full feature surface out of the box:

- The default Anthropic Claude model on Vellum's credentials. You can [bring your own](/docs/key-concepts/the-workspace) for OpenAI, Gemini, OpenRouter, Fireworks, or a local Ollama instance.
- The full [channel](/docs/key-concepts/channels) system: web, desktop, voice (phone), Telegram, Slack, and the optional assistant-owned email address.
- Long-running infrastructure for [schedules, watchers, heartbeats, and subagents](/docs/key-concepts/scheduling). Schedules fire on time even when your devices are off.
- An isolated [Credential Execution Service](/docs/trust-security/privacy-and-data) container so OAuth tokens and API keys are never exposed to the assistant or the AI model.
- The [long-term memory store](/docs/key-concepts/memory-and-context), skills, and PKB, all persisted in your private workspace.

## How it works

When you create an assistant on Vellum Cloud, three things happen:

1. **An assistant container is provisioned.** Your assistant runs in its own sandboxed environment with its own file system, process tree, and network egress. It cannot reach other accounts.
2. **A gateway is wired up.** The gateway is the guard rail in front of the assistant. It enforces permissions, routes inbound channel messages, mediates guardian approvals, and is the only path through which the outside world can talk to your assistant.
3. **A separate Credential Execution Service container spins up.** CES holds your secrets in private storage that the assistant container literally cannot read. The assistant only ever sees credentials by alias, never their raw values.

Same architectural shape as the local install, with Vellum running the boxes.

## Privacy and data

Your data lives in your private, encrypted Vellum Cloud account. Workspace files, conversations, memories, skills, credentials, and trust rules are scoped to your account and isolated from every other user.

- Vellum staff access to your account is restricted to operational purposes (incident response, abuse prevention) and is logged.
- Outbound traffic to AI model providers, channel platforms (Telegram, Slack, etc.), and the services your assistant calls follows the published terms of those providers. Your inputs are not used to train their models under their commercial APIs.
- The Share Feedback button is the only path that explicitly sends conversation logs to Vellum, and only when you click it.

For the full breakdown, see [Privacy and data](/docs/trust-security/privacy-and-data). If keeping your data off third-party infrastructure is a hard requirement, look at [local hosting](/docs/hosting-options/local-hosting) instead.

## Reaching your machine

A common question: if my assistant is running in the cloud, can it still touch my Mac? Yes, but only when you're connected and only with explicit permission.

The distinction is between tools that run on the assistant's computer (the cloud container) versus tools that run on yours (your Mac or Windows PC, through the desktop app):

- `bash` runs commands inside the assistant's cloud container.
- `host_bash`, `host_file_*`, computer use, and screen watch run on *your* machine, tunneled through the desktop app.

If your laptop is closed, your assistant can still do its own work (run schedules, process channel messages, research, write to its workspace), but the host\_\* and computer-use tools wait until you're back at your desktop. The assistant always knows which surface it's reachable on and adjusts what it offers to do accordingly.

## Connecting to your assistant

Surface and hosting are independent axes. With Cloud, you have two first-class surfaces to talk to your assistant:

- **Web app.** Sign in at [vellum.ai](https://vellum.ai) from any browser. Full chat, voice, approvals, and workspace browsing. No install required.
- **Desktop app.** Install the Vellum desktop app on your Mac, sign in to the same account, and you get the same assistant plus the host\_\* and computer-use tools that need direct access to your machine.

Both surfaces talk to the same underlying cloud assistant, with the same memory and the same workspace. You can switch between them mid-thought.

## When Cloud is the right choice

Cloud hosting is the right call if:

- You want your assistant available 24/7, not just when your laptop is open.
- You want to use voice, phone, Telegram, Slack, or email channels reliably.
- You want Vellum to handle infrastructure, uptime, and updates.
- You want to reach your assistant from multiple devices.
- You don't have a strict requirement to keep all data on hardware you control.

Look at [local hosting](/docs/hosting-options/local-hosting) instead if you need maximum data control or fully offline operation, or at [GCP](/docs/hosting-options/gcp) if you want 24/7 availability on your own infrastructure.

## Getting started

1. Sign in at [vellum.ai](https://vellum.ai). Your cloud assistant is provisioned automatically.
2. Walk through onboarding to name your assistant and shape its identity, then start chatting from the web.
3. Optional: install the [desktop app](https://www.vellum.ai/downloads) if you want host tools and computer use.
4. Optional: connect [channels](/docs/key-concepts/channels) (phone, Telegram, Slack, email) so your assistant can reach you anywhere.
