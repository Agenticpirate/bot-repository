# Environment Variables

> This component API and its examples come from the [official AI Elements docs/skill](https://github.com/vercel/ai-elements). In Customware apps, use the installation command below, React Router for the frontend, and the Customware Hono gateway backend. Ignore copied Next.js route or direct-provider backend examples.

## Installation

```bash
pnpm exec node <customware-ai-skill>/scripts/install-ai-elements.mjs environment-variables --cwd .
```

Underlying non-interactive shadcn command used by the installer:

```bash
pnpm dlx shadcn@latest add @ai-elements/environment-variables --yes --path .tmp/customware-ai-elements-install
```

Never use this component to display, mask, copy, or otherwise expose `CUSTOMWARE_AI_GATEWAY_KEY`.

Display environment variables with masking and copy functionality.

The `EnvironmentVariables` component displays environment variables with value masking, visibility toggle, and copy functionality.

See [`environment-variables.tsx`](examples/environment-variables.tsx) for this official example.

## Features

- Value masking by default
- Toggle visibility switch
- Copy individual values
- Export format support (`export KEY="value"`)
- Required badge indicator

## Props

### `<EnvironmentVariables />`

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `showValues` | `boolean` | - | Controlled visibility state. |
| `defaultShowValues` | `boolean` | `false` | Default visibility state. |
| `onShowValuesChange` | `(show: boolean) => void` | - | Callback when visibility changes. |
| `...props` | `React.HTMLAttributes<HTMLDivElement>` | - | Spread to the container div. |

### `<EnvironmentVariablesHeader />`

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `...props` | `React.HTMLAttributes<HTMLDivElement>` | - | Spread to the header div. |

### `<EnvironmentVariablesTitle />`

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `children` | `React.ReactNode` | - | Custom title text. |
| `...props` | `React.HTMLAttributes<HTMLHeadingElement>` | - | Spread to the h3 element. |

### `<EnvironmentVariablesToggle />`

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `...props` | `React.ComponentProps<typeof Switch>` | - | Spread to the Switch component. |

### `<EnvironmentVariablesContent />`

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `...props` | `React.HTMLAttributes<HTMLDivElement>` | - | Spread to the content div. |

### `<EnvironmentVariable />`

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `name` | `string` | Required | Variable name. |
| `value` | `string` | Required | Variable value. |
| `...props` | `React.HTMLAttributes<HTMLDivElement>` | - | Spread to the row div. |

### `<EnvironmentVariableGroup />`

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `...props` | `React.HTMLAttributes<HTMLDivElement>` | - | Spread to the group div. |

### `<EnvironmentVariableName />`

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `children` | `React.ReactNode` | - | Custom name content. Defaults to the name from context. |
| `...props` | `React.HTMLAttributes<HTMLSpanElement>` | - | Spread to the span element. |

### `<EnvironmentVariableValue />`

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `children` | `React.ReactNode` | - | Custom value content. Defaults to the masked/unmasked value from context. |
| `...props` | `React.HTMLAttributes<HTMLSpanElement>` | - | Spread to the span element. |

### `<EnvironmentVariableCopyButton />`

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `copyFormat` | `unknown` | - | Format to copy. |
| `onCopy` | `() => void` | - | Callback after successful copy. |
| `onError` | `(error: Error) => void` | - | Callback if copying fails. |
| `timeout` | `number` | `2000` | Duration to show copied state (ms). |
| `...props` | `React.ComponentProps<typeof Button>` | - | Spread to the Button component. |

### `<EnvironmentVariableRequired />`

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `children` | `React.ReactNode` | - | Custom badge text. |
| `...props` | `React.ComponentProps<typeof Badge>` | - | Spread to the Badge component. |
