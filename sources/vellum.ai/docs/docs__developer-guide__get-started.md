# Get Started

A short on-ramp for developers and contributors. Covers the repo layout, how to run the assistant locally for development, and how to talk to it programmatically through the CLI and the HTTP API.

## Who this is for

This page is for developers who want to go beyond the shipping product:

- **Contributors** working on the assistant runtime, the macOS, Windows, or iOS clients, the gateway, the CLI, or the platform web app.
- **Integrators** building skills, automations, or tools on top of an existing assistant.
- **Advanced users** who want to script their assistant or run it locally with full visibility into how it works.

## The two paths

Most developer work happens against a **local install**. The assistant runtime, the gateway, the credential service, and the workspace all run on your Mac, so you can read state, attach a debugger, and iterate without round-tripping through Vellum's infrastructure. Everything below assumes a local install unless noted.

Vellum Cloud is the same software running on managed infrastructure. The HTTP API is gated behind the platform gateway in cloud mode, not exposed directly, so for raw API development you'll want a local install. See [Cloud hosting](/docs/hosting-options/cloud-hosting) and [Local hosting](/docs/hosting-options/local-hosting) for the full comparison.

## The repos

Most developer work happens in **vellum-assistant**, the open-source repo that holds the assistant daemon and everything that ships with it:

- `assistant/`: the TypeScript runtime (conversations, memory, tools, channels, schedules)
- `gateway/`: the network guard rail that fronts the runtime
- `cli/`: the `vellum` command line interface
- `credential-executor/`: the isolated Credential Execution Service
- `skills/`: bundled and example skills
- `clients/macos/`: the macOS desktop app
- `clients/windows/`: the Windows desktop app

See [Architecture](/docs/developer-guide/architecture) for how the pieces fit together.

## Local development setup

The fastest way to get a working assistant on your Mac is through the desktop app installer, which provisions the local runtime, gateway, and credential service for you. From there you can swap in your own builds.

1. Install the [desktop app](https://www.vellum.ai/downloads) and walk through onboarding. Your workspace will live at `~/.vellum/`.
2. Clone `vellum-assistant` alongside it. Use the repo's top-level setup scripts to install dependencies and link your local build into the running installation.
3. Verify with `vellum ps`: you should see the `assistant`, `gateway`, and `credential-executor` processes running.

For the full development loop, including parallel agents and the review pipeline, see [Development Workflow](/docs/developer-guide/development-workflow).

## Talking to your assistant programmatically

Three options, in order of how much ceremony they require.

### CLI

The `vellum` CLI is the highest-level interface. It reads your local credentials and routes commands to the running daemon.

```
# send a message and stream the response
vellum message "summarize today's calendar"

# tail the live event stream
vellum events

# inspect process state
vellum ps
```

Useful subcommands include `login`, `setup`, `hatch`, `message`, `events`, `logs`, `ps`, `terminal`, and `retire`. Run `vellum --help` to see the full list.

### HTTP API

The runtime exposes a versioned REST API at `/v1`. On a local install the daemon listens on a loopback port; the CLI handles auth for you, but you can also call the API directly with a JWT bearer token.

```
# list conversations
curl -H "Authorization: Bearer $VELLUM_JWT" \
     http://127.0.0.1:7821/v1/conversations

# post a message into a conversation
curl -X POST \
     -H "Authorization: Bearer $VELLUM_JWT" \
     -H "Content-Type: application/json" \
     -d '{"text": "hello"}' \
     http://127.0.0.1:7821/v1/messages
```

Auth is JWT-only: every request needs an `Authorization: Bearer` header carrying a token signed by the gateway. See [Security & Permissions](/docs/developer-guide/security) for the full auth model.

### SSE event stream

Long-lived clients subscribe to a server-sent events stream to receive streaming model output, tool calls, approval prompts, and channel events as they happen.

```
curl -N \
     -H "Authorization: Bearer $VELLUM_JWT" \
     http://127.0.0.1:7821/v1/events
```

See [API & Communication](/docs/developer-guide/api) for the full event-type catalog, connection management, and a JavaScript reference client.

## Where to go next

- [Architecture](/docs/developer-guide/architecture): platform domains, repo structure, and how the runtime, clients, and gateway fit together.
- [Security & Permissions](/docs/developer-guide/security): sandbox model, credential storage, trust rules, and JWT auth.
- [Features & Capabilities](/docs/developer-guide/features): integrations, dynamic skill authoring, browser automation, attachments.
- [API & Communication](/docs/developer-guide/api): SSE event stream, payloads, connection management.
- [Development Workflow](/docs/developer-guide/development-workflow): Claude Code commands, parallel PR execution, the release pipeline.
