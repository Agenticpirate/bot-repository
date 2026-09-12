# Schema Display

> This component API and its examples come from the [official AI Elements docs/skill](https://github.com/vercel/ai-elements). In Customware apps, use the installation command below, React Router for the frontend, and the Customware Hono gateway backend. Ignore copied Next.js route or direct-provider backend examples.

## Installation

```bash
pnpm exec node <customware-ai-skill>/scripts/install-ai-elements.mjs schema-display --cwd .
```

Underlying non-interactive shadcn command used by the installer:

```bash
pnpm dlx shadcn@latest add @ai-elements/schema-display --yes --path .tmp/customware-ai-elements-install
```

Display REST API endpoint documentation with parameters, request/response bodies.

The `SchemaDisplay` component visualizes REST API endpoints with HTTP methods, paths, parameters, and request/response schemas.

See [`schema-display.tsx`](examples/schema-display.tsx) for this official example.

## Features

- Color-coded HTTP methods
- Path parameter highlighting
- Collapsible parameters section
- Request/response body schemas
- Nested object property display
- Required field indicators

## Method Colors

| Method   | Color  |
| -------- | ------ |
| `GET`    | Green  |
| `POST`   | Blue   |
| `PUT`    | Orange |
| `PATCH`  | Yellow |
| `DELETE` | Red    |

## Examples

### Basic Usage

See [`schema-display-basic.tsx`](examples/schema-display-basic.tsx) for this official example.

### With Parameters

See [`schema-display-params.tsx`](examples/schema-display-params.tsx) for this official example.

### With Request/Response Bodies

See [`schema-display-body.tsx`](examples/schema-display-body.tsx) for this official example.

### Nested Properties

See [`schema-display-nested.tsx`](examples/schema-display-nested.tsx) for this official example.

## Props

### `<SchemaDisplay />`

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `method` | `unknown` | - | HTTP method. |
| `path` | `string` | - | API endpoint path. |
| `description` | `string` | - | Endpoint description. |
| `parameters` | `SchemaParameter[]` | - | URL/query parameters. |
| `requestBody` | `SchemaProperty[]` | - | Request body properties. |
| `responseBody` | `SchemaProperty[]` | - | Response body properties. |

### `SchemaParameter`

```tsx
interface SchemaParameter {
  name: string;
  type: string;
  required?: boolean;
  description?: string;
  location?: "path" | "query" | "header";
}
```

### `SchemaProperty`

```tsx
interface SchemaProperty {
  name: string;
  type: string;
  required?: boolean;
  description?: string;
  properties?: SchemaProperty[]; // For objects
  items?: SchemaProperty; // For arrays
}
```

### Subcomponents

- `SchemaDisplayHeader` - Header container
- `SchemaDisplayMethod` - Color-coded method badge
- `SchemaDisplayPath` - Path with highlighted parameters
- `SchemaDisplayDescription` - Description text
- `SchemaDisplayContent` - Content container
- `SchemaDisplayParameters` - Collapsible parameters section
- `SchemaDisplayParameter` - Individual parameter
- `SchemaDisplayRequest` - Collapsible request body
- `SchemaDisplayResponse` - Collapsible response body
- `SchemaDisplayProperty` - Schema property (recursive)
- `SchemaDisplayExample` - Code example block
