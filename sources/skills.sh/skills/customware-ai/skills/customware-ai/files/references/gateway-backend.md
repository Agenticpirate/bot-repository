# Customware Gateway Backend

## Architecture

The browser never talks to the Customware gateway directly:

```text
React UI -> generated app Hono endpoint -> Customware AI Gateway -> OpenRouter
```

The generated app receives `CUSTOMWARE_AI_GATEWAY_KEY` as a system-level server environment value. It is an org-scoped gateway credential. The URL also contains the real org and project ids so Customware can authorize and attribute the request.

## Dependencies

Use pnpm only:

```bash
pnpm add ai @ai-sdk/react @openrouter/ai-sdk-provider zod
```

Do not add provider-specific AI SDK packages for models routed through this gateway.

## Version-aware AI SDK usage

When an AI SDK or provider API is unclear, inspect the installed package in the target project's `node_modules/` before implementing it. Read `.d.ts` files for the type contract, then the actual `.js`/`.mjs` source for runtime behavior and defaults. Use this for `ai`, `@ai-sdk/react`, and `@openrouter/ai-sdk-provider`; installed source takes precedence over stale examples.

## Provider Helper

Create a server-only helper such as `server/ai/provider.ts`:

```ts
import { createOpenRouter } from "@openrouter/ai-sdk-provider";

const CUSTOMWARE_AI_ORIGIN = "https://app.customware.ai/api";

export function createCustomwareAI(orgId: string, projectId: string) {
  const apiKey = process.env.CUSTOMWARE_AI_GATEWAY_KEY;

  if (!apiKey) {
    throw new Error("CUSTOMWARE_AI_GATEWAY_KEY is required on the server.");
  }

  return createOpenRouter({
    apiKey,
    baseURL: `${CUSTOMWARE_AI_ORIGIN}/orgs/${orgId}/projects/${projectId}/ai/v1`,
  });
}
```

The OpenRouter adapter appends `/chat/completions`, producing the gateway route:

```text
https://app.customware.ai/api/orgs/{orgId}/projects/{projectId}/ai/v1/chat/completions
```

Rules:

- Keep the origin hardcoded. Do not create `CUSTOMWARE_AI_GATEWAY_URL` or another URL env value.
- Use exactly `CUSTOMWARE_AI_GATEWAY_KEY`; do not rename it to `OPENROUTER_GATEWAY_KEY`.
- Keep this module outside `app/` so Vite cannot include it in the browser bundle.
- Resolve the real org/project ids from trusted generation or server context. Do not read them from the chat request body.
- If either id is not available, stop with a clear missing-id reason. Do not write placeholders.

## Streaming Hono Route

Mount the route before static-file serving and the SPA fallback. Adapt the import paths to the app, but preserve the server boundary:

```ts
import { convertToModelMessages, streamText, type UIMessage } from "ai";
import { createCustomwareAI } from "./ai/provider.js";

const ORG_ID = "<real Customware org id>";
const PROJECT_ID = "<real Customware project id>";
const customwareAI = createCustomwareAI(ORG_ID, PROJECT_ID);

app.post("/api/chat", async (c) => {
  const body = await c.req.json<{ messages: UIMessage[] }>();
  const result = streamText({
    model: customwareAI("google/gemini-3-flash-preview"),
    messages: await convertToModelMessages(body.messages),
  });

  return result.toUIMessageStreamResponse({
    sendReasoning: true,
    sendSources: true,
  });
});
```

The ids shown as markers above must be replaced while implementing. Never leave those strings in working code.

For a model picker, validate a submitted model key against the server-owned catalog in [models.md](models.md). Never pass an arbitrary browser string directly to `customwareAI(...)`.

## Gateway-Owned Request Controls

The gateway applies the Customware OpenRouter preset and server-owned attribution. Do not send or let the browser control:

- `preset`
- `provider`
- `models` fallback/routing lists
- gateway/OpenRouter metadata
- trace ids
- OpenRouter `user`

Normal AI SDK request controls such as messages, system prompt, tools, tool choice, temperature, max output tokens, stop conditions, and structured output may be used when the product requires them.

## Security

- Never send the gateway key to the frontend even though the frontend calls the local `/api/chat` route.
- Never log request headers, the provider configuration, or the key.
- Never fall back to a direct OpenRouter URL or key when the gateway fails.
- Use the generated app's existing server error/logging boundary. Do not return raw upstream errors or request details to the browser.
- Keep any browser/server shared schema in a neutral shared module/package (for example `shared/contracts/`). Never import a module from `server/` into `app/`, and never copy the schema into a second client file.
