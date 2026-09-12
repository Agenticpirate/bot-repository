# Copy-Ready Examples

Use these assets as starting code. Copy only the example that matches the feature, then adapt it to the target app's existing route and component layout instead of creating a parallel structure.

## AI Chat

Source files:

- `assets/ai-chat/app/components/AIChat.tsx`
- `assets/ai-chat/server/ai/customware-ai.ts`
- `assets/ai-chat/server/ai/chat-routes.ts`

Install dependencies first, then the UI components:

```bash
pnpm add ai @ai-sdk/react @openrouter/ai-sdk-provider zod
pnpm exec node <customware-ai-skill>/scripts/install-ai-elements.mjs conversation message prompt-input --cwd .
```

Copy the asset files to the matching `app/` and `server/` paths. Mount the Hono routes before static-file serving and the SPA fallback:

```ts
import { createAIChatRoutes } from "./ai/chat-routes.js";

app.route(
  "/",
  createAIChatRoutes({
    orgId: "<real Customware org id>",
    projectId: "<real Customware project id>",
  }),
);
```

Replace both id markers. Render `<AIChat />` in the requested React Router route or layout. The asset is a complete Tailwind + AI Elements surface: preserve its header, conversation spacing, purposeful empty state, and dedicated composer footer, then align its tokens to the app's existing design. For a side panel, give the parent and chat pane `min-h-0 min-w-0` and let the panel fill the available height; do not reduce it to a raw fixed-height input box.

Load the client chat pane lazily from the route boundary so AI Elements and Streamdown do not inflate the initial bundle:

```tsx
import { lazy } from "react";

const AIChat = lazy(() => import("~/components/AIChat").then((module) => ({ default: module.AIChat })));
```

If the feature has a schema used by both browser and server, place it in a neutral shared module such as `shared/contracts/`. Never import the browser contract from `server/` or duplicate it under `app/`.

## SQL Tool Chat

Source files:

- `assets/sql-tool-chat/app/components/SQLToolChat.tsx`
- `assets/sql-tool-chat/server/ai/customware-ai.ts`
- `assets/sql-tool-chat/server/ai/chat-routes.ts`
- `assets/sql-tool-chat/server/ai/project-query-tool.ts`
- `assets/sql-tool-chat/shared/ai/project-tools.ts`

Install dependencies first, then the UI components:

```bash
pnpm add ai @ai-sdk/react @openrouter/ai-sdk-provider zod
pnpm exec node <customware-ai-skill>/scripts/install-ai-elements.mjs conversation message prompt-input tool --cwd .
```

Copy the `app/`, `server/`, and `shared/` files into matching paths in the target app. Mount the Hono route and replace the ids:

```ts
import { createSQLToolChatRoutes } from "./ai/chat-routes.js";

app.route(
  "/",
  createSQLToolChatRoutes({
    orgId: "<real Customware org id>",
    projectId: "<real Customware project id>",
  }),
);
```

This asset is the default reference for database-shaped tool chat:

- `tool({ inputSchema, execute })`
- bounded tool-followed-by-answer flow with `stopWhen: stepCountIs(5)`
- read-only, parameterized SQL building on the server
- visible tool UI in the chat transcript
- a compact assistant header, safe starter prompts, and a dedicated composer footer

The included rows are demo data so the example stays self-contained. Keep the server tool and query-builder shape, then replace the demo executor with the app's real read-only database boundary.

## Generative UI Chat

Source files:

- `assets/generative-ui-chat/app/components/GenerativeWeatherChat.tsx`
- `assets/generative-ui-chat/server/ai/customware-ai.ts`
- `assets/generative-ui-chat/server/ai/chat-routes.ts`
- `assets/generative-ui-chat/shared/ai/weather-card.ts`

Install dependencies first, then the UI components:

```bash
pnpm add ai @ai-sdk/react @openrouter/ai-sdk-provider zod
pnpm exec node <customware-ai-skill>/scripts/install-ai-elements.mjs conversation message prompt-input --cwd .
```

Copy the `app/`, `server/`, and `shared/` files into matching paths in the target app. Mount the Hono route and replace the ids:

```ts
import { createGenerativeWeatherChatRoutes } from "./ai/chat-routes.js";

app.route(
  "/",
  createGenerativeWeatherChatRoutes({
    orgId: "<real Customware org id>",
    projectId: "<real Customware project id>",
  }),
);
```

This asset is the default reference for generative UI in Customware apps:

- the model calls a server tool
- the tool returns typed data
- the client renders a custom React card from the tool part
- the assistant can still add normal text around the card
- cards stay full-width and visually distinct without breaking the chat's message rhythm

## Internal Email Parser

Source files:

- `assets/email-parser/server/ai/customware-ai.ts`
- `assets/email-parser/server/ai/email-parser.ts`

Copy both files under `server/ai/`. Call the parser from an existing internal server workflow:

```ts
const result = await parseEmail(emailContent, {
  orgId: "<real Customware org id>",
  projectId: "<real Customware project id>",
});

if (result.isErr()) {
  return result;
}

const parsedEmail = result.value;
```

The function returns a `ResultAsync` containing Zod-validated structured output with sender, subject, summary, category, urgency, and action items. Keep it internal unless the product explicitly requires an HTTP route.

## Verification

- Run the exact model `hi` check.
- For the email parser, run the one-key JSON gateway check before a representative email parse.
- For chat, exercise two turns through the mounted Hono endpoint.
- For tool-backed chat, trigger at least one prompt that causes a tool call and confirm the tool UI renders expected input and output.
- For generative UI chat, trigger at least one prompt that renders the custom card UI and confirm the final assistant text stays grounded in that card data.
- Run `pnpm run build` and `pnpm run check`.
