# Tools

Add new actions the model can call. A plugin tool lands in the same catalog as the Assistant's built-in tools, so the model picks it up with no extra wiring.

A tool is a default-exported object from `tools/<name>.ts`. The loader derives the model-visible tool name from the file basename, so `tools/example.ts` becomes the `example` tool. Plugin tools register in the same catalog as built-in tools and are offered to the model through the standard tool-calling interface.

## What a tool is

A tool is something the model chooses to call. You describe what it does and what arguments it takes, and the model decides when to invoke it. When it does, the Assistant runs your `execute` function and feeds the result back into the turn.

Every field on a tool definition is optional. The loader fills documented defaults for anything you omit, so `export default {}` is a valid (if useless) tool. A broken or misconfigured tool never blocks the rest of the plugin from loading; the problem surfaces at call time instead.

## Tool reference

These are the fields a tool definition can set. Names and types come from `ToolDefinition` in [`@vellumai/plugin-api`](https://github.com/vellum-ai/vellum-assistant/tree/main/assistant/src/plugin-api).

| Field              | Type                                           | Default                | Description                                                                                                                                                                                                                       |
| ------------------ | ---------------------------------------------- | ---------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `name`             | `string`                                       | File basename          | Name the model sees when calling the tool. Loaders default to the source file basename, so tools/example.ts becomes example. Only set this to override the file-derived name.                                                     |
| `description`      | `string`                                       | ""                     | Human-readable description shown to the model in the tool catalog. This is how the model decides when to call the tool, so write it for the model.                                                                                |
| `input_schema`     | `object (JSON Schema)`                         | Empty object schema    | JSON Schema describing the tool's input arguments. The model is constrained to this shape when it calls the tool.                                                                                                                 |
| `defaultRiskLevel` | `"low" \| "medium" \| "high"`                  | "medium"               | Author-asserted risk band the gateway weighs against the user's risk tolerance to decide whether a call runs automatically or pauses for approval. Defaults to medium. See Risk level and category below for what each band does. |
| `category`         | `string`                                       | None                   | Free-form label a permission policy can allow or block by name via allowedToolCategories. Optional; see Risk level and category below for how to pick one.                                                                        |
| `executionTarget`  | `"sandbox" \| "host"`                          | Resolved automatically | Where the tool runs: the sandbox (assistant container) or the host (guardian device, via proxy). When omitted, resolved by name prefix: host\_\* and computer\_use\_\* default to host, everything else defaults to sandbox.      |
| `execute`          | `(input, ctx) => Promise<ToolExecutionResult>` | Unimplemented error    | Implementation invoked when the model calls the tool. When omitted, the loader synthesizes a result that reports the tool as unimplemented.                                                                                       |

### Risk level and category

Two fields decide whether and where the model is allowed to call your tool. `defaultRiskLevel` gates it against the user's permission settings, and `category` lets a permission policy allow or block it by group. Both are optional, but picking them deliberately is what makes a tool feel safe to run unattended.

#### `defaultRiskLevel`: how risky the call is

You assert how sensitive the tool's worst-case action is. The gateway compares that band against the user's configured *risk tolerance* to decide whether the call auto-approves or stops for an approval prompt. The three bands mirror how built-in tools are classified:

- **low** covers read-only work with no side effects (reading files, searching, recalling memories). At the default risk tolerance these auto-approve, so a `low` tool typically runs with *no prompt at all*. This is the band that skips the confirmation.
- **medium** covers operations that change state (writing files, calling external APIs, running commands that modify things). Whether these prompt depends on the user's tolerance: at the default setting they prompt; a user who has raised their tolerance lets them through. This is the fallback when you omit the field.
- **high** covers destructive or sensitive actions (deleting data, modifying skill source, running `sudo`). These *always* prompt, with a red risk badge and the full tool input shown, unless the user has explicitly chosen Full access.

Set the band to match the most sensitive thing your `execute` can do. Under-stating it, like tagging a tool that writes files as `low`, means it can run unattended for users who have loosened their tolerance, which is exactly the case the prompt exists to catch. For the full mapping of bands to tolerance thresholds and what each approval prompt looks like, see [The permissions model](/docs/trust-security/the-permissions-model).

#### `category`: which policies may use the tool

`category` is a free-form label, any non-empty string, not a fixed enum. Its job is tool-policy enforcement: a permission policy can list categories under `allowedToolCategories`, and only tools whose `category` appears in that list are offered under that policy. Today that surfaces as per-channel permission profiles (see [Channels](/docs/key-concepts/channels)), where a policy that allows `coding` admits every tool tagged `category: "coding"` and blocks the rest.

So “which category?” is really “how do I want policies to group this tool?” Pick a short, stable label and reuse the same one across related tools, so giving all your terminal-style tools `category: "terminal"` lets a single rule govern them together. Align with the labels built-in tools already use (for example `coding` and `terminal`) so your tool rides existing rules instead of forcing admins to add a new one. If you never scope the tool by policy, leave `category` unset.

### The execute context

`execute(input, ctx)` receives the model-supplied `input` (validated against your `input_schema`) and a `ToolContext`, and returns a `ToolExecutionResult`. The stable `ToolContext` surface a plugin tool should rely on is listed below. The host threads additional routing, permission, and trust metadata onto the context, but those fields are internal and still being narrowed while plugins are in beta, so don't depend on them.

| Field            | Type                       | Description                                                                                                           |
| ---------------- | -------------------------- | --------------------------------------------------------------------------------------------------------------------- |
| `conversationId` | `string`                   | Conversation this tool invocation belongs to.                                                                         |
| `workingDir`     | `string`                   | Working directory the assistant was launched from.                                                                    |
| `requestId`      | `string?`                  | Per-turn request id for cross-component log correlation.                                                              |
| `signal`         | `AbortSignal?`             | Cooperative cancellation. Check signal.aborted periodically, or forward it to fetch and child-process options.        |
| `onOutput`       | `(chunk: string) => void?` | Incremental-output callback for streaming tools. Fall back to returning the full result in content when it is absent. |
| `assistantId`    | `string?`                  | Logical assistant scope for multi-assistant routing.                                                                  |
| `isInteractive`  | `boolean?`                 | True when an interactive client is connected (not just a no-op callback).                                             |

And the result is what the model sees back:

| Field           | Type              | Description                                                                                             |
| --------------- | ----------------- | ------------------------------------------------------------------------------------------------------- |
| `content`       | `string`          | Text result shown to the model in the tool-result block. An empty string is valid.                      |
| `isError`       | `boolean`         | When true, the agent loop treats content as an error and may surface it or retry.                       |
| `status`        | `string?`         | Short status message for client display, such as "truncated" or "timed out".                            |
| `yieldToUser`   | `boolean?`        | When true, the loop returns control to the user after this result instead of making another model call. |
| `contentBlocks` | `ContentBlock[]?` | Rich content blocks (for example images) to include alongside the text result.                          |

## Resolution order

All tools (built-in, plugin, workspace, and MCP) land in one shared catalog. When the model calls a tool, the runtime looks it up by name. When two sources register the same name, the higher-precedence source wins:

1. **Core tools**. Registered at startup. They take precedence over plugin and MCP tools: a plugin or MCP tool with the same name is skipped with a warning.
2. **Workspace tools**. Filesystem overrides under `/workspace/tools/`. These are the explicit exception to registration order: a workspace override always shadows a core tool of the same name, regardless of when it was discovered.
3. **MCP server tools**. Registered when an MCP server connects. Conflicts with core or workspace tools are skipped; conflicts with plugin tools are resolved by first registration.
4. **Built-in default plugin tools**. Vellum ships a set of default plugins alongside the Assistant. Their tools register during bootstrap, before any user-installed plugin tools.
5. **User plugin tools**. Registered at boot, ordered by the plugin's original install date (same ordering as hooks: `install-meta.json` → directory birthtime → unknown). A user plugin tool that collides with a core, workspace, MCP, or default plugin tool is skipped. A collision between two different user plugins with the same tool name fails registration.

The model sees the full catalog regardless of source. Pick distinctive tool names to avoid collisions. The loader derives the name from the file basename, so namespacing with a prefix (for example `myplugin_search`) is the simplest way to stay clear.

## Anatomy of a tool

One tool per file, default-exported. The filename becomes the tool name, so an `example` tool is `tools/example.ts`:

```
// tools/example.ts
import type { ToolContext, ToolExecutionResult } from "@vellumai/plugin-api";

export default {
  description:
    "Search saved notes for a phrase. Use this when the user asks what they told you to remember.",
  defaultRiskLevel: "low" as const,
  input_schema: {
    type: "object",
    properties: {
      query: { type: "string", description: "Text to search for." },
    },
    required: ["query"],
  },
  async execute(
    input: Record<string, unknown>,
    ctx: ToolContext,
  ): Promise<ToolExecutionResult> {
    const query = String((input as { query?: unknown }).query ?? "").trim();
    if (query.length === 0) {
      return { content: "error: query must be non-empty", isError: true };
    }
    // ctx.conversationId - current conversation
    // ctx.signal         - forward to fetch() / spawn() for cancellation
    return { content: `searched ${ctx.conversationId} for ${query}`, isError: false };
  },
};
```

Types come from [`@vellumai/plugin-api`](https://github.com/vellum-ai/vellum-assistant/tree/main/assistant/src/plugin-api), the only supported contract.

## When should my assistant write a Tool?

Reach for a tool when the assistant needs to *do* something the model invokes by name and gets a result back: call an API, run a query, compute a value, return structured data. A tool is a typed action in the catalog. The model decides when to call it, and the result flows into the turn.

A tool is *always* loaded in the model's context: its name, description, and input schema sit in the catalog the model sees on every request, so the assistant pays that token cost whether or not the tool is ever called. Add tools the assistant reaches for often, and keep their descriptions and schemas tight. For a capability that is only occasionally relevant, prefer something the model pulls in on demand so it does not weigh on every turn.
