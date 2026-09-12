# Structured Output

Use the current AI SDK `generateText` with `Output.object` and a Zod schema. Do not start new code with deprecated `generateObject`.

Structured output belongs on the Hono server because it uses the gateway provider and secret.

## Hono Endpoint

```ts
import { generateText, Output } from "ai";
import { z } from "zod";
import { createCustomwareAI } from "./ai/provider.js";

const ResultSchema = z.object({
  summary: z.string(),
});

app.post("/api/generate-summary", async (c) => {
  const { content } = await c.req.json<{ content: string }>();
  const customwareAI = createCustomwareAI(ORG_ID, PROJECT_ID);
  const { output } = await generateText({
    model: customwareAI("google/gemini-3-flash-preview"),
    output: Output.object({ schema: ResultSchema }),
    prompt: `Summarize this content: ${content}`,
  });

  return c.json(output);
});
```

Use the feature's real schema. The one-key shape above demonstrates the boundary; it is not a reason to flatten structured product data.

The feature schema is a product contract, not a place to add model preferences. Preserve the names and types requested by the user (for example `contentType`, `genre`, `tone`, `themes`, `audience`, and `summary`). Define it once in a neutral shared contract module/package (for example `shared/contracts/`) and derive all TypeScript types from that schema; the client must not import from `server/`, and it must not maintain a mirror with copied enums or fields. Product-requested limits such as 20,000 characters are valid when documented by the feature.

## Mandatory One-Key Check

Whenever the user requests JSON or structured output, test the exact chosen model with this minimal schema before finishing:

```ts
const GatewayCheckSchema = z.object({
  status: z.literal("ok"),
});

const { output } = await generateText({
  model: customwareAI(selectedModel.id),
  providerOptions: selectedModel.providerOptions,
  output: Output.object({ schema: GatewayCheckSchema }),
  prompt: 'Return exactly one JSON field named "status" with the value "ok".',
});

if (output.status !== "ok") {
  throw new Error("Customware AI structured-output check failed.");
}
```

This check proves all three of these together:

- the model is still available
- the Customware gateway endpoint works
- structured output works through the selected model/provider route

Do not treat a plain text response containing JSON as a passing structured-output check. Validate the typed `output` returned by AI SDK.

## UI Rendering

Return parsed JSON from the app's Hono endpoint. The frontend should render the actual product UI for the typed response. Use AI Elements `SchemaDisplay` only when the product specifically needs a generic schema/value inspector; it is not required for normal cards, forms, tables, or reports.
