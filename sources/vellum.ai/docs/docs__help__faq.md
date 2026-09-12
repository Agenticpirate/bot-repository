# FAQ

## About the product

### What is Vellum?

A personal AI assistant that lives on your computer. It can take real actions on your behalf: reading files, sending emails, browsing the web, controlling your Mac or Windows PC, building apps, managing your schedule, making phone calls, and more. It has its own identity, personality, and long-term memory that persists across conversations. See [What is Vellum?](/docs/getting-started/what-is-vellum) for the full overview.

### How is this different from ChatGPT or Claude?

Those are conversation tools. You type, they respond, you copy-paste the answer somewhere. Vellum is different because it has tools (it can actually do things on your computer and across services), memory (it remembers you across conversations with a full hybrid search system), a persistent identity (its own personality, name, and behavioral rules you can customize), and it reaches you everywhere (desktop, Telegram, Slack, voice calls). More detail in [What is Vellum?](/docs/getting-started/what-is-vellum).

### Is Vellum free?

You can start without paying. Vellum Cloud has a free **Base** plan, and you can also run Vellum locally with your own model API key at no cost beyond that API usage. Paid **Pro** packages add a larger machine, more storage, and included monthly credits. See [Pricing](/docs/pricing) for the current plans. For this assistant's live plan and credit balance, ask it here rather than guessing from the docs page.

### Why does my assistant cost money when I'm not actively using it?

A big part of how assistants work is that they have their own heartbeat and memory system, which performs work in the background even when you're not chatting with them. We're always working on ways to make this less of a surprise and to cost less.

A lot of it is configurable too. You can ask your assistant to disable or reduce the frequency of “heartbeats” and “memory compaction,” or to use a less expensive model for these background actions.

### What platforms does it support?

On Vellum Cloud, you can reach your assistant from any modern browser at [vellum.ai](https://vellum.ai), the iPhone and iPad app, the Android app, the macOS and Windows desktop apps, and a command-line interface. There is no shipped Linux desktop client. On Linux, use the web app or the Chrome extension. The assistant runtime can self-host on a Linux machine; that is hosting, not a desktop app. Download the shipped clients from [vellum.ai/downloads](https://www.vellum.ai/downloads). Beyond those first-party surfaces, channels include Telegram, Slack, email, and phone calls.

### Where should I host my assistant?

Three paths, picked by what you care about most:

- **[Vellum Cloud](/docs/hosting-options/cloud-hosting)** (recommended). Always on, sandboxed per account, reachable from web, desktop, iOS, voice, and chat. Vellum runs the infrastructure. The right pick if you want it to just work and be available 24/7 across your devices.
- **[Local hosting](/docs/hosting-options/local-hosting)**. The assistant runs on your computer. Your data stays on your machine, and the assistant has direct access to your local files and tools. The right pick if you want maximum data control or fully offline operation, and you're okay with the assistant only being available when your computer is awake.
- **[User-Hosted Remote](/docs/hosting-options#user-hosted-remote)**. Your own GCP project or a Mac Mini at home. You get 24/7 availability and full data ownership, but you manage the infrastructure. The right pick if you're comfortable running cloud yourself and want neither party compromise.

Most users should start on Cloud. You can move later if your needs change. See the [Hosting options overview](/docs/hosting-options) for the full comparison.

### Can I use it on my phone?

Yes. There is a native iPhone and iPad app on the [App Store](https://apps.apple.com/us/app/vellum-assistant/id6759934423) and an Android app on [Google Play](https://play.google.com/store/apps/details?id=ai.vellum.assistant). You can also reach your assistant through Telegram or phone calls from any device.

### Is there a Windows app?

Yes. Download the Windows desktop app from [vellum.ai/downloads](https://www.vellum.ai/downloads). You can also open [vellum.ai](https://vellum.ai) in a browser, or install the [Chrome extension](https://chromewebstore.google.com/detail/vellum-assistant-browser/hphbdmpffeigpcdjkckleobjmhhokpne) so the assistant can use your Chrome session.

### Does it run on Linux?

The web app and Chrome extension work on Linux. There is no Linux desktop client to install. You can self-host the assistant runtime on a Linux machine if you want the server itself on that host. See [Hosting options](/docs/hosting-options).

***

## About privacy and data

### Is my data safe?

On Vellum Cloud (the default), your workspace, memories, and credentials live in your private, encrypted cloud account, not shared with other users. If you self-host, all of that stays on your machine instead, with credentials kept in the macOS Keychain or an AES-256-GCM encrypted file, isolated behind a separate Credential Execution Service. In both cases, your conversations and context are sent to the AI model provider (Anthropic) to generate responses. That's the trade-off we're transparent about. Full details in [Privacy & Data](/docs/trust-security/privacy-and-data).

### Does Vellum train on my data?

No. From our side, your data is not used for training or fine-tuning. Anthropic's API terms also state that API data is not used for model training. We recommend reading [Anthropic's Privacy Policy](https://www.anthropic.com/legal/privacy) directly for the most current details.

### Does Vellum collect telemetry?

Only if you opt in. There are two optional toggles in Settings > Privacy: usage analytics (anonymized token counts and feature adoption — no message content) and crash diagnostics (error reports via Sentry — no personal data). Both are off by default.

### Can my employer see what I do with Vellum?

Your assistant is yours. Vellum doesn't have a dashboard, an admin panel, or any way for your employer to see your usage. That said, if you're using your employer's computer or network, they could potentially see the API calls or web traffic from your assistant. If that's a concern, self-hosting on a personal device is the most private option. Use your judgment based on your work environment.

### What happens if I delete the app?

On Vellum Cloud, your account and workspace stick around unless you ask us to delete them. You can export your workspace at any time, or request full deletion through the account settings or support. If you self-host, your workspace folder (`~/.vellum/`) stays on your machine until you delete it manually; `vellum retire` from the CLI archives the workspace as a tarball before removal. See [Security Best Practices](/docs/trust-security/security-best-practices) for the full reset process.

### Can other people access my assistant?

Yes, in a controlled way. You can grant trusted contacts limited access to your assistant through channels like Telegram or Slack. Trusted contacts can chat with your assistant but can't access your memories, modify your workspace, or use sensitive tools without your explicit approval. Unverified people who message your assistant get heavily restricted access. See [The Permissions Model](/docs/trust-security/the-permissions-model) for details on how trust gating works.

***

## About capabilities

### What can it do?

A lot. Gmail management, Google Calendar, Slack integration, web browsing, computer control, phone calls, image generation, coding, app building, document writing, task management, screen watching, media processing, and more — about 30 built-in skills in total. You can also build custom skills to extend it further. See the [Skills Reference](/docs/skills-reference) for details on each capability.

### Can it access my files?

Files inside the workspace (`~/.vellum/workspace/`) are accessible without prompts. Files outside the workspace — on your host machine — require your explicit permission each time. You see what file it wants to access, whether it's a read or write, and can choose to allow once, allow temporarily, or create a persistent rule. See [The Permissions Model](/docs/trust-security/the-permissions-model).

### Can it send emails as me?

With the Gmail skill, your assistant can draft and send emails from your Gmail account, but sending always requires your explicit approval. It creates a draft first, and you approve before anything is sent. Your assistant can also use its own email address through AgentMail for sending on its own behalf.

### Can it control my computer?

Yes, with your permission. The Computer Use skill lets your assistant see your screen (via accessibility APIs and screenshots) and control mouse and keyboard input. This requires Accessibility and Screen Recording permissions on macOS. On Windows, check screen capture access in Settings > Permissions & Privacy; there is no Accessibility permission prompt. Windows computer control cannot act on elevated or protected windows. In-app permissions still apply. See [Computer Use](/docs/skills-reference/computer-use).

### Can I teach it new things?

Yes, in three ways. You can tell it facts and preferences naturally in conversation (it extracts and saves them to long-term memory automatically). You can edit its workspace files directly (SOUL.md for behavior, USER.md for facts about you). And you can build custom skills that teach it new workflows and capabilities. See [Tools & Skills](/docs/key-concepts/skills-and-tools).

### Can I use it offline?

No. Your workspace and tools are local, but your assistant needs an internet connection to think — it sends your messages to the AI model provider (Anthropic) to generate responses. Without internet, it can't respond.

***

## About the assistant itself

### Can I change its name?

Yes. Say “I want to rename you to \[name]” or edit IDENTITY.md directly in `~/.vellum/workspace/`.

### Can I change its personality?

Yes. Tell it what you want (“be more casual,” “stop being sarcastic”) and it will update SOUL.md. You can also edit SOUL.md directly. Changes to workspace files take effect on the next conversation. See [The Workspace](/docs/key-concepts/the-workspace).

### Can I change how it looks?

Yes. Your assistant has a customizable avatar. Say “put on a wizard hat” or “change your color to emerald” and it will update its appearance. Avatar customization is managed through the assistant's identity and style settings.

### What AI model does it use?

Anthropic's Claude by default. The model can be changed in `config.json` in your workspace.

### Does it have feelings?

No. It's very good at sounding like it does, though. Don't let the personality fool you. It's a language model with a good costume.
