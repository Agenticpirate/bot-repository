---
name: call-control
description: Programmatic call control with WebRTC bridging
version: "1.0.0"
author: Telnyx
type: skill-md
---

# Call Control

> Programmatic call control with real-time actions, DTMF, transfers, conferencing, and WebRTC bridging.

## Overview

Telnyx Call Control gives you programmatic, real-time control over voice calls via a webhook-driven API. Instead of writing dialplan logic in a PBX, you respond to call events with actions — answer, play audio, collect DTMF input, transfer, bridge, record, and more. Every action is an API call, and every event is a webhook.

Use this skill when you need to build custom voice applications — IVR menus, call routing, conferencing, call recording, blind/warm transfers, or WebRTC-to-PSTN bridging. Call Control works with SIP trunks, phone numbers, and WebRTC clients.

## Prerequisites

- Telnyx account (sign up at https://telnyx.com)
- API key from https://portal.telnyx.com
- A Telnyx phone number or SIP connection
- A webhook endpoint to receive call events

## Quick Start

### 1. Configure Webhook on Connection

Set your webhook URL on the SIP connection or phone number:

```bash
curl -X PATCH https://api.telnyx.com/v2/connections/{connection_id} \
  -H "Authorization: Bearer $TELNYX_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "webhook_api_url": "https://your-server.com/call-webhook"
  }'
```

### 2. Make an Outbound Call

```bash
curl -X POST https://api.telnyx.com/v2/calls \
  -H "Authorization: Bearer $TELNYX_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "connection_id": "{connection_id}",
    "to": "+15553098000",
    "from": "+18665551000"
  }'
```

Save the `call_control_id` from the response.

### 3. Answer and Play Audio

When you receive a `call.initiated` webhook, answer the call:

```bash
curl -X POST "https://api.telnyx.com/v2/calls/{call_control_id}/actions/answer" \
  -H "Authorization: Bearer $TELNYX_API_KEY" \
  -H "Content-Type: application/json"
```

Then play audio:

```bash
curl -X POST "https://api.telnyx.com/v2/calls/{call_control_id}/actions/play" \
  -H "Authorization: Bearer $TELNYX_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "audio_url": "https://example.com/greeting.wav",
    "overlay": false
  }'
```

### 4. Collect DTMF Input (IVR Menu)

```bash
curl -X POST "https://api.telnyx.com/v2/calls/{call_control_id}/actions/gather_using_audio" \
  -H "Authorization: Bearer $TELNYX_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "audio_url": "https://example.com/menu.wav",
    "digits": {
      "min": 1,
      "max": 1,
      "timeout_ms": 5000
    }
  }'
```

## Configuration

### Call Events (Webhooks)

| Event | Trigger |
|-------|---------|
| `call.initiated` | Call is ringing (inbound or outbound) |
| `call.answered` | Call was answered |
| `call.hangup` | Call ended |
| `call.dtmf.received` | DTMF digit received |
| `call.playback.ended` | Audio playback finished |
| `call.gather.ended` | DTMF gathering completed |
| `call.transcription.started` | Transcription started |

### Audio Formats

| Format | Supported | Recommended For |
|--------|-----------|----------------|
| WAV (16-bit PCM) | ✓ | Best quality, lowest latency |
| MP3 | ✓ | Smaller file size |
| OGG | ✓ | WebRTC compatibility |

### WebRTC Client Setup

Connect browser-based WebRTC clients to the PSTN:

```javascript
import { TelnyxRTC } from "@telnyx/webrtc";

const client = new TelnyxClient({
  credentialLogin: {
    username: "your-sip-username",
    password: "your-sip-password",
  },
});

client.on("telnyx.ready", () => {
  console.log("WebRTC connected");
});

client.on("telnyx.notification", (notification) => {
  const call = notification.call;
  if (notification.type === "callInitiated") {
    call.answer();
  }
});

client.connect();
```

## Examples

### Blind Transfer

Transfer a call to another number without consulting the recipient:

```bash
curl -X POST "https://api.telnyx.com/v2/calls/{call_control_id}/actions/transfer" \
  -H "Authorization: Bearer $TELNYX_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "to": "+15553098001"
  }'
```

### Warm Transfer (Two-Step)

1. Create a second call to the transfer target:

```bash
curl -X POST https://api.telnyx.com/v2/calls \
  -H "Authorization: Bearer $TELNYX_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "connection_id": "{connection_id}",
    "to": "+15553098001",
    "from": "+18665551000"
  }'
```

2. Bridge the two calls together:

```bash
curl -X POST "https://api.telnyx.com/v2/calls/{call_control_id}/actions/bridge" \
  -H "Authorization: Bearer $TELNYX_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "call_control_id": "{second_call_control_id}"
  }'
```

### Conference Call

Create a conference and add participants:

```bash
# Create conference
curl -X POST "https://api.telnyx.com/v2/calls/{call_control_id}/actions/join_conference" \
  -H "Authorization: Bearer $TELNYX_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "conference_id": "my-conference-123"
  }'

# Add second participant
curl -X POST "https://api.telnyx.com/v2/calls/{second_call_control_id}/actions/join_conference" \
  -H "Authorization: Bearer $TELNYX_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "conference_id": "my-conference-123"
  }'
```

### Call Recording

Start and stop recording on a live call:

```bash
# Start recording
curl -X POST "https://api.telnyx.com/v2/calls/{call_control_id}/actions/record_start" \
  -H "Authorization: Bearer $TELNYX_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "format": "wav",
    "channels": "dual"
  }'

# Stop recording
curl -X POST "https://api.telnyx.com/v2/calls/{call_control_id}/actions/record_stop" \
  -H "Authorization: Bearer $TELNYX_API_KEY" \
  -H "Content-Type: application/json"
```

### Send DTMF

```bash
curl -X POST "https://api.telnyx.com/v2/calls/{call_control_id}/actions/send_dtmf" \
  -H "Authorization: Bearer $TELNYX_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "digits": "1234#"
  }'
```

## Troubleshooting

### Webhook not receiving call events
- Verify the webhook URL is accessible from the public internet
- Check that your server returns 200 OK within 3 seconds
- Use the webhook failover URL for redundancy
- Test with the Telnyx Call Control simulator in the portal

### Call connects but no audio
- Ensure codecs match — Telnyx supports G.711, G.722, Opus
- Open RTP ports (10000–20000 UDP) on your firewall
- Check NAT configuration — use STUN server `stun.telnyx.com:3478`
- Verify media encryption settings match on both ends

### DTMF not detected
- Set `dtmf_type: "rfc2833"` on your SIP connection
- For in-band DTMF, ensure G.711 codec is used
- Check `min`/`max` digits and `timeout_ms` in gather settings

### WebRTC client won't connect
- Verify SIP credentials are correct
- Ensure the WebRTC client uses WSS (not WS) for signaling
- Check browser permissions for microphone access
- Use the latest version of `@telnyx/webrtc` package

## See Also

- [Call Control Docs](https://developers.telnyx.com/docs/call-control)
- [Call Control API Reference](https://developers.telnyx.com/api/call-control)
- [WebRTC Guide](https://developers.telnyx.com/docs/voice/webrtc)
- [Conferencing](https://developers.telnyx.com/docs/voice/conferences)
- [SIP Trunking Skill](/.well-known/agent-skills/sip-trunking/SKILL.md)
