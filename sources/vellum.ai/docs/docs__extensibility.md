# Extensibility

Build on top of Vellum with plugins. A plugin bundles hooks, tools, and more into a single installable package that extends what your assistant can do.

This section covers how you can teach your Assistant to extend itself by building new features without touching the core harness logic.

## What is a plugin?

A plugin is a directory in your assistant's workspace (`<workspaceDir>/plugins/<name>/`) that groups different surfaces into one cohesive capability that they can now perform. Your assistant can build plugins directly in this folder in the workspace or install one from the community via the CLI:

```
assistant plugins install <name>
```

Plugins can also be discovered and managed from the Plugins tab in the app, or searched from the CLI with `assistant plugins search`. The catalog is a curated allowlist that the Vellum team approves and curates.

## The surfaces a plugin can bundle

A single plugin can contribute several different kinds of behavior. Each surface is discovered by convention from a named subdirectory. Missing directories are simply skipped, so a plugin contributes only what it ships.

| Surface                                          | Lives in                | What it does                                                                                                                                   |
| ------------------------------------------------ | ----------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| [Lifecycle hooks](/docs/extensibility/hooks)     | `hooks/<name>.ts`       | Run code at fixed points in the Assistant's lifecycle to read or transform what flows through.                                                 |
| [Skills](/docs/extensibility/skills)             | `skills/<name>/`        | Directories of instructions and associated assets, scripts, and resources that the Assistant loads dynamically when relevant.                  |
| [Model-visible tools](/docs/extensibility/tools) | `tools/<name>.ts`       | Add new tools the model can call. Plugin tools land in the same catalog as built-in tools.                                                     |
| [MCP servers](/docs/extensibility/mcp)           | `mcp.json`              | Declare MCP servers the assistant connects on install. Their tools land as `mcp__<id>__<tool>` alongside workspace-configured MCP tools.       |
| [HTTP routes](/docs/extensibility/routes)        | `routes/<path>.ts`      | Serve HTTP endpoints in the plugin's own `/x/plugins/<name>/` namespace (apps, local callers, and the handler behind public ingress).          |
| [Channels](/docs/extensibility/channels)         | `channels/ingress.json` | Declare public webhook and WebSocket routes that make the plugin a channel. The gateway signature-checks them and forwards to matching routes. |
| [Apps](/docs/extensibility/apps)                 | `apps/<app>/`           | Ship persistent, interactive apps (dashboards, tools, games) served in the workspace panel, built as compiled React.                           |

The two extensibility patterns serve different goals. **Plugins are for distribution**: you intend to share the capability, publish to the marketplace, or install it across multiple assistants. The plugin manifest (`package.json`), the `@vellumai/plugin-api` peer dependency, and the install flow exist to make a capability portable, versioned, and discoverable by others.

**Direct workspace contributions are for personal extension**: you simply want to extend *your* assistant and have no intention of distributing the work. Skip the plugin packaging entirely. Drop the file directly into the matching top-level workspace directory (`/workspace/tools/<name>/` for a tool, `/workspace/skills/<name>/` for a skill, `/workspace/hooks/<event>.ts` for a lifecycle hook) and the assistant picks it up automatically. No manifest, no install step, no peer dependency. MCP servers can also be added in settings without a plugin; `mcp.json` is the way to ship them with one.

Several surfaces that plugins contribute run in the same process as the main Assistant process. They can import all internal methods from the Assistant from the single public package, [`@vellumai/plugin-api`](https://github.com/vellum-ai/vellum-assistant/tree/main/assistant/src/plugin-api), which is the only supported contract. Anything not exported from there is internal and can change without notice.

## Developing plugins

If you have an idea for a capability your assistant lacks, lean on your assistant to do the work. Describe what you want in plain language and let it scaffold the plugin, fill in the surfaces, and handle the publishing flow. Most users never need to touch the `assistant plugins` CLI directly: your assistant runs those commands on your behalf when you ask it to install, search, or publish.

The pages in this section are also available to your assistant through the `plugin-builder` skill, so when you ask it to build a plugin it will reference the same surface contracts, manifest fields, and CLI commands documented here. The docs you are reading and the skill your assistant reads are kept in sync.

If you do want to drive the process yourself — whether to learn how plugins work or to build one without involving your assistant — the CLI and the page-by-page references below cover everything end to end.

## Coming from another harness?

Vellum's plugin model was designed to line up with the agent harnesses you may already use. The shared vocabulary is deliberate to be as portable as possible with the other entrants in the industry.
