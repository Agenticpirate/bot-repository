---
name: number-verification
description: Verify phone numbers and detect SIM swap with STIR/SHAKEN
version: "1.0.0"
author: Telnyx
type: skill-md
---

# Number Verification

> Verify phone numbers, detect SIM swaps, and validate caller identity with STIR/SHAKEN attestation.

## Overview

Telnyx Number Verification provides real-time intelligence about phone numbers — whether they're valid, who the carrier is, whether a SIM swap recently occurred, and the STIR/SHAKEN attestation level of inbound calls. This is critical for fraud prevention, account security, and regulatory compliance.

Use this skill when you need to validate phone numbers at sign-up, detect SIM swap fraud before sending OTP codes, verify caller identity for high-value transactions, or implement STIR/SHAKEN attestation checks on inbound calls.

This skill covers the Number Lookup API, SIM swap detection, caller ID verification, and STIR/SHAKEN attestation levels.

## Prerequisites

- Telnyx account (sign up at https://telnyx.com)
- API key from https://portal.telnyx.com
- Phone numbers to verify (E.164 format: `+15553098000`)

## Quick Start

### 1. Number Lookup

Get carrier and line type information for any phone number:

```bash
curl -X GET "https://api.telnyx.com/v2/number_lookup/+15553098000" \
  -H "Authorization: Bearer $TELNYX_API_KEY"
```

Response:

```json
{
  "data": {
    "phone_number": "+15553098000",
    "valid": true,
    "carrier": {
      "name": "Telnyx LLC",
      "type": "voip",
      "mobile_country_code": "310",
      "mobile_network_code": "999"
    },
    "line_type": "voip",
    "country_code": "US",
    "national_format": "(555) 309-8000"
  }
}
```

### 2. SIM Swap Detection

Check if a SIM swap has occurred on a mobile number recently:

```bash
curl -X POST https://api.telnyx.com/v2/sim_swap \
  -H "Authorization: Bearer $TELNYX_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "phone_number": "+15553098000"
  }'
```

Response:

```json
{
  "data": {
    "phone_number": "+15553098000",
    "sim_swap_detected": true,
    "sim_swap_date": "2024-12-15T08:30:00Z",
    "carrier_name": "T-Mobile US"
  }
}
```

### 3. Caller ID Verification (Inbound Calls)

When you receive an inbound call via Call Control, check STIR/SHAKEN attestation in the webhook:

```json
{
  "data": {
    "event_type": "call.initiated",
    "payload": {
      "from": "+15553098000",
      "to": "+18665551000",
      "stir_shaken": {
        "attestation": "A",
        "verification_result": "valid",
        "certificate_chain": "verified"
      }
    }
  }
}
```

## Configuration

### Attestation Levels

| Level | Label | Meaning |
|-------|-------|---------|
| **A** | Full Attestation | Calling party is known and authorized to use this number |
| **B** | Partial Attestation | Calling party is known but origin cannot be fully verified |
| **C** | Gateway Attestation | Call is passing through a gateway; origin cannot be verified |

### Line Types from Number Lookup

| Type | Description |
|------|-------------|
| `mobile` | Mobile/cellular number |
| `landline` | Fixed-line number |
| `voip` | Voice over IP number |
| `toll_free` | Toll-free number |
| `premium` | Premium rate number |
| `unknown` | Type could not be determined |

### SIM Swap Detection Parameters

```json
{
  "phone_number": "+15553098000",
  "max_age_hours": 72
}
```

Use `max_age_hours` to define how far back to check for SIM swaps. Default: 72 hours.

## Examples

### Pre-OTP SIM Swap Check

Before sending a one-time password, verify the SIM hasn't been swapped:

```python
import telnyx

telnyx.api_key = "YOUR_API_KEY"

def send_otp_safely(phone_number):
    # Check for recent SIM swap
    sim_check = telnyx.SimSwap.retrieve(phone_number=phone_number)

    if sim_check.sim_swap_detected:
        # SIM was recently swapped — don't send OTP
        # Require alternative verification
        return {"status": "blocked", "reason": "sim_swap_detected"}

    # Safe to send OTP via SMS
    message = telnyx.Message.create(
        from_="+18665551000",
        to=phone_number,
        text=f"Your verification code is {generate_otp()}"
    )
    return {"status": "sent", "message_id": message.id}
```

### Batch Number Verification

Validate multiple numbers at sign-up:

```bash
for number in +15553098000 +15553098001 +15553098002; do
  result=$(curl -s -X GET "https://api.telnyx.com/v2/number_lookup/$number" \
    -H "Authorization: Bearer $TELNYX_API_KEY")
  echo "$number: $(echo $result | jq -r '.data.valid') / $(echo $result | jq -r '.data.line_type')"
done
```

### Verify Inbound Caller Identity

Use Call Control to check caller identity on live calls:

```python
import telnyx

telnyx.api_key = "YOUR_API_KEY"

# In your call webhook handler
def handle_call_initiated(event):
    stir_shaken = event["payload"]["stir_shaken"]

    if stir_shaken["attestation"] == "A" and stir_shaken["verification_result"] == "valid":
        # High-confidence caller — proceed normally
        answer_call(event["payload"]["call_control_id"])
    elif stir_shaken["attestation"] == "C":
        # Low confidence — add extra verification step
        require_pin_verification(event["payload"]["call_control_id"])
    else:
        # No attestation — treat as unverified
        log_unverified_call(event["payload"]["from"])
```

### Identify Fraudulent VoIP Numbers

Filter out VoIP numbers that are often used for fraud:

```bash
curl -X GET "https://api.telnyx.com/v2/number_lookup/+15553098000" \
  -H "Authorization: Bearer $TELNYX_API_KEY" | jq '
    if .data.line_type == "voip" then
      {action: "flag", reason: "voip_number", carrier: .data.carrier.name}
    else
      {action: "allow", line_type: .data.line_type}
    end
  '
```

## Troubleshooting

### Number lookup returns `valid: false`
- Ensure the number is in E.164 format (`+1` prefix for US)
- The number may be invalid, disconnected, or not yet assigned
- Some recently ported numbers may show stale carrier info

### SIM swap check returns no data
- SIM swap detection only works for mobile numbers (not landline/VoIP)
- Some carriers don't expose SIM swap data — response will indicate `unsupported_carrier`
- International numbers may have limited carrier support

### STIR/SHAKEN attestation missing on inbound calls
- Not all carriers sign calls with STIR/SHAKEN yet
- International inbound calls typically don't have attestation
- Calls from VoIP providers may lack attestation — not necessarily fraudulent

### Rate limiting on Number Lookup
- Number Lookup API has per-minute rate limits
- Cache results for frequently looked-up numbers (TTL: 24h recommended)
- Use batch endpoints for bulk verification when available

## See Also

- [Number Lookup API](https://developers.telnyx.com/docs/numbers/number-lookup)
- [SIM Swap Detection](https://developers.telnyx.com/docs/security/sim-swap)
- [STIR/SHAKEN Overview](https://developers.telnyx.com/docs/voice/stir-shaken)
- [Call Control API](https://developers.telnyx.com/docs/call-control)
- [Branded Calling Skill](/.well-known/agent-skills/branded-calling/SKILL.md)
