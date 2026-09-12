---
name: stt-tts
description: Configure speech-to-text and text-to-speech with sub-200ms latency
version: "1.0.0"
author: Telnyx
type: skill-md
---

# Speech-to-Text & Text-to-Speech

> Configure STT and TTS engines for sub-200ms streaming latency in voice AI applications.

## Overview

Telnyx provides integrated access to industry-leading STT and TTS engines through a unified API. When used with Telnyx AI Assistants or Call Control, the STT/TTS engines run co-located with the call media on the Telnyx carrier edge — cutting the network latency that makes cloud-only pipelines feel sluggish.

Use this skill when you need to configure speech recognition or synthesis for voice applications — IVR, voice agents, transcription, or real-time communication. You can use these engines standalone via WebSocket APIs or as part of an AI Assistant pipeline.

This skill covers available engines, streaming configuration, latency optimization, and integration patterns.

## Prerequisites

- Telnyx account (sign up at https://telnyx.com)
- API key from https://portal.telnyx.com
- A WebSocket client library (for streaming STT/TTS)

## Quick Start

### 1. STT via WebSocket (Deepgram)

Connect to the streaming STT endpoint and send audio in real-time:

```javascript
const ws = new WebSocket(
  "wss://api.telnyx.com/v2/stt/stream?provider=deepgram&model=nova-2&language=en",
  ["Bearer", TELNYX_API_KEY]
);

ws.onopen = () => {
  // Send audio chunks (16kHz, 16-bit PCM, mono)
  const audioBuffer = getAudioFromMicrophone();
  ws.send(audioBuffer);
};

ws.onmessage = (event) => {
  const result = JSON.parse(event.data);
  console.log("Transcript:", result.channel.alternatives[0].transcript);
  console.log("Is final:", result.is_final);
};
```

### 2. TTS via REST API

Synthesize speech from text:

```bash
curl -X POST https://api.telnyx.com/v2/tts/synthesize \
  -H "Authorization: Bearer $TELNYX_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "text": "Hello! Welcome to Acme Corp customer support.",
    "voice": "en-US-Neural2-F",
    "provider": "telnyx",
    "output_format": "mp3",
    "sample_rate": 24000
  }' \
  --output greeting.mp3
```

### 3. TTS via WebSocket (Streaming)

For real-time voice AI, stream TTS audio as it's generated:

```javascript
const ws = new WebSocket(
  "wss://api.telnyx.com/v2/tts/stream?voice=en-US-Neural2-F&provider=telnyx&sample_rate=24000",
  ["Bearer", TELNYX_API_KEY]
);

ws.onopen = () => {
  ws.send(JSON.stringify({ text: "Hello! How can I help you today?" }));
};

ws.onmessage = (event) => {
  // event.data is a PCM audio chunk — play it immediately
  playAudioChunk(event.data);
};
```

## Configuration

### STT Engines

| Provider | Model | Latency | Languages | Best For |
|----------|-------|---------|-----------|----------|
| Deepgram | `nova-2` | ~150ms | 36+ | General purpose, fast |
| Deepgram | `enhanced` | ~200ms | 36+ | Higher accuracy |
| Deepgram | `whisper` | ~250ms | 50+ | Open-source, multilingual |

### STT Streaming Parameters

```json
{
  "provider": "deepgram",
  "model": "nova-2",
  "language": "en",
  "punctuate": true,
  "diarize": false,
  "interim_results": true,
  "utterance_end_ms": 1000,
  "vad_events": true,
  "encoding": "linear16",
  "sample_rate": 16000,
  "channels": 1
}
```

### TTS Voices

| Provider | Voice | Gender | Style | Latency |
|----------|-------|--------|-------|---------|
| Telnyx | `en-US-Neural2-F` | Female | Conversational | ~100ms |
| Telnyx | `en-US-Neural2-D` | Male | Conversational | ~100ms |
| Deepgram | `aura-asteria-en` | Female | Expressive | ~80ms |
| Deepgram | `aura-zeus-en` | Male | Authoritative | ~80ms |
| ElevenLabs | Custom voices | Varies | Clone from sample | ~200ms |

### TTS Parameters

```json
{
  "provider": "telnyx",
  "voice": "en-US-Neural2-F",
  "sample_rate": 24000,
  "output_format": "mp3",
  "speed": 1.0,
  "pitch": 0
}
```

## Examples

### Full Streaming Pipeline (STT → LLM → TTS)

```python
import asyncio
import websockets

async def voice_pipeline():
    # 1. Connect to STT
    async with websockets.connect(
        "wss://api.telnyx.com/v2/stt/stream?provider=deepgram&model=nova-2&language=en",
        extra_headers={"Authorization": f"Bearer {API_KEY}"}
    ) as stt_ws:
        # 2. Send audio from microphone
        async for audio_chunk in microphone_stream():
            await stt_ws.send(audio_chunk)

            # 3. Receive transcript
            result = json.loads(await stt_ws.recv())
            if result.get("is_final"):
                transcript = result["channel"]["alternatives"][0]["transcript"]

                # 4. Send to LLM (Telnyx Edge Inference)
                llm_response = await call_llm(transcript)

                # 5. Stream TTS response
                async with websockets.connect(
                    "wss://api.telnyx.com/v2/tts/stream?voice=en-US-Neural2-F&provider=telnyx",
                    extra_headers={"Authorization": f"Bearer {API_KEY}"}
                ) as tts_ws:
                    await tts_ws.send(json.dumps({"text": llm_response}))
                    async for audio in tts_ws:
                        speaker.play(audio)
```

### Using STT/TTS with AI Assistants

The simplest approach — let Telnyx orchestrate the pipeline:

```bash
curl -X POST https://api.telnyx.com/v2/ai_assistants \
  -H "Authorization: Bearer $TELNYX_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "my-agent",
    "stt_settings": {
      "provider": "deepgram",
      "model": "nova-2",
      "language": "en"
    },
    "voice_settings": {
      "tts_provider": "telnyx",
      "tts_voice": "en-US-Neural2-F"
    },
    "system_prompt": "You are a helpful voice assistant."
  }'
```

### Real-Time Transcription of a Call

Use Call Control to stream audio from a live call to STT:

```bash
# Start transcription on an active call
curl -X POST https://api.telnyx.com/v2/calls/{call_control_id}/actions/transcribe \
  -H "Authorization: Bearer $TELNYX_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "transcribe": {
      "language": "en",
      "interim_results": true
    },
    "command_id": "transcribe-123",
    "webhook_url": "https://your-server.com/transcription-webhook"
  }'
```

## Troubleshooting

### STT not detecting speech
- Ensure audio is 16kHz, 16-bit PCM, mono for Deepgram
- Check `encoding` and `sample_rate` match your audio format
- Increase `utterance_end_ms` if speakers pause frequently
- Enable `vad_events` to debug voice activity detection

### TTS audio quality issues
- Use `sample_rate: 24000` or higher for natural-sounding output
- Switch from `mp3` to `pcm` for lossless audio in real-time pipelines
- Try different voices — some handle specific content types better

### WebSocket connection drops
- Implement reconnection logic with exponential backoff
- Send keepalive pings every 30 seconds
- Check rate limits — streaming connections count against concurrent limits

### Latency still too high
- Use Deepgram `nova-2` (fastest STT)
- Enable streaming for both STT and TTS (don't wait for complete results)
- Use Telnyx AI Assistants for fully co-located pipeline
- Check network latency from your server to `api.telnyx.com`

## See Also

- [STT API Reference](https://developers.telnyx.com/docs/ai/stt)
- [TTS API Reference](https://developers.telnyx.com/docs/ai/tts)
- [AI Assistants](https://developers.telnyx.com/docs/ai/ai-assistants)
- [Edge Inference Skill](/.well-known/agent-skills/edge-inference/SKILL.md)
- [Voice AI Agent Skill](/.well-known/agent-skills/voice-ai-agent/SKILL.md)
