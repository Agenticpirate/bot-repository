# Snippet

> This component API and its examples come from the [official AI Elements docs/skill](https://github.com/vercel/ai-elements). In Customware apps, use the installation command below, React Router for the frontend, and the Customware Hono gateway backend. Ignore copied Next.js route or direct-provider backend examples.

## Installation

```bash
pnpm exec node <customware-ai-skill>/scripts/install-ai-elements.mjs snippet --cwd .
```

Underlying non-interactive shadcn command used by the installer:

```bash
pnpm dlx shadcn@latest add @ai-elements/snippet --yes --path .tmp/customware-ai-elements-install
```

Lightweight inline code display for terminal commands and short code references.

The `Snippet` component provides a lightweight way to display terminal commands and short code snippets with copy functionality. Built on top of InputGroup, it's designed for brief code references in text.

See [`snippet.tsx`](examples/snippet.tsx) for this official example.

## Features

- Composable architecture with InputGroup
- Optional prefix text (e.g., `$` for terminal commands)
- Built-in copy button
- Compact design for chat/markdown

## Examples

### Without Prefix

See [`snippet-plain.tsx`](examples/snippet-plain.tsx) for this official example.

## Props

### `<Snippet />`

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `code` | `string` | Required | The code content to display. |
| `children` | `React.ReactNode` | - | Child elements like SnippetAddon, SnippetInput, etc. |
| `...props` | `React.ComponentProps<typeof InputGroup>` | - | Spread to the InputGroup component. |

### `<SnippetAddon />`

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `...props` | `React.ComponentProps<typeof InputGroupAddon>` | - | Spread to the InputGroupAddon component. |

### `<SnippetText />`

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `...props` | `React.ComponentProps<typeof InputGroupText>` | - | Spread to the InputGroupText component. |

### `<SnippetInput />`

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `...props` | `Omit<React.ComponentProps<typeof InputGroupInput>, ` | - | Spread to the InputGroupInput component. Value and readOnly are set automatically. |

### `<SnippetCopyButton />`

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `onCopy` | `() => void` | - | Callback fired after a successful copy. |
| `onError` | `(error: Error) => void` | - | Callback fired if copying fails. |
| `timeout` | `number` | `2000` | How long to show the copied state (ms). |
| `children` | `React.ReactNode` | - | Custom button content. |
| `...props` | `React.ComponentProps<typeof InputGroupButton>` | - | Spread to the InputGroupButton component. |
