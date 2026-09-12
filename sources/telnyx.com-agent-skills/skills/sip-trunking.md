---
name: sip-trunking
description: Configure and deploy SIP trunks on carrier-owned infrastructure
version: "1.0.0"
author: Telnyx
type: skill-md
---

# SIP Trunking

> Configure and deploy SIP trunks on carrier-owned infrastructure for reliable, low-latency voice connectivity.

## Overview

SIP trunking replaces traditional phone lines with internet-based voice connectivity, letting you make and receive calls over the Telnyx carrier network. Telnyx operates its own private IP backbone, ensuring call quality and reliability that public-internet SIP trunks can't match.

Use this skill when you need to set up programmatic voice connectivity — whether connecting a PBX, building a custom dialer, or routing calls through your own infrastructure. Telnyx SIP trunks support IP-based and credential-based authentication, STIR/SHAKEN attestation, and global outbound routing.

This skill covers the full lifecycle: creating a SIP trunk, configuring authentication, setting outbound routes, testing with a softphone, and verifying STIR/SHAKEN attestation.

## Prerequisites

- Telnyx account (sign up at https://telnyx.com)
- API key from https://portal.telnyx.com
- A softphone or SIP client (e.g., Linphone, Zoiper) for testing
- A Telnyx phone number (purchase via API or portal)

## Quick Start

### 1. Create a SIP Trunk Connection

```bash
curl -X POST https://api.telnyx.com/v2/connections \
  -H "Authorization: Bearer $TELNYX_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "connection_name": "my-sip-trunk",
    "active": true,
    "transport_protocol": "udp",
    "default_on_hold_comfort_noise_enabled": true,
    "dtmf_type": "rfc2833",
    "encode_contact_header_enabled": false,
    "encrypted_media": "srtp_preferred",
    "rtp_timeout": 30
  }'
```

Save the `id` from the response — this is your connection ID.

### 2. Configure IP Authentication

If your PBX has a static IP, use IP authentication for the simplest setup:

```bash
curl -X POST https://api.telnyx.com/v2/ip_connections \
  -H "Authorization: Bearer $TELNYX_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "connection_id": "{connection_id}",
    "ip": "203.0.113.50",
    "port": 5060
  }'
```

### 3. Or Configure Credential Authentication

If you don't have a static IP, use SIP credentials:

```bash
curl -X POST https://api.telnyx.com/v2/credential_connections \
  -H "Authorization: Bearer $TELNYX_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "connection_id": "{connection_id}",
    "username": "my-sip-user",
    "password": "secure-password-here"
  }'
```

### 4. Set Outbound Voice Profile

Create an outbound voice profile to define routing rules:

```bash
curl -X POST https://api.telnyx.com/v2/outbound_voice_profiles \
  -H "Authorization: Bearer $TELNYX_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "default-outbound",
    "enabled": true,
    "connection_id": "{connection_id}"
  }'
```

### 5. Assign a Phone Number

Link a purchased phone number to your SIP trunk:

```bash
curl -X PATCH https://api.telnyx.com/v2/phone_numbers/{phone_number_id} \
  -H "Authorization: Bearer $TELNYX_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "connection_id": "{connection_id}"
  }'
```

## Configuration

### Transport Protocol

| Protocol | Use Case |
|----------|----------|
| `udp` | Default, lowest overhead, best for LAN |
| `tcp` | Traverses firewalls better than UDP |
| `tls` | Encrypted SIP signaling (recommended for production) |

### Media Encryption

| Option | Description |
|--------|-------------|
| `disabled` | No media encryption (lowest latency) |
| `srtp_preferred` | Use SRTP if both sides support it, fallback to RTP |
| `srtp_only` | Require SRTP — reject unencrypted media |
| `zrtp` | Use ZRTP for key negotiation (WebRTC friendly) |

### STIR/SHAKEN Attestation

Telnyx automatically signs outbound calls with STIR/SHAKEN attestation:

- **Full (A)** — You own the number and are authorized to use it
- **Partial (B)** — You are authorized but origin cannot be fully verified
- **Gateway (C)** — Call is passing through a gateway

To verify attestation on inbound calls, inspect the `stir_shaken` object in the call webhook.

## Examples

### Test with a Softphone

Configure your softphone with these settings:

| Setting | Value |
|---------|-------|
| SIP Server | `sip.telnyx.com` |
| Username | Your credential username (if using credential auth) |
| Password | Your credential password |
| Transport | Match your trunk's transport protocol |
| STUN Server | `stun.telnyx.com:3478` |

Place an outbound call to verify two-way audio.

### Verify STIR/SHAKEN on Inbound

When you receive an inbound call webhook, check the attestation:

```json
{
  "stir_shaken": {
    "attestation": "A",
    "verification_result": "TN-Auth-List pass"
  }
}
```

### Create Multiple IP Auth Entries

For multi-site deployments, register each site's IP:

```bash
# Site 1
curl -X POST https://api.telnyx.com/v2/ip_connections \
  -H "Authorization: Bearer $TELNYX_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"connection_id": "{connection_id}", "ip": "203.0.113.10", "port": 5060}'

# Site 2
curl -X POST https://api.telnyx.com/v2/ip_connections \
  -H "Authorization: Bearer $TELNYX_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"connection_id": "{connection_id}", "ip": "198.51.100.20", "port": 5060}'
```

## Troubleshooting

### No audio on calls
- Check that RTP ports (10000–20000 UDP) are open on your firewall
- Verify STUN server is configured: `stun.telnyx.com:3478`
- Ensure codec overlap — Telnyx supports G.711 (PCMA/PCMU), G.722, Opus

### One-way audio
- Typically a NAT/firewall issue — ensure your PBX's public IP matches the SIP Contact header
- Enable `encode_contact_header_enabled: true` if behind NAT

### SIP registration fails
- Verify username/password for credential auth
- Check that your IP is whitelisted for IP auth
- Confirm the transport protocol matches (UDP/TCP/TLS)

### STIR/SHAKEN attestation showing C instead of A
- Ensure your number is purchased from Telnyx (not ported recently)
- Complete CNAM registration for the number
- Contact support for trust registry enrollment

## See Also

- [SIP Trunking Docs](https://developers.telnyx.com/docs/voice/sip-trunking)
- [STIR/SHAKEN Overview](https://developers.telnyx.com/docs/voice/stir-shaken)
- [Call Control API](https://developers.telnyx.com/docs/call-control)
- [Number Ordering API](https://developers.telnyx.com/docs/numbers/number-ordering)
