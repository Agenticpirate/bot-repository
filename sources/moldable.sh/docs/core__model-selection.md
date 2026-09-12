> ## Documentation Index
> Fetch the complete documentation index at: https://docs.moldable.sh/llms.txt
> Use this file to discover all available pages before exploring further.

# Model selection

> Where models can be configured/overridden and the precedence rules.

Moldable Gateway treats a “model” as an identifier string (for example, the name your backend expects). Different parts of the system can supply a model, so it helps to know what tends to win.

## Common places to set a model

* **Adapter default**: a default model on the configured AI backend adapter.
* **Agent defaults**: an agent may specify a model to use for messages routed to it.
* **Per-request override**: some callers (for example, OpenAI-compatible HTTP clients) can include a model in the request.

## Typical precedence

In general, the gateway prefers the most specific choice available:

1. Per-request override (when provided)
2. Routed agent model (when an agent is selected)
3. Adapter default
4. Global default (if configured)
