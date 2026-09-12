# Architecture

The Vellum Assistant platform has three main domains that work together: a runtime that manages conversations and tools, a native client for macOS, and a gateway that handles all external communication.

## Platform Domains

### Assistant Runtime

`assistant/`

Bun + TypeScript runtime that owns conversation history, attachment storage, and channel delivery state in a local SQLite database. Exposes a Unix domain socket for the native client, plus an HTTP API consumed by the gateway.

### Native Clients

`clients/`

Native macOS app built with Swift via `VellumAssistantShared`. A menu bar assistant with computer-use (accessibility + CGEvent), chat, and full tool access.

### Gateway

`gateway/`

Standalone Bun + TypeScript service that serves as the public ingress boundary for all external webhooks and callbacks. Owns Telegram integration end-to-end (receives webhooks, routes to assistants, delivers replies). Routes Twilio voice webhooks, handles OAuth callbacks, and optionally acts as an authenticated reverse proxy for the assistant runtime API.

## Repository Structure

```
/
├── assistant/            # Bun-based assistant runtime (runtime, CLI, HTTP API)
├── clients/              # Native macOS client (menu bar app)
├── gateway/              # Gateway service (Telegram, Twilio, OAuth, reverse proxy)
├── credential-executor/  # Credential Execution Service (isolated RPC boundary)
├── packages/             # Shared private packages (CES contracts, credential storage, egress proxy)
├── cli/                  # Vellum CLI
├── skills/               # Bundled skill definitions
├── benchmarking/         # Load testing scripts
├── scripts/              # Utility scripts (publishing, tunneling, releases)
├── meta/                 # Meta configuration
├── .claude/              # Claude Code slash commands and workflow tools
└── .github/              # GitHub Actions workflows
```

## Architecture Docs

Detailed architecture docs are split by ownership domain, close to the code:

| Document                                         | What's Covered                                                           |
| ------------------------------------------------ | ------------------------------------------------------------------------ |
| `ARCHITECTURE.md`                                | Cross-system index — invariants, domain boundaries, data flow            |
| `assistant/ARCHITECTURE.md`                      | Runtime internals — conversation loop, tool dispatch, memory, scheduling |
| `gateway/ARCHITECTURE.md`                        | Ingress boundary — webhooks, Telegram, Twilio, reverse proxy             |
| `clients/ARCHITECTURE.md`                        | Native macOS client — menu bar app                                       |
| `assistant/docs/architecture/security.md`        | Security model — sandbox, credentials, permissions, secret handling      |
| `assistant/docs/architecture/memory.md`          | Memory system — extraction, recall, provenance gates                     |
| `assistant/docs/credential-execution-service.md` | CES — credential isolation, secure commands, RPC boundary                |
