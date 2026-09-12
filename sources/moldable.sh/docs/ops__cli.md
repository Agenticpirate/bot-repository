> ## Documentation Index
> Fetch the complete documentation index at: https://docs.moldable.sh/llms.txt
> Use this file to discover all available pages before exploring further.

# CLI reference

> Commands and flags for operating the gateway.

This is the command reference for running and operating the gateway using the command line.

The CLI controls the running gateway over a local control API.

## Example

```bash theme={null}
moldable gateway status
```

This command asks the gateway for a status snapshot and prints it.

## Global flags

* `--config <path>`: override config file path.
* `--url <url>`: override the gateway control URL (remote mode).
* `--token <token>`: override auth token for remote control.

## Commands

### Run the gateway

```bash theme={null}
moldable gateway run
```

If the startup security summary reports critical findings, the gateway will refuse to start.
Use `moldable gateway run --force` to override (not recommended).
Auto-restart on config changes is on by default. Set `gateway.restart_on_change=false` to
disable, or use `moldable gateway run --restart-on-change` to force it on.

### Health and status

```bash theme={null}
moldable gateway health
moldable gateway status
```

### Pairing

```bash theme={null}
moldable gateway pair list
moldable gateway pair approve <channel> <code>
moldable gateway pair reject <channel> <code>
```

### Node pairing and runtime

```bash theme={null}
moldable gateway node pair-list
moldable gateway node pair-approve <node-id>
moldable gateway node pair-reject <node-id>
moldable gateway node runtime-list
moldable gateway node invoke <node-id> "<command>"
```

### Channels and sessions

```bash theme={null}
moldable gateway channels-status
moldable gateway sessions-list
```

### Services

```bash theme={null}
moldable gateway install-service
moldable gateway start-service
moldable gateway stop-service
moldable gateway restart-service
moldable gateway service-status
```

### Onboarding

```bash theme={null}
moldable onboard
```

### Doctor

```bash theme={null}
moldable doctor
moldable doctor --repair
```

### Security audit (config + security checks)

```bash theme={null}
moldable gateway audit
moldable gateway audit --fix
```

`--fix` applies safe config changes and tightens local file permissions (chmod).
