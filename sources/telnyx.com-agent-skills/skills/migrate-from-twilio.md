---
name: migrate-from-twilio
description: Complete migration guide with code examples, CLI tool, and API mapping
version: "1.0.0"
author: Telnyx
type: skill-md
---

# Migrate from Twilio

> Complete migration guide with API mapping, code examples, phone number porting, and a CLI tool for automated migration.

## Overview

Migrating from Twilio to Telnyx is straightforward — both platforms use similar REST API patterns with webhooks for real-time events. The key differences are in authentication (API keys vs. Account SIDs), endpoint structure, and some naming conventions. This skill provides a step-by-step migration guide covering API mapping, phone number porting, webhook migration, and code examples in Node.js and Python.

Telnyx's direct carrier status means better pricing, lower latency, and no middleman — but it also means some concepts (like SIP connections) work differently than Twilio's abstraction layer.

Use this skill when you're planning or executing a migration from Twilio to Telnyx, whether for cost savings, performance, or carrier control.

## Prerequisites

- Telnyx account (sign up at https://telnyx.com)
- API key from https://portal.telnyx.com
- Existing Twilio account with active services
- Access to both platforms during the transition period

## Quick Start

### 1. Map Your Twilio Services

Before migrating, inventory your Twilio usage:

| Twilio Service | Telnyx Equivalent |
|---------------|-------------------|
| Twilio Voice | Telnyx Call Control |
| Twilio SMS | Telnyx Messaging API |
| Twilio SIP Domain | Telnyx SIP Connection |
| Twilio Phone Numbers | Telnyx Number Ordering |
| Twilio TaskRouter | Custom with Call Control |
| Twilio Studio | Custom with Call Control + AI Assistants |
| Twilio Functions | Your own server + Telnyx webhooks |
| Twilio Verify | Telnyx Verify API |

### 2. Port Your Phone Numbers

Initiate a number port from Twilio to Telnyx:

```bash
curl -X POST https://api.telnyx.com/v2/porting_orders \
  -H "Authorization: Bearer $TELNYX_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "phone_numbers": ["+18665551000", "+18665551001"],
    "billing_name": "Acme Corp",
    "billing_address": {
      "street": "123 Main St",
      "city": "Chicago",
      "state": "IL",
      "postal_code": "60601",
      "country": "US"
    },
    "carrier_name": "Twilio",
    "account_number": "ACxxxxxxxx",
    "pin": "1234"
  }'
```

Porting typically takes 2–5 business days for US numbers.

### 3. Swap API Calls

Replace Twilio SDK calls with Telnyx equivalents:

**Twilio (Node.js):**
```javascript
const twilio = require("twilio");
const client = twilio("ACxxx", "auth_token");

// Send SMS
const message = await client.messages.create({
  body: "Hello from Twilio",
  from: "+18665551000",
  to: "+15553098000"
});
```

**Telnyx (Node.js):**
```javascript
const telnyx = require("telnyx")("YOUR_API_KEY");

// Send SMS
const message = await telnyx.messages.create({
  from: "+18665551000",
  to: "+15553098000",
  text: "Hello from Telnyx"
});
```

## Configuration

### Authentication Mapping

| Twilio | Telnyx |
|--------|--------|
| Account SID + Auth Token | API Key (Bearer token) |
| `ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx` | `KEY0123456789...` |
| Base URL: `https://api.twilio.com/2010-04-01/` | Base URL: `https://api.telnyx.com/v2/` |

### Webhook Event Mapping

| Twilio Event | Telnyx Event |
|-------------|-------------|
| `ringing` | `call.initiated` |
| `in-progress` | `call.answered` |
| `completed` | `call.hangup` |
| `busy` | `call.hangup` (with `hangup_cause: "busy"`) |
| `no-answer` | `call.hangup` (with `hangup_cause: "no_answer"`) |
| `failed` | `call.hangup` (with `hangup_cause: "error"`) |
| `MessageStatus` values | `message.delivery_updated` events |

### Voice API Mapping

| Twilio Verb | Telnyx Equivalent |
|------------|-------------------|
| `<Dial>` | `POST /calls` + `bridge` action |
| `<Play>` | `POST /calls/{id}/actions/play` |
| `<Say>` | `POST /calls/{id}/actions/speak` |
| `<Gather>` | `POST /calls/{id}/actions/gather_using_audio` |
| `<Record>` | `POST /calls/{id}/actions/record_start` |
| `<Hangup>` | `POST /calls/{id}/actions/hangup` |
| `<Conference>` | `POST /calls/{id}/actions/join_conference` |
| `<Redirect>` | Respond to webhook with new actions |

## Examples

### Node.js: Outbound Call with IVR

**Twilio:**
```javascript
const twiml = new twilio.twiml.VoiceResponse();
twiml.say("Welcome to Acme Corp");
twiml.gather({
  numDigits: 1,
  action: "/handle-key"
}, (gather) => {
  gather.say("Press 1 for sales, 2 for support");
});
```

**Telnyx:**
```javascript
// Answer the call
await fetch(`https://api.telnyx.com/v2/calls/${callControlId}/actions/answer`, {
  method: "POST",
  headers: {
    "Authorization": `Bearer ${API_KEY}`,
    "Content-Type": "application/json"
  }
});

// Play greeting and gather DTMF
await fetch(`https://api.telnyx.com/v2/calls/${callControlId}/actions/gather_using_audio`, {
  method: "POST",
  headers: {
    "Authorization": `Bearer ${API_KEY}`,
    "Content-Type": "application/json"
  },
  body: JSON.stringify({
    audio_url: "https://example.com/menu.wav",
    digits: { min: 1, max: 1, timeout_ms: 5000 }
  })
});
```

### Python: SMS with Delivery Tracking

**Twilio:**
```python
from twilio.rest import Client

client = Client("ACxxx", "auth_token")
message = client.messages.create(
    body="Hello from Twilio",
    from_="+18665551000",
    to="+15553098000",
    status_callback="https://your-server.com/sms-status"
)
```

**Telnyx:**
```python
import telnyx

telnyx.api_key = "YOUR_API_KEY"
message = telnyx.Message.create(
    from_="+18665551000",
    to="+15553098000",
    text="Hello from Telnyx"
)
# Delivery receipts sent to messaging profile webhook_url
```

### Webhook Server Migration

**Twilio** expects TwiML XML responses. **Telnyx** expects you to call actions via the API (no XML needed):

```python
from flask import Flask, request

app = Flask(__name__)

@app.route("/call-webhook", methods=["POST"])
def handle_call():
    event = request.json
    event_type = event["data"]["event_type"]
    call_control_id = event["data"]["payload"]["call_control_id"]

    if event_type == "call.initiated":
        # Answer the call via API
        telnyx.Call.answer(call_control_id=call_control_id)
    elif event_type == "call.answered":
        # Play audio via API
        telnyx.Call.play(
            call_control_id=call_control_id,
            audio_url="https://example.com/greeting.wav"
        )

    return "", 200
```

## Troubleshooting

### Phone number port rejected
- Ensure the Twilio account is in good standing
- The authorized person on the port must match the Twilio account holder
- Check that numbers are not locked by Twilio contracts
- Contact Telnyx porting support for assistance

### Webhooks not firing after migration
- Update all webhook URLs from Twilio endpoints to your new server
- Telnyx sends JSON (not form-encoded like Twilio)
- Ensure your server handles `Content-Type: application/json`
- Telnyx webhooks use `data.event_type` instead of `CallStatus`

### SIP connections not working
- Twilio SIP Domains use `{domain}.sip.twilio.com`
- Telnyx uses `sip.telnyx.com` with IP or credential auth
- Update your SIP client configuration with new credentials
- See the SIP Trunking skill for setup instructions

### "Call Control ID not found" errors
- Call Control IDs are per-call, not per-number
- Store call_control_id from the `call.initiated` webhook
- IDs expire after the call ends

## See Also

- [API Mapping Reference](/.well-known/agent-skills/migrate-from-twilio/references/api-mapping.md)
- [Migration Guide](https://developers.telnyx.com/docs/migration/twilio)
- [Call Control API](https://developers.telnyx.com/docs/call-control)
- [Messaging API](https://developers.telnyx.com/docs/messaging)
- [SIP Trunking Skill](/.well-known/agent-skills/sip-trunking/SKILL.md)
