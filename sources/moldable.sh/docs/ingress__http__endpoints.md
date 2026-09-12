> ## Documentation Index
> Fetch the complete documentation index at: https://docs.moldable.sh/llms.txt
> Use this file to discover all available pages before exploring further.

# HTTP endpoints

> OpenAI-compatible HTTP endpoints for gateway adapters.

These are optional OpenAI‑style endpoints so existing clients can talk to your gateway.

The gateway can expose OpenAI-compatible HTTP endpoints and forward requests to the default AI adapter.
See [OpenAI-compatible endpoints](/ingress/http/openai) for usage notes.

If you only use Telegram/WhatsApp channels, you can keep these disabled and ignore this section.

Note that enabling these endpoints will potentially allow others to send requests to your gateway, so you should only enable them if you are comfortable with that and aware of the security implications.
Gateway auth is required by default (even on loopback). HTTP endpoints must be protected with `gateway.http.auth_token` or the gateway auth token.

## Enable endpoints

```json theme={null}
{
  "gateway": {
    "http": {
      "bind": "127.0.0.1",
      "port": 19790,
      "auth_token": "replace-me",
      "endpoints": {
        "openai_chat": true,
        "openresponses": true
      }
    }
  }
}
```

If `auth_token` is set, clients must send:

* `Authorization: Bearer <token>` or

## Example

```bash theme={null}
curl http://127.0.0.1:19790/v1/chat/completions \
  -H "Authorization: Bearer replace-me" \
  -H "Content-Type: application/json" \
  -d '{"model":"any","messages":[{"role":"user","content":"hello"}]}'
```

## OpenAI Chat Completions

`POST /v1/chat/completions`

Minimal supported fields:

* `model`
* `messages` (array of `{ role, content }`)
* `stream` (boolean)
* `user` (optional session hint)

The gateway supports `stream` for clients that expect server-sent events.

## OpenResponses

`POST /v1/responses`

Minimal supported fields:

* `model`
* `input` (string or array of `{ role, content }`)
* `stream` (boolean)
* `user` (optional session hint)

## Sessions

Requests are grouped into sessions so the gateway can keep context. If your client supports the OpenAI `user` field, providing a stable value can help keep a consistent thread.
