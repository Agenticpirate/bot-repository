# stripe

- Marketplace: Grok Build Plugin Marketplace (Plugins catalog)
- Source of truth: https://github.com/xai-org/plugin-marketplace
- Catalog revision: `1581c908c0244fd5f6f59051e4a1ce65814e86ab`
- Category: development
- Homepage: https://github.com/stripe/ai
- Keywords: stripe, stripe payments, stripe connect, stripe mcp, stripe billing
- Domains: stripe.com, docs.stripe.com, dashboard.stripe.com

## Description

Stripe development plugin for Grok Build: best practices, API/SDK upgrade guidance, and the Stripe MCP server.

## Source pin

```json
{
  "source": "url",
  "url": "https://github.com/stripe/ai.git",
  "sha": "da4991b0a0b9299d423ae2d5856e6d7e2b31b031",
  "path": "providers/grok/plugin"
}
```

## Components (plugin-index.json)

### agents

- **company-researcher**: Research a company from its URL or description to infer Stripe Connect integration shape

### commands

- **explain-error**: Explain Stripe error codes and provide solutions with code examples
- **test-cards**: Display Stripe test card numbers for various testing scenarios

### mcpServers

- **stripe**: http

### skills

- **connect-recommend**: Use this skill when the user asks about Stripe Connect configuration, charge patterns, Dashboard access, or how to get…
- **connect-required-verification-information**: Use this skill when the user asks what information a Stripe Connect connected account must provide for verification, on…
- **stripe-apps**: Use when building, modifying, or reviewing a Stripe App — or when the user describes something that implies one (e.g. "…
- **stripe-best-practices**: Guides Stripe integration decisions across development and test environment planning (separate sandboxes vs the shared…
- **stripe-directory**: Identifies external providers, merchants, nonprofits, platforms, APIs, and software services, and resolves the document…
- **stripe-docs**: Use when the user or agent needs to read, search, or look up Stripe documentation or API reference. Prefer this over cu…
- **stripe-pay**: Helps users send funds to another Stripe business, transfer money to a Stripe Profile handle or network ID, or ask whet…
- **stripe-projects**: Use when the user wants to provision infrastructure or third-party services using Stripe Projects. Triggers: "I need a…
- **upgrade-stripe**: Guide for upgrading Stripe API versions and SDKs
