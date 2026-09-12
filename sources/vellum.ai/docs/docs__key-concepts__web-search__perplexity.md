# Perplexity

AI-powered search with synthesized answers and inline citations. Use Perplexity as a web search provider in your Vellum assistant for conversational, citation-grade results.

## What it does

Perplexity is a search engine that uses large language models to synthesize answers from real-time web sources. Instead of returning a list of links, it produces a concise answer with inline citations, making it ideal for assistant workflows that need to explain or summarize current information.

When configured as your web search provider, Vellum routes queries through the Perplexity API and feeds the synthesized answer (with its source citations) back to your assistant. The model can then quote from, verify, or expand on the answer without needing to scrape individual pages.

## Prerequisites

- A running Vellum assistant. Cloud, self-hosted, or the desktop apps all work.
- A Perplexity API key. Create one at [perplexity.ai/settings/api](https://www.perplexity.ai/settings/api). Keys start with `pplx-`.

## Setup

Perplexity is BYOK (bring your own key). You stay in control of the key and pay Perplexity directly for usage.

1. **Open assistant settings.** In Vellum, head to Settings → Models & Services.
2. **Add your Perplexity API key.** Under the Web Search section, choose Perplexity as the provider and paste your API key. Vellum stores the key in your local secure store and never writes it to disk in plaintext.
3. **Ask something current.** Start a new conversation and ask a question that needs fresh information. Vellum calls Perplexity under the hood and feeds the synthesized answer back to the model in context.

Prefer the CLI? Two commands from any shell where the assistant daemon is running:

```
assistant keys set perplexity pplx-...
assistant config set services.web-search.provider perplexity
```

Swap or revoke the key at any time with `assistant keys delete perplexity`.

## Best practices

- **Pick Perplexity when you want synthesized answers.** Perplexity excels at producing a single coherent answer with citations. For raw search results or relevance-scored snippets, consider Tavily or Brave.
- **One key per workspace.** Reuse the same Perplexity key across your assistants so usage and billing stay in one place on the Perplexity dashboard.
- **Fallback behavior.** If Perplexity is unavailable, the assistant falls through the rest of the web search chain (Brave, then Tavily, then Provider Native). See the [Web Search](/docs/key-concepts/web-search) page for the full fallback rules.
- **Billing.** Perplexity usage is billed directly by Perplexity under the account that owns the key, separately from Vellum credits.
- **Privacy.** Queries leave your assistant and reach Perplexity's servers. Review the [Perplexity privacy policy](https://www.perplexity.ai/hub/legal/privacy-policy) for details.

## Resources

- [Perplexity API documentation](https://docs.perplexity.ai/)
- [Perplexity API key dashboard](https://www.perplexity.ai/settings/api)
- [Vellum Web Search reference](/docs/key-concepts/web-search)
