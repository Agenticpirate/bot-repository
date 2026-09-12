# Model Selection

Keep model choice on the server. Use the default unless the user names a model or the work clearly matches another entry.

| Use | OpenRouter model id | Reasoning |
| --- | --- | --- |
| Default general work | `google/gemini-3-flash-preview` | Model default |
| More agentic work | `openai/gpt-5.6-luna` | `high` |
| Complex tasks | `openai/gpt-5.6-terra` | `high` |
| Cheapest fast simple work | `deepseek/deepseek-v4-flash` | Model default |

Use DeepSeek V4 Flash for small extraction, classification, rewriting, or other simple tasks where a small fast model is sufficient. Do not use it for work the user describes as complex or agentic.

## Server-Owned Catalog

Use a small allow-list when the browser can select a model:

```ts
import type { OpenRouterProviderOptions } from "@openrouter/ai-sdk-provider";

interface ModelConfig {
  id: string;
  label: string;
  providerOptions?: {
    openrouter: OpenRouterProviderOptions;
  };
}

export type ModelKey = "default" | "agentic" | "complex" | "simple";

export const MODEL_CATALOG: Record<ModelKey, ModelConfig> = {
  default: {
    id: "google/gemini-3-flash-preview",
    label: "Gemini 3 Flash Preview",
  },
  agentic: {
    id: "openai/gpt-5.6-luna",
    label: "GPT-5.6 Luna",
    providerOptions: {
      openrouter: { reasoning: { effort: "high" } },
    },
  },
  complex: {
    id: "openai/gpt-5.6-terra",
    label: "GPT-5.6 Terra",
    providerOptions: {
      openrouter: { reasoning: { effort: "high" } },
    },
  },
  simple: {
    id: "deepseek/deepseek-v4-flash",
    label: "DeepSeek V4 Flash",
  },
};
```

Apply both fields on the server:

```ts
const config = MODEL_CATALOG[modelKey];

const result = streamText({
  model: customwareAI(config.id),
  providerOptions: config.providerOptions,
  messages,
});
```

If no picker is requested, do not add one. Keep one server-owned model constant instead.

## User-Named Models

When the user names or changes a model during development:

1. Use the exact OpenRouter model id requested or confirm its exact current id.
2. Send a live `hi` request through the Customware gateway using that model.
3. Continue only after it succeeds.
4. If it fails, report the exact model as unavailable through the gateway. Do not silently substitute another model.

Run this check even when the named model appears in the catalog. Model listings can remain visible after an endpoint becomes temporarily unavailable.
