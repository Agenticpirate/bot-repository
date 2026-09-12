# Canvas

> This component API and its examples come from the [official AI Elements docs/skill](https://github.com/vercel/ai-elements). In Customware apps, use the installation command below, React Router for the frontend, and the Customware Hono gateway backend. Ignore copied Next.js route or direct-provider backend examples.

## Installation

```bash
pnpm exec node <customware-ai-skill>/scripts/install-ai-elements.mjs canvas --cwd .
```

Underlying non-interactive shadcn command used by the installer:

```bash
pnpm dlx shadcn@latest add @ai-elements/canvas --yes --path .tmp/customware-ai-elements-install
```

A React Flow-based canvas component for building interactive node-based interfaces.

The `Canvas` component provides a React Flow-based canvas for building interactive node-based interfaces. It comes pre-configured with sensible defaults for AI applications, including panning, zooming, and selection behaviors.

## Usage

See [`workflow.tsx`](examples/workflow.tsx) for the official workflow example using `Canvas` with nodes and edges.

## Features

- Pre-configured React Flow canvas with AI-optimized defaults
- Pan on scroll enabled for intuitive navigation
- Selection on drag for multi-node operations
- Customizable background color using CSS variables
- Delete key support (Backspace and Delete keys)
- Auto-fit view to show all nodes
- Disabled double-click zoom for better UX
- Disabled pan on drag to prevent accidental canvas movement
- Fully compatible with React Flow props and API

## Props

### `<Canvas />`

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `children` | `ReactNode` | - | Child components like Background, Controls, or MiniMap. |
| `...props` | `ReactFlowProps` | - | Any other React Flow props like nodes, edges, nodeTypes, edgeTypes, onNodesChange, etc. |
