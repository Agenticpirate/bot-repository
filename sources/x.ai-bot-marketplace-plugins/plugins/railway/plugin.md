# railway

- Marketplace: Grok Build Plugin Marketplace (Plugins catalog)
- Source of truth: https://github.com/xai-org/plugin-marketplace
- Catalog revision: `1581c908c0244fd5f6f59051e4a1ce65814e86ab`
- Category: deployment
- Homepage: https://github.com/railwayapp/railway-skills
- Keywords: railway, railway deploy, deploy to railway
- Domains: railway.com, railway.app

## Description

Railway deployment platform integration (MCP server + skill). Create projects, provision services and databases, deploy code, manage environments, variables, volumes, object storage buckets, and feature flags, configure domains, troubleshoot build failures, and check status and metrics directly from Grok.

## Source pin

```json
{
  "source": "url",
  "url": "https://github.com/railwayapp/railway-skills.git",
  "sha": "950acebcef3445f3915ea0709876c3ba9c237a7f",
  "path": "plugins/railway"
}
```

## Components (plugin-index.json)

### hooks

- **PreToolUse**: Bash

### mcpServers

- **railway**: http

### skills

- **use-railway**: Operate Railway infrastructure: sign up for or sign in to a Railway account, create projects, provision services, datab…
