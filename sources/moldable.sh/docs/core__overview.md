> ## Documentation Index
> Fetch the complete documentation index at: https://docs.moldable.sh/llms.txt
> Use this file to discover all available pages before exploring further.

# Overview

> What Moldable Gateway is, who it helps, and what it does.

Moldable Gateway is the local gateway/runtime for Moldable. It connects messaging channels (like Telegram and WhatsApp Cloud) to your configured AI backend, and keeps control and state on your machine.

Basically, it's a local router between external chat apps like Telegram and your local AI backend.

## Who this is for

* Operators who want a private gateway that bridges chat apps to AI.
* Teams who need a simple onboarding flow and a single command to run.

## What it does

* Receives messages from supported channels.
* Applies pairing and allowlist rules to protect access.
* Resolves routing and selects an AI backend.
* Uses recent session history as context.
* Sends the request to your configured backend.
* Stores conversation history in memory (and can persist transcripts to disk if enabled).
* Returns the response to the original channel.
* Optionally exposes OpenAI/OpenResponses-compatible HTTP endpoints.

## Example

You DM the Telegram bot with “hello”. The gateway:

1. Checks pairing/allowlist rules.
2. Resolves routing and loads recent history.
3. Sends the message to your configured AI backend.
4. Stores both messages locally (in memory, and optionally on disk).
5. Replies back to Telegram with the AI response.

## What it does not do (yet)

* Web UI or hosted management API.
* Built-in SSH tunneling or remote ops UX.

## Key ideas

* The gateway runs locally and owns the channel credentials.
* The CLI uses a local control API to operate the gateway.
* Gateway auth is required by default, even on loopback.
* Pairing is the default security posture for DMs.
* Security posture and access controls are documented in [Security and pairing](/core/security-and-pairing).
