# Contributing

This list tracks every plugin in Grok Bot's in-app marketplace (Settings, Plugins). Contributions welcome.

> This is an independent, community-maintained project. Not affiliated with, endorsed by, or sponsored by xAI Corp or Cursor (Anysphere).

## How This Repo Works (Data-First)

`data/plugins.json` is the source of truth. `README.md` is generated from it -- don't hand-edit the README; CI rejects any README that doesn't match the data (`generated-in-sync` job).

To add or change an entry:

1. Edit `data/plugins.json` (add the entry object anywhere -- sorting is automatic).
2. Run `python3 scripts/generate_readme.py` (stdlib only, no dependencies).
3. Commit `data/plugins.json` and `README.md` together.

The generator validates the data before writing: duplicate names (case-insensitive), duplicate URLs, unknown categories, entry format, and terminal punctuation all fail loud with the offending entry named. `python3 scripts/generate_readme.py --check` runs the exact check CI runs.

## What You Can Contribute

### New Plugins
When Grok Bot's in-app marketplace adds plugins, submit a PR adding them to `data/plugins.json` with the catalog category, a description, and a use case.

### Improved Descriptions
If a description or use case is missing detail or could be more helpful, submit a PR with a better one.

### Category Corrections
If a plugin is in the wrong *catalog* category, submit a PR moving it. Categories follow the Grok Bot / Cursor marketplace taxonomy, not a recategorized scheme.

### Field Reports
Tested a plugin on Grok Bot and have real-world notes? Open an issue or PR with one paragraph on what worked, what didn't, what surprised you -- be specific. (The README is generated, so field reports land through the data file; the entry schema grows a field when the first report is accepted.)

## Guidelines

- One PR per change unless closely related.
- Keep descriptions concise -- one sentence for the description, one sentence for the use case.
- The use case is one sentence containing a concrete task or 2--3 comma-separated task fragments a user would actually perform with a Grok Bot (e.g. "Searching an inbox for a vendor invoice, drafting a reply, applying a label after triage."). It must NOT restate the description -- it adds scenario information the description lacks. No vendor voice ("your"/"our"), no marketing adjectives, and every capability it implies must be stated in the description.
- Provenance marker **`C`** only for listings under the Cursor publisher path (`https://cursor.com/marketplace/cursor/...`).
- Don't add plugins that are not in the Grok Bot in-app catalog. The public Cursor web marketplace is larger; web-only extras stay out until they appear in Grok Bot. This list does not track Grok Build plugins or grok.com connectors.
- Alphabetical order within categories is enforced by the generator -- add entries anywhere in `data/plugins.json`.

## Weekly Updates

This list is updated weekly to stay in sync with the Grok Bot catalog. If you notice the in-app marketplace has added plugins that aren't listed here, please open an issue or PR.

### The two surfaces

Grok Bot's plugin catalog lives on two surfaces that do not fully overlap:

- **Grok Bot in-app** (Settings, Plugins) -- the surface this list tracks. Not scrapeable; requires a manual export from a logged-in Grok Bot session.
- **Cursor Marketplace web** (`cursor.com/marketplace`) -- the public listing used to confirm identity and copy official blurbs. It includes automations and some plugins that have not appeared in Grok Bot.

**Removal rule: only remove an entry when it is absent from the Grok Bot in-app catalog.** Absence from the web marketplace alone is not evidence of delisting. Presence on the web marketplace alone is not evidence it should be added.

The day-0 capture (2026-08-12) found five public-marketplace extras that were *not* in the Grok Bot in-app roster: Figma, Merge, PagerDuty, Compound Engineering, Zenity. They stay out until a Grok Bot sighting.

Do not confuse this catalog with:

- [Grok Build Plugin Marketplace](https://github.com/xai-org/plugin-marketplace) -- local TUI agent plugins.
- [Grok Connectors](https://grok.com/connectors) -- grok.com chat OAuth tiles.

### Naming

Follow the Grok Bot in-app display name where it differs from the web listing. Those are naming drift, not separate plugins -- don't add the web variant as a second entry.

### Verification

Link the vendor's public product page when one exists. Confirm the page is that product, not a generic homepage that happens to 200. Use the Cursor Marketplace listing only when the plugin has no public company or product site (Cursor first-party tools, or a vendor we cannot identify). Never guess a URL.

Marketplace slugs still live in `data/plugins.json` (`slug`) and `data/vendor-urls.json` is the vendor-URL map. Rebuild with `python3 scripts/build_plugins.py` after editing either file.

### Held entries

Catalog entries whose vendor URL cannot be confirmed, and that also lack a marketplace listing, are published in **Held for Verification** -- name, catalog description, and the reason held, with no link. Presence in the Grok Bot in-app catalog is still required.

If you are the vendor of a held entry, or you know the canonical product page, open an issue or PR with the URL. The entry graduates once the page confirms the product.

### Plugin Snap Stacks

Each sweep features a Plugin Snap Stack in the README tip: a persona plus a small stack of plugins that click together, run through Grok Bot. Composition rule: at least one plugin new to the list and at least one proven one (the 2026-08-12 debut used four new entries because the whole list is new; that is the exception, not the pattern). Stacks are archived in docs/stacks/; sweep statistics live in docs/CHANGELOG.md. A stack write-up must not assert outcomes that have not been field-tested -- mark untested stacks as composed, and upgrade them when a Field Report comes in.
