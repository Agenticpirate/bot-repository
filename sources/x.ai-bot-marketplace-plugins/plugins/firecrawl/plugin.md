# firecrawl

- Marketplace: Grok Build Plugin Marketplace (Plugins catalog)
- Source of truth: https://github.com/xai-org/plugin-marketplace
- Catalog revision: `1581c908c0244fd5f6f59051e4a1ce65814e86ab`
- Category: development
- Homepage: https://github.com/firecrawl/firecrawl-grok-plugin
- Keywords: firecrawl, fire crawl
- Domains: firecrawl.dev, docs.firecrawl.dev

## Description

Turn any website into clean, LLM-ready markdown or structured data. Search, scrape, map, crawl, and extract live web data via the bundled hosted Firecrawl MCP server — keyless on eligible networks (1,000 free credits/month, no signup), with an optional free API key for more usage. Automatic JS rendering, anti-bot handling, and proxy rotation; CLI skills available as a fallback.

## Source pin

```json
{
  "source": "url",
  "url": "https://github.com/firecrawl/firecrawl-grok-plugin.git",
  "sha": "7100b62d09a40673fe1688175431b1baff7ed262"
}
```

## Components (plugin-index.json)

### commands

- **skill-gen**: Generate a complete Agent Skill from a documentation URL using Firecrawl

### mcpServers

- **firecrawl**: http

### skills

- **firecrawl**: Search, scrape, and interact with the web via the Firecrawl CLI. Use this skill whenever the user wants to search the w…
- **firecrawl-agent**: AI-powered autonomous data extraction that navigates complex sites and returns structured JSON. Use this skill when the…
- **firecrawl-crawl**: Bulk extract content from an entire website or site section. Use this skill when the user wants to crawl a site, extrac…
- **firecrawl-developer-search**: Search an index built for coding agents — GitHub issues, merged pull requests, repository READMEs, and curated document…
- **firecrawl-download**: Download an entire website as local files — markdown, screenshots, or multiple formats per page. Use this skill when th…
- **firecrawl-interact**: Control and interact with a live browser session on any scraped page — click buttons, fill forms, navigate flows, and e…
- **firecrawl-map**: Discover and list all URLs on a website, with optional search filtering. Use this skill when the user wants to find a s…
- **firecrawl-monitor**: Detect when content on a website changes and get notified by webhook or email — no cron jobs, scrapers, or diff scripts…
- **firecrawl-parse**: Efficiently extract and convert the contents of any local file—such as PDF, DOCX, DOC, ODT, RTF, XLSX, XLS, or HTML—int…
- **firecrawl-scrape**: Extract clean markdown from any URL, including JavaScript-rendered SPAs. Use this skill whenever the user provides a UR…
- **firecrawl-search**: Web search with full page content extraction. Use this skill whenever the user asks to search the web, find articles, r…
