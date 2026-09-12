> ## Documentation Index
> Fetch the complete documentation index at: https://docs.moldable.sh/llms.txt
> Use this file to discover all available pages before exploring further.

# AI adapters

> Configure your AI backend.

AI adapters connect the gateway to whichever model backend you use.

## Example

Example: point the HTTP adapter at your own local model server.

AI adapters connect the gateway to whichever model backend you use. The gateway ships with:

* [ai-server](/ai/ai-server)

## Selecting an adapter

Set the default in `ai.default_adapter` and ensure that adapter is listed in `ai.adapters`.

Routing rules can further customize which backend is used for specific chats.
