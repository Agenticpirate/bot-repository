> ## Documentation Index
> Fetch the complete documentation index at: https://docs.moldable.sh/llms.txt
> Use this file to discover all available pages before exploring further.

# Message flow

> The end-to-end path of a message through the gateway.

A message goes in, gets checked and routed, then a reply comes back and is stored (in memory, and optionally persisted to disk).

This is the end-to-end path for a typical inbound message:

1. A channel adapter receives a message.
2. The gateway checks pairing and allowlist rules.
3. The gateway resolves routing and selects an AI adapter.
4. The gateway loads recent session history for context.
5. The gateway builds the request (history + new user message).
6. The gateway records the user message locally (in memory, and optionally on disk).
7. The AI adapter returns a response.
8. The gateway records the assistant response locally (in memory, and optionally on disk).
9. The gateway sends the response back to the original channel.

If an error occurs while calling the AI adapter, the gateway returns a short apology message and records the error in health metrics.

## Example

Telegram user sends “what’s the weather?”. The gateway:

* checks pairing (e.g. is the user allowed to message the bot?),
* resolves routing and fetches recent history,
* calls your AI adapter (e.g. an AI-sdk backend or HTTP adapter),
* replies in Telegram,
* and stores both messages locally (and can persist them to a session transcript if enabled).
