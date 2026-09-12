# Generative UI

Reviewed against the official AI SDK docs on 2026-07-15:

- [AI SDK UI: Generative User Interfaces](https://ai-sdk.dev/docs/ai-sdk-ui/generative-user-interfaces)
- [AI SDK UI: Streaming Custom Data](https://ai-sdk.dev/docs/ai-sdk-ui/streaming-data)
- [AI SDK UI: UIMessage](https://ai-sdk.dev/docs/reference/ai-sdk-ui/ui-message)

In Customware apps, generative UI means a normal React Router client chat that renders typed message parts into real React components. Do not use a separate browser-to-provider path. Do not switch to RSC or Next.js route handlers.

## Pattern 1: Tool Result -> React Component

This is the default pattern for app-facing generative UI in the template.

- the model decides to call a server tool
- the tool returns typed data
- the client renders the `tool-*` part with a custom React component
- the assistant can still add normal text before or after the component

Example:

```tsx
if (part.type === "tool-show_weather_card" && part.state === "output-available") {
  return <WeatherCard data={part.output} />;
}
```

This is the right pattern for cards, previews, summaries, product selectors, search results, and other end-user UI blocks that come from server-owned data.

For a copy-ready example, use `assets/generative-ui-chat/`.

## Pattern 2: Typed `data-*` Parts

Use typed data parts when the server needs to stream extra UI state that is not naturally a tool result, such as progress rows, transient notifications, staged loading, or custom status blocks.

Shared message type:

```ts
import type { UIMessage } from "ai";

export type SupportMessage = UIMessage<
  never,
  {
    "status-update": {
      label: string;
      detail: string;
    };
  }
>;
```

Server-side streaming shape:

```ts
import { createUIMessageStream, createUIMessageStreamResponse } from "ai";

return createUIMessageStreamResponse({
  stream: createUIMessageStream({
    async execute({ writer }) {
      writer.write({
        type: "data-status-update",
        id: "loading",
        data: {
          label: "Searching",
          detail: "Looking up matching records",
        },
      });

      writer.write({
        type: "data-status-update",
        id: "done",
        data: {
          label: "Complete",
          detail: "Loaded the final result",
        },
      });
    },
  }),
});
```

Client-side rendering shape:

```tsx
if (part.type === "data-status-update") {
  return <StatusCard key={part.id} status={part.data} />;
}
```

Use `data-*` parts when the server is streaming UI state directly. Use tool parts when the model is choosing a tool and you want the tool result to become UI.

## Customware Rules

- Keep the gateway provider and all AI SDK server calls on the Hono server.
- Keep shared `UIMessage` data contracts in a neutral shared module, not under `server/`.
- Use AI Elements for chat chrome such as conversation, message, prompt input, tool state, sources, and reasoning.
- Use normal app React components for the generated card or panel itself.
- If package usage is unclear, inspect the installed `ai` package types and source in the target project's `node_modules/`.

## Recommended Choice

Prefer this order:

1. Tool part rendered with a custom React component.
2. `data-*` parts when the server itself needs to stream extra UI state.
3. Avoid heavier or framework-specific UI generation paths unless the app genuinely requires them.
