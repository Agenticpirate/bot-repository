# Awesome List for Grok Bot Plugins [![Awesome](https://awesome.re/badge.svg)](https://awesome.re) [![Last Commit](https://img.shields.io/github/last-commit/rdmgator12/awesome-grok-bot-plugins)](https://github.com/rdmgator12/awesome-grok-bot-plugins/commits/main)

<p align="center">
  <img src="media/banner.svg" alt="Awesome Grok Bot Plugins" width="800">
</p>

> A directory of the plugins in [Grok Bot](https://x.ai/bot)'s in-app marketplace (Settings, Plugins) — {{LISTED}} listings across the {{CAPTURE_DATE}} catalog capture, plus {{HELD}} held pending marketplace-URL verification, organized by the catalog's own categories with descriptions and use cases.

**Last updated:** {{LAST_UPDATED}} | **Plugins tracked:** {{LISTED}} listed + {{HELD}} held | **Categories:** {{NCAT}}

xAI's teammate product: named agents on a persistent cloud computer. The full model, eligibility, and how plugins fit are in What is Grok Bot, first section below.

This list is maintained weekly. To contribute, see [CONTRIBUTING.md](CONTRIBUTING.md).

> This is an independent, community-maintained list. Not affiliated with, endorsed by, or sponsored by xAI Corp, X.AI LLC, Cursor (Anysphere), SpaceX, or any Musk-affiliated entity. "Grok", "Grok Bot", and related marks are the property of xAI. "Cursor" is the property of Anysphere. Each plugin is the property of its respective owner.

> [!TIP]
> ### Plugin Snap Stack — August 12, 2026
>
> Same format as the connector lists: a persona plus a small stack that clicks together. Past stacks will live in [docs/stacks](docs/stacks/). Sweep history lives in the [changelog](docs/CHANGELOG.md).
>
> **The overnight sales outbound Bot** — Apollo.io · Clay · Gong · HubSpot · running on **Grok Bot**
>
> One Bot, four plugins: research and score accounts in Apollo, enrich the shortlist in Clay, pull the last-call brief from Gong, then write the CRM note and next step in HubSpot before asking for approval on the outbound draft. Composed from the day-0 Grok Bot catalog, not yet field-tested — if you run it on a live book, send a Field Report (see CONTRIBUTING).
>
> Disclaimer: This is a free, public, community-maintained list. Not affiliated with, endorsed by, or sponsored by Grok, xAI Corp, SpaceX, or any Musk-affiliated entity. "Grok" and related marks are the property of xAI Corp. Each connector is the property of its respective owner. No fees, no paid placement, no commercial relationship with any vendor listed.

---

## Contents

- [What is Grok Bot](#what-is-grok-bot)
{{TOC}}

---

## What is Grok Bot

[Grok Bot](https://x.ai/news/introducing-grok-bot) is xAI's teammate product, opened as an early beta on August 11, 2026. It is not a chat window with a few tools bolted on. Each Bot is a named, persistent agent that works on a **cloud computer of its own** — browser, filesystem, and terminal — and keeps working after the laptop closes.

You message a Bot the way you would text a colleague. A good handoff names the outcome, the apps or files it should use, the constraints, the deliverable, and when to stop for approval. The Bot then signs into those tools and finishes the work *in the actual product*, not as a draft in chat. Passwords, passkeys, 2FA, CAPTCHAs, and payments stay with you: the Bot pauses, you take over the computer for that step, then you hand it back. xAI's own framing is the last ten percent: most assistants get a task almost done; a Bot is supposed to land it where a human would put it.

All Bots on an account share one computer. Browser sessions, `/workspace` files, and CLI credentials are account-scoped, not Bot-scoped. That is why a handoff works without re-setup, and why a login you complete for one Bot is available to the others. Several Bots can run in parallel, message each other, and sit in a group thread. Focused Bots (sales outbound, inbox, bug reproduction) beat one catch-all.

Show a Bot a workflow once and it can save that path as a **routine** and re-run it on a schedule. Over time it keeps memory, preferences, files, and signed-in sessions, so the second Friday close is cheaper than the first.

**Who can use it today.** SuperGrok Heavy, Cursor Ultra, and Cursor Teams Premium. Desktop apps for macOS and Windows, plus iOS. No Linux desktop app yet. Enterprise is a waitlist. Grok Bot requires cloud data storage; Cursor Legacy Privacy Mode accounts have to move to a supported data setting before a Bot will start.

**How plugins fit.** In the app, structured connections appear under **Settings, Plugins**. They are [Cursor Marketplace](https://cursor.com/marketplace) bundles — skills, MCP servers, slash commands, and related agent primitives. After install, `@` attaches a plugin to the task and `/` calls a saved skill. Prefer a plugin when one exists: it is usually more reliable than clicking through a website. Use the Bot's browser for services without a plugin, or for visual workflows the plugin does not expose. Installed plugins are account-wide.

> [!IMPORTANT]
> Four xAI surfaces, four jobs. This list is only Grok Bot's plugin catalog.
>
> - **Grok** (grok.com) is the chat assistant.
> - **Grok Connectors** are OAuth tiles *inside that chat* — email, calendar, files. Tracked in awesome-grok-connectors (see Related).
> - **Grok Build** is the local terminal coding agent, with its own marketplace at `xai-org/plugin-marketplace`.
> - **Grok Bot** is a team of cloud-computer agents. Plugins here are how a Bot gets a structured hook into a supported service. The public listing lives on the Cursor Marketplace; the inclusion gate for *this* list is the Grok Bot in-app catalog (Settings, Plugins).
>
> A plugin is not required to use a Bot. Computer-use covers apps with no API. The catalog below is the structured layer.

{{CATEGORY_SECTIONS}}

## Held for Verification

Every listed link is the vendor's public product page when one exists. Cursor Marketplace URLs appear only when there is no public company or product site. Entries that appear in the Grok Bot in-app catalog but have no confirmed URL are listed here without a link rather than with a guessed one.

{{HELD_TABLE}}

## Related

- [awesome-grok-connectors](https://github.com/rdmgator12/awesome-grok-connectors) - Grok.com chat connectors and skills, a different xAI surface.
- [awesome-claude-connectors](https://github.com/rdmgator12/awesome-claude-connectors) - Companion list for Anthropic's Claude Connectors catalog.
- [awesome-claude-plugins](https://github.com/rdmgator12/awesome-claude-plugins) - Companion list for Claude Code and Cowork plugins.
- [awesome-mcp-servers](https://github.com/punkpeye/awesome-mcp-servers) - Model Context Protocol servers powering many of the plugins above.
- Cursor Marketplace - Official install surface this list tracks (linked in the introduction).
- [Grok Bot docs](https://docs.x.ai/grok-bot/overview) - xAI product documentation.

---

[![CC0](https://licensebuttons.net/p/zero/1.0/88x31.png)](https://creativecommons.org/publicdomain/zero/1.0/)

To the extent possible under law, [Ralph Martello](https://github.com/rdmgator12) has waived all copyright and related or neighboring rights to this work.
