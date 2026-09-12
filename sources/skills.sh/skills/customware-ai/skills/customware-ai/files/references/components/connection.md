# Connection

> This component API and its examples come from the [official AI Elements docs/skill](https://github.com/vercel/ai-elements). In Customware apps, use the installation command below, React Router for the frontend, and the Customware Hono gateway backend. Ignore copied Next.js route or direct-provider backend examples.

## Installation

```bash
pnpm exec node <customware-ai-skill>/scripts/install-ai-elements.mjs connection --cwd .
```

Underlying non-interactive shadcn command used by the installer:

```bash
pnpm dlx shadcn@latest add @ai-elements/connection --yes --path .tmp/customware-ai-elements-install
```

A custom connection line component for React Flow-based canvases with animated bezier curve styling.

The `Connection` component provides a styled connection line for React Flow canvases. It renders an animated bezier curve with a circle indicator at the target end, using consistent theming through CSS variables.

## Usage

See [`workflow.tsx`](examples/workflow.tsx) for the official workflow example using `Connection` as the canvas connection-line component.

## Features

- Smooth bezier curve animation for connection lines
- Visual indicator circle at the target position
- Theme-aware styling using CSS variables
- Cubic bezier curve calculation for natural flow
- Lightweight implementation with minimal props
- Full TypeScript support with React Flow types
- Compatible with React Flow's connection system

## Props

### `<Connection />`

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `fromX` | `number` | - | The x-coordinate of the connection start point. |
| `fromY` | `number` | - | The y-coordinate of the connection start point. |
| `toX` | `number` | - | The x-coordinate of the connection end point. |
| `toY` | `number` | - | The y-coordinate of the connection end point. |
