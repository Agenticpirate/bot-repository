# Toolbar

> This component API and its examples come from the [official AI Elements docs/skill](https://github.com/vercel/ai-elements). In Customware apps, use the installation command below, React Router for the frontend, and the Customware Hono gateway backend. Ignore copied Next.js route or direct-provider backend examples.

## Installation

```bash
pnpm exec node <customware-ai-skill>/scripts/install-ai-elements.mjs toolbar --cwd .
```

Underlying non-interactive shadcn command used by the installer:

```bash
pnpm dlx shadcn@latest add @ai-elements/toolbar --yes --path .tmp/customware-ai-elements-install
```

A styled toolbar component for React Flow nodes with flexible positioning and custom actions.

The `Toolbar` component provides a positioned toolbar that attaches to nodes in React Flow canvases. It features modern card styling with backdrop blur and flexbox layout for action buttons and controls.

## Usage

Adapted from the official component usage:

```tsx
import { Canvas } from "~/components/ai-elements/canvas";
import { Toolbar } from "~/components/ai-elements/toolbar";

const nodeTypes = {
  custom: () => (
    <div>
      <Toolbar>Edit node</Toolbar>
      Node content
    </div>
  ),
};

export function WorkflowToolbar() {
  return (
    <Canvas
      edges={[]}
      nodes={[{ data: {}, id: "node-1", position: { x: 0, y: 0 }, type: "custom" }]}
      nodeTypes={nodeTypes}
    />
  );
}
```

## Features

- Attaches to any React Flow node
- Bottom positioning by default
- Rounded card design with border
- Theme-aware background styling
- Flexbox layout with gap spacing
- Full TypeScript support
- Compatible with all React Flow NodeToolbar features

## Props

### `<Toolbar />`

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `className` | `string` | - | Additional CSS classes to apply to the toolbar. |
| `...props` | `ComponentProps<typeof NodeToolbar>` | - | Any other props from @xyflow/react NodeToolbar component (position, offset, isVisible, etc.). |
