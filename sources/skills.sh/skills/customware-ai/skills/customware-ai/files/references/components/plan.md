# Plan

> This component API and its examples come from the [official AI Elements docs/skill](https://github.com/vercel/ai-elements). In Customware apps, use the installation command below, React Router for the frontend, and the Customware Hono gateway backend. Ignore copied Next.js route or direct-provider backend examples.

## Installation

```bash
pnpm exec node <customware-ai-skill>/scripts/install-ai-elements.mjs plan --cwd .
```

Underlying non-interactive shadcn command used by the installer:

```bash
pnpm dlx shadcn@latest add @ai-elements/plan --yes --path .tmp/customware-ai-elements-install
```

A collapsible plan component for displaying AI-generated execution plans with streaming support and shimmer animations.

The `Plan` component provides a flexible system for displaying AI-generated execution plans with collapsible content. Perfect for showing multi-step workflows, task breakdowns, and implementation strategies with support for streaming content and loading states.

See [`plan.tsx`](examples/plan.tsx) for this official example.

## Features

- Collapsible content with smooth animations
- Streaming support with shimmer loading states
- Built on shadcn/ui Card and Collapsible components
- TypeScript support with comprehensive type definitions
- Customizable styling with Tailwind CSS
- Responsive design with mobile-friendly interactions
- Keyboard navigation and accessibility support
- Theme-aware with automatic dark mode support
- Context-based state management for streaming

## Props

### `<Plan />`

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `isStreaming` | `boolean` | `false` | Whether content is currently streaming. Enables shimmer animations on title and description. |
| `defaultOpen` | `boolean` | - | Whether the plan is expanded by default. |
| `...props` | `React.ComponentProps<typeof Collapsible>` | - | Any other props are spread to the Collapsible component. |

### `<PlanHeader />`

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `...props` | `React.ComponentProps<typeof CardHeader>` | - | Any other props are spread to the CardHeader component. |

### `<PlanTitle />`

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `children` | `string` | - | The title text. Displays with shimmer animation when isStreaming is true. |
| `...props` | `Omit<React.ComponentProps<typeof CardTitle>, ` | - | Any other props (except children) are spread to the CardTitle component. |

### `<PlanDescription />`

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `children` | `string` | - | The description text. Displays with shimmer animation when isStreaming is true. |
| `...props` | `Omit<React.ComponentProps<typeof CardDescription>, ` | - | Any other props (except children) are spread to the CardDescription component. |

### `<PlanTrigger />`

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `...props` | `React.ComponentProps<typeof CollapsibleTrigger>` | - | Any other props are spread to the CollapsibleTrigger component. Renders as a Button with chevron icon. |

### `<PlanContent />`

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `...props` | `React.ComponentProps<typeof CardContent>` | - | Any other props are spread to the CardContent component. |

### `<PlanFooter />`

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `...props` | `React.ComponentProps<` | - | Any other props are spread to the div element. |

### `<PlanAction />`

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `...props` | `React.ComponentProps<typeof CardAction>` | - | Any other props are spread to the CardAction component. |
