# mongodb

- Marketplace: Grok Build Plugin Marketplace (Plugins catalog)
- Source of truth: https://github.com/xai-org/plugin-marketplace
- Catalog revision: `1581c908c0244fd5f6f59051e4a1ce65814e86ab`
- Category: database
- Homepage: https://www.mongodb.com/docs/mcp-server/get-started/
- Keywords: mongodb community, mongo, mongosh, mongodb local mcp, enterprise advanced
- Domains: mongodb.com

## Description

Official plugin for MongoDB (Self-Managed MCP Server + Skills). Connect to any MongoDB deployment (Community, Enterprise Advanced, local dev container via Atlas CLI, or Atlas clusters) through a self-managed MongoDB MCP Server using your connection string. Explore data, manage collections, optimize queries, and generate reliable code with MongoDB best practices.

## Source pin

```json
{
  "source": "url",
  "url": "https://github.com/mongodb/agent-skills.git",
  "sha": "47cc46148f53145eb9b880d2bf1aa89bc9097818",
  "path": "plugins/mongodb"
}
```

## Components (plugin-index.json)

### mcpServers

- **mongodb**: stdio

### skills

- **mongodb-atlas-stream-processing**: Manages MongoDB Atlas Stream Processing (ASP) workflows. Handles workspace provisioning, data source/sink connections,…
- **mongodb-connection**: Optimize MongoDB client connection configuration (pools, timeouts, patterns) for any supported driver language. Use thi…
- **mongodb-mcp-setup**: Guide users through configuring key MongoDB MCP server options. Use this skill when a user has the MongoDB MCP server i…
- **mongodb-natural-language-querying**: Generate read-only MongoDB queries (find) or aggregation pipelines using natural language, with collection schema conte…
- **mongodb-query-optimizer**: Help with MongoDB query optimization and indexing. Use only when the user asks for optimization or performance: "How do…
- **mongodb-schema-design**: MongoDB schema design patterns and anti-patterns. Use when designing data models, reviewing schemas, migrating from SQL…
- **mongodb-search-and-ai**: Guides MongoDB users through implementing and optimizing Atlas Search (full-text), Vector Search (semantic), and Hybrid…
