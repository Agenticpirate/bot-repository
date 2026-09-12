---
name: web-scraper
description: |
  Scrape, crawl, map, search, and extract structured data from the web through Shift's Skill Router.
metadata:
  author: shift
  version: "1.0"
---

# Firecrawl Web Scraper

Use this managed skill when the user wants to scrape web pages, crawl websites, discover URLs, search the web, or extract structured data from websites.

This skill uses Shift's local Skill Router. Do not ask the user to paste credentials into chat.

## Invocation

Send a `POST` request to:

```text
${SHIFT_LOCAL_GATEWAY}/skill-router/invoke
```

### Scrape a single page

Extracts content from a URL as clean markdown.

```json
{
  "skillProvider": "firecrawl",
  "skill": "web-scraper",
  "action": "scrape",
  "input": {
    "url": "https://example.com"
  }
}
```

Optional input fields:

- `formats`: array of output formats, default `["markdown"]`. Options: `markdown`, `html`, `links`, `screenshot`
- `onlyMainContent`: boolean, default `true`. Exclude nav/footer
- `includeTags` / `excludeTags`: arrays of HTML tags to include or exclude
- `waitFor`: integer, milliseconds to wait before scraping
- `timeout`: integer, milliseconds, default `30000`
- `mobile`: boolean, default `false`. Emulate mobile viewport
- `location`: object with `country` (ISO 3166-1 alpha-2) and `languages` array

### Crawl a website (async)

Starts an async crawl job. Returns a job ID to poll with `crawl_status`.

```json
{
  "skillProvider": "firecrawl",
  "skill": "web-scraper",
  "action": "crawl",
  "input": {
    "url": "https://example.com",
    "limit": 50
  }
}
```

Optional input fields:

- `limit`: max pages to crawl, default `10`
- `maxDepth`: crawl depth
- `includePaths` / `excludePaths`: regex path filters
- `allowExternalLinks`: boolean, default `false`
- `allowSubdomains`: boolean, default `false`
- `scrapeOptions`: object with same options as scrape (e.g. `{"formats": ["markdown"]}`)

### Check crawl status

Poll for crawl job results using the ID returned from crawl.

```json
{
  "skillProvider": "firecrawl",
  "skill": "web-scraper",
  "action": "crawl_status",
  "input": {
    "crawlId": "crawl-job-uuid"
  }
}
```

Status values: `scraping`, `completed`, `failed`.

### Map a website's URLs

Discovers all URLs on a site without scraping content. Use this to understand site structure before crawling.

```json
{
  "skillProvider": "firecrawl",
  "skill": "web-scraper",
  "action": "map",
  "input": {
    "url": "https://example.com"
  }
}
```

Optional input fields:

- `search`: order results by relevance to this query
- `limit`: max URLs, default `5000`
- `includeSubdomains`: boolean, default `true`
- `ignoreSitemap`: boolean, default `false`

### Search the web

Search the web and optionally scrape the result pages.

```json
{
  "skillProvider": "firecrawl",
  "skill": "web-scraper",
  "action": "search",
  "input": {
    "query": "latest AI research papers"
  }
}
```

Optional input fields:

- `limit`: max results, 1-100, default `5`
- `lang`: language code
- `country`: country code, default `US`
- `tbs`: time filter (`qdr:h` hour, `qdr:d` day, `qdr:w` week, `qdr:m` month, `qdr:y` year)
- `scrapeOptions`: object to control content extraction from results

### Extract structured data (async)

Extracts structured data from URLs using a prompt and/or JSON schema. Returns a job ID to poll with `extract_status`.

```json
{
  "skillProvider": "firecrawl",
  "skill": "web-scraper",
  "action": "extract",
  "input": {
    "urls": ["https://example.com/pricing"],
    "prompt": "Extract all pricing plans with name, price, and features"
  }
}
```

Optional input fields:

- `schema`: JSON Schema defining expected output structure
- `enableWebSearch`: boolean, default `false`

### Check extract status

Poll for extract job results.

```json
{
  "skillProvider": "firecrawl",
  "skill": "web-scraper",
  "action": "extract_status",
  "input": {
    "extractId": "extract-job-uuid"
  }
}
```

## Authentication

This skill requires a Firecrawl API key configured in Shift. Get one at https://www.firecrawl.dev.

Do not ask the user to paste raw credentials into the conversation. Shift handles authentication automatically when the required connection is configured.

## Agent behavior

1. Prefer `scrape` for single pages. Use `crawl` only when multiple pages are needed.
2. Use `map` first to discover site structure before starting a large crawl.
3. For async actions (`crawl`, `extract`), poll status every few seconds until `completed` or `failed`.
4. Default to `markdown` format unless the user specifically needs HTML or screenshots.
5. When scraping fails, suggest the user check the URL or try with `waitFor` for JavaScript-heavy pages.
