---
name: sms-api
description: Send and receive SMS programmatically with delivery receipts
version: "1.0.0"
author: Telnyx
type: skill-md
---

# SMS API

> Send and receive SMS programmatically with delivery receipts, phone number provisioning, and 10DLC registration.

## Overview

The Telnyx Messaging API lets you send and receive SMS and MMS messages at scale, with real-time delivery receipts, phone number provisioning, and full 10DLC compliance built in. Telnyx operates its own carrier network, which means better deliverability, no middleman markup, and direct control over message routing.

Use this skill when you need to add SMS capabilities to your application — notifications, two-factor authentication, appointment reminders, conversational messaging, or bulk campaigns. This skill covers the full messaging lifecycle: provisioning numbers, sending messages, receiving inbound messages via webhooks, handling delivery receipts, and registering for 10DLC compliance.

## Prerequisites

- Telnyx account (sign up at https://telnyx.com)
- API key from https://portal.telnyx.com
- A Telnyx phone number with messaging enabled
- A webhook endpoint to receive inbound messages and delivery receipts

## Quick Start

### 1. Purchase a Phone Number

```bash
curl -X POST https://api.telnyx.com/v2/number_orders \
  -H "Authorization: Bearer $TELNYX_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "phone_numbers": [
      {"phone_number": "+18665551000"}
    ]
  }'
```

### 2. Send an SMS

```bash
curl -X POST https://api.telnyx.com/v2/messages \
  -H "Authorization: Bearer $TELNYX_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "from": "+18665551000",
    "to": "+15553098000",
    "text": "Hello from Telnyx! Your code is 123456."
  }'
```

### 3. Receive Inbound SMS

Configure a webhook URL on your messaging profile. Telnyx will POST inbound messages to your endpoint:

```json
{
  "data": {
    "event_type": "message.received",
    "payload": {
      "from": "+15553098000",
      "to": "+18665551000",
      "text": "Hi, I need help with my order.",
      "message_id": "msg_abc123"
    }
  }
}
```

### 4. Handle Delivery Receipts

Telnyx sends delivery status updates to your webhook:

```json
{
  "data": {
    "event_type": "message.delivery_updated",
    "payload": {
      "message_id": "msg_abc123",
      "to": "+15553098000",
      "status": "delivered",
      "errors": []
    }
  }
}
```

Delivery statuses: `queued`, `sent`, `delivered`, `undelivered`, `failed`.

## Configuration

### Messaging Profile

Create a messaging profile to group settings for a set of phone numbers:

```bash
curl -X POST https://api.telnyx.com/v2/messaging_profiles \
  -H "Authorization: Bearer $TELNYX_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "production-sms",
    "enabled": true,
    "webhook_url": "https://your-server.com/sms-webhook",
    "webhook_failover_url": "https://fallback.your-server.com/sms-webhook",
    "number_pool_settings": {
      "geometry": "US",
      "limit": 5
    }
  }'
```

### Enable SMS on a Phone Number

```bash
curl -X PATCH https://api.telnyx.com/v2/phone_numbers/{phone_number_id} \
  -H "Authorization: Bearer $TELNYX_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "messaging_profile_id": "{messaging_profile_id}"
  }'
```

### 10DLC Registration

For US A2P messaging at scale, register your brand and campaign:

```bash
# Register your brand
curl -X POST https://api.telnyx.com/v2/10dlc/brands \
  -H "Authorization: Bearer $TELNYX_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Acme Corp",
    "entity_type": "PRIVATE_PROFIT",
    "ein": "12-3456789",
    "stock_symbol": "ACME"
  }'

# Register a campaign
curl -X POST https://api.telnyx.com/v2/10dlc/campaigns \
  -H "Authorization: Bearer $TELNYX_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "brand_id": "{brand_id}",
    "use_case": "AUTHENTICATION",
    "description": "2FA codes for user login",
    "sample_messages": ["Your login code is 123456. Do not share this code."]
  }'
```

## Examples

### Send MMS with Image

```bash
curl -X POST https://api.telnyx.com/v2/messages \
  -H "Authorization: Bearer $TELNYX_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "from": "+18665551000",
    "to": "+15553098000",
    "text": "Check out our new product!",
    "media_urls": ["https://example.com/product-image.jpg"]
  }'
```

### Number Pool for Outbound Scaling

Enable number pooling on your messaging profile to automatically rotate through multiple sender numbers:

```json
{
  "number_pool_settings": {
    "geometry": "US",
    "limit": 10,
    "reuse_outbound_number": true
  }
}
```

Then send messages using the profile ID instead of a specific number:

```bash
curl -X POST https://api.telnyx.com/v2/messages \
  -H "Authorization: Bearer $TELNYX_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "messaging_profile_id": "{messaging_profile_id}",
    "to": "+15553098000",
    "text": "Your appointment is confirmed for 3pm."
  }'
```

### Python SDK Example

```python
import telnyx

telnyx.api_key = "YOUR_API_KEY"

message = telnyx.Message.create(
    from_="+18665551000",
    to="+15553098000",
    text="Hello from the Telnyx Python SDK!"
)

print(f"Message ID: {message.id}")
print(f"Status: {message.status}")
```

## Troubleshooting

### Messages stuck in "queued" status
- Verify the phone number has a messaging profile assigned
- Check that the messaging profile is enabled
- For US numbers: ensure 10DLC registration is approved
- Check your account balance

### "Undelivered" or "failed" status
- Verify the destination number is valid and can receive SMS
- For US: confirm 10DLC campaign covers your use case
- Check that the "from" number supports SMS (not voice-only)
- Review error codes in the delivery receipt for specifics

### Inbound messages not reaching webhook
- Verify webhook URL is accessible from the public internet
- Test with `curl -X POST https://your-server.com/sms-webhook` from outside
- Check webhook URL is set on the messaging profile
- Ensure your server returns 200 OK within 5 seconds

### 10DLC registration rejected
- Ensure EIN matches the legal entity name
- Campaign description must match actual message content
- Sample messages must be realistic representations
- Allow 2–5 business days for brand verification

## See Also

- [Messaging API Docs](https://developers.telnyx.com/docs/messaging)
- [10DLC Registration](https://developers.telnyx.com/docs/messaging/10dlc)
- [Number Ordering](https://developers.telnyx.com/docs/numbers/number-ordering)
- [MMS Guide](https://developers.telnyx.com/docs/messaging/mms)
