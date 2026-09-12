# Firecrawl

Web search and full-page scraping in one provider. Use Firecrawl in your Vellum assistant for clean, relevance-ranked results and markdown extraction from pages the built-in fetcher cannot read.

## What it does

Firecrawl is unusual among the web providers because it covers both jobs your assistant needs. As a search provider it returns clean, relevance-ranked results with an optional freshness filter. As a fetch provider it scrapes a specific URL through its hosted API and returns tidy markdown, including for JavaScript-rendered pages that the built-in fetcher cannot see.

One Firecrawl key powers both paths. Set it as your web search provider, your web fetch provider, or both. When configured, Vellum routes the matching calls through Firecrawl and feeds the results back to your assistant in context, where the model can read snippets, open sources, or synthesize an answer.

## Prerequisites

- A running Vellum assistant. Cloud, self-hosted, or the desktop apps all work.
- A Firecrawl API key. Create one at [firecrawl.dev](https://www.firecrawl.dev/app/api-keys). Keys start with `fc-`.

## Setup

Firecrawl is BYOK (bring your own key). You stay in control of the key and pay Firecrawl directly for usage. The same key serves both web search and web fetch.

1. **Open assistant settings.** In Vellum, head to Settings → Models & Services.
2. **Add your Firecrawl API key.** Under the Web Search section, choose Firecrawl as the provider and paste your API key. To use Firecrawl for single-page retrieval too, select it under the Web Fetch section as well. Vellum stores the key in your local secure store and never writes it to disk in plaintext.
3. **Try it.** Start a new conversation and ask a question that needs fresh information, or point the assistant at a JavaScript-heavy page. Vellum calls Firecrawl under the hood and feeds the results back to the model in context.

Prefer the CLI? From any shell where the assistant daemon is running:

```
assistant keys set firecrawl fc-...
assistant config set services.web-search.provider firecrawl
assistant config set services.web-fetch.provider firecrawl
```

The third line is optional. Set it only if you want Firecrawl to handle single-page fetches as well as search. Swap or revoke the key at any time with `assistant keys delete firecrawl`.

## Best practices

- **Reach for Firecrawl when pages fight back.** If your assistant keeps hitting JavaScript-rendered pages, snippets behind heavy client-side rendering, or sites the built-in fetcher returns empty on, Firecrawl's hosted scraper usually gets clean markdown back where a plain fetch fails.
- **One key, both jobs.** A single Firecrawl key powers web search and web fetch. Set it once and point both services at Firecrawl so usage and billing stay in one place.
- **Fallback behavior.** Firecrawl sits last in the web search fallback chain (after Perplexity, Brave, and Tavily). The chain skips any provider without a key connected; if none are connected, the search returns an error. See the [Web Search](/docs/key-concepts/web-search) page for the full fallback rules.
- **Billing.** Firecrawl usage is billed directly by Firecrawl under the account that owns the key, separately from Vellum credits.
- **Privacy.** Queries and the URLs you fetch leave your assistant and reach Firecrawl servers. Review the [Firecrawl privacy policy](https://www.firecrawl.dev/privacy-policy) for details.

## Resources

- [Firecrawl documentation](https://docs.firecrawl.dev/)
- [Firecrawl API key dashboard](https://www.firecrawl.dev/app/api-keys)
- [Vellum Web Search reference](/docs/key-concepts/web-search)
