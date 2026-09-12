# Tavily

Real-time web search built for AI agents. Use Tavily as the web search provider in your Vellum assistant for citation-grade, relevance-scored results.

## What it does

Vellum ships with a built-in web search capability that connects your assistant's conversations to real-time information from the open web. Tavily is one of the supported providers, and the one we recommend when you want results shaped for agents rather than humans.

Each Tavily result comes with a relevance score, the URL, the title, and a pre-extracted content block, so the assistant can quote from a page without a separate fetch step. Once configured, Vellum routes web search queries through the Tavily API so the model can answer questions with up-to-date sources instead of guessing from training data.

## Prerequisites

- A running Vellum assistant. Cloud, self-hosted, or the desktop apps all work.
- A Tavily API key. Create one at [app.tavily.com](https://app.tavily.com/home). Keys start with `tvly-`.

## Setup

Tavily is BYOK (bring your own key). You stay in control of the key and pay Tavily directly for usage.

1. **Open assistant settings.** In Vellum, head to Settings → Models & Services.
2. **Add your Tavily API key.** Under the Web Search section, choose Tavily as the provider and paste your API key. Vellum stores the key in your local secure store and never writes it to disk in plaintext.
3. **Ask something current.** Start a new conversation and ask a question that needs fresh information. Vellum calls Tavily under the hood and feeds the results back to the model in context.

Prefer the CLI? Two commands from any shell where the assistant daemon is running:

```
assistant keys set tavily tvly-...
assistant config set services.web-search.provider tavily
```

Swap or revoke the key at any time with `assistant keys delete tavily`.

## Best practices

- **Pick Tavily when you want agent-optimized results.** Tavily returns relevance-scored, LLM-friendly snippets that work especially well inside an assistant loop. For raw HTML or page scraping, use a different provider.
- **One key per workspace.** Reuse the same Tavily key across your assistants and other tools so usage and billing stay in one place on the Tavily dashboard.
- **Dev vs production keys.** Keys that start with `tvly-dev-` are free-tier development keys with lower rate limits. Upgrade to a paid plan for production workloads.
- **Fallback behavior.** If Tavily is unavailable, the assistant falls through the rest of the web search chain (Perplexity, Brave, then Provider Native). See the [Web Search](/docs/key-concepts/web-search) page for the full fallback rules.
- **Billing.** Tavily usage is billed directly by Tavily under the account that owns the key, separately from Vellum credits.
- **Privacy.** Queries leave your assistant and reach Tavily's servers. Review the [Tavily privacy policy](https://tavily.com/privacy) before connecting it to a workspace with sensitive prompts.

## Resources

- [Tavily API dashboard](https://app.tavily.com/home) to create and manage keys.
- [Tavily documentation](https://docs.tavily.com/) for API reference and advanced usage.
- [Tavily ↔ Vellum guide](https://docs.tavily.com/documentation/integrations/vellum) on the Tavily docs site.
- [Vellum Web Search reference](/docs/key-concepts/web-search) for the full provider matrix and fallback chain.
