> ## Documentation Index
> Fetch the complete documentation index at: https://docs.moldable.sh/llms.txt
> Use this file to discover all available pages before exploring further.

# State paths

> Where config, sessions, and pairing data live on disk.

This page just tells you where Moldable Gateway stores files, logs, and configurations so you can easily find them.

## Config path

By default, the gateway uses platform-specific config directories:

* macOS/Linux: `~/.moldable/gateway/config.json5`
* Windows: `%APPDATA%\Moldable Gateway\config.json5`

You can override the path with `--config` or the `MOLDABLE_GATEWAY_CONFIG` environment variable.

## State directory

The state directory stores the gateway's local state (logs, pairing approvals, and other operational data):

```
~/.moldable/gateway/
```

If you need to locate logs or troubleshoot, prefer using the CLI commands in [Logging](/core/logging) and [Operations](/ops).
