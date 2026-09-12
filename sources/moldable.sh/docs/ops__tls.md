> ## Documentation Index
> Fetch the complete documentation index at: https://docs.moldable.sh/llms.txt
> Use this file to discover all available pages before exploring further.

# TLS

> Enable encrypted remote control connections.

TLS encrypts the gateway's remote control connections so tokens and commands aren't sent in plain text.

When enabled, the gateway can generate a local certificate for you if one does not exist.

## Example

If you enable TLS and connect remotely, use the TLS fingerprint pinning option in your config so clients can verify they are talking to the correct gateway.

## Configuration

```json theme={null}
{
  "gateway": {
    "tls": {
      "enabled": true,
      "cert_path": null,
      "key_path": null,
      "fingerprint_sha256": null
    }
  }
}
```

## Certificate generation

If `cert_path`/`key_path` are not provided, the gateway will generate them in its local state directory.

## Fingerprint

The gateway computes a SHA-256 fingerprint of the certificate. You can store it in config and use it to pin remote clients.
