# Tool Usage

Reviewed against the official AI SDK docs on 2026-07-15:

- [AI SDK Core: Tools And Tool Calling](https://ai-sdk.dev/docs/ai-sdk-core/tools-and-tool-calling)
- [AI SDK UI: Chatbot Tool Usage](https://ai-sdk.dev/docs/ai-sdk-ui/chatbot-tool-usage)

In Customware apps, tools belong on the Hono server. The browser sends chat messages to the app's endpoint. The server decides which tools exist, what inputs they accept, and what they are allowed to do.

## Basic Server Pattern

Use `tool({ inputSchema, execute })` so the model gets a typed contract and the server keeps control of the side effect:

```ts
import { convertToModelMessages, stepCountIs, streamText, tool } from "ai";
import { z } from "zod";

const list_projects = tool({
  description: "Fetch a small read-only list of projects for the current org.",
  inputSchema: z.object({
    status: z.enum(["active", "paused", "draft"]).optional(),
    limit: z.number().int().min(1).max(10).default(5),
  }),
  async execute(input) {
    return await loadProjectsFromServer(input);
  },
});

const result = streamText({
  model: customwareAI("google/gemini-3-flash-preview"),
  system:
    "Use the list_projects tool when the user asks for live project data. Never invent rows.",
  messages: await convertToModelMessages(messages),
  tools: {
    list_projects,
  },
  stopWhen: stepCountIs(5),
});
```

Use a bounded multi-step setting such as `stopWhen: stepCountIs(5)` when the model should call the tool and then continue to a final answer.

## Client Pattern

`useChat` receives tool parts in `message.parts`. When a tool-backed chat needs visible tool state, render those parts explicitly instead of only rendering `text` parts:

```tsx
import { type ToolUIPart } from "ai";
import { Tool, ToolContent, ToolHeader, ToolInput, ToolOutput } from "~/components/ai-elements/tool";

type ListProjectsToolPart = ToolUIPart<{
  list_projects: {
    input: { status?: "active" | "paused" | "draft"; limit: number };
    output: { rowCount: number; rows: Array<{ id: string; name: string }> };
  };
}>;

function renderPart(part: { type: string }, key: string) {
  if (part.type !== "tool-list_projects") return null;

  const toolPart = part as ListProjectsToolPart;

  return (
    <Tool key={key} defaultOpen={toolPart.state !== "input-streaming"}>
      <ToolHeader type={toolPart.type} state={toolPart.state} />
      <ToolContent>
        <ToolInput input={toolPart.input} />
        <ToolOutput
          errorText={toolPart.errorText}
          output={
            toolPart.state === "output-available" ? (
              <pre>{JSON.stringify(toolPart.output, null, 2)}</pre>
            ) : (
              <p>Waiting for tool output…</p>
            )
          }
        />
      </ToolContent>
    </Tool>
  );
}
```

For this UI, install `tool` alongside the normal chat components:

```bash
pnpm exec node <customware-ai-skill>/scripts/install-ai-elements.mjs conversation message prompt-input tool --cwd .
```

## Database Rule

If a tool touches the database, the model must not write free-form SQL and have it executed directly.

Correct pattern:

- the model chooses from server-owned tool inputs
- the server builds the query from allowlisted filters or a server query builder
- the server executes parameterized SQL
- the model answers using the returned rows

Wrong pattern:

- model emits raw SQL text
- app executes that text directly

For a copy-ready example, use `assets/sql-tool-chat/`.

## Client-Approval Tools

If a tool needs user approval before continuing, follow the AI SDK UI tool flow from the official docs and keep the approval boundary in the browser. Only use this when the product genuinely needs a client-side approval step. For Customware gateway work, most data-fetch and write tools should remain server-executed.
