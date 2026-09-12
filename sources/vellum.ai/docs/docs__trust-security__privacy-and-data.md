# Privacy & Data

Your assistant's data lives wherever your assistant is hosted. On Vellum Cloud (the default), your data lives in your private, encrypted Vellum Cloud account. If you self-host on your Mac, everything stays on your machine.

Regardless of hosting option, your assistant thinks through an AI model in the cloud. Here's exactly what that means.

## What lives in your assistant's workspace

All of the following data stays within your assistant's environment and never leaves it, except where noted. On Vellum Cloud this means your private cloud account; on self-hosted installations this means your machine.

Never leaves your assistant

Credentials

API keys, OAuth tokens

`Credential Execution Service`

Isolated container (Cloud) or process (desktop). Never exposed to the assistant or AI model.

Trust rules & permissions

`Gateway-managed store`

Owned by the gateway, never sent to the assistant or AI model

Custom skills

`skills/ in your workspace`

Configuration

`config.json in your workspace`

Included in AI model calls when relevant

Workspace files

IDENTITY.md, SOUL.md, USER.md, NOW\.md, PKB

`Workspace root`

Loaded at the start of each conversation as context

Memories

Events, knowledge, feelings, plans, patterns, stories

`Long-term memory store`

Retrieved via hybrid search when relevant to a conversation

Conversation history

Messages, tool calls, results

`conversations/ in your workspace`

Current conversation only, compacted when long

## What leaves your assistant

Data leaves your assistant's environment in two ways:

- **AI model calls** — conversation context (messages, workspace files, relevant memories) is sent to the AI model provider for inference. Currently, this is Anthropic (Claude) with a zero-retention data policy.
- **Channel messages**: when your assistant sends a message through Telegram, Slack, email, or phone, that message content passes through the respective platform's servers. If you've enabled the assistant's own email address (the optional `email-channel` feature, currently backed by AgentMail), outbound mail from that address also passes through the AgentMail provider.
- **Tool network calls** — when a tool makes an external API request (e.g., web search, fetching a URL), that request leaves your environment. Credentials for these requests are injected by a proxy at the network layer — the assistant never sees the raw credential values.

On Vellum Cloud (the default), your data is stored in Vellum's infrastructure, isolated in a dedicated, encrypted container, and accessible to Vellum only for operational purposes. If you self-host and opt out of usage analytics, your workspace files, memories, conversation history, credentials, and trust rules are never sent to Vellum, and the only external party that receives conversation context is the AI model provider. The exception in both cases is the **Share Feedback** feature, which explicitly sends logs when you choose to use it.

## How credentials are protected

Credentials (API keys, OAuth tokens, passwords) are handled by the **Credential Execution Service (CES)**, an isolated component that runs alongside your assistant. The assistant talks to CES over a controlled RPC interface but never sees the credential values themselves.

- **Isolation**: on Vellum Cloud, CES runs in a dedicated container with its own private storage that the assistant container literally cannot read. On desktop, CES runs as a separate process with its own sandboxed data directory under your Vellum root. Same architectural property in both cases: the assistant and the AI model never touch raw secrets.
- **Storage**: credentials are encrypted at rest. The encryption key itself is held by CES, not by the assistant.
- **Network injection**: when a tool needs to make an authenticated API call, the credential proxy injects the token into the outbound HTTP request at the network layer. The assistant only knows which credential to use (by alias), not what it contains.
- **Secure collection**: the `credential_store` tool collects secrets through a dedicated UI prompt. Secret values never enter the conversation text.

## How secrets are caught

Even with secure collection, secrets can accidentally end up in conversation text — pasted from a clipboard, included in a file, or returned in a tool output. A multi-layer detection pipeline catches these:

- **Ingress scanning** — inbound messages are checked for known secret patterns before they reach the assistant. Detected secrets are blocked or redacted.
- **Pattern matching** — regex-based detectors for common secret formats: API keys, tokens, connection strings, private keys, and more.
- **Allowlist** — known false positives can be allowlisted so they don't trigger the scanner.
- **Tool output scanning** — secrets in tool execution results are detected and handled before they enter the conversation context.

The secret scanner is a safety net, not a guarantee. The primary defense is the credential architecture: secrets are collected securely and injected at the network layer, so they should never appear in conversation text in the first place.

## Who can access your data

Your assistant distinguishes between three levels of access:

- **Guardian (you)**: full access to everything, memories, workspace files, credentials, tools, configuration. Your guardian identity is tied to your authenticated session, whether that's the web app or the desktop app, and verified automatically.
- **Trusted contacts** — verified people who message your assistant through external channels (Telegram, Slack, email). They can have conversations and use allowed tools, but they can't access your memories, read your workspace files, or use sensitive tools without guardian approval.
- **Unknown contacts**: unverified users who reach your assistant on a channel. They go through a channel-appropriate challenge before being granted any access (an invite code on Telegram, Slack, and email; an outbound voice verification on phone).

## Private conversations

A private conversation has its own isolated memory scope. Memories created during a private conversation can't leak into other conversations. The private conversation can still read from your shared memory pool, but anything it saves stays scoped to that conversation. Useful when discussing sensitive topics you don't want persisted broadly.

## Computer use safety

When your assistant controls your Mac through computer use, it follows a structured perceive → verify → execute → observe loop:

- Screenshots are captured and analyzed to understand the current state
- Each action (click, type, key press, drag, AppleScript) is a separate tool call with its own risk assessment
- Before interacting, the assistant verifies it's looking at the right element
- After each action, it observes the result before continuing

Computer use tools are classified as medium or high risk, meaning they prompt for your approval. You can create persistent trust rules for common workflows (e.g., “always allow clicking in VS Code”) to reduce friction while maintaining control.

## The permission system

Every tool has a risk classification:

- **Low risk** — runs automatically. Reading files, searching memory, generating text.
- **Medium risk** — prompts for approval. Writing files, running shell commands, sending messages.
- **High risk** — always prompts. Deleting data, modifying system settings, computer use actions.

When a tool prompts for approval, you can:

- Allow (creates a trust rule for similar future actions)
- Allow & Create Rule (customize the rule in the Rule Editor)
- Deny

Trust rules are stored in a gateway-managed database and accumulate over time as you use your assistant. Each rule has a tool, pattern, risk level, scope, and decision. You can review and manage rules in Settings > Permissions & Privacy. On external channels where there's no native prompt UI, approvals are handled through interactive buttons (Telegram, Slack) or the guardian system.

## The AI model provider

Your assistant uses a third-party AI model to generate responses. By default, data is routed to **Anthropic** (Claude) using Vellum's credentials. If you connect your own API key, you can switch to **OpenAI**, **Google** (Gemini), **OpenRouter**, or **Fireworks**. If you want to keep model inference fully local, you can also point your assistant at a local **Ollama** instance instead of a hosted provider. Under the published terms of these providers' commercial APIs, your inputs are not used to train or improve their models, and are not used for advertising.

What gets sent to the model on each turn:

- The system prompt (assembled from your workspace files)
- Conversation history (current conversation, possibly compacted)
- Relevant memories (retrieved via hybrid search)
- Tool definitions (available tools and their schemas)
- Tool results (output from recently executed tools)

Credentials, trust rules, and raw configuration files are never included in model calls.

For the complete list of providers, what data each feature shares, and links to each provider's privacy notice, see the “Third-Party AI Providers” section of our [Privacy Notice](/docs/privacy-policy).

## Your options for sensitive information

- **Use private conversations** — memory from private conversations is scoped and won't leak into future contexts.
- **Never paste secrets in chat** — use `credential_store` with the secure prompt action instead. The value never enters the conversation.
- **Review workspace files** — check USER.md and SOUL.md periodically. If something sensitive got saved there, remove it. These files are sent to the model on every conversation.
- **Manage memories** — ask your assistant to delete specific memories, or review them with “show me what you remember about X.” You have full control over what stays in memory.
- **Scope trust rules carefully** — avoid broad “always allow” rules for high-risk tools. Use conversation-scoped or time-limited approvals instead.

## Hosting options

#### Vellum Cloud (recommended)

Your assistant runs in Vellum's cloud infrastructure. Your data is isolated in a dedicated, encrypted container that is not shared with other users. You get 24/7 uptime, automatic updates, and no local machine dependency. Schedules, watchers, and heartbeats run reliably even when your desktop is off.

#### Self-Hosted (Local)

Your assistant runs on your Mac. All data stays local. Conversations, memories, workspace files, credentials: none of it leaves your device except for AI model inference and outbound channel messages. You manage updates, uptime, and backups.
