# datadog

- Marketplace: Grok Build Plugin Marketplace (Plugins catalog)
- Source of truth: https://github.com/xai-org/plugin-marketplace
- Catalog revision: `9963e48f7a4a641d4f3a791cec55b089dd4aefa6`
- Category: observability
- Homepage: https://github.com/datadog-labs/grok-plugin
- Keywords: datadog, datadog mcp
- Domains: datadoghq.com, app.datadoghq.com, datadoghq.eu

## Description

Datadog observability integration. Query logs, metrics, traces, and profiles, search and manage monitors, dashboards, and incidents, and investigate issues directly from Grok.

## Source pin

```json
{
  "source": "url",
  "url": "https://github.com/datadog-labs/grok-plugin.git",
  "sha": "083b4783095520f562534956578c8826613292a9"
}
```

## Components (plugin-index.json)

### mcpServers

- **datadog-grok**: http

### skills

- **datadog-app**: Use ONLY when the user explicitly asks to create, scaffold, or initialize a new Datadog App project — they must use act…
- **ddconfig**: Configures or troubleshoots the plugin's Datadog MCP server. Use when the user wants to change the Datadog domain, swit…
