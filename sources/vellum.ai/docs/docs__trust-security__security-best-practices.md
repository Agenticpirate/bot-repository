# Security Best Practices

Your assistant is a powerful tool. Powerful tools deserve thoughtful use. Here are practical tips for getting the most out of Vellum while staying safe.

## Be intentional about what you share

Your assistant remembers what you tell it. Facts and preferences are extracted automatically and stored as memories. Those memories may be included in future AI model calls when they're relevant.

Share freely for things that help your assistant help you: projects, preferences, schedule patterns, how you like to work.

Think twice before sharing highly sensitive information like passwords, financial account details, medical records, or legal matters. If it's in the conversation, it may end up in a memory and in future model calls.

If you shared something sensitive:

- Ask it to forget: “Forget what I told you about \[topic]”
- Use a private conversation for sensitive topics — memories stay isolated and won't surface in other conversations
- Edit USER.md directly to remove anything you don't want persisted

Your assistant does run a secret scanner that catches accidentally shared credentials (API keys, tokens, passwords in common formats), but don't rely on it as your only protection. It's a safety net, not a strategy.

## Review your workspace and trust rules

Your assistant's state lives in files you can read. Take advantage of that.

Every few weeks, open your workspace files and glance through. On the web, that's **About your assistant > Workspace**. On desktop with a local install, you can also browse `~/.vellum/workspace/` directly.

- **USER.md** — Is everything accurate? Anything you'd rather remove?
- **SOUL.md** — Are the behavior rules still what you want?
- **IDENTITY.md** — Still happy with the name and personality?

Also review your trust rules in Settings > Permissions & Privacy. These are the accumulated allow and deny rules that control what your assistant can do without asking. Over time, you may have approved things broadly that you'd rather scope more narrowly.

## Understand what you're approving

When a permission prompt appears:

1. **Read it.** Don't click Allow out of habit.
2. **Check the scope.** Is it reading one file or your entire home directory?
3. **Look at the risk level.** Low, medium, and high risk actions have different implications.
4. **Consider the context.** Does this action make sense for what you just asked?
5. **Consider the scope.** Clicking Allow creates a trust rule for similar future actions. If you want more control over the pattern, use “Allow & Create Rule” to customize it in the Rule Editor before saving.
6. **Say no if unsure.** Your assistant won't retry automatically. It'll ask about alternative approaches.

> **Autopilot warning:** It's easy to start clicking Allow reflexively after your first dozen prompts. Each prompt is a new action. Take the half-second to read it.

## Be cautious with custom skills

Custom skills can read files, run commands, and make network requests. Treat them like any software you install.

- **Review the code.** If your assistant wrote a custom skill, ask to see it before saving: “Show me what this skill does.”
- **Know the safety rails.** Third-party skill tools are always prompted by default, regardless of risk level. Writing to skill source files is classified as high-risk. These protections exist because a malicious skill could escalate its own privileges.
- **Review community skills before installing.** If you install a skill from the clawhub registry, read the SKILL.md and tool definitions first. Skills are audited, but you should verify yourself.
- **Test before trusting.** Run a new skill a few times with one-time approvals before creating persistent trust rules for its tools.

## Credential hygiene

Your credentials are isolated behind a **Credential Execution Service** (CES), a separate process that handles authentication so the assistant itself never sees credential values in plaintext. On Vellum Cloud, CES runs in its own isolated container with private storage. On a local install, credentials live in an encrypted file under your assistant's protected directory, sealed with a key the assistant container can't read.

Even so:

- **Use scoped tokens.** When connecting services, grant the minimum access needed. Read-only when possible.
- **Rotate periodically.** If you've stored API keys, consider rotating them every few months.
- **Revoke what you don't use.** Ask “Show me my credentials” and clean up anything stale.
- **Don't store master passwords.** The credential vault is for service tokens and API keys, not your primary account passwords.

## Computer use safety

When your assistant controls your screen:

- **Watch the overlay.** It shows what the assistant is doing at each step. Each action is prompted individually.
- **You can stop at any time.** Cancel the session if something doesn't look right.
- **Be mindful of what's on screen.** The assistant captures screenshots and reads the accessibility tree. If sensitive information is visible (banking, medical records, private messages), it will be included in the model call.
- **Know the limits.** Sessions are capped at 50 steps. Loop detection pauses the assistant if it gets stuck. Destructive keyboard shortcuts are blocked.

## Channel security

Your assistant can communicate through multiple channels — Telegram, Slack, phone calls, and more. Every channel is protected by the same verification system.

**Guardian verification.** When you first set up a new channel, you must complete a verification handshake. Your assistant displays a six-digit code in your authenticated session (web or desktop) and you provide that code in the new channel. Only after this handshake will your assistant talk to you on that channel.

**Trusted contacts.** If someone else tries to contact your assistant (e.g., calls its phone number), you get a notification: “This number called me — do you want to add them as a trusted contact?” If you approve, they receive their own six-digit code and must complete the same verification. Trusted contacts can talk to the AI, but they cannot perform sensitive actions without your explicit approval through guardian-in-the-loop notifications.

**Strangers are hard-denied.** Anyone who hasn't been verified gets a deterministic response — “Sorry, I don't have permission to talk to you.” This message is not generated by the AI. It's a hard-coded response that cannot be prompt-injected past.

**Guardian-in-the-loop.** When a trusted contact asks your assistant to do something that requires a tool call or sensitive action, you (the guardian) receive a notification and must approve the action before it executes. This keeps the guardian in control even when others are chatting with your assistant.

**Cross-channel approvals are one-time.** When someone triggers an action through Telegram that needs your approval, the grant is consumed on use and expires after 5 minutes. It can't be reused.

## Network awareness

Your assistant makes network calls in two situations:

1. **AI model calls**: your messages and context go to the model provider over HTTPS. By default that's Anthropic (Claude); with your own API key you can switch to OpenAI, Google (Gemini), OpenRouter, or Fireworks, or point at a local Ollama instance for fully on-device inference.
2. **Service API calls** — emails, calendar events, web browsing, etc. over HTTPS

If you're on a sensitive network (corporate VPN, public WiFi), be aware that these calls are happening. They're encrypted in transit, but the data is still traversing the network.

## Starting over

If you want to completely reset, the path depends on where your assistant lives.

### On Vellum Cloud

1. **Reset your workspace** from the web app to clear identity, memory, and conversations while keeping your Vellum account.
2. **Or delete the assistant entirely** from account settings. The assistant container and its workspace are removed; the credential service tears down its isolated storage with it.
3. **Revoke OAuth connections** at each connected service (Google, Slack, etc.) and remove the Vellum app on their side too.

### On a local install

1. **Archive your workspace:** Run `vellum retire` from the CLI. This creates a tarball backup of your workspace before removing it.
2. **Or delete manually:** Remove `~/.vellum/` entirely. Your assistant starts from scratch.
3. **Revoke macOS permissions:** System Settings > Privacy & Security > remove Vellum from Accessibility, Screen Recording, and Microphone.
4. **Revoke OAuth connections** at each connected service and remove the Vellum app on their side.

Either way, this is irreversible (unless you archived first). Everything your assistant has learned is gone. But it's your data and your choice.
