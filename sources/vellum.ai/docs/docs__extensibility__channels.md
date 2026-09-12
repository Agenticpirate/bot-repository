# Channels

Make a route reachable from the public internet. A plugin is a channel because it declares ingress: channels/ingress.json is the list of routes the outside world may reach it on.

The gateway owns the public surface: it validates the declaration, verifies every request, and holds plugin-owned ingress behind a guardian's approval. Plugins that declare a channel ingress are considered themselves a channel in all contexts where channels are viewed.

## The declaration

`channels/ingress.json` is a JSON object with a non-empty `routes` array. The plugin's identity comes from its directory, not from the file, so a manifest cannot claim to belong to a different plugin. Declare the public path in `ingress.json` **and** implement the matching handler under [`routes/`](/docs/extensibility/routes) at the same relative path.

```
{
  "routes": [
    {
      "path": "events",
      "kind": "http",
      "description": "Inbound events from Example Courier"
    }
  ]
}
```

That route is served at `/webhooks/plugins/<plugin-name>/events` and handled by `routes/events.ts`. Resolve the URL to hand a vendor with `resolveWebhookUrl({ path: "events" })` from [`@vellumai/plugin-api`](https://github.com/vellum-ai/vellum-assistant/tree/main/assistant/src/plugin-api). Do not hardcode a hostname. Do not tell a vendor to POST at `/x/plugins/...`.

### Route fields

| Field          | Required | Default            | Notes                                                                                                                                                                                                                                 |
| -------------- | -------- | ------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `path`         | yes      | none               | Relative to the plugin's own namespace ("events", not /webhooks/plugins/my-plugin/events). No leading slash, no trailing slash, no query or fragment, no . or .. segments, and canonical (unencoded, no empty or redundant segments). |
| `kind`         | yes      | none               | "http" or "websocket". The gateway bridges the two differently, so the kind has to be known before a connection arrives.                                                                                                              |
| `description`  | yes      | none               | Human-readable purpose, surfaced in gateway logs and the approval UI.                                                                                                                                                                 |
| `handshake`    | no       | `"signed-headers"` | Where the caller carries its signature. "signed-headers" (default) puts it in request headers. "signed-query" puts the same HMAC in the URL, WebSocket only, for a caller that is handed a URL and nothing else.                      |
| `verification` | no       | `vendor HMAC`      | How an outside caller is verified. HTTP only: hmac, standard-webhooks, or bearer.                                                                                                                                                     |
| `inbound`      | no       | `webhook only`     | That this route's replies carry inbound messages, and how to read them. HTTP only.                                                                                                                                                    |

Duplicate paths in one file fail the whole declaration. A malformed file disables ingress for that plugin only; sibling plugins keep theirs.

## Approval and verification

Every public plugin route is verified. An unverified plugin route does not exist. A route whose signing secret or bearer token is missing is refused rather than served unsigned, and an unauthenticated probe sees `404` whether the route is undeclared, pending, or missing a secret.

A guardian has to approve the declaration before the gateway serves it. The approval covers a digest of the declaration: adding a route, changing transport, handshake, verification, or inbound delivery drops the plugin back to pending. Rewording `description` does not. Editing the file and reinstalling is not enough; the guardian has to approve the new digest. Ask the user to approve pending ingress from the channels settings once the plugin is installed. A plugin must not approve its own ingress.

## Ingress verification

A vendor that signs `X-Example-Signature` has its own scheme. Declare `verification` so the gateway runs one HMAC engine and reads the vendor's specifics as data:

```
{
  "path": "events",
  "kind": "http",
  "description": "Inbound deliveries from Example Courier",
  "verification": {
    "kind": "hmac",
    "algorithm": "sha256",
    "secret": { "field": "courier_webhook_secret" },
    "signature": {
      "header": "X-Example-Signature",
      "encoding": "hex",
      "prefix": "sha256="
    },
    "payload": ["body"],
    "freshness": {
      "header": "X-Example-Timestamp",
      "format": "unix-seconds",
      "toleranceSeconds": 300
    }
  }
}
```

An automation client that cannot calculate an HMAC, such as an iOS Shortcut, can use a static bearer token. The gateway verifies the`Authorization` header before it forwards the request:

```
{
  "path": "shortcuts/health",
  "kind": "http",
  "description": "Health data submitted by an automation shortcut",
  "verification": {
    "kind": "bearer",
    "secret": { "field": "shortcut_ingress_token" }
  }
}
```

Store `shortcut_ingress_token` through `assistant credentials prompt` or `storeCredential`, then configure the client to send exactly one token in `Authorization: Bearer <shortcut_ingress_token>`. The scheme name is case-insensitive, but the token is not. Do not put the token in a URL or query string. URLs can be retained in browser history, logs, and referrer data, and the gateway accepts bearer credentials only in `Authorization`.

A static bearer token does not provide replay protection. Prefer`hmac` with `freshness` when a vendor supports signed timestamps, and rotate the token after any suspected disclosure.

- The credential **service** is the plugin's directory name. The descriptor names only a **field**. A manifest cannot point a route at another plugin's secret or at the platform's.
- Store the secret via `assistant credentials prompt` (or `storeCredential` from a hook, tool, or route). Never put it in the file.
- `payload` is the exact bytes the vendor signs, in order: `"body"`, `{ "header": "..." }`, or `{ "literal": "..." }`. A header named in `payload` but absent from the request fails verification rather than contributing an empty string.
- `freshness` is a replay window. Declare it when the vendor binds a timestamp. A signature over the body alone stays valid for as long as the secret does.
- Unrecognized fields fail the declaration rather than guessing a scheme.

## Delivering inbound messages

Absent `inbound`, the route is a webhook and nothing more: the gateway forwards the delivery, returns whatever the plugin answered, and the message goes no further.

Present, the plugin's **reply** is normalized and run through the gateway's inbound pipeline (admission floor, trust verdict, verification and invite intercepts), exactly as a built-in channel's would be. The plugin parses the vendor payload. The declaration tells the gateway where the sender and the conversation sit so the gate can run before anything is forwarded.

A plugin that returns the default envelope declares `"inbound": {}` and nothing more. The matching route handler replies with:

```
{
  "message": {
    "content": "hello",
    "conversationExternalId": "chat-123",
    "externalMessageId": "msg-123"
  },
  "actor": {
    "actorExternalId": "+12025550142",
    "displayName": "Alice"
  },
  "source": { "chatType": "dm" }
}
```

A reply with no sender and no conversation is a plain acknowledgement (delivery receipt, vendor probe). Naming some of those fields and not the rest is invalid and is logged rather than quietly dropped. Override field locations when the vendor's payload is not that shape. Paths are dotted identifiers (`message.body`), not JSONPath. `from` may list several paths (first non-empty wins). `map` / `default` turn a vendor vocabulary into ours. `identity` is `opaque` (default), `phone`, or `email`: it decides whether `+1 (202) 555-0142` and `+12025550142` are the same person. Leave it `opaque` unless the sender id really is a phone number or email.

The plugin does not get to name the channel (the gateway stamps `plugin`) or the external-id namespace (every id is prefixed with the plugin's directory name). A plugin cannot inherit Slack's admission floor or another plugin's contacts.

## Presentation

The channels list reads the plugin's `package.json`, not the ingress file. Optional `displayName`, `description`, and `icon` (a Lucide name without the `lucide-` prefix) do not gate load. A plugin with ingress and a bare `package.json` still appears, titled from its directory. A plugin whose directory name is already a built-in channel (`slack`, `telegram`, …) is skipped so it cannot impersonate one.

Disabled plugins contribute no channel.

## Anatomy of a channel

```
example-courier/
├── package.json
├── channels/
│   └── ingress.json
└── routes/
    └── events.ts
```

```
{
  "routes": [
    {
      "path": "events",
      "kind": "http",
      "description": "Inbound events from Example Courier",
      "inbound": {}
    }
  ]
}
```

```
// routes/events.ts
export async function POST(request: Request): Promise<Response> {
  const delivery = await request.json();
  return Response.json({
    message: {
      content: delivery.text ?? "",
      conversationExternalId: delivery.chatId,
      externalMessageId: delivery.messageId,
    },
    actor: {
      actorExternalId: delivery.from,
      displayName: delivery.fromName,
    },
  });
}
```

## When should my assistant write a Channel?

Reach for `channels/ingress.json` when a third party must deliver to the assistant from outside: a vendor webhook, a realtime socket a third party dials, or a channel that should appear next to Slack and Telegram. Use a [route](/docs/extensibility/routes) alone when the caller is already inside the assistant (an app frontend, a local tool, another plugin). After install, hand the vendor `await resolveWebhookUrl({ path: "events" })` and ask the guardian to approve the pending ingress from channels settings.
