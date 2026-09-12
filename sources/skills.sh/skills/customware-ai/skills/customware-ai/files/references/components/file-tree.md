# File Tree

> This component API and its examples come from the [official AI Elements docs/skill](https://github.com/vercel/ai-elements). In Customware apps, use the installation command below, React Router for the frontend, and the Customware Hono gateway backend. Ignore copied Next.js route or direct-provider backend examples.

## Installation

```bash
pnpm exec node <customware-ai-skill>/scripts/install-ai-elements.mjs file-tree --cwd .
```

Underlying non-interactive shadcn command used by the installer:

```bash
pnpm dlx shadcn@latest add @ai-elements/file-tree --yes --path .tmp/customware-ai-elements-install
```

Display hierarchical file and folder structure with expand/collapse functionality.

The `FileTree` component displays a hierarchical file system structure with expandable folders and file selection.

See [`file-tree.tsx`](examples/file-tree.tsx) for this official example.

## Features

- Hierarchical folder structure
- Expand/collapse folders
- File selection with callback
- Keyboard accessible
- Customizable icons
- Controlled and uncontrolled modes

## Examples

### Basic Usage

See [`file-tree-basic.tsx`](examples/file-tree-basic.tsx) for this official example.

### With Selection

See [`file-tree-selection.tsx`](examples/file-tree-selection.tsx) for this official example.

### Default Expanded

See [`file-tree-expanded.tsx`](examples/file-tree-expanded.tsx) for this official example.

## Props

### `<FileTree />`

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `expanded` | `Set<string>` | - | Controlled expanded paths. |
| `defaultExpanded` | `Set<string>` | `new Set()` | Default expanded paths. |
| `selectedPath` | `string` | - | Currently selected file/folder path. |
| `onSelect` | `(path: string) => void` | - | Callback when a file/folder is selected. |
| `onExpandedChange` | `(expanded: Set<string>) => void` | - | Callback when expanded paths change. |
| `className` | `string` | - | Additional CSS classes. |

### `<FileTreeFolder />`

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `path` | `string` | - | Unique folder path. |
| `name` | `string` | - | Display name. |
| `className` | `string` | - | Additional CSS classes. |

### `<FileTreeFile />`

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `path` | `string` | - | Unique file path. |
| `name` | `string` | - | Display name. |
| `icon` | `ReactNode` | - | Custom file icon. |
| `className` | `string` | - | Additional CSS classes. |

### Subcomponents

- `FileTreeIcon` - Icon wrapper
- `FileTreeName` - Name text
- `FileTreeActions` - Action buttons container (stops click propagation)
