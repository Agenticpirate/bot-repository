> ## Documentation Index
> Fetch the complete documentation index at: https://docs.moldable.sh/llms.txt
> Use this file to discover all available pages before exploring further.

# Gateway runtime

> How the daemon orchestrates channels, pairing, routing, and AI.

This is the main runtime loop: it receives messages, checks rules, calls the AI, and replies.

At a high level, the gateway runtime coordinates:

1. Start channel adapters.
2. Accept inbound messages.
3. Apply pairing and allowlist checks.
4. Resolve routing and select the AI backend.
5. Load recent history for context.
6. Call the configured backend.
7. Store the exchange locally and send the response back to the channel.

## Self-healing loops

The runtime also runs periodic “maintenance” loops:

* Team watchdog (auto-respawn stalled teammates)

See [Team watchdog](/core/team-watchdog) for teammate staleness detection and respawn behavior.

## Routing

The runtime resolves the AI backend in this order:

1. Per-peer override
2. Per-group override
3. Per-channel override
4. Default adapter

Routing rules are configured under `routing` in the config file.

### Example

If you override routing for one Telegram group, only that group uses the custom adapter; everything else falls back to the default.

## Metrics

The runtime tracks:

* inbound message count
* outbound message count
* last inbound/outbound timestamps

You can view health/status via the CLI:

```bash theme={null}
moldable gateway health
moldable gateway status
```

## Gateway lock

When running locally, the gateway creates a lock file in the state directory to prevent multiple instances.

## Config reloads

Some configuration changes can be applied without a full restart. For safety, the gateway may restart itself after certain changes.
