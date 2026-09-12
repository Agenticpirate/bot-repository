# AI Elements In The React Router SPA

This guidance adapts the relevant parts of the official [`vercel/ai-elements`](https://github.com/vercel/ai-elements) skill for the Customware full-stack template. AI Elements components are installed as React source files, so they do not require Next.js.

## Install Only What The UI Needs

Use pnpm and the shadcn registry only. Do not use npm, npx, yarn, bun, or the interactive AI Elements CLI.

The current registry components require the shadcn primitive versions shipped with them. Overwriting the template's shared primitives breaks existing template component contracts, while keeping the older primitives breaks AI Elements. Use the bundled installer to isolate the registry-matched primitives under `app/components/ai-elements/ui/`.

Install the runtime dependencies before the AI Elements installer or live checks:

```bash
pnpm add ai @ai-sdk/react @openrouter/ai-sdk-provider zod
```

For the minimal chat, then install only the selected components:

```bash
pnpm exec node <customware-ai-skill>/scripts/install-ai-elements.mjs conversation message prompt-input --cwd .
```

Resolve `<customware-ai-skill>` to this skill's real directory. The installer runs one pnpm/shadcn invocation with `--yes`, stages files under `.tmp/`, places selected AI Elements under `app/components/ai-elements/`, places their matching primitives under `app/components/ai-elements/ui/`, rewrites only their internal primitive imports, and removes the staging directory. Do not run the installer first and discover missing AI SDK/provider packages during the smoke test.

Do not bypass the installer with `--overwrite` against `app/components/ui/`. That changes shared template primitive APIs and can break unrelated existing UI.

For every available component and its exact pnpm/shadcn command, use [ai-elements-catalog.md](ai-elements-catalog.md). After choosing components, read only their linked files under `components/`; do not load all component references.

The template already has shadcn configuration with `rsc: false`, Tailwind, and `~/components` aliases. Keep AI Elements under `app/components/ai-elements/` and imports under `~/components/ai-elements/...`.

Do not:

- create a Next.js app or `app/api/.../route.ts` files
- treat a generated `"use client"` directive as a Next.js dependency; it is harmless in this React Router SPA
- replace the Hono server with React Router server actions
- install every AI Elements component by default
- edit generated components unless the product needs a real customization

## Basic Streaming Chat

Use `assets/ai-chat/` for the copy-ready frontend and Hono route. It connects browser `useChat` through `DefaultChatTransport({ api: "/api/chat" })`; the browser never receives the gateway key or URL.

`assets/ai-chat/` is the text-only baseline. If the feature uses server tools, visible tool state, or end-user card UI from tool results, read [tool-usage.md](tool-usage.md) and [generative-ui.md](generative-ui.md), then start from `assets/sql-tool-chat/` or `assets/generative-ui-chat/`.

For the component APIs, read only:

- [components/conversation.md](components/conversation.md)
- [components/message.md](components/message.md)
- [components/prompt-input.md](components/prompt-input.md)
- [components/tool.md](components/tool.md) when the chat exposes tool state or tool details

Give the chat region a concrete height. In flex/grid layouts, include `min-h-0` so the conversation owns internal scrolling.

## Chat UI Quality Baseline

Do not ship the raw `Conversation` + `PromptInput` stack as an unstyled box. Compose a complete chat surface with Tailwind around the AI Elements primitives:

- Use a bounded panel (`min-h-0`, explicit/minimum height, `overflow-hidden`, rounded border) that fits the app's layout. A side pane must use `min-w-0` and should normally fill its available height rather than use a fixed 600px height.
- Add a compact header with an assistant identity, one-line scope description, and a quiet availability/status indicator. Keep the header readable in narrow panes.
- Give the scrollable conversation a subtle distinct background and a centered readable content width. Preserve the AI Elements message components for accessible message layout and streaming markdown.
- Make the empty state useful: an icon, a clear capability statement, and one or two optional starter prompts. `ConversationEmptyState` uses `children` as a replacement for its built-in icon/title/description, so render prompt buttons as a sibling below it, not as its children. Starter prompts must be real buttons, keyboard-focusable, and disabled while a request is active.
- Put the composer in its own padded footer with a top border. Use `PromptInputBody`, `PromptInputFooter`, `PromptInputTools`, and `PromptInputSubmit` to create a compact rounded composer, visible focus treatment, placeholder that describes scope, and a short Enter/Shift+Enter hint when space allows.
- Keep the submit/Stop affordance visually obvious. `PromptInputSubmit` must remain enabled while `submitted` or `streaming` so it can stop generation.
- Use app design tokens (`bg-background`, `bg-muted`, `border-border`, `text-muted-foreground`, `bg-primary`) instead of hard-coded product colors. Tool outputs and generated cards can use restrained semantic accents when they improve comprehension.
- Design responsive first: no clipped header text, full-width cards in narrow panes, and controls that retain a comfortable tap target.

The bundled chat assets show this baseline. Use their composition and Tailwind treatment as the starting point, then match the target app's visual language rather than copying an unrelated generic example from an AI Elements component reference.

## Message Parts

AI SDK UI messages are part-based. Render only the parts the feature supports:

- `text` -> `MessageResponse`
- `reasoning` -> one consolidated `Reasoning` block per assistant message
- `tool-*` or dynamic tool parts -> `Tool`, `ToolHeader`, `ToolInput`, and `ToolOutput`
- `data-*` -> custom React components rendered from a typed `UIMessage`; see [generative-ui.md](generative-ui.md)
- `source-url` -> group under `Sources`, `SourcesTrigger`, `SourcesContent`, and `Source`

Reasoning models can emit several reasoning parts. Join them into one block to avoid multiple “Thinking” sections:

```tsx
const reasoning = message.parts
  .filter((part) => part.type === "reasoning")
  .map((part) => part.text)
  .join("\n\n");
```

Set `isStreaming` only for reasoning in the last message while chat status is `streaming`. The Hono response must use `sendReasoning: true` for reasoning parts and `sendSources: true` for source parts.

Render tool state as status/details, not as a second action button. Use the part's state (`input-streaming`, `input-available`, `output-available`, `output-error`, or approval states) and keep tool execution on the server.

## Model Selection

Add a model selector only when the product requires end-user choice. Show friendly labels from [models.md](models.md), send only a catalog key such as `default` or `complex`, and validate that key on the Hono server. Never send provider options, the gateway key, org id, or project id from the selector.

## UI Fit

- Follow the app's existing visual system and layout before customizing AI Elements source.
- Preserve accessible labels, keyboard submission, focus behavior, and streaming status.
- Disable duplicate submission while appropriate, but preserve the AI SDK stop behavior when the product exposes it.
- When using `PromptInputSubmit`, disable it for an empty input only while idle. Keep it enabled during `submitted`/`streaming` so its Stop action can call `stop()`.
- `MessageResponse` imports Streamdown plugins for code, math, Mermaid, and syntax highlighting. If the feature only renders ordinary text, isolate that renderer or use a lighter text path so the initial client chunk does not grow unnecessarily.
- Lazy-load the chat pane or other client AI Elements with `React.lazy`/dynamic import at the route boundary. Keep server-only AI SDK calls (`streamText`, `generateText`, tools) and the gateway provider on the server. `DefaultChatTransport` is the supported client transport for `useChat`; do not import the gateway provider or server-only calls into client code.
- Keep browser code unaware of the Customware gateway URL and secret.

## Version-aware component usage

If a component prop or behavior is unclear, inspect the installed AI Elements source under `node_modules/`:

- `.d.ts` files show the supported props and types.
- `.js`/`.mjs` files show the actual defaults and event behavior.

Use the installed version's implementation rather than guessing from an older example. In particular, inspect `PromptInputSubmit` before wiring `status`, `onStop`, and `disabled`.
