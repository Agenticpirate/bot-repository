# Web Search

How your assistant looks things up online: the six built-in providers, the fallback chain, and how each one is billed.

## Overview

Web search lets your assistant pull live information from the internet to answer questions, verify claims, and ground its responses in current sources. Whenever a conversation, scheduled task, or skill needs information that isn't in your workspace, the assistant can call out to a search provider, read the results, and cite the sources it used.

You control which provider runs that search and how it's billed. Vellum's managed search works out of the box on your platform account, your inference provider's native search can handle it in-model, or you can connect your own API key for a dedicated search engine like Perplexity, Brave Search, Tavily, or Firecrawl.

## Providers

Six providers ship with every workspace. Managed providers need no API key and bill through your Vellum account; BYOK providers call the vendor directly with a key you connect and bill you there.

| Provider        | Kind    | Notes                                                                                                                                                                                                                                             |
| --------------- | ------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Vellum          | Managed | Searches run through Vellum's managed search service. No setup, no API key. Metered from your Vellum account balance.                                                                                                                             |
| Provider Native | Managed | Hands the search to the inference provider, so quality and freshness follow whichever LLM you have selected. When the selected model has no native search, the assistant falls back to any connected search key, then to Vellum's managed search. |
| Perplexity      | BYOK    | Synthesized answers with inline citations. Default first choice in the fallback chain. Pulls from the Perplexity Search API.                                                                                                                      |
| Brave Search    | BYOK    | Independent index, no tracking, supports freshness filtering. Good default for privacy-leaning workspaces.                                                                                                                                        |
| Tavily          | BYOK    | Search API designed for AI agents. Returns scored results with extracted content blocks.                                                                                                                                                          |
| Firecrawl       | BYOK    | Search plus full-page scraping. Returns clean markdown, including for JavaScript-rendered pages. One key also powers web fetch.                                                                                                                   |

For each BYOK provider you connect, your assistant stores the key locally and uses it for every web search until you disconnect or switch providers. Provider privacy policies: [Perplexity](https://www.perplexity.ai/hub/legal/privacy-policy), [Brave](https://search.brave.com/help/privacy-policy), [Tavily](https://tavily.com/privacy), [Firecrawl](https://www.firecrawl.dev/privacy-policy).

## Choosing a provider

Side-by-side comparison across the dimensions that usually matter.

| Dimension         | Vellum                                      | Provider Native                         | Perplexity                                | Brave                                    | Tavily                                                 | Firecrawl                                              |
| ----------------- | ------------------------------------------- | --------------------------------------- | ----------------------------------------- | ---------------------------------------- | ------------------------------------------------------ | ------------------------------------------------------ |
| Setup             | None. Works out of the box.                 | None. Works out of the box.             | API key required                          | API key required                         | API key required                                       | API key required                                       |
| Billing           | Vellum credits, metered per search          | Bundled with inference (Vellum credits) | Direct to Perplexity                      | Direct to Brave                          | Direct to Tavily                                       | Direct to Firecrawl                                    |
| Result style      | Raw ranked results (title, URL, snippet)    | Depends on the LLM you selected         | Synthesized answer with inline citations  | Raw ranked results (title, URL, snippet) | Scored results with extracted content blocks           | Clean markdown, full pages included                    |
| Index source      | Vellum's managed search service             | Whatever the LLM provider uses          | Aggregates multiple search engines        | Independent crawl, not Google or Bing    | Aggregates multiple search engines                     | Aggregates multiple search engines                     |
| Freshness control | Supported (day / week / month / year)       | Not exposed                             | Not exposed                               | Supported (day / week / month / year)    | Supported                                              | Supported                                              |
| Privacy           | Processed by Vellum's search infrastructure | Subject to LLM provider terms           | Standard SaaS                             | No query tracking                        | Standard SaaS                                          | Standard SaaS                                          |
| Agent ergonomics  | General-purpose search shape                | Hidden behind the LLM                   | Pre-synthesized, agent can quote directly | General-purpose search shape             | Built for agents (scores, content blocks, raw content) | Search plus full-page scrape, reads JS-rendered pages  |
| Best for          | Zero-setup search billed to one account     | Default setups, low overhead            | Cited answers in chat                     | Privacy-leaning workspaces               | Agentic workflows with extraction                      | Scraping JS-heavy pages; search and fetch from one key |

If you're unsure, start on Vellum or Provider Native and switch only when you hit a concrete reason to.

## Configuring web search

Web search is configured in **Settings → AI → Web Search**.

1. Choose a **provider** from the dropdown. Vellum and Provider Native need no further setup.
2. For a BYOK provider (Perplexity, Brave, Tavily, or Firecrawl), paste your API key into the field below the dropdown. Keys are stored locally on the device that runs your assistant.
3. Optionally connect keys for more than one BYOK provider. The extras become fallbacks if the primary provider fails or runs out of quota. See [Fallback behavior](#fallback) below.

Changing the provider takes effect immediately for the next search; in-flight searches finish on the previously configured provider.

## Fallback behavior

On **Vellum**, there is no fallback: search errors (including an exhausted account balance) surface directly so your searches are never silently rerouted to a key you pay for elsewhere. On **Provider Native**, the model's own hosted search runs first, then any connected search keys, then Vellum's managed search. On a **BYOK provider**, your assistant tries the provider you selected first; if it has no key configured or its request fails with a retryable error, the daemon walks the fallback chain in this order:

1. Perplexity
2. Brave Search
3. Tavily
4. Firecrawl

The chain skips any provider that doesn't have a key connected. If none of them have keys, the search returns an error and the assistant tells you it couldn't reach the web. Connecting more than one BYOK key is the simplest way to keep search resilient when an upstream provider has an outage.

## Billing

Web search is one of four chargeable categories in the Vellum platform, alongside LLM inference, image generation, and paid third-party APIs.

- On **Vellum**, each search is metered from your Vellum account balance.
- On **Provider Native**, search cost is bundled into the inference call that triggered it. You pay Vellum credits the same way you pay for any other LLM request.
- On a **BYOK provider**, the search vendor bills you directly under your account with them. Vellum doesn't mark up or proxy these requests.

For pricing details and credit denominations, see the [pricing page](/docs/pricing).

## Tavily Integration

Tavily is a search API designed specifically for AI agents. For a step-by-step walkthrough of connecting your Tavily API key, provider configuration, and advanced usage, see the [Tavily integration page](/docs/key-concepts/web-search/tavily).

## Perplexity Integration

Perplexity is an AI-powered search engine that synthesizes answers with inline citations. For a step-by-step walkthrough of connecting your Perplexity API key, provider configuration, and advanced usage, see the [Perplexity integration page](/docs/key-concepts/web-search/perplexity).

## Brave Search Integration

Brave Search is a privacy-first web search engine with an independent index. For a step-by-step walkthrough of connecting your Brave Search API key, provider configuration, and advanced usage, see the [Brave Search integration page](/docs/key-concepts/web-search/brave).

## Firecrawl Integration

Firecrawl combines web search with full-page scraping, returning clean markdown even for JavaScript-rendered pages, and a single key powers both web search and web fetch. For a step-by-step walkthrough of connecting your Firecrawl API key, provider configuration, and advanced usage, see the [Firecrawl integration page](/docs/key-concepts/web-search/firecrawl).
