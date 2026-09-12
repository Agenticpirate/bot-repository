# Architecture

Open Agent Marketplace has four layers:

1. **Data layer** — public JSON profiles for agents, squads, skills, and categories.
2. **Schema layer** — JSON Schema definitions that make the data portable.
3. **Marketplace layer** — search, filter, browse, and detail views.
4. **Composition layer** — squads combine multiple agents into workflow-ready teams.

```txt
agents.json  -> searchable cards
skills.json  -> capability bindings
squads.json  -> prebuilt teams
API/UI       -> browse, search, copy, fork, install
```

The repository is intentionally framework-light so teams can adapt it to Next.js, Astro, Remix, static GitHub Pages, or a backend API.
