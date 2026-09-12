# Shimmer

> This component API and its examples come from the [official AI Elements docs/skill](https://github.com/vercel/ai-elements). In Customware apps, use the installation command below, React Router for the frontend, and the Customware Hono gateway backend. Ignore copied Next.js route or direct-provider backend examples.

## Installation

```bash
pnpm exec node <customware-ai-skill>/scripts/install-ai-elements.mjs shimmer --cwd .
```

Underlying non-interactive shadcn command used by the installer:

```bash
pnpm dlx shadcn@latest add @ai-elements/shimmer --yes --path .tmp/customware-ai-elements-install
```

An animated text shimmer component for creating eye-catching loading states and progressive reveal effects.

The `Shimmer` component provides an animated shimmer effect that sweeps across text, perfect for indicating loading states, progressive reveals, or drawing attention to dynamic content in AI applications.

See [`shimmer.tsx`](examples/shimmer.tsx) for this official example.

## Features

- Smooth animated shimmer effect using CSS gradients and Framer Motion
- Customizable animation duration and spread
- Polymorphic component - render as any HTML element via the `as` prop
- Automatic spread calculation based on text length
- Theme-aware styling using CSS custom properties
- Infinite looping animation with linear easing
- TypeScript support with proper type definitions
- Memoized for optimal performance
- Responsive and accessible design
- Uses `text-transparent` with background-clip for crisp text rendering

## Examples

### Different Durations

See [`shimmer-duration.tsx`](examples/shimmer-duration.tsx) for this official example.

### Custom Elements

See [`shimmer-elements.tsx`](examples/shimmer-elements.tsx) for this official example.

## Props

### `<Shimmer />`

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `children` | `string` | - | The text content to apply the shimmer effect to. |
| `as` | `ElementType` | - | The HTML element or React component to render. |
| `className` | `string` | - | Additional CSS classes to apply to the component. |
| `duration` | `number` | `2` | The duration of the shimmer animation in seconds. |
| `spread` | `number` | `2` | The spread multiplier for the shimmer gradient, multiplied by text length. |
