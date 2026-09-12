> ## Documentation Index
> Fetch the complete documentation index at: https://docs.moldable.sh/llms.txt
> Use this file to discover all available pages before exploring further.

# WhatsApp Cloud

> Configure the WhatsApp Cloud adapter and webhook.

This enables you to use WhatsApp Cloud to securely connect with your local computer via the gateway.

The WhatsApp Cloud adapter uses Meta's WhatsApp Cloud API. It runs a local webhook server and sends outbound replies via the Graph API.

**Important:** WhatsApp Cloud bots use a **phone number**, not a separate bot identity. We strongly recommend using a **dedicated SIM/number** for the bot. Otherwise, anyone who messages your regular WhatsApp number can potentially interact with the bot and access whatever it can access.

## Requirements

* A WhatsApp Cloud app in Meta Business Manager.
* `access_token` and `phone_number_id` from the app.
* A webhook endpoint that Meta can reach.

## Create the WhatsApp Cloud app (quick steps)

1. In Meta Business Manager, create a **Meta app** and add the **WhatsApp** product.
2. In **WhatsApp > API Setup**, copy the **Phone Number ID**.
3. Generate an **access token** (temporary for testing, or a long‑lived system user token for production).
4. Pick a **verify token** (random string) you will use for webhook verification.
5. You will need a **public HTTPS** URL for the webhook (use a tunnel if running locally).

## Basic configuration

```json theme={null}
{
  "channels": {
    "whatsapp": {
      "enabled": true,
      "allow_from": [],
      "groups": [],
      "require_mention": true,
      "cloud": {
        "enabled": true,
        "verify_token": "<verify-token>",
        "app_secret": "<meta-app-secret>",
        "access_token": "<access-token>",
        "phone_number_id": "<phone-number-id>",
        "webhook_bind": "127.0.0.1:8088"
      }
    }
  }
}
```

## Recommended setup (webhook + tunnel)

WhatsApp Cloud requires a **public HTTPS** webhook endpoint. The safest pattern is:

* Keep the gateway local-only.
* Expose only the webhook port through a tunnel (ngrok/Tailscale/Cloudflare Tunnel).

```json theme={null}
{
  "gateway": {
    "bind": "loopback",
    "public_access": false,
    "auth": { "mode": "token", "token": "<gateway-token>" }
  },
  "channels": {
    "whatsapp": {
      "enabled": true,
      "cloud": {
        "enabled": true,
        "verify_token": "<verify-token>",
        "app_secret": "<meta-app-secret>",
        "access_token": "<access-token>",
        "phone_number_id": "<phone-number-id>",
        "webhook_bind": "127.0.0.1:8088"
      }
    }
  }
}
```

Example ngrok command (maps public HTTPS to local webhook):

```bash theme={null}
ngrok http 8088
```

Set your Meta webhook URL to the HTTPS URL ngrok gives you plus `/webhook`.

## Webhook setup

* The gateway listens on `http://<host>:8088/webhook` by default.
* Meta will send a verification request with `hub.verify_token`.
* The adapter replies with the provided challenge when the token matches.
* For webhook POSTs, set `cloud.app_secret` to verify `X-Hub-Signature-256` and prevent forged requests.
* In Meta’s webhook settings, **subscribe to message events** for the WhatsApp product.

## Pairing and allowlists

WhatsApp uses the shared pairing and allowlist rules. See [Security and pairing](/core/security-and-pairing).

## Security tips

* Keep `gateway.public_access=false`; only tunnel the webhook port, not the gateway.
* Use a random `verify_token` and store it safely.
* Use `pairing.dm_policy=pairing` unless you have a controlled, allowlisted setup.

## Notes

* The `webhook_bind` must be reachable by Meta (often via a tunnel or reverse proxy).
