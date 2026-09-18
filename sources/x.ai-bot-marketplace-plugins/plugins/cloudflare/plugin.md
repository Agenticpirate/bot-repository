# cloudflare

- Marketplace: Grok Build Plugin Marketplace (Plugins catalog)
- Source of truth: https://github.com/xai-org/plugin-marketplace
- Catalog revision: `1581c908c0244fd5f6f59051e4a1ce65814e86ab`
- Category: development
- Homepage: https://github.com/cloudflare/skills
- Keywords: cloudflare, wrangler, cloudflare workers
- Domains: cloudflare.com

## Description

Skills for the Cloudflare developer platform: Workers, Durable Objects, Agents SDK, MCP servers, Wrangler CLI, and web performance.

## Source pin

```json
{
  "source": "url",
  "url": "https://github.com/cloudflare/skills.git",
  "sha": "60147cbb773649eadca89cee92b4e0caf02234b4"
}
```

## Components (plugin-index.json)

### commands

- **build-agent**: Build an AI agent on Cloudflare using the Agents SDK
- **build-mcp**: Build a remote MCP server on Cloudflare using McpAgent

### mcpServers

- **cloudflare-api**: http
- **cloudflare-bindings**: http
- **cloudflare-builds**: http
- **cloudflare-docs**: http
- **cloudflare-observability**: http

### skills

- **agents-sdk**: Build AI agents on Cloudflare Workers using the Agents SDK. Load when creating stateful agents, durable workflows, real…
- **cloudflare**: Comprehensive Cloudflare platform skill covering Workers, Pages, storage (KV, D1, R2), AI (Workers AI, Vectorize, Agent…
- **cloudflare-email-service**: Send and receive transactional emails with Cloudflare Email Service (Email Sending + Email Routing). Use when building…
- **durable-objects**: Create and review Cloudflare Durable Objects. Use when building stateful coordination (chat rooms, multiplayer games, b…
- **sandbox-sdk**: Build sandboxed applications for secure code execution. Load when building AI code execution, code interpreters, CI/CD…
- **web-perf**: Analyzes web performance using Chrome DevTools MCP. Measures Core Web Vitals (LCP, INP, CLS) and supplementary metrics…
- **workers-best-practices**: Reviews and authors Cloudflare Workers code against production best practices. Load when writing new Workers, reviewing…
- **wrangler**: Cloudflare Workers CLI for deploying, developing, and managing Workers, KV, R2, D1, Vectorize, Hyperdrive, Workers AI,…
