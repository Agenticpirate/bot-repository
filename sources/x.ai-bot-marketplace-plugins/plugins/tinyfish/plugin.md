# tinyfish

- Marketplace: Grok Build Plugin Marketplace (Plugins catalog)
- Source of truth: https://github.com/xai-org/plugin-marketplace
- Catalog revision: `9963e48f7a4a641d4f3a791cec55b089dd4aefa6`
- Category: development
- Homepage: https://www.tinyfish.ai
- Keywords: tinyfish, tinyfish agent, tinyfish web agent, agentql
- Domains: tinyfish.ai, agent.tinyfish.ai, docs.tinyfish.ai

## Description

Web search, content extraction, and goal-driven browser automation via TinyFish's hosted MCP server. Search and fetch pages for free, then drive real multi-step workflows on live sites — including authenticated ones, using saved Browser Context Profiles and password-manager credentials. Sign in with your TinyFish account on first connection; no API key needed.

## Source pin

```json
{
  "source": "url",
  "url": "https://github.com/tinyfish-io/tinyfish-web-agent-integrations.git",
  "sha": "89457fba3fa44c7b2227807948628011983ab668",
  "path": "grok"
}
```

## Components (plugin-index.json)

### mcpServers

- **tinyfish**: http

### skills

- **tinyfish-authenticated**: Automate websites the user is logged into, using TinyFish Browser Context Profiles and Vault credentials. Use when a ta…
- **tinyfish-automation**: Goal-driven browser automation with TinyFish. Use when a task needs a real browser to act on a site — clicking, filling…
- **tinyfish-browser**: Create a remote stealth Chrome session with TinyFish and control it over CDP. Use when the task needs programmatic brow…
- **tinyfish-research**: Web research powered by TinyFish search and fetch. Use for any question needing current web information, and for deep r…
- **tinyfish-web**: Pick the right TinyFish tool for a web task. Use when a request involves the live web — searching, reading pages, extra…
