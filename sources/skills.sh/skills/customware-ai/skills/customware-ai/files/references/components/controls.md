# Controls

> This component API and its examples come from the [official AI Elements docs/skill](https://github.com/vercel/ai-elements). In Customware apps, use the installation command below, React Router for the frontend, and the Customware Hono gateway backend. Ignore copied Next.js route or direct-provider backend examples.

## Installation

```bash
pnpm exec node <customware-ai-skill>/scripts/install-ai-elements.mjs controls --cwd .
```

Underlying non-interactive shadcn command used by the installer:

```bash
pnpm dlx shadcn@latest add @ai-elements/controls --yes --path .tmp/customware-ai-elements-install
```

A styled controls component for React Flow-based canvases with zoom and fit view functionality.

The `Controls` component provides interactive zoom and fit view controls for React Flow canvases. It includes a modern, themed design with backdrop blur and card styling.

## Usage

Adapted from the official component usage:

```tsx
import { Canvas } from "~/components/ai-elements/canvas";
import { Controls } from "~/components/ai-elements/controls";

export function WorkflowControls() {
  return (
    <Canvas edges={[]} nodes={[]}>
      <Controls />
    </Canvas>
  );
}
```

## Features

- Zoom in/out controls
- Fit view button to center and scale content
- Rounded pill design with backdrop blur
- Theme-aware card background
- Subtle drop shadow for depth
- Full TypeScript support
- Compatible with all React Flow control features

## Props

### `<Controls />`

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `className` | `string` | - | Additional CSS classes to apply to the controls. |
| `...props` | `ComponentProps<typeof Controls>` | - | Any other props from @xyflow/react Controls component (showZoom, showFitView, showInteractive, position, etc.). |
