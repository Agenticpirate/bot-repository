> ## Documentation Index
> Fetch the complete documentation index at: https://docs.moldable.sh/llms.txt
> Use this file to discover all available pages before exploring further.

# Gateway audit

> Run a local security audit and optional fixes.

Gateway audit checks config and local filesystem permissions for common security issues and misconfigurations.

## Example

If `gateway.auth.mode` is `off`, the audit will flag it as a critical issue and suggest switching to token auth.

## IMPORTANT: Read this before running the audit

Security posture, pairing rules, and recommended setups are covered in
[Security and pairing](/core/security-and-pairing). This document focuses on the audit command output.

## Secure-by-default defaults

Moldable ships with secure defaults and expects you to opt in to higher-risk settings only when you
understand the tradeoffs.

* Public access is off by default and requires TLS if you opt in.

## Run the audit

```bash theme={null}
moldable gateway audit
```

## Apply safe fixes

```bash theme={null}
moldable gateway audit --fix
```

`--fix` applies safe config changes and tightens local file permissions.

## What it checks

* Config file and state directory presence
* Auth disabled (unsupported)
* TLS disabled on non-loopback binds
* Public access without TLS
* Missing auth token
* HTTP auth token requirements for HTTP endpoints
* Channel credentials or tokens missing/default
* Channel credentials and open DM policies without allowlist
* WhatsApp verify token
* Group policy disabled
* Node pairing not required
* Safety prompt disabled or metadata redaction off
* Permissions on config/state/data directories (chmod 600/700)
