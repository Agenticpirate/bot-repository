---
name: edge-inference
description: Deploy AI inference at carrier edge with co-located STT/TTS
version: "1.0.0"
author: Telnyx
type: skill-md
---

# Edge Inference

> Deploy AI inference at carrier edge with co-located STT/TTS for sub-200ms voice AI latency.

## Overview

Telnyx Edge Inference runs AI models on compute nodes co-located with the Telnyx carrier network. This eliminates the round-trip to a distant cloud data center that plagues conventional voice AI pipelines. When your STT, LLM, and TTS all run within the same data center as the call media, you get response times under 200ms — fast enough for natural conversation.

Use this skill when latency is the bottleneck in your voice AI application. If your current pipeline routes audio from the carrier to a cloud STT service, then to a cloud LLM, then to a cloud TTS — each hop adds 50–150ms. Telnyx Edge Inference collapses those hops into a single location.

This skill covers using the Telnyx AI Inference API, deploying models to edge nodes, configuring for voice AI workloads, and understanding the performance difference vs. cloud-based inference.

## Prerequisites

- Telnyx account (sign up at https://telnyx.com)
- API key from https://portal.telnyx.com
- Familiarity with LLM APIs (OpenAI-compatible interface)

## Quick Start

### 1. List Available Edge Models

```bash
curl https://api.telnyx.com/v2/ai/models \
  -H "Authorization: Bearer $TELNYX_API_KEY"
```

### 2. Run Inference at the Edge

Telnyx Edge Inference uses an OpenAI-compatible API, so you can swap endpoints without changing code:

```bash
curl -X POST https://api.telnyx.com/v2/ai/chat/completions \
  -H "Authorization: Bearer $TELNYX_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "telnyx-gpt-4o-mini",
    "messages": [
      {"role": "system", "content": "You are a helpful assistant."},
      {"role": "user", "content": "What is the capital of France?"}
    ],
    "temperature": 0.7,
    "max_tokens": 100
  }'
```

### 3. Streaming Inference

For voice AI, use streaming to minimize time-to-first-token:

```bash
curl -X POST https://api.telnyx.com/v2/ai/chat/completions \
  -H "Authorization: Bearer $TELNYX_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "telnyx-gpt-4o-mini",
    "messages": [
      {"role": "user", "content": "Tell me a short joke."}
    ],
    "stream": true
  }'
```

### 4. Use with AI Assistants for Lowest Latency

When you create an AI Assistant with Telnyx edge inference, all components run in the same PoP:

```bash
curl -X POST https://api.telnyx.com/v2/ai_assistants \
  -H "Authorization: Bearer $TELNYX_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "edge-voice-agent",
    "llm_settings": {
      "provider": "telnyx",
      "model": "telnyx-gpt-4o-mini"
    },
    "stt_settings": {
      "provider": "deepgram",
      "model": "nova-2"
    },
    "voice_settings": {
      "tts_provider": "telnyx",
      "tts_voice": "en-US-Neural2-F"
    },
    "system_prompt": "You are a fast, helpful agent."
  }'
```

## Configuration

### Model Selection

| Model | Use Case | Context Window |
|-------|----------|---------------|
| `telnyx-gpt-4o-mini` | General purpose, fast | 128K |
| `telnyx-gpt-4o` | Complex reasoning | 128K |
| `telnyx-llama-3.1-70b` | Open-source alternative | 128K |
| `telnyx-mistral-7b` | Lightweight tasks | 32K |

### Edge vs Cloud Latency Comparison

| Pipeline Stage | Cloud (Typical) | Telnyx Edge |
|---------------|-----------------|-------------|
| STT (audio → text) | 150–300ms | 80–150ms |
| LLM (text → text) | 300–800ms | 100–300ms |
| TTS (text → audio) | 150–250ms | 60–120ms |
| **Total round-trip** | **600–1350ms** | **240–570ms** |
| **Network hops between stages** | **2–3** | **0 (same PoP)** |

### Region Selection

By default, Telnyx routes inference to the nearest edge PoP. To pin a region:

```json
{
  "model": "telnyx-gpt-4o-mini",
  "region": "us-east-1"
}
```

Available regions: `us-east-1`, `us-west-2`, `eu-west-1`, `ap-southeast-1`.

## Examples

### Python SDK with Edge Inference

```python
from telnyx import TelnyxClient

client = TelnyxClient()
response = client.ai.chat.completions.create(
    model="telnyx-gpt-4o-mini",
    messages=[
        {"role": "system", "content": "You are a voice AI assistant. Be concise."},
        {"role": "user", "content": "What time is it?"}
    ],
    stream=True
)

for chunk in response:
    if chunk.choices[0].delta.content:
        print(chunk.choices[0].delta.content, end="")
```

### Embedding Generation at Edge

```bash
curl -X POST https://api.telnyx.com/v2/ai/embeddings \
  -H "Authorization: Bearer $TELNYX_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "telnyx-text-embedding-3-small",
    "input": "Telnyx provides carrier-grade communications APIs."
  }'
```

### Batch Processing

For non-real-time workloads, use the batch endpoint:

```bash
curl -X POST https://api.telnyx.com/v2/ai/batch/completions \
  -H "Authorization: Bearer $TELNYX_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "telnyx-gpt-4o-mini",
    "requests": [
      {"messages": [{"role": "user", "content": "Summarize: ..."}]},
      {"messages": [{"role": "user", "content": "Classify: ..."}]}
    ]
  }'
```

## Troubleshooting

### Higher than expected latency
- Confirm you're using `telnyx-` prefixed models (these run on edge)
- Check your region — use the nearest PoP for your users
- Enable streaming for voice workloads (reduces perceived latency)
- Verify the model is available in your region with `GET /v2/ai/models`

### Model not found error
- Edge models use the `telnyx-` prefix — don't use raw OpenAI model names
- Check model availability: `GET /v2/ai/models`
- Some models may be region-specific

### Rate limiting
- Edge inference has per-region rate limits
- Spread load across regions if hitting limits
- Use batch endpoints for non-real-time work to free real-time capacity

### Connection timeouts
- Increase your client timeout (edge inference is fast but LLM inference varies by prompt)
- Use streaming to avoid waiting for full completion
- Check `https://status.telnyx.com` for edge node status

## See Also

- [AI Inference API](https://developers.telnyx.com/docs/ai/inference)
- [AI Assistants](https://developers.telnyx.com/docs/ai/ai-assistants)
- [Voice AI Agent Skill](/.well-known/agent-skills/voice-ai-agent/SKILL.md)
- [STT/TTS Skill](/.well-known/agent-skills/stt-tts/SKILL.md)
