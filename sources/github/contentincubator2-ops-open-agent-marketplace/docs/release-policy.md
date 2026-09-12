# Public Agent Release Policy

This repo publishes public-safe agent profiles, not raw internal data exports.

## Release tiers

| Tier | Target count | Status | Requirement |
|---|---:|---|---|
| Starter samples | 25–50 | Active | Handwritten examples and docs |
| Curated public pack | 300–500 | Active | Scrubbed, fictionalized, deduplicated public profiles |
| Expanded public pack | 800–1,000 | Planned | Full sensitivity sweep plus category balancing |
| Transformed library | 2,000–4,000 | Planned | Automated anonymization, rewrite, review, and eval pass |
| Complete private library | 16,000+ | Not public | Hosted or commercial product layer only |

## Public export schema

Public agent packs may include:

- `slug`
- `name` using fictional public personas
- `title`
- `layer`
- `category`
- `primarySkill`
- `industries`
- `summary`
- `exampleTasks`
- `pricingTier`
- `channelExpertise`
- `funnelStage`
- `deliverables`
- `tools` as generic public workflow aids
- `qualityRubrics`
- `riskFlags`

Public agent packs must exclude:

- private prompts
- workspace records
- customer records
- company slugs
- internal review notes
- direct tool routing
- model routing
- messaging app identifiers
- infrastructure details
- private performance metrics
- any private operational fields

## Safety gates

A profile must pass all gates before release:

1. approved public status
2. no messaging app connection fields
3. no company-specific slug or workspace trace
4. no duplicate public slug
5. no credential-like terms in public fields
6. no infrastructure or private operations terms in public fields
7. no obvious client, brand, or project identifiers
8. fictionalized public name
9. summary and example tasks rewritten for public reuse
10. schema validation and sensitivity sweep pass

## Naming policy

Public packs should avoid real people as agent personas unless the person has explicitly contributed the profile. Use fictional names and generic role titles.

## Prompt policy

Do not publish raw internal prompts. If a future pack includes runnable prompts, they must be rewritten as public templates, reviewed as standalone open-source content, and separated from private production prompts.

## Versioning policy

Use pack names that indicate release intent, not internal source tables:

- `public-curated-500`
- `public-growth-250`
- `public-sales-250`
- `public-ecommerce-250`
- `public-analytics-250`

Each pack should include a README with count, source-positioning, schema, and safety notes.
