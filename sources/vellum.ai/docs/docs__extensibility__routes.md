# Routes

Expose HTTP endpoints from a plugin. A route is a file the assistant serves in the plugin's own /x/plugins/<name>/ namespace: app frontends, local callers, and the handler behind a public ingress declaration.

A route is a file under `routes/<path>.ts` that exports named HTTP-method functions. There is no registration step and no manifest entry: the Assistant's `/x/*` route dispatcher resolves each request against the plugin's `routes/` directory on disk at request time.

Public internet webhooks are a different surface. Declare them in `channels/ingress.json` (see the [Channels page](/docs/extensibility/channels)). The gateway signature-checks those requests and forwards them to the matching route at `/v1/x/plugins/<name>/<path>`. A `routes/` file with no ingress declaration is not a public webhook. Do not tell a vendor to POST at `/x/plugins/...`.

## Where routes are served

Every plugin route lives in a namespace reserved for that plugin:

```
/x/plugins/<plugin-name>/<path>
```

The `plugins/<name>/` prefix resolves **only** against `<workspaceDir>/plugins/<name>/routes/`. It never falls back to a workspace `routes/plugins/…` file, so a plugin can't collide with workspace routes or with another plugin. A path with no matching file returns 404, and a disabled plugin (its `.disabled` sentinel present) serves no routes even though the files remain on disk.

The same file-based dispatcher also serves standalone workspace routes at `/x/<path>` from `<workspaceDir>/routes/`. Plugin routes are the namespaced form of that surface; a plugin is what lets you ship routes together with its other surfaces as one installable unit.

## Path mapping

The file's path under `routes/` becomes the sub-path, minus the extension. Nested directories nest, and an `index` file maps to the directory itself:

| File                          | Served at                                |
| ----------------------------- | ---------------------------------------- |
| `routes/status.ts`            | `/x/plugins/<name>/status`               |
| `routes/webhooks/incoming.ts` | `/x/plugins/<name>/webhooks/incoming`    |
| `routes/index.ts`             | `/x/plugins/<name> (the namespace root)` |

`.js` wins over `.ts` for the same basename (compiled-binary semantics), and a direct file wins over an `index` file for the same path.

## Writing a handler

Each file exports one function per HTTP method it accepts (`GET`, `POST`, `PUT`, `PATCH`, `DELETE`, `HEAD`, `OPTIONS`), using the standard Web API `Request`/`Response` signature. A request whose method the file does not export returns 405 with an `Allow` header listing the methods it does.

```
export async function GET(request: Request): Promise<Response> {
  return Response.json({ ok: true });
}

export async function POST(request: Request): Promise<Response> {
  const body = await request.json();
  return Response.json({ received: body }, { status: 201 });
}
```

Handlers receive a second `context` argument with the Assistant's runtime singletons (the event hub, and a `conversations.postMessage` helper for surfacing an inbound event as a real turn):

```
export async function POST(request: Request, context): Promise<Response> {
  const { conversationId, text } = await request.json();
  await context.conversations.postMessage(conversationId, text);
  return Response.json({ delivered: true });
}
```

A handler may also reach other Assistant capabilities through its [`@vellumai/plugin-api`](https://github.com/vellum-ai/vellum-assistant/tree/main/assistant/src/plugin-api) imports, the same as any other surface.

## Loading and lifecycle

Route files are loaded lazily on the first matching request and cached by path + mtime. Editing a route file is picked up on the next request; the dispatcher re-reads it when its mtime changes, so there is no restart or reload step. A handler that throws returns 500; a handler that runs longer than the per-request timeout (30s) returns 504.

## Anatomy of a route

```
my-plugin/
└── routes/
    ├── index.ts          → GET /x/plugins/my-plugin
    ├── status.ts         → GET, POST /x/plugins/my-plugin/status
    └── webhooks/
        └── incoming.ts   → POST /x/plugins/my-plugin/webhooks/incoming
```

```
// routes/status.ts
export async function GET(request: Request): Promise<Response> {
  return Response.json({ status: "ok", uptimeMs: performance.now() });
}
```

## Calling a route from an app frontend

A plugin [app](/docs/extensibility/apps) that backs its data with the plugin's own routes must reach them through the `window.vellum.fetch` bridge — **never the global `fetch`**. An app runs in a sandboxed origin, so a raw `fetch` carries no gateway URL and no auth headers and the request fails; `window.vellum.fetch` injects both and routes the call to the Assistant runtime.

Call the route at the same path it is served — `/x/plugins/<name>/<path>`. The wrapper prepends the `/v1` API prefix for you, so you never write it:

```
// inside apps/<app>/src — calling this plugin's own status route
const res = await window.vellum.fetch("/x/plugins/my-plugin/status");
if (!res.ok) throw new Error(`HTTP ${res.status}`);
const data = await res.json();
```

Authenticated callers (the plugin's own app, local tools) reach the same route over HTTP. Third-party vendors on the public internet must go through [plugin ingress](/docs/extensibility/channels) instead; the `window.vellum.fetch` rule is specific to an app frontend's sandboxed origin.

## When should my assistant write a Route?

Reach for a route when something already inside the assistant needs to call in over HTTP: an app frontend, a local tool, or a status endpoint. Unlike a tool (which the model calls) or a hook (which fires inside the turn), a route is driven by a caller and runs whenever a request arrives. If the caller is a third party on the public internet, also declare [plugin ingress](/docs/extensibility/channels) so the gateway can signature-check the request before it reaches this handler. Bundle both in a plugin when you want that endpoint to ship, version, and install alongside the plugin's other surfaces.
