# Package Info

> This component API and its examples come from the [official AI Elements docs/skill](https://github.com/vercel/ai-elements). In Customware apps, use the installation command below, React Router for the frontend, and the Customware Hono gateway backend. Ignore copied Next.js route or direct-provider backend examples.

## Installation

```bash
pnpm exec node <customware-ai-skill>/scripts/install-ai-elements.mjs package-info --cwd .
```

Underlying non-interactive shadcn command used by the installer:

```bash
pnpm dlx shadcn@latest add @ai-elements/package-info --yes --path .tmp/customware-ai-elements-install
```

Display dependency information and version changes.

The `PackageInfo` component displays package dependency information including version changes and change type badges.

See [`package-info.tsx`](examples/package-info.tsx) for this official example.

## Features

- Version change display (current → new)
- Color-coded change type badges
- Dependencies list
- Description support

## Change Types

| Type      | Color  | Use Case           |
| --------- | ------ | ------------------ |
| `major`   | Red    | Breaking changes   |
| `minor`   | Yellow | New features       |
| `patch`   | Green  | Bug fixes          |
| `added`   | Blue   | New dependency     |
| `removed` | Gray   | Removed dependency |

## Props

### `<PackageInfo />`

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `name` | `string` | Required | Package name. |
| `currentVersion` | `string` | - | Current installed version. |
| `newVersion` | `string` | - | New version being installed. |
| `changeType` | `unknown` | - | Type of version change. |
| `...props` | `React.HTMLAttributes<HTMLDivElement>` | - | Spread to the container div. |

### `<PackageInfoHeader />`

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `...props` | `React.HTMLAttributes<HTMLDivElement>` | - | Spread to the header div. |

### `<PackageInfoName />`

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `children` | `React.ReactNode` | - | Custom name content. Defaults to the name from context. |
| `...props` | `React.HTMLAttributes<HTMLDivElement>` | - | Spread to the container div. |

### `<PackageInfoChangeType />`

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `children` | `React.ReactNode` | - | Custom change type label. Defaults to the changeType from context. |
| `...props` | `React.HTMLAttributes<HTMLDivElement>` | - | Spread to the Badge component. |

### `<PackageInfoVersion />`

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `children` | `React.ReactNode` | - | Custom version content. Defaults to version transition display. |
| `...props` | `React.HTMLAttributes<HTMLDivElement>` | - | Spread to the container div. |

### `<PackageInfoDescription />`

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `...props` | `React.HTMLAttributes<HTMLParagraphElement>` | - | Spread to the p element. |

### `<PackageInfoContent />`

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `...props` | `React.HTMLAttributes<HTMLDivElement>` | - | Spread to the container div. |

### `<PackageInfoDependencies />`

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `...props` | `React.HTMLAttributes<HTMLDivElement>` | - | Spread to the container div. |

### `<PackageInfoDependency />`

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `name` | `string` | Required | Dependency name. |
| `version` | `string` | - | Dependency version. |
| `...props` | `React.HTMLAttributes<HTMLDivElement>` | - | Spread to the row div. |
