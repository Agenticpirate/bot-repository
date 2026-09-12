> ## Documentation Index
> Fetch the complete documentation index at: https://docs.moldable.sh/llms.txt
> Use this file to discover all available pages before exploring further.

# Services

> Install and run the gateway as a background service.

Services let the gateway run in the background and automatically restart when your system reboots.

Moldable Gateway can install a background service on macOS, Linux, or Windows.

## Install

```bash theme={null}
moldable gateway install-service
```

## Start/stop

```bash theme={null}
moldable gateway start-service
moldable gateway stop-service
```

## Status

```bash theme={null}
moldable gateway service-status
```

## What gets installed

* macOS: LaunchAgent `com.moldable.gateway` under `~/Library/LaunchAgents/`.
* Linux: user-level systemd unit `~/.config/systemd/user/moldable-gateway.service`.
* Windows: a scheduled task named `MoldableGateway`.

## Logs

On macOS, stdout/stderr are written to `/tmp/moldable-gateway.log` by the LaunchAgent (unless you enable the disk log kill switch `gateway.logs.disable_disk_logs`, in which case service stdio is redirected to `/dev/null` when the service is installed).
If you change that setting later, re-run `moldable gateway install-service` to update the service config.

The gateway also writes persistent logs under `~/.moldable/gateway/logs/`:

* `gateway.log` - the human-readable CLI activity stream
* `trace.log` - detailed debug logging
