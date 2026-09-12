> ## Documentation Index
> Fetch the complete documentation index at: https://docs.moldable.sh/llms.txt
> Use this file to discover all available pages before exploring further.

# Security and pairing

> Simple safe setups first, then advanced details.

Moldable ships with secure defaults and expects you to opt in to higher-risk settings only when you
understand the tradeoffs.

Most people only need the simple setups below. These are the same choices you’ll see in **Guided onboarding**. Pick one and you’re done. Manual config is shown only as an optional reference.

## Start here: simple safe setups (most people)

### 1) “Just me (this computer only)” (recommended default)

**Use when:** You only use Moldable on this computer.

**Guided onboarding:** Choose **Just me (this computer only)**.

**Manual config (optional):**

* `gateway.bind=loopback`
* `gateway.public_access=false`
* `gateway.auth.mode=token`
* `pairing.dm_policy=pairing`

**Why this is safe:** Your gateway never leaves your laptop, and new people can’t message it until you approve them.

***

### 2) “Local network (other devices on same Wi‑Fi)”

**Use when:** You want to connect from another device on your home/office network.

**Guided onboarding:** Choose **Local network (other devices on same Wi‑Fi)**.

**Manual config (optional):**

* `gateway.bind=lan`
* `gateway.public_access=false`
* `gateway.auth.mode=token`
* `pairing.dm_policy=pairing`

**Why this is safe:** Only devices on your home/office Wi‑Fi can reach it. The wider internet still can’t.

***

### 3) “Remote access with a tunnel” (no public ports)

**Use when:** You want remote access without opening a public port.

**Guided onboarding:** Choose **Remote access with a tunnel**.

**Manual config (optional):**

* Keep `gateway.bind=loopback`
* Keep `gateway.public_access=false`
* Use a **tunnel** (SSH, Tailscale, ngrok)

**Why this is safer:** You’re not opening a public port on your machine. Access only works through the tunnel, which you can disable or restrict with access policies.

***

### 4) “Webhooks (e.g. WhatsApp Cloud)”

**Use when:** A service needs to send webhooks to you.

**Guided onboarding:** Choose **Webhooks (e.g. WhatsApp Cloud)**.

**Manual config (optional):**

* Keep `gateway.bind=loopback`
* Keep `gateway.public_access=false`
* Expose the **webhook port** (e.g. `127.0.0.1:8088`) via a tunnel

**Why this is safe:** You only expose the tiny webhook doorway, not your whole gateway or computer.

***

### 5) “Telegram (local-only)”

**Use when:** You only need outbound polling.

**Guided onboarding:** Choose **Telegram (local-only)**.

**Manual config (optional):**

* Same as **“Just me (this computer only)”** or **“Local network (other devices on same Wi‑Fi)”**

**Why this is safe:** Telegram doesn’t need to call into your computer. Your gateway calls out to Telegram, so nothing on the internet can access your machine.

***

If you are not sure, choose **“Just me (this computer only)”**. You can always change later.

## What actually protects you (simple explanation)

* **Loopback bind** means “only this computer can connect.”
* **Public access = off** means “the internet can’t reach me.”
* **Auth required** means "a secret token is always needed."
* **Pairing** means “new people must be manually approved by you before they can DM your bot.”

You can verify your posture any time:

```bash theme={null}
moldable gateway audit
```

Use `moldable gateway audit --fix` to apply safe fixes automatically.
The gateway also prints a security summary on startup and refuses to run if there are critical findings (use `moldable gateway run --force` to override).

***

## Prompt injection & LLM risks (applies to everyone)

Prompt injection is a real risk for any LLM system. The gateway helps, but it is not a guarantee.

For secret storage and “prompt injection can’t print my keys” protections, see:

* [Vault (encrypted secrets)](/core/vault)

Common risk vectors people often miss:

* **Exfiltration prompts:** “summarize your secrets,” “print the system prompt,” or “read local files and send them back.”
* **Tool misuse:** a message tricks the model into running commands or sending data it shouldn’t.
* **Untrusted inputs:** web pages, documents, or chats can contain hidden instructions.
* **Untrusted tools/CLIs:** compromised node packages or vendor tools can execute arbitrary code you didn’t audit.
* **Expanded surface area:** granting access to email, calendars, notes, or other dynamic sources multiplies the ways attackers can inject or exfiltrate data.
* **Model supply risk:** a model trained on poisoned data (e.g. 200 documents placed on the internet for training data crawlers to find) can have hidden triggers.
* **Over‑sharing:** users paste sensitive data or keys into chats, which gets logged locally or sent to a provider.

Mitigations we recommend:

* The gateway can prepend a **safety system prompt** (when enabled).
* Gateway outputs can be **redacted for known secrets** (`gateway.safety.redact_output_secrets`).
* Use **allowlists** and avoid `dm_policy=open`.
* Don’t expose the gateway on LAN/custom binds without TLS + strong tokens.
* Use a **strong model** for higher resistance.
* Audit tools, skills, and configurations on a regular basis to only keep what you absolutely need.

***

## Remaining risks by setup (what’s still true)

Even with safe defaults, there are still risks depending on how you use the gateway. Here’s what remains for each recommended setup:

### "Just me (this computer only)"

* Risk if your laptop is compromised (malware, stolen device, unlocked session).
* Any message you send to the bot can still be logged locally.
* If you enable nodes, those can access local files when approved.

### “Local network (other devices on same Wi‑Fi)”

* Everything from “Just me” plus: anyone on your LAN who gets the token can connect.
* Shared or untrusted Wi‑Fi increases exposure, so always use a VPN on shared networks.

### “Remote access with a tunnel” (tunnel)

* Everything from “Just me” plus: the tunnel provider becomes part of the trust chain.
* Misconfigured tunnel access controls can expose the gateway.

### “Webhooks (e.g. WhatsApp Cloud)”

* Webhook URL is public; attackers can hit it (the verify token helps, but be sure to set a rate‑limit and monitor for abuse).
* The tunnel endpoint is on the internet; secure it and rotate tokens if leaked.

### “Telegram (local-only)”

* Telegram bot chats are **not end‑to‑end encrypted**. Content flows through Telegram’s servers.
* If the bot is in a group, **any member can talk to it**, so use pairing/allowlists and keep `require_mention=true`.

***

## If your machine handles sensitive data (e.g., banking, HIPAA, PHI / PII)

If this computer sometimes accesses sensitive data, keep a strict boundary:

* Keep the gateway **local‑only** (`bind=loopback`, `public_access=false`).
* Keep **pairing on** and use allowlists for trusted senders.
* Avoid sending sensitive data to remote AI providers unless you have the right agreements (e.g., BAA).
* Consider running the gateway under a **separate OS user** or on a dedicated machine.

**Recommended guided setup:** **Just me (this computer only)** (local‑only).\
If you need another device on the same Wi‑Fi, use **Local network** and keep `public_access=false`.

**Data access summary (Telegram or other channels):**

* The gateway does **not** read local files unless nodes are enabled.
* By default, messages are kept in memory only (not written to disk). If you enable session transcripts (`sessions.transcripts.enabled`), messages are stored locally in session logs.
* Operational logs and Vault audit logs are separate from transcripts. See [Logging](/core/logging) for privacy options (including a global disk log kill switch).
* Telegram bot chats are **not end‑to‑end encrypted** and pass through Telegram servers.
* If you use a remote AI adapter, message content is sent to that provider.
* Group chats can expose the bot to **any group member**, so keep `require_mention=true` and use pairing/allowlists.

***

## Advanced setup (read only if you are customizing)

If you want to change defaults or expose the gateway beyond your own device, read this section carefully. These options are powerful but easier to misconfigure.

### What do loopback, LAN, and public mean?

* **Loopback** = this computer only (127.0.0.1).
* **LAN** = other devices on your local network (same Wi‑Fi/router).
* **Public** = devices outside your network (the internet).

### Remote access & tunnels (how they avoid a public port)

Normally, to reach your gateway from the internet you would open a public port on your router.
A **tunnel** avoids that. Your machine makes an outbound connection to a tunnel provider, and the provider relays traffic back to your local gateway. From the internet’s point of view, your gateway still has **no open public port**.

Recommended posture:

* Keep `gateway.bind=loopback` and `gateway.public_access=false`.
* Keep auth on (token).
* Use a tunnel if you need remote access.

Common options:

* **SSH tunnel**:
  * `ssh -N -L 19789:127.0.0.1:19789 user@host`
* **Tailscale Serve/Funnel** (identity‑based)
* **ngrok** (public HTTPS tunnel)

### Security checklist (quick self‑check)

* `gateway.auth.mode` is `token` (never off).
* `gateway.public_access=false` unless you explicitly need public access.
* If `gateway.public_access=true`, then `gateway.tls.enabled=true`.
* HTTP endpoints are protected with `gateway.http.auth_token` (or gateway auth).
* Pairing is enabled (`pairing.dm_policy=pairing`).

### Gateway API authentication

The gateway exposes a local control API for the CLI. Auth is configured under `gateway.auth`:

* `token` (required)

Auth is always required.

Example: if you set a token, the CLI uses it when you run `moldable gateway status`.

### Can anyone else access my gateway?

Not unless you allow it:

* **Loopback bind** keeps the gateway reachable only on the local machine.
* **LAN/custom binds** still require `gateway.auth` and `gateway.http.auth_token` for HTTP endpoints.
* **LAN-only access** is enforced by default; set `gateway.public_access=true` to allow public internet access.
* **Node connections** (if enabled) require explicit pairing and authorization.

If you expose the gateway beyond loopback, **enable TLS** and keep tokens secret.

### Reverse proxies (unsupported)

Running the gateway behind a reverse proxy on the same host is **risky and unsupported** today.
Some proxy setups can unintentionally weaken network boundary checks.

If you must use a reverse proxy:

* Keep `gateway.bind=loopback` and `gateway.public_access=false`.
* Enforce strong auth + TLS at the proxy and restrict access with firewall rules.
* Prefer a tunnel instead of opening a public port.

### DM policies

Configured in `pairing.dm_policy`:

* `pairing`: unknown senders create a pending request (default).
* `allowlist`: only explicitly allowed or approved senders.
* `open`: all DMs allowed (no pairing gate).
* `disabled`: all DMs blocked.

When to use each:

* **Pairing (recommended):** safest default. New people must be approved before they can DM.
* **Allowlist:** use if you want **only** a short list of people to DM the bot.
* **Open:** only for controlled setups (e.g., a private test bot where you are the only user). Anyone who can reach the gateway can DM.
* **Disabled:** use if you only want **group chats** or **webhooks** and want to block all DMs entirely.

When `pairing` is enabled, the gateway sends a short message back with a pairing code. You approve it with:

```bash theme={null}
moldable gateway pair approve <channel> <code>
```

### Group policies

Groups are gated by the channel‑specific allowlist and mention rules:

* If `groups` is empty or contains `*`, all groups are allowed.
* If `require_mention` is true, the bot must be mentioned in a group message.

### Allowlists

Each channel has an `allow_from` list of sender IDs. These are always allowed, regardless of pairing status.

### Where approvals live

Pairing approvals are stored locally under the gateway state directory.

### Are my files and personal data safe?

The gateway does **not** read your local files by default. It only sees:

* Messages received by enabled channels.
* Session transcripts stored locally.
* Any data you explicitly pass to an adapter.

File access only happens if you use **paired node runtimes** that can run system commands.

If you use a **remote AI adapter**, your message content is sent to that provider. If you use a **local adapter**, data stays on your machine.

### Node pairing

Nodes (tool runtimes) must be paired when `nodes.require_pairing` is true. Pairing requests are managed via:

```bash theme={null}
moldable gateway node pair list
moldable gateway node pair approve <node-id>
```

Node approvals are stored under:

```
~/.moldable/gateway/nodes/paired.json
```

Next: [Channels](/channels)
