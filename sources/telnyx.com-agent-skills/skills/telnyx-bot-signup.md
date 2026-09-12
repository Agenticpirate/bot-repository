---
name: telnyx-bot-signup
type: skill-md
description: Automated Telnyx bot account signup via challenge-response
homepage: https://telnyx.com/agent-signup.md
docs: https://developers.telnyx.com/docs/account-setup/create-account
metadata: {
  "api_base": "https://api.telnyx.com/v2",
  "openclaw": {
    "emoji": "🤖",
    "requires": {
      "bins": ["curl"],
      "env": []
    },
    "primaryEnv": "TELNYX_API_KEY"
  }
}
---

# Telnyx Bot Signup

Create a new Telnyx bot account via the challenge-response signup flow. Walks through challenge solving, account creation, email verification, and API key generation.

Base URL: `https://api.telnyx.com`

## Overview

The bot challenge (sometimes called "reverse-CAPTCHA") presents a problem that only an LLM can reliably solve. The response includes a `challenge_type` field indicating which type was served. The challenge could be a math problem (which may or may not be obfuscated) or a completely different type of challenge. Read the `problem` text and `challenge_type` to determine the solving approach.

## Demo-First Approach

> 🚀 **Try before you sign up.** Before committing to the full signup flow, use the demo endpoints to validate your integration. No account or email is required.

The `/.well-known/agent-access.json` file exposes a `fast_path` with demo endpoints you can call immediately — no API key needed. These are proxied through telnyx.com with server-side authentication:

- **SMS:** `POST https://telnyx.com/api/demo/send-sms` — Send a test SMS (5 req/min per IP, test numbers only)
- **AI Inference:** `POST https://telnyx.com/api/inference` — Chat completions (10 req/min per IP)
- **Text-to-Speech:** `POST https://telnyx.com/api/tts-demo`
- **Speech-to-Text:** `POST https://telnyx.com/api/stt-demo`
- **Number Lookup:** `GET https://telnyx.com/api/number-lookup` — requires hCaptcha token (not fully autonomous)
- **Voice AI:** `POST https://telnyx.com/api/voice-ai-agent/register-web-caller` — requires session_id + email in body

**Recommended agent workflow:**

1. Fetch `/.well-known/agent-access.json` and extract the `fast_path.demo_endpoints` list.
2. Call any demo endpoint directly — no authentication headers needed.
3. Only proceed with the full signup flow below if you need production-level access (e.g., purchasing numbers, sending real messages, creating API keys).

## Email Access for Autonomous Agents

Step 4 of the signup flow requires retrieving a session token from a magic link sent to an email address. Before creating any new mailbox, agents must first check whether they already have an active mailbox they can read.

- If you have an active readable mailbox, use that email address for bot signup.
- If you do **not** have an active readable mailbox, create a Telnyx Agent Inbox and use the generated email address.

When you create a Telnyx Agent Inbox, permanently store the full creation response before continuing, especially `email`, `account_id`, and `account_key`. The `account_key` is returned only once; if you lose it, you cannot recover access to that inbox or read the signup email.

## Flow

Execute these steps in order.

### Step 1: Get Bot Challenge

```bash
curl -s -X POST https://api.telnyx.com/v2/bot_challenge
```

**Optional model metadata:**

You may self-report your model's metadata by sending a JSON body with any or all of these fields:

```bash
curl -s -X POST https://api.telnyx.com/v2/bot_challenge \
  -H "Content-Type: application/json" \
  -d '{
    "llm_model_name": "<your model name>",
    "llm_parameter_count": "<parameter count>",
    "llm_quantization": "<quantization format>"
  }'
```

These fields are **optional** and purely for analytics. Only include them if:
1. You know the values for certain (don't guess or hallucinate)
2. You believe the person you are operating on behalf of would be okay sharing this information

If you'd prefer not to share, simply omit them — the request works without a body.

**Response (math challenge):**
```json
{
  "data": {
    "nonce": "<uuid>",
    "problem": "<may be obfuscated math text> Round to N decimal places. Omit units.",
    "challenge_type": "math",
    "terms_and_conditions_url": "<url>",
    "privacy_policy_url": "<url>"
  }
}
```

**Response (non-math challenge):**
```json
{
  "data": {
    "nonce": "<uuid>",
    "problem": "<problem text — no rounding instruction>",
    "challenge_type": "<challenge_type>",
    "terms_and_conditions_url": "<url>",
    "privacy_policy_url": "<url>"
  }
}
```

Save all fields. The `nonce` ties your answer to this specific challenge instance.

### Step 2: Solve the Challenge

Read the `problem` text and `challenge_type` field to determine what's being asked. The challenge could be a math problem or a completely different type of challenge.

**If it's a math problem (`challenge_type: "math"`):**
- The problem text may or may not be obfuscated — if it looks garbled (random case, injected symbols, split lines), read through the noise and extract the math
- The rounding instruction at the end (`Round to N decimal places. Omit units.`) is always unobfuscated
- Produce a single numeric answer rounded to the specified precision

**For other challenge types:**
- Read the problem text carefully — it will describe exactly what to do
- Produce the answer the problem asks for

No external solver is needed — the LLM agent does this step with reasoning alone.

### Step 3: Submit Bot Signup

First choose an email address:

1. If you have an active readable mailbox, use that email address.
2. If you do **not** have an active readable mailbox and Telnyx Agent Inbox is available, create a Telnyx Agent Inbox:

   - Create the Agent Inbox challenge: `POST https://agent-inbox.telnyx.com/v2/agent_inboxes/challenges`. This is the Agent Inbox proof-of-work challenge endpoint, distinct from the Telnyx API bot challenge in Step 1.
   - Create the inbox: `POST https://agent-inbox.telnyx.com/v2/agent_inboxes`
   - Permanently store the full create response, especially `email`, `account_id`, and `account_key`. The `account_key` is returned only once and cannot be recovered later.
   - Use the returned `email` in the `bot_signup` request below.
3. If neither a readable mailbox nor Telnyx Agent Inbox is available, ask the user for an email address they can read and use that email in the `bot_signup` request below. You will need the user to copy the single-use sign-in link from that mailbox in Step 4.

Only create a Telnyx Agent Inbox when no active readable mailbox is available.

```bash
curl -s -X POST https://api.telnyx.com/v2/bot_signup \
  -H "Content-Type: application/json" \
  -d '{
    "bot_challenge_nonce": "<nonce from step 1>",
    "bot_challenge_answer": "<answer from step 2>",
    "terms_and_conditions_url": "<from step 1>",
    "privacy_policy_url": "<from step 1>",
    "email": "<user email>",
    "terms_of_service": true
  }'
```

> **Note:** You must accept the terms of service to register with Telnyx. You must indicate this acceptance by supplying `"terms_of_service": true` as a parameter on the request. The API will reject the request with a `400 Bad Request` if this field is missing or any value other than true.

**Response:** Success message. A sign-in link is sent to the provided email.

### Step 4: Get Session Token from Email

Wait 10-30 seconds for the verification email to arrive.

#### Path A: Agent Has Email Access

If you have email access (e.g. the `google-workspace` skill), search for a message with subject **"Your Single Use Telnyx Portal sign-in link"**, extract the single-use URL from the body, and GET it:

> ⚠️ **Important:** If you are extracting the link from an HTML email body, make sure to decode HTML entities first (for example, convert `&amp;` back to `&`). Using the raw HTML-encoded URL may cause the request to fail.

```bash
curl -s -L "<single-use-link-from-email>"
```

The response returns a temporary session token in the following shape:

```json
{
  "data": {
    "api_v2_token": "<temporary-session-token>"
  }
}
```

Use `data.api_v2_token` as the Bearer token in Step 5.

> ⚠️ **Important:** The magic link is consumed by any request, even one that later returns an error (for example, a `401`). If the request fails, you must request a new link.

#### Path B: Telnyx Agent Inbox

If you created a Telnyx Agent Inbox in Step 3, use the permanently stored `account_id` and `account_key` to read the signup email. Do not rely on the create response still being in memory.

List messages:

```bash
curl -s https://agent-inbox.telnyx.com/v2/agent_inboxes/<account_id>/messages \
  -H "Authorization: Bearer <account_key>"
```

Read the selected message:

```bash
curl -s https://agent-inbox.telnyx.com/v2/agent_inboxes/<account_id>/messages/<message_id> \
  -H "Authorization: Bearer <account_key>"
```

Extract the single-use URL from the message body and GET it:

```bash
curl -s -L "<single-use-link-from-email>"
```

The response returns `data.api_v2_token`. Use it as the Bearer token in Step 5.

> ⚠️ **Important:** The magic link is consumed by any request, even one that later returns an error (for example, a `401`). If the request fails, you must request a new link.

#### Path C: Manual Link Fallback

If neither a readable mailbox nor Telnyx Agent Inbox is available, ask the user to copy the single-use sign-in link from the email without opening it, then GET that link to retrieve `data.api_v2_token`.

#### Resend Magic Link

If the verification email did not arrive or the link expired, resend it:

```bash
curl -s -X POST https://api.telnyx.com/v2/bot_signup/resend_magic_link -H "Content-Type: application/json" -d '{"email": "<user email>"}'
```

**Response:**
```json
{
  "data": {
    "message": "If an account with that email exists, a new magic link has been sent."
  }
}
```

**Rate limiting:** Max 3 resends per account, with a 60-second cooldown between resends. The endpoint always returns 200 OK regardless of whether the email exists, the retry cap is exceeded, or the cooldown is active (to prevent email enumeration).

> **Note:** This endpoint is subject to the same signup availability and regional gating as the rest of the bot-signup flow. If the flow is unavailable for the requester, the endpoint may return `404`.

### Step 5: Create API Key

```bash
curl -s -X POST https://api.telnyx.com/v2/api_keys \
  -H "Authorization: Bearer <api_v2_token from step 4>" \
  -H "Content-Type: application/json" \
  -d '{}'
```

**Response:**
```json
{
  "data": {
    "api_key": "KEYxxxxxxxxxxxxx",
    ...
  }
}
```

The `data.api_key` value is the permanent API key for the new account. Present it to the user and advise them to store it securely.

### Step 6: Provision with the agent CLI (optional fast path)

With the API key in hand, the quickest route to a working capability is the official agent CLI — composite commands that collapse multi-step portal workflows into one call:

```bash
npm install -g @telnyx/agent-cli
export TELNYX_API_KEY="KEYxxxxxxxxxxxxx"
telnyx-agent status              # account health: balance, numbers, profiles
telnyx-agent capabilities --json # machine-readable list of everything it can do
telnyx-agent setup-sms --json    # zero to sending SMS in one command
```

Every command supports `--json`. `setup-sms` (like `setup-voice` and `setup-verify`) reuses anything it already provisioned — pass `--force` for fresh resources. Repo: https://github.com/team-telnyx/ai/tree/main/cli

## Notes

- The bot challenge could be a math problem or a completely different type of challenge. Check the `challenge_type` field in the response to determine the solving approach.
- Math challenges may or may not be obfuscated depending on server-side configuration. If the text looks clean, obfuscation is simply disabled. The LLM agent solves it by reading through any obfuscation — no separate solver binary is needed.
- Non-math challenges are never obfuscated.
- Model metadata fields (`llm_model_name`, `llm_parameter_count`, `llm_quantization`) are optional on the challenge request. Include them if you know the values and are comfortable sharing — otherwise omit them entirely.
- The single-use sign-in link expires quickly — retrieve and use it promptly.
- Any request to the magic link consumes it, even if the request later fails. If that happens, request a new link via the resend endpoint.
- Email access is optional. If unavailable, prompt the user to paste the link manually. Before creating a Telnyx Agent Inbox, check whether you already have an active readable mailbox — only create an Agent Inbox when no readable mailbox is available.
- If you create a Telnyx Agent Inbox, permanently store the full create response, especially `email`, `account_id`, and `account_key`; the `account_key` cannot be recovered later.
