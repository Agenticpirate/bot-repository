---
name: branded-calling
description: Configure branded calling with call attestation
version: "1.0.0"
author: Telnyx
type: skill-md
---

# Branded Calling

> Configure branded calling with call attestation, CNAM registration, and trust registry enrollment for verified caller identity.

## Overview

Branded calling lets you display your company name, logo, and call reason on the recipient's phone screen before they answer. Combined with STIR/SHAKEN attestation and CNAM (Caller Name) registration, branded calling increases answer rates, builds trust, and ensures regulatory compliance for outbound calling.

Use this skill when you need to improve outbound call answer rates, comply with STIR/SHAKEN requirements, register your brand for verified caller ID, or set up CNAM for your phone numbers. Telnyx's direct carrier status simplifies this process — we handle the trust registry enrollment and attestation signing on your behalf.

## Prerequisites

- Telnyx account (sign up at https://telnyx.com)
- API key from https://portal.telnyx.com
- Telnyx phone numbers (purchased or ported)
- Business entity information (legal name, EIN, address) for trust registry

## Quick Start

### 1. Register CNAM for a Phone Number

Display your business name on outbound calls:

```bash
curl -X POST https://api.telnyx.com/v2/caller_id_names \
  -H "Authorization: Bearer $TELNYX_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "phone_number_id": "{phone_number_id}",
    "caller_id_name": "ACME CORP",
    "comments": "Main business line"
  }'
```

### 2. Enroll in Trust Registry

Submit your business for STIR/SHAKEN trust registry enrollment:

```bash
curl -X POST https://api.telnyx.com/v2/trust_registry \
  -H "Authorization: Bearer $TELNYX_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "business_name": "Acme Corporation",
    "business_type": "PRIVATE_PROFIT",
    "ein": "12-3456789",
    "address": {
      "street": "123 Main St",
      "city": "Chicago",
      "state": "IL",
      "postal_code": "60601",
      "country": "US"
    },
    "phone_numbers": ["+18665551000"]
  }'
```

### 3. Verify Attestation on Outbound Calls

After trust registry enrollment, outbound calls are automatically signed. Check your attestation level:

```bash
curl -X GET "https://api.telnyx.com/v2/phone_numbers/{phone_number_id}/attestation" \
  -H "Authorization: Bearer $TELNYX_API_KEY"
```

### 4. Configure Branded Call Display

Set up branded call display with company name and reason:

```bash
curl -X POST https://api.telnyx.com/v2/branded_calls \
  -H "Authorization: Bearer $TELNYX_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "phone_number_id": "{phone_number_id}",
    "brand_name": "Acme Corp",
    "call_reason": "Account Verification",
    "logo_url": "https://example.com/logo.png"
  }'
```

## Configuration

### Call Attestation Levels

| Level | Label | When You Get It | Display |
|-------|-------|----------------|---------|
| **A** | Full | You own the number, business verified in trust registry | ✓ Verified Caller |
| **B** | Partial | You are authorized but number is recently ported | ~ Verified |
| **C** | Gateway | Origin cannot be verified (pass-through) | No badge |

### CNAM Registration Rules

- Maximum 15 characters, uppercase letters and spaces only
- Must match your legal business name or DBA
- Takes 24–72 hours to propagate across carriers
- Each phone number can have one CNAM entry

### Trust Registry Enrollment Requirements

| Field | Required | Notes |
|-------|----------|-------|
| Business legal name | Yes | Must match EIN records |
| EIN | Yes | For US businesses |
| Business address | Yes | Physical address (not PO Box) |
| Business type | Yes | PRIVATE_PROFIT, PUBLIC_PROFIT, NON_PROFIT, GOVERNMENT |
| Phone numbers | Yes | Numbers to enroll (Telnyx-owned) |
| Website | Recommended | Helps verification |

## Examples

### Bulk CNAM Registration

Register caller ID names for multiple numbers:

```bash
for number_id in id_abc123 id_def456 id_ghi789; do
  curl -X POST https://api.telnyx.com/v2/caller_id_names \
    -H "Authorization: Bearer $TELNYX_API_KEY" \
    -H "Content-Type: application/json" \
    -d "{
      \"phone_number_id\": \"$number_id\",
      \"caller_id_name\": \"ACME CORP\",
      \"comments\": \"Bulk CNAM registration\"
    }"
done
```

### Check CNAM Status

```bash
curl -X GET "https://api.telnyx.com/v2/caller_id_names/{cnam_id}" \
  -H "Authorization: Bearer $TELNYX_API_KEY"
```

Status values: `pending`, `approved`, `rejected`.

### Verify Trust Registry Status

```bash
curl -X GET "https://api.telnyx.com/v2/trust_registry/{registry_id}" \
  -H "Authorization: Bearer $TELNYX_API_KEY"
```

Status values: `pending`, `verified`, `rejected`, `revoked`.

### Use with Call Control

When making outbound calls with Call Control, attestation is applied automatically:

```bash
curl -X POST https://api.telnyx.com/v2/calls \
  -H "Authorization: Bearer $TELNYX_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "connection_id": "{connection_id}",
    "to": "+15553098000",
    "from": "+18665551000",
    "call_control_id": "outbound-call-1"
  }'
```

The receiving carrier will display your CNAM name and STIR/SHAKEN attestation badge.

## Troubleshooting

### CNAM not showing on outbound calls
- CNAM takes 24–72 hours to propagate after registration
- Not all carriers display CNAM (e.g., some mobile carriers skip it)
- Ensure the CNAM name is ≤15 characters and uppercase
- Verify the CNAM status is `approved`

### Attestation showing level C instead of A
- Complete trust registry enrollment for your business
- Ensure the phone number is in the trust registry
- Recently ported numbers may temporarily show level B
- Check that the "from" number is owned by your Telnyx account

### Trust registry enrollment rejected
- Business name must exactly match EIN records
- Address must be a physical address (no PO Boxes)
- EIN must be valid and verifiable with the IRS
- Contact Telnyx support if you believe the rejection is incorrect

### Branded call display not appearing
- Branded calling support varies by carrier and device
- iOS and Android display branded calls differently
- The recipient's carrier must support branded call delivery
- Test with different carrier destinations to confirm

## See Also

- [Branded Calling Docs](https://developers.telnyx.com/docs/voice/branded-calling)
- [CNAM Registration](https://developers.telnyx.com/docs/voice/cnam)
- [STIR/SHAKEN Overview](https://developers.telnyx.com/docs/voice/stir-shaken)
- [Number Verification Skill](/.well-known/agent-skills/number-verification/SKILL.md)
- [Call Control Skill](/.well-known/agent-skills/call-control/SKILL.md)
