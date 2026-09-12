> ## Documentation Index
> Fetch the complete documentation index at: https://docs.moldable.sh/llms.txt
> Use this file to discover all available pages before exploring further.

# Vault (encrypted secrets)

> How Moldable stores secrets safely and prevents prompt-injection exfiltration.

Moldable Gateway includes a built-in **Vault** for secrets (API keys, tokens). The goal is simple:

* **Secrets are encrypted at rest** (so you can delete `.env` as a primary store).
* **The LLM never receives plaintext secrets**, so prompt injection can’t “trick the model into printing them.”
* **Teams don’t share secrets by default** (team/workspace/global scope, with explicit attachments for sharing).

This doc explains the model in plain terms and what it does (and does not) protect you from.

## What Vault Protects Against

### 1) “Someone stole my files”

Vault stores secret values encrypted on disk (under `~/.moldable/shared/vault/` by default). If an attacker copies your home directory backup, they should not be able to read your secrets unless they also have access to the vault key (KEK).

### 2) Prompt injection exfiltration

Prompt injection usually works by getting the model to:

* read files like `.env`
* print secrets
* send secrets over the network

Vault blocks the most common failure mode by design: **the model never sees the secret value**, so it can’t reveal it.

### 3) “Malware skill” exfiltration (within the gateway model)

By default, the gateway does **not** expose an API/tool that returns plaintext secrets to the model.

Instead, the gateway supports **secret references** like `vault:secret:<id>` and uses those internally in carefully controlled pathways (for example: an internal HTTP connector can use a bearer token without revealing it to the model).

## What Vault Does Not Protect Against

Vault is not magic; it can’t protect you from a fully compromised machine.

* If malware runs as your user and can read your Keychain / env vars / key files, it can often access the same secrets the gateway can.
* If you run an untrusted program with network access and you *give it secrets*, it can exfiltrate them.
* If you paste secrets into chat messages, those messages can be logged locally and/or sent to an AI provider.

Vault is designed to prevent *LLM-driven* exfiltration and accidental plaintext storage, not to defeat root-level attackers or bad chat hygiene (like pasting secrets into your chat messages... use the Vault UI to set secrets instead).

## How It Works (Quick Mental Model)

Vault uses a common “envelope encryption” pattern:

1. Each secret value is encrypted with a random **DEK** (data encryption key).
2. The DEK is encrypted (“wrapped”) with a **KEK** (key encryption key).
3. The vault stores:
   * encrypted secret value
   * wrapped DEK
   * metadata (scope, timestamps, attachments, etc.)

## Where Keys Live (Providers)

Vault supports multiple ways to store/unlock the KEK. You choose the tradeoff between convenience and “needs a human after restart.”

### macOS Keychain (recommended on macOS)

* KEK is stored in **macOS Keychain**.
* The gateway can usually unlock seamlessly without you typing anything.
* Good offline security story: copying vault files alone isn’t enough.

### Passphrase mode (high security)

* KEK is derived from a passphrase using a slow KDF (Argon2id).
* The passphrase is **not stored** locally on the machine (you can store it in a password manager or your brain).
* After restart, the vault is **locked** until you unlock it (so scheduled jobs that need secrets fail safely).

### Env / File key (servers, Docker)

* KEK is provided by an environment variable or a mounted file.
* Seamless restarts, but the key is “present on the machine,” so offline compromise protection depends on your ops setup.

If you use the file provider, treat the key file as a sensitive secret (permissions are restricted to `0600` on unix-like systems).

## How Secrets Are Used Without Revealing Them

Vault encourages “secret references everywhere”:

* Config/state store `token_ref` fields (not plaintext tokens).
* Tools and connectors accept `tokenRef` and perform the privileged action inside the gateway.
* The model gets the *result* of the operation, not the secret.

This is the core prompt-injection mitigation: the model can’t leak what it never receives.

## Scopes And Attachments

Each secret has a scope:

* **Team** (default safest): only that team can use it
* **Workspace**: any team in the workspace can use it
* **Global**: not accessible to teams unless explicitly **attached**

Sharing is explicit: attach a secret to a team if you want cross-team use.

## Auditing

Vault writes append-only audit events (create/rotate/revoke/attach/detach/use/lock/unlock). Audit logs never include secret plaintext.

This is separate from conversation transcripts:

* You can keep **session transcripts off-disk** and still keep **Vault audit logs** on (recommended for security visibility).
* If you enable the global kill switch `gateway.logs.disable_disk_logs=true`, Vault audit logging is also disabled.

## Migration From `.env`

Vault is intended to replace plaintext `.env` as the “source of truth.”

* UI: Vault page supports importing by pasting dotenv contents (no file reads).

Once imported and verified, you can remove the legacy file.

## How You Can Verify It’s Working

* The Vault UI and APIs list **metadata only**. Secret values are not returned after you set them.
* Agent filesystem access denies reading `.env` and vault storage paths by default.
* Secret-dependent operations use `tokenRef` internally rather than injecting plaintext into prompts.
