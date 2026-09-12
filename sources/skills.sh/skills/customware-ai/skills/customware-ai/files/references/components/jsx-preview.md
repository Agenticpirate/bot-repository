# JSX Preview

> This component API and its examples come from the [official AI Elements docs/skill](https://github.com/vercel/ai-elements). In Customware apps, use the installation command below, React Router for the frontend, and the Customware Hono gateway backend. Ignore copied Next.js route or direct-provider backend examples.

## Installation

```bash
pnpm exec node <customware-ai-skill>/scripts/install-ai-elements.mjs jsx-preview --cwd .
```

Underlying non-interactive shadcn command used by the installer:

```bash
pnpm dlx shadcn@latest add @ai-elements/jsx-preview --yes --path .tmp/customware-ai-elements-install
```

A component that dynamically renders JSX strings with streaming support for AI-generated UI.

The `JSXPreview` component renders JSX strings dynamically, supporting streaming scenarios where JSX may be incomplete. It automatically closes unclosed tags during streaming, making it ideal for displaying AI-generated UI components in real-time.

See [`jsx-preview.tsx`](examples/jsx-preview.tsx) for this official example.

## Features

- Renders JSX strings dynamically using `react-jsx-parser`
- Streaming support with automatic tag completion
- Custom component injection for rendering your own components
- Error handling with customizable error display
- Context-based architecture for flexible composition

## Usage with AI SDK

The JSXPreview component integrates with the AI SDK to render generated UI in real-time:

```tsx title="components/generated-ui.tsx"
"use client";

import {
  JSXPreview,
  JSXPreviewContent,
  JSXPreviewError,
} from "~/components/ai-elements/jsx-preview";

type GeneratedUIProps = {
  jsx: string;
  isStreaming: boolean;
};

export const GeneratedUI = ({ jsx, isStreaming }: GeneratedUIProps) => (
  <JSXPreview
    jsx={jsx}
    isStreaming={isStreaming}
    onError={(error) => console.error("JSX Parse Error:", error)}
  >
    <JSXPreviewContent />
    <JSXPreviewError />
  </JSXPreview>
);
```

### With Custom Components

You can inject custom components to be used within the rendered JSX:

```tsx title="components/generated-ui-with-components.tsx"
"use client";

import {
  JSXPreview,
  JSXPreviewContent,
} from "~/components/ai-elements/jsx-preview";
import { Button } from "~/components/ui/button";
import { Card } from "~/components/ui/card";

const customComponents = {
  Button,
  Card,
};

export const GeneratedUIWithComponents = ({ jsx }: { jsx: string }) => (
  <JSXPreview jsx={jsx} components={customComponents}>
    <JSXPreviewContent />
  </JSXPreview>
);
```

## Props

### `<JSXPreview />`

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `jsx` | `string` | Required | The JSX string to render. |
| `isStreaming` | `boolean` | `false` | When true, automatically completes unclosed tags. |
| `components` | `Record<string, React.ComponentType>` | - | Custom components available within the rendered JSX. |
| `bindings` | `Record<string, unknown>` | - | Variables and functions available within the JSX scope. |
| `onError` | `(error: Error) => void` | - | Callback fired when a parsing or rendering error occurs. |
| `...props` | `React.ComponentProps<` | - | Any other props are spread to the underlying div element. |

### `<JSXPreviewContent />`

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `renderError` | `JsxParserProps[` | - | Custom error renderer passed to react-jsx-parser. |
| `...props` | `React.ComponentProps<` | - | Any other props are spread to the underlying div element. |

### `<JSXPreviewError />`

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `children` | `ReactNode | ((error: Error) => ReactNode)` | - | Custom error content or render function receiving the error. |
| `...props` | `React.ComponentProps<` | - | Any other props are spread to the underlying div element. |
