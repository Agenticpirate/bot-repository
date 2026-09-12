# agent-hunt.netlify.app (Agenthunt)

Archived `2026-09-12T21:29:58Z` from https://agent-hunt.netlify.app/.

**58** agents in `meta/agents.json` (live count verified).

The site **updates twice daily** (homepage note: “Updated twice a day”). Curated by [KP](https://x.com/thisiskp_). Not affiliated with the listed products.

Hash `#ezail` is the wordmark/shuffle token that highlights the [Ezail](https://www.ezail.com/) listing; per-agent files live under `agents/ezail/`. Ezail homepage snapshot: [`sources/ezail.com/`](../ezail.com/).

## Saved

- `pages/homepage.html`
- `assets/app.js`, `assets/styles.css`, `assets/favicon.svg`
- `meta/agents.json` (canonical feed)
- `agents/<id>/meta.json` (copy of each object) + `agents/<id>/agent.md` (name, url, oneLiner, category, launched, raised, launchUrl)
- `meta/discovery.json` — light homepage + common-feed pass per outbound URL
- `robots.txt` / `sitemap.xml` / `llms.txt` were **404** (see ERRORS.md)
- `meta/visits.json` if `/api/visits` responded

## Outbound discovery

Light fetch of each agent homepage plus `/llms.txt`, `/robots.txt`, `/sitemap.xml`, `/agents.json`, and marketplace/docs paths. Paywalled apps were not deep-scraped (`humane-ai-pin` has no public URL).

**New public galleries archived:**

| Domain | Why it counts as a gallery | Local |
| --- | --- | --- |
| [vellum.ai](https://www.vellum.ai/skills) | Public **AI Assistant Skills Catalog** (75 skills, installable) | [`sources/vellum.ai/`](../vellum.ai/) |
| [moldable.sh](https://moldable.sh/bots) | Public **Bots for every role** listing | [`sources/moldable.sh/`](../moldable.sh/) |
| [ezail.com](https://www.ezail.com/) | Requested Ezail snapshot (homepage + llms.txt + sitemap) | [`sources/ezail.com/`](../ezail.com/) |

Most other outbound sites publish a marketing `llms.txt` / product homepage only — noted in `meta/discovery.json`, not copied into their own `sources/` trees. x.ai Grok Bot is already archived under `sources/x.ai-bot-marketplace/`. Muse (`muse.ai`) is a login-walled product; cookbooks stay under `sources/muse-research/`.
