> ## Documentation Index
> Fetch the complete documentation index at: https://docs.moldable.sh/llms.txt
> Use this file to discover all available pages before exploring further.

# Gateway architecture

> The three areas of the gateway and how they fit together.

Moldable Gateway is split into three core areas:

1. Channels

* Receives inbound messages from Telegram or WhatsApp Cloud.
* Sends outbound responses back to those channels.

2. AI

* Prepares a request using recent session history.
* Sends the request to your configured AI backend.

3. Control plane

* Used by the CLI for health, status, pairing, and config operations.

## Example

When you run `moldable gateway status`, the CLI talks to the running gateway to fetch a status snapshot while messages from Telegram still flow through the channel adapters.

## Key components

* **Gateway runtime**: Orchestrates channels, pairing, routing, sessions, and AI.
* **Channel adapters**: Isolate channel-specific protocols.
* **AI backends**: The configured system the gateway calls to generate responses.
* **Session store**: Stores conversation history for context (in memory, and optionally persisted to disk).

## Data ownership

All credentials, pairing data, and sessions live on the gateway host. The gateway does not upload this data anywhere unless you configure an external AI adapter.
