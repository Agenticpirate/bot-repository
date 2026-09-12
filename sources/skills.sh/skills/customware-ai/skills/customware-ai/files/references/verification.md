# Verification

Live gateway checks are required because a valid model id in source code does not prove that the model is currently available or that the gateway path works.

## Required Checks

### User names or changes a model

Send the message `hi` through the exact model using:

- `CUSTOMWARE_AI_GATEWAY_KEY` from the server environment
- the real org id
- the real project id
- the fixed Customware gateway base URL
- the same reasoning configuration the feature will use

Do this before finishing implementation. A successful HTTP response with generated text is a pass.

### Feature generates JSON

Run the one-key `{ "status": "ok" }` check from [structured-output.md](structured-output.md) with the exact selected model. The returned AI SDK `output` must pass the Zod schema.

### Chat feature

Exercise the generated app's Hono endpoint with at least two user turns so the second request includes prior messages. Confirm both responses stream and the assistant uses the prior turn.

### Tool-backed or generative UI feature

Trigger at least one prompt that causes the intended tool path to run.

Confirm:

- the tool is called through the app's Hono endpoint, not directly from the browser
- the visible tool or card UI renders in the chat
- the final assistant answer is grounded in the returned tool data
- any loading state transitions to the final output state

### Browser UI feature

When the task adds a chat or structured-output UI, run an interactive browser check from the target project (use Playwright or the template's existing browser workflow). Confirm the two panes render, chat can submit two turns, the Stop control is enabled during streaming, categorization renders the requested JSON fields, any tool or custom card UI appears when triggered, and the responsive layout remains usable. This is required in addition to direct endpoint checks.

## How To Run Checks

Create a temporary TypeScript script inside the target project's ignored `tmp/` directory so it resolves the project's installed packages. Do not put the script under `/tmp`: Node module resolution there will not use the target project's dependencies. Use `createOpenRouter`, the fixed gateway URL, and the same model config as the implementation.

Use this shape and replace the ids before running it:

```ts
import { createOpenRouter, type OpenRouterProviderOptions } from "@openrouter/ai-sdk-provider";
import { generateText, Output } from "ai";
import { z } from "zod";

const orgId = "<real Customware org id>";
const projectId = "<real Customware project id>";
const modelId = process.argv[2] ?? "google/gemini-3-flash-preview";
const apiKey = process.env.CUSTOMWARE_AI_GATEWAY_KEY;

if (!apiKey) {
  throw new Error("CUSTOMWARE_AI_GATEWAY_KEY is required.");
}

const customwareAI = createOpenRouter({
  apiKey,
  baseURL: `https://app.customware.ai/api/orgs/${orgId}/projects/${projectId}/ai/v1`,
});

const providerOptions: { openrouter: OpenRouterProviderOptions } | undefined =
  modelId === "openai/gpt-5.6-luna" || modelId === "openai/gpt-5.6-terra"
    ? { openrouter: { reasoning: { effort: "high" } } }
    : undefined;

const textResult = await generateText({
  model: customwareAI(modelId),
  providerOptions,
  prompt: "hi",
});

console.log({
  check: "text",
  modelId,
  response: textResult.text,
  passed: textResult.text.trim().length > 0,
});

if (process.argv.includes("--json")) {
  const { output } = await generateText({
    model: customwareAI(modelId),
    providerOptions,
    output: Output.object({
      schema: z.object({ status: z.literal("ok") }),
    }),
    prompt: 'Return exactly one JSON field named "status" with the value "ok".',
  });

  console.log({
    check: "structured-output",
    modelId,
    output,
    passed: output.status === "ok",
  });
}
```

Run TypeScript natively with the environment source used by the target app. Never run any file or shell inspection command against `.env`/`.env.*` (`cat`, `head`, `tail`, `sed`, `awk`, `rg`, `grep`, `ls`, `stat`, etc.). The only allowed reference is the execution form `node --env-file=.env ...`, and its output must not print environment variables. For a local `.env`:

```bash
node --env-file=.env --experimental-strip-types tmp/customware-ai-smoke.ts google/gemini-3-flash-preview
node --env-file=.env --experimental-strip-types tmp/customware-ai-smoke.ts google/gemini-3-flash-preview --json
```

If the sandbox already injects system environment values, omit `--env-file=.env`. Remove the temporary script after verification unless the user explicitly asks to keep it.

## Evidence And Failure Rules

- Log the model id, check name, response text or parsed output, and pass/fail result.
- Never log the gateway key, authorization header, provider configuration containing the key, or full sensitive prompts.
- If an interactive browser check cannot find expected UI, capture the page title/body text and browser console/page errors from a project-local script before changing application code. Use selectors derived from the rendered DOM, not guessed selectors or labels.
- Do not claim a model or JSON path was tested unless a live gateway call completed.
- Do not silently retry through OpenRouter directly.
- Do not silently switch models.
- If the `hi` check fails, report that exact model and failure.
- If the JSON check fails after text succeeds, report structured output as the failing capability.
- After live checks, run the target app's normal check and build commands.

## Completion Checklist

- [ ] Gateway called only from Hono/server code.
- [ ] `CUSTOMWARE_AI_GATEWAY_KEY` remains server-only.
- [ ] Fixed URL contains the real org and project ids.
- [ ] Exact requested/default model used.
- [ ] User-named model passed the live `hi` check.
- [ ] JSON feature passed the one-key structured-output check.
- [ ] Multi-turn chat was exercised when chat was built.
- [ ] Tool-backed or generative UI paths were exercised when those features were built.
- [ ] App check/build completed.
