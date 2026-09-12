# Edge

> This component API and its examples come from the [official AI Elements docs/skill](https://github.com/vercel/ai-elements). In Customware apps, use the installation command below, React Router for the frontend, and the Customware Hono gateway backend. Ignore copied Next.js route or direct-provider backend examples.

## Installation

```bash
pnpm exec node <customware-ai-skill>/scripts/install-ai-elements.mjs edge --cwd .
```

Underlying non-interactive shadcn command used by the installer:

```bash
pnpm dlx shadcn@latest add @ai-elements/edge --yes --path .tmp/customware-ai-elements-install
```

Customizable edge components for React Flow canvases with animated and temporary states.

The `Edge` component provides two pre-styled edge types for React Flow canvases: `Temporary` for dashed temporary connections and `Animated` for connections with animated indicators.

## Usage

See [`workflow.tsx`](examples/workflow.tsx) for the official workflow example registering and using both edge types.

## Features

- Two distinct edge types: Temporary and Animated
- Temporary edges use dashed lines with ring color
- Animated edges include a moving circle indicator
- Automatic handle position calculation
- Smart offset calculation based on handle type and position
- Uses Bezier curves for smooth, natural-looking connections
- Fully compatible with React Flow's edge system
- Type-safe implementation with TypeScript

## Edge Types

### `Edge.Temporary`

A dashed edge style for temporary or preview connections. Uses a simple Bezier path with a dashed stroke pattern.

### `Edge.Animated`

A solid edge with an animated circle that moves along the path. The animation repeats indefinitely with a 2-second duration, providing visual feedback for active connections.

## Props

Both edge types accept standard React Flow `EdgeProps`:

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `id` | `string` | - | Unique identifier for the edge. |
| `source` | `string` | - | ID of the source node. |
| `target` | `string` | - | ID of the target node. |
| `sourceX` | `number` | - | X coordinate of the source handle (Temporary only). |
| `sourceY` | `number` | - | Y coordinate of the source handle (Temporary only). |
| `targetX` | `number` | - | X coordinate of the target handle (Temporary only). |
| `targetY` | `number` | - | Y coordinate of the target handle (Temporary only). |
| `sourcePosition` | `Position` | - | Position of the source handle (Left, Right, Top, Bottom). |
| `targetPosition` | `Position` | - | Position of the target handle (Left, Right, Top, Bottom). |
| `markerEnd` | `string` | - | SVG marker ID for the edge end (Animated only). |
| `style` | `React.CSSProperties` | - | Custom styles for the edge (Animated only). |
