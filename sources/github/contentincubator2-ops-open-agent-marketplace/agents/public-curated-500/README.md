# Public Curated 500 Agent Pack

This directory contains 500 public-safe agent profiles derived from a private 16,000+ agent library.

The pack is intentionally **not** a raw database export. Every profile is transformed into a public marketplace profile with:

- fictional names
- public-safe titles and summaries
- no raw internal prompts
- no customer-specific records
- no tool access, model routing, credentials, or private operational fields
- deduplicated public slugs

Use the combined JSON file at [`../../data/agents.public-curated-500.json`](../../data/agents.public-curated-500.json) for demos and imports.

## Counts

- Private library size audited: 16,113 agents
- Public-safe candidate pool for this export: 1,689 agents
- Published in this pack: 500 agents

## Schema

Each profile follows [`../../schema/agent.schema.json`](../../schema/agent.schema.json) and includes only public profile fields: role, layer, category, skill, summary, example tasks, funnel coverage, deliverables, and quality rubrics.
