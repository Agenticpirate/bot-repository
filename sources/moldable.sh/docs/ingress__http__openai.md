> ## Documentation Index
> Fetch the complete documentation index at: https://docs.moldable.sh/llms.txt
> Use this file to discover all available pages before exploring further.

# OpenAI-compatible endpoints

> Use existing OpenAI clients against your local gateway.

The gateway exposes OpenAI-style HTTP endpoints so existing OpenAI client libraries can talk to your local gateway without a custom SDK. Requests are routed to your configured default AI adapter.

## How to use it

1. Configure a default AI adapter in your gateway config.
2. Enable the OpenAI-compatible endpoints and set an `auth_token`.
3. Point your OpenAI client at the gateway base URL.
4. Send Chat Completions or Responses requests as you normally would.

In practice, you use this when you want:

* Drop-in OpenAI client compatibility while running a different backend.
* One HTTP ingress path that routes to your configured adapter.

### Example: Chat Completions (curl)

```bash theme={null}
curl http://127.0.0.1:19790/v1/chat/completions \
  -H "Authorization: Bearer replace-me" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "any-string",
    "messages": [
      { "role": "user", "content": "Hello from a client" }
    ]
  }'
```

### Example: Responses (curl)

```bash theme={null}
curl http://127.0.0.1:19790/v1/responses \
  -H "Authorization: Bearer replace-me" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "any-string",
    "input": "Hello from a client"
  }'
```

### Example: OpenAI SDKs (base URL override)

Point the client at the gateway and use your `auth_token` as the API key.

JavaScript:

```js theme={null}
import OpenAI from "openai";

const client = new OpenAI({
  apiKey: "replace-me",
  baseURL: "http://127.0.0.1:19790/v1"
});

const res = await client.chat.completions.create({
  model: "any-string",
  messages: [{ role: "user", content: "hello" }]
});
```

Python:

```py theme={null}
from openai import OpenAI

client = OpenAI(
  api_key="replace-me",
  base_url="http://127.0.0.1:19790/v1"
)

res = client.chat.completions.create(
  model="any-string",
  messages=[{"role": "user", "content": "hello"}],
)
```

## Why they exist

* **Compatibility**: reuse OpenAI client libraries, CLI tools, and SDKs.
* **Single adapter path**: the same safety rules, session storage, and logging apply regardless of how the request arrives.

## Safety + redaction

If enabled in config, the gateway prepends safety system prompts before dispatching to the adapter, and applies output redaction before returning the response.
