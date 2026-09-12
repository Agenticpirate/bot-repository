# Private 16,000+ Agent Library

Open Agent Marketplace is built from the operating pattern behind a much larger private agent library.

We maintain a private library of **16,000+ specialized business agents** across marketing, growth, sales, analytics, content, operations, product, research, and industry-specific roles. This repository does **not** publish that private library as a raw dump. Instead, it publishes public-safe schemas, workflows, squad recipes, evaluation tools, and curated public agent packs.

## Why the complete library is not raw-opened

A large internal agent library contains several kinds of material that should not be published directly:

- private workspace fields
- customer- or company-specific records
- tool routing and model configuration
- operational notes and internal review fields
- duplicate or draft marketplace entries
- non-public names, brands, and project traces
- rows that are marketplace profiles rather than runnable open-source packages

Publishing a smaller curated set creates a better open-source product: easier to browse, easier to fork, safer to contribute to, and clearer for developers who want to build their own agent marketplace.

## Public release model

| Layer | Count | What is published |
|---|---:|---|
| Launch starter set | 28 | Handwritten sample agents, squads, workflows, and evals |
| Public Curated 500 | 500 | Public-safe transformed marketplace profiles |
| Future public packs | 800–1,000 | Additional scrubbed and deduplicated public profiles |
| Transformed public library | 2,000–4,000 | Requires anonymization, rewrite, taxonomy normalization, and QA |
| Complete private library | 16,000+ | Hosted/commercial layer, not raw GitHub export |

## Current public pack

The first scaled pack is available here:

- [`agents/public-curated-500/`](../agents/public-curated-500/)
- [`data/agents.public-curated-500.json`](../data/agents.public-curated-500.json)

The pack was generated from a larger candidate pool using a public-release filter:

1. approved and available profiles only
2. no Slack app or bot fields
3. English public title and profile copy present
4. no company slug
5. no obvious brand, client, or project slug
6. no credential, infrastructure, internal, or direct side-effect terms in public fields
7. deduplicated public slugs
8. fictionalized public names
9. public profile schema only

## What is intentionally excluded

The public pack excludes raw private prompts, private workspace names, internal task notes, model routing, tool access, customer records, private performance metrics, and any fields that are not needed for a public marketplace profile.

## How to use this positioning

Recommended external language:

> We maintain a private library of 16,000+ specialized agents. This open-source repo provides a curated public starter set, schemas, workflows, squad recipes, and evaluation tools for building your own agent marketplace.

This lets the project communicate real scale while keeping the public repo clean, safe, and useful.
