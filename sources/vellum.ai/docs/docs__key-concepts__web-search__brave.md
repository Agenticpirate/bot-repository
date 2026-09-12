# Brave Search

Privacy-first web search with an independent index. Use Brave Search as a web search provider in your Vellum assistant for ad-free, tracking-free results.

## What it does

Brave Search is an independent search engine with its own index, built by the team behind the Brave browser. It does not track users, profile queries, or show ads. For assistants that need privacy-first web search with transparent sourcing, Brave is a strong choice.

When configured as your web search provider, Vellum routes queries through the Brave Search API and feeds the ranked results back to your assistant. The model can then read snippets, visit sources, or synthesize an answer from the retrieved pages.

## Prerequisites

- A running Vellum assistant. Cloud, self-hosted, or the desktop apps all work.
- A Brave Search API key. Create one at [api.search.brave.com](https://api.search.brave.com/app/keys). Keys start with `BSA`.

## Setup

Brave Search is BYOK (bring your own key). You stay in control of the key and pay Brave directly for usage.

1. **Open assistant settings.** In Vellum, head to Settings → Models & Services.
2. **Add your Brave Search API key.** Under the Web Search section, choose Brave Search as the provider and paste your API key. Vellum stores the key in your local secure store and never writes it to disk in plaintext.
3. **Ask something current.** Start a new conversation and ask a question that needs fresh information. Vellum calls Brave Search under the hood and feeds the results back to the model in context.

Prefer the CLI? Two commands from any shell where the assistant daemon is running:

```
assistant keys set brave BSA...
assistant config set services.web-search.provider brave
```

Swap or revoke the key at any time with `assistant keys delete brave`.

## Best practices

- **Pick Brave when privacy matters.** Brave Search has its own independent index and does not track or profile queries. For assistants handling sensitive topics, this is the most privacy-conscious option.
- **One key per workspace.** Reuse the same Brave Search key across your assistants so usage and billing stay in one place on the Brave dashboard.
- **Fallback behavior.** If Brave Search is unavailable, the assistant falls through the rest of the web search chain (Perplexity, Tavily, then Provider Native). See the [Web Search](/docs/key-concepts/web-search) page for the full fallback rules.
- **Billing.** Brave Search usage is billed directly by Brave under the account that owns the key, separately from Vellum credits.
- **Privacy.** Queries leave your assistant and reach Brave Search servers. Review the [Brave Search privacy policy](https://search.brave.com/help/privacy-policy) for details.

## Resources

- [Brave Search API documentation](https://api.search.brave.com/)
- [Brave Search API key dashboard](https://api.search.brave.com/app/keys)
- [Vellum Web Search reference](/docs/key-concepts/web-search)
