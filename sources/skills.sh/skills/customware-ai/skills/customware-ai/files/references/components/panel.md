# Panel

> This component API and its examples come from the [official AI Elements docs/skill](https://github.com/vercel/ai-elements). In Customware apps, use the installation command below, React Router for the frontend, and the Customware Hono gateway backend. Ignore copied Next.js route or direct-provider backend examples.

## Installation

```bash
pnpm exec node <customware-ai-skill>/scripts/install-ai-elements.mjs panel --cwd .
```

Underlying non-interactive shadcn command used by the installer:

```bash
pnpm dlx shadcn@latest add @ai-elements/panel --yes --path .tmp/customware-ai-elements-install
```

A styled panel component for React Flow-based canvases to position custom UI elements.

The `Panel` component provides a positioned container for custom UI elements on React Flow canvases. It includes modern card styling with backdrop blur and flexible positioning options.

## Usage

Adapted from the official component usage:

```tsx
import { Canvas } from "~/components/ai-elements/canvas";
import { Panel } from "~/components/ai-elements/panel";

export function WorkflowPanel() {
  return (
    <Canvas edges={[]} nodes={[]}>
      <Panel position="top-left">Workflow controls</Panel>
    </Canvas>
  );
}
```

## Features

- Flexible positioning (top-left, top-right, bottom-left, bottom-right, top-center, bottom-center)
- Rounded pill design with backdrop blur
- Theme-aware card background
- Flexbox layout for easy content alignment
- Subtle drop shadow for depth
- Full TypeScript support
- Compatible with React Flow's panel system

## Props

### `<Panel />`

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `position` | `unknown` | - | Position of the panel on the canvas. |
| `className` | `string` | - | Additional CSS classes to apply to the panel. |
| `...props` | `ComponentProps<typeof Panel>` | - | Any other props from @xyflow/react Panel component. |
