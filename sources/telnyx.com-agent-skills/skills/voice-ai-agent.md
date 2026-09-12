---
name: voice-ai-agent
description: Build and deploy voice AI agents with STT/TTS/LLM on one platform
version: "1.0.0"
author: Telnyx
type: skill-md
---

# Voice AI Agent

> Build and deploy voice AI agents with integrated STT, TTS, and LLM on a single platform for sub-second conversational latency.

## Overview

Telnyx AI Assistants let you build voice AI agents that listen, think, and speak — all on one platform. Unlike stitching together separate STT, LLM, and TTS providers, Telnyx co-locates these components on its carrier edge, eliminating the network hops that cause conversational latency.

Use this skill when you need to create a voice agent that handles phone calls: IVR replacement, customer service automation, appointment scheduling, or any conversational AI over the phone. The platform manages WebSocket connections to STT/TTS engines and orchestrates the conversation loop so you can focus on the agent's behavior.

This skill covers creating an AI Assistant application, configuring STT/TTS/LLM, connecting it to a phone number, and testing end-to-end.

## Prerequisites

- Telnyx account (sign up at https://telnyx.com)
- API key from https://portal.telnyx.com
- A purchased Telnyx phone number
- (Optional) Custom LLM API key if using a non-Telnyx model

## Quick Start

### 1. Create an AI Assistant

```bash
curl -X POST https://api.telnyx.com/v2/ai_assistants \
  -H "Authorization: Bearer $TELNYX_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "customer-support-agent",
    "active": true,
    "system_prompt": "You are a helpful customer support agent for Acme Corp. Be concise and friendly. If you cannot help, offer to transfer to a human.",
    "language": "en",
    "voice_settings": {
      "tts_provider": "telnyx",
      "tts_voice": "en-US-Neural2-F"
    },
    "stt_settings": {
      "provider": "deepgram",
      "language": "en",
      "model": "nova-2"
    },
    "llm_settings": {
      "provider": "openai",
      "model": "gpt-4o-mini"
    },
    "webhook_url": "https://your-server.com/ai-webhook"
  }'
```

Save the response `id` — this is your assistant ID.

### 2. Connect to a Phone Number

```bash
curl -X POST https://api.telnyx.com/v2/phone_numbers/{phone_number_id}/ai_assistant \
  -H "Authorization: Bearer $TELNYX_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "ai_assistant_id": "{assistant_id}"
  }'
```

### 3. Test End-to-End

Call your Telnyx phone number from any phone. The AI agent will answer and begin conversing using your configured STT/TTS/LLM pipeline.

## Configuration

### STT Engine Options

| Provider | Model | Latency | Best For |
|----------|-------|---------|----------|
| Deepgram | `nova-2` | ~150ms | General purpose, fast |
| Deepgram | `enhanced` | ~200ms | Higher accuracy |
| Telnyx | `whisper` | ~250ms | Open-source, 50+ languages |

### TTS Voice Options

| Provider | Voice | Latency | Notes |
|----------|-------|---------|-------|
| Telnyx | `en-US-Neural2-F` | ~100ms | Natural female voice |
| Telnyx | `en-US-Neural2-D` | ~100ms | Natural male voice |
| ElevenLabs | Any custom voice | ~200ms | Custom voice cloning |
| Deepgram | `aura-asteria-en` | ~80ms | Low-latency, expressive |

### LLM Provider Options

| Provider | Model | Use Case |
|----------|-------|----------|
| OpenAI | `gpt-4o-mini` | Fast, cost-effective |
| OpenAI | `gpt-4o` | Complex reasoning |
| Anthropic | `claude-3.5-sonnet` | Nuanced conversations |
| Telnyx | `telnyx-llm` | Carrier-edge, lowest latency |

### Webhook Configuration

Set a `webhook_url` to receive real-time events:

```json
{
  "webhook_url": "https://your-server.com/ai-webhook",
  "webhook_events": [
    "call.started",
    "transcript.partial",
    "transcript.complete",
    "call.ended"
  ]
}
```

## Examples

### Function Calling

Give your agent tools via the system prompt and webhook:

```json
{
  "system_prompt": "You are a booking agent. When a customer wants to book, call the book_appointment function.",
  "tools": [
    {
      "type": "function",
      "function": {
        "name": "book_appointment",
        "description": "Book an appointment",
        "parameters": {
          "type": "object",
          "properties": {
            "date": {"type": "string", "description": "ISO 8601 date"},
            "time": {"type": "string", "description": "Time in HH:MM format"}
          },
          "required": ["date", "time"]
        }
      }
    }
  ]
}
```

Handle the function call in your webhook server and return the result.

### Transfer to Human

Configure transfer rules in the system prompt:

```
If the customer asks to speak to a human, say "Let me transfer you now" and call the transfer_call function.
```

### Multi-Language Agent

```json
{
  "language": "multi",
  "stt_settings": {
    "provider": "deepgram",
    "language": "en",
    "detect_language": true
  },
  "tts_settings": {
    "tts_provider": "telnyx",
    "tts_voice": "multi"
  }
}
```

## Troubleshooting

### Agent doesn't answer calls
- Verify the phone number is linked to the assistant (check `ai_assistant_id` on the number)
- Ensure the assistant `active` flag is `true`
- Check that you have sufficient calling credits

### High latency (>2 seconds response time)
- Switch STT to Deepgram `nova-2` for faster transcription
- Use `gpt-4o-mini` instead of `gpt-4o` for faster LLM inference
- Enable Telnyx edge inference for co-located processing
- Keep system prompts concise — long prompts increase TTFT

### Agent cuts off or talks over caller
- Adjust `end_utterance_silence_ms` (default 600ms, try 800ms for slower speakers)
- Enable `interruption_settings.allow_interruption: true` for barge-in support

### TTS voice sounds robotic
- Switch from default to a Neural2 voice
- Try ElevenLabs for custom voice quality
- Ensure `sample_rate` matches (16000 or 24000)

## See Also

- [AI Assistants Docs](https://developers.telnyx.com/docs/ai/ai-assistants)
- [Call Control API](https://developers.telnyx.com/docs/call-control)
- [STT/TTS Configuration](https://developers.telnyx.com/docs/ai/speech)
- [Edge Inference Skill](/.well-known/agent-skills/edge-inference/SKILL.md)
