# mongodb-atlas

- Marketplace: Grok Build Plugin Marketplace (Plugins catalog)
- Source of truth: https://github.com/xai-org/plugin-marketplace
- Catalog revision: `9963e48f7a4a641d4f3a791cec55b089dd4aefa6`
- Category: database
- Homepage: https://www.mongodb.com/docs/mcp-server/get-started/
- Keywords: mongodb atlas, atlas, mongodb, atlas cluster, atlas mcp
- Domains: mongodb.com, cloud.mongodb.com

## Description

Official plugin for MongoDB Atlas (Managed MCP Server + Skills). Sign in with your Atlas account to explore data, manage collections, optimize queries, generate reliable code with MongoDB best practices, and manage Atlas resources such as clusters, projects, database users, and network access.

## Source pin

```json
{
  "source": "url",
  "url": "https://github.com/mongodb/agent-skills.git",
  "sha": "47cc46148f53145eb9b880d2bf1aa89bc9097818",
  "path": "plugins/mongodb-atlas"
}
```

## Components (plugin-index.json)

### mcpServers

- **mongodb-atlas**: http

### skills

- **mongodb-atlas-stream-processing**: Manages MongoDB Atlas Stream Processing (ASP) workflows. Handles workspace provisioning, data source/sink connections,…
- **mongodb-connection**: Optimize MongoDB client connection configuration (pools, timeouts, patterns) for any supported driver language. Use thi…
- **mongodb-natural-language-querying**: Generate read-only MongoDB queries (find) or aggregation pipelines using natural language, with collection schema conte…
- **mongodb-query-optimizer**: Help with MongoDB query optimization and indexing. Use only when the user asks for optimization or performance: "How do…
- **mongodb-schema-design**: MongoDB schema design patterns and anti-patterns. Use when designing data models, reviewing schemas, migrating from SQL…
- **mongodb-search-and-ai**: Guides MongoDB users through implementing and optimizing Atlas Search (full-text), Vector Search (semantic), and Hybrid…
