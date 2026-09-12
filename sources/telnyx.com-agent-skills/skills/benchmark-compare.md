---
name: benchmark-compare
description: Run portable benchmarks comparing Telnyx vs competitors
version: "1.0.0"
author: Telnyx
type: skill-md
---

# Benchmark & Compare

> Run portable benchmarks comparing Telnyx vs competitors with head-to-head latency, throughput, and reliability tests.

## Overview

The Telnyx Benchmark Tool (`@telnyx/benchmark`) is an open-source, portable benchmarking suite that measures real-world performance of communications APIs. It tests message delivery latency, voice call setup time, STT/TTS pipeline latency, and API response times — with head-to-head comparison mode for evaluating Telnyx against Twilio, Vonage, or other providers.

Use this skill when you need to evaluate communications API performance, justify a migration with data, or continuously monitor your Telnyx integration's performance. The tool runs locally and makes real API calls, so results reflect actual network conditions.

## Prerequisites

- Node.js 18+ installed
- API keys for providers you want to benchmark
- A terminal/command line environment

## Quick Start

### 1. Install and Run

```bash
npx @telnyx/benchmark run \
  --provider telnyx \
  --api-key $TELNYX_API_KEY \
  --from +18665551000 \
  --to +15553098000
```

### 2. Head-to-Head Comparison

Run benchmarks for two providers simultaneously:

```bash
npx @telnyx/benchmark run \
  --provider telnyx --api-key $TELNYX_API_KEY \
  --provider twilio --api-key $TWILIO_AUTH_TOKEN \
  --account-sid $TWILIO_ACCOUNT_SID \
  --from +18665551000 \
  --to +15553098000 \
  --compare
```

### 3. Specific Test Suite

Run only messaging or voice tests:

```bash
# Messaging only
npx @telnyx/benchmark run \
  --provider telnyx \
  --api-key $TELNYX_API_KEY \
  --suite messaging \
  --iterations 50

# Voice only
npx @telnyx/benchmark run \
  --provider telnyx \
  --api-key $TELNYX_API_KEY \
  --suite voice \
  --iterations 20

# AI pipeline (STT + LLM + TTS)
npx @telnyx/benchmark run \
  --provider telnyx \
  --api-key $TELNYX_API_KEY \
  --suite ai-voice \
  --iterations 10
```

## Configuration

### Test Suites

| Suite | What It Tests | Duration (per iteration) |
|-------|---------------|--------------------------|
| `messaging` | SMS send latency, delivery receipt time, API response time | ~5s |
| `voice` | Call setup time, answer latency, hangup time, audio quality | ~10s |
| `ai-voice` | STT latency, LLM TTFT, TTS latency, end-to-end conversation | ~15s |
| `all` | All test suites combined | ~30s |

### Command Line Options

| Flag | Description | Default |
|------|-------------|---------|
| `--provider` | Provider to benchmark (telnyx, twilio, vonage) | Required |
| `--api-key` | API key for the provider | Required |
| `--from` | Sender phone number (E.164) | Required |
| `--to` | Recipient phone number (E.164) | Required |
| `--suite` | Test suite to run (messaging, voice, ai-voice, all) | `all` |
| `--iterations` | Number of test iterations | `10` |
| `--compare` | Enable head-to-head comparison mode | `false` |
| `--output` | Output format (table, json, csv) | `table` |
| `--region` | Region hint for edge routing | Auto-detect |
| `--verbose` | Show detailed per-iteration logs | `false` |

### Environment Variables

```bash
# Telnyx
export TELNYX_API_KEY="KEY0123..."

# Twilio (for comparison)
export TWILIO_ACCOUNT_SID="ACxxx..."
export TWILIO_AUTH_TOKEN="auth_token..."

# Vonage (for comparison)
export VONAGE_API_KEY="xxx..."
export VONAGE_API_SECRET="xxx..."
```

## Examples

### Full Comparison Report

```bash
npx @telnyx/benchmark run \
  --provider telnyx --api-key $TELNYX_API_KEY \
  --provider twilio --api-key $TWILIO_AUTH_TOKEN \
  --account-sid $TWILIO_ACCOUNT_SID \
  --from +18665551000 \
  --to +15553098000 \
  --compare \
  --output json \
  > benchmark-results.json
```

### CSV Export for Analysis

```bash
npx @telnyx/benchmark run \
  --provider telnyx \
  --api-key $TELNYX_API_KEY \
  --from +18665551000 \
  --to +15553098000 \
  --iterations 100 \
  --output csv \
  > results.csv
```

### AI Voice Pipeline Benchmark

Measure STT → LLM → TTS end-to-end latency:

```bash
npx @telnyx/benchmark run \
  --provider telnyx \
  --api-key $TELNYX_API_KEY \
  --suite ai-voice \
  --iterations 20 \
  --verbose
```

Expected output:
```
AI Voice Pipeline Results (20 iterations)
──────────────────────────────────────────
STT Latency (p50):     142ms
STT Latency (p99):     210ms
LLM TTFT (p50):       185ms
LLM TTFT (p99):       340ms
TTS Latency (p50):     95ms
TTS Latency (p99):     160ms
End-to-End (p50):     422ms
End-to-End (p99):     710ms
```

### Interpreting Results

| Metric | What It Measures | Good | Concerning |
|--------|-----------------|------|------------|
| SMS Send Latency | Time from API call to 200 OK | <200ms | >500ms |
| SMS Delivery Time | Time from send to delivery receipt | <3s | >10s |
| Call Setup Time | Time from API call to ringing | <500ms | >2s |
| Call Answer Latency | Time from answer action to confirmed | <300ms | >1s |
| STT Latency | Time from audio chunk to transcript | <200ms | >500ms |
| LLM TTFT | Time from prompt to first token | <300ms | >1s |
| TTS Latency | Time from text to first audio chunk | <150ms | >400ms |
| End-to-End (AI) | Total conversational round-trip | <800ms | >2s |

## Troubleshooting

### "Insufficient credits" error
- Ensure your account has sufficient balance for test iterations
- Each SMS/call iteration costs a small amount
- Use `--iterations 5` for a quick low-cost test

### SMS delivery tests timing out
- Verify the "to" number can receive SMS
- For US numbers, ensure 10DLC registration is complete
- Some test numbers may not support delivery receipts

### Voice test calls not connecting
- Verify the "from" number has a voice connection
- Check that your SIP connection or Call Control is configured
- Ensure your webhook URL is accessible

### AI voice tests failing
- Verify AI Assistants are enabled on your account
- Check that the model is available in your region
- Use `--region us-east-1` to pin a region

### Head-to-head comparison mismatched results
- Ensure both providers are using the same region
- Run more iterations (`--iterations 50+`) for statistical significance
- Run at different times of day to account for load variations
- See [methodology](/.well-known/agent-skills/benchmark-compare/references/methodology.md) for fair comparison guidelines

## See Also

- [Benchmark Methodology](/.well-known/agent-skills/benchmark-compare/references/methodology.md)
- [Telnyx Performance](https://telnyx.com/performance)
- [Pricing Comparison](https://telnyx.com/pricing)
- [Migration Guide Skill](/.well-known/agent-skills/migrate-from-twilio/SKILL.md)
