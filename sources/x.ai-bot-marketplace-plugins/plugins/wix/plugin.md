# wix

- Marketplace: Grok Build Plugin Marketplace (Plugins catalog)
- Source of truth: https://github.com/xai-org/plugin-marketplace
- Catalog revision: `9963e48f7a4a641d4f3a791cec55b089dd4aefa6`
- Category: development
- Homepage: https://dev.wix.com/docs/api-reference/articles/ai-tools/about-wix-skills
- Keywords: wix, wix cli, wix mcp, wix apps, wix headless
- Domains: wix.com, dev.wix.com, manage.wix.com

## Description

Build, manage, and deploy Wix sites and apps (MCP Server + Skills). Includes CLI development skills and Wix MCP server for site management, eCommerce, CMS, dashboard extensions, and more.

## Source pin

```json
{
  "source": "url",
  "url": "https://github.com/wix/skills.git",
  "sha": "58922ec060ee898e1b5767a30aad874981b53474"
}
```

## Components (plugin-index.json)

### mcpServers

- **wix-mcp**: http

### skills

- **replatform**: Routes RePlatform source-to-Wix migrations to the next workflow step by inspecting migration project artifacts. Use whe…
- **wix-app**: Build and review Wix CLI app extensions — dashboard pages, modals, plugins, menu plugins, custom element widgets, Edito…
- **wix-auth**: Authenticate with Wix to obtain an access token for calling Wix APIs. Use when an agent needs a valid Wix access token…
- **wix-base44-connector**: Build on and manage the connected Wix site from a Base44 app: discover and call any Wix API (endpoints, request/respons…
- **wix-design-system**: Wix Design System component reference. Use when building UI with @wix/design-system, choosing components, checking prop…
- **wix-docs**: Look up the Wix API/SDK documentation to confirm an exact endpoint, HTTP method, request/response shape, field, enum, o…
- **wix-headless**: Connect Wix business services (Stores, Bookings, CMS, Blog, Events, Forms, and more) to a Wix Headless frontend — infer…
- **wix-headless-fast**: Build a Wix Headless site fast by wiring SHIPPED, verified @wix/sdk code instead of authoring the integration from reci…
- **wix-manage**: REST recipes to configure and manage a Wix site's business solutions — stores, bookings, payments, CMS, and more. Open…
- **wix-vibe-headless**: Client-only, dependency-free REST scaffolds for connecting an already-built front end (a vibe-coded app, an HTML/JSX/Vi…
