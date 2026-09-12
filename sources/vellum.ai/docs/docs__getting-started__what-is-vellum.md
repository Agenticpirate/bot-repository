# What is Vellum?

## The short version

Vellum is a personal AI assistant that lives in the secure Vellum Cloud, available wherever you are. It can have its own identity, its own email, its own accounts, its own logins. It can read your files, manage your calendar, order you food, build you an app, control your computer, take calls on your behalf, and remember that you take your coffee black.

It's not a chatbot. It's not an autocomplete engine. It's a separate entity that works for you, learns about you, and takes real actions in the real world.

## How is this different from ChatGPT, Claude, OpenClaw, or Hermes?

Those are conversation tools. You type, they respond, you copy-paste the answer somewhere useful. The conversation ends and everything resets.

Vellum is different in a few important ways:

**It has tools, not just words.** Your assistant can browse the web, read your files, run code, send emails, manage your calendar, and interact with dozens of services. It can also see your screen and control your Mac or Windows PC directly, clicking, typing, and navigating apps through the desktop app. Sensitive actions always require your approval first. It doesn't describe what you *could* do. It does it.

**It remembers you.** Not just within a single conversation. Across days, weeks, months. Your preferences, your projects, your quirks. It builds a picture of who you are and uses that to help you better over time.

**It has its own identity.** Your assistant isn't borrowing yours. It can have its own email, its own GitHub account, its own Slack handle. When it sends an email on your behalf, the recipient knows they're talking to your assistant, not to you. Clear boundaries, no confusion.

**Your data stays yours.** Your workspace, your memories, your configuration... all live in your private Vellum Cloud account, encrypted and isolated, or on your own machine if you self-host. No shared database, no opaque storage, no data you can't access. Plain-text, exportable, deletable, yours.

**It's personal.** Not a team tool. Not a shared resource. Not a Slack bot everyone in your company uses. It's *your* assistant, personalized to *you*, and nobody else can access it.

Tools like OpenClaw and Hermes Agent take a more DIY approach. They run in your terminal, expect you to configure them yourself, and assume you're comfortable wiring up API keys, model providers, and tool integrations before you can get anything done.

**It works out of the box.** No config files to write, no CLI to install, no model routing to set up. Sign up and your assistant is running, connected to cloud AI models, and ready to go. OpenClaw and Hermes expect you to bring your own keys, pick your own providers, and handle the plumbing yourself.

**It has a real interface.** A polished web app and desktop apps for macOS and Windows. You can see your memories, browse your skills, manage integrations, and read conversation history in a UI designed for humans. OpenClaw and Hermes live in the terminal, which works if you're a developer who lives there too, but most people want a screen they can click.

**It's built for security and reliability.** Credentials are encrypted at rest. Sensitive actions require explicit approval. Your workspace is isolated to your account with no shared state. Vellum Cloud runs on managed infrastructure with monitoring and uptime you don't have to maintain. Self-hosting is there if you want full control, but you don't have to trade reliability for ownership.

OpenClaw and Hermes are powerful if you're technical and want to build everything yourself. Vellum is for people who want the power without the setup tax.

## What can it do?

A non-exhaustive list of things your assistant can handle, organized by category:

### 💬 Communication

- **Gmail** — Manage your inbox, draft replies, archive, label, and unsubscribe
- **Email (Agent Mail)** — Give your assistant its own email address to send and receive mail
- **Messaging** — Read, search, and send messages across multiple platforms
- **Phone Calls** — Make and receive phone calls via Twilio
- **Slack** — Scan channels, summarize threads, send and manage messages
- **Contacts** — Manage contacts, communication channels, and access control
- **Notifications** — Send notifications through the unified notification router

### 📅 Productivity

- **Google Calendar** — Check schedules, create events, and coordinate availability
- **Tasks** — Reusable task templates and a prioritized work queue
- **Schedule** — Recurring and one-shot scheduling with cron, RRULE, or single fire-at time
- **Followups** — Track sent messages awaiting responses across channels
- **Playbooks** — Trigger-action automation rules for handling incoming messages
- **Document** — Write and edit long-form content like blog posts, articles, and reports
- **Start the Day** — Get a personalized daily briefing with weather, calendar, news, and tasks

### 🖥️ Automation & Control

- **Computer Use**: Control your Mac or Windows PC: click, type, and navigate supported apps
- **Browser** — Navigate and interact with web pages using a headless browser
- **Screen Watch** — Observe the screen at regular intervals with OCR
- **Watcher** — Poll and monitor external sources for changes
- **Subagent** — Spawn autonomous background agents for parallel work

### 🛠️ Development

- **App Builder** — Build interactive apps, dashboards, tools, and data visualizations
- **Frontend Design** — Create distinctive, production-grade frontend interfaces with high design quality
- **ACP** — Delegate coding tasks to external coding agents via the Agent Client Protocol

### 🎨 Media

- **Image Studio** — Generate and edit images using AI
- **Media Processing** — Ingest and process video, audio, and image files
- **Transcribe** — Turn audio and video into text with Whisper

### 🛍️ Services

- **Amazon** — Shop on Amazon and Amazon Fresh
- **DoorDash** — Order food, groceries, and convenience items
- **Weather** — Get current conditions and forecasts for any location

### 🧠 Knowledge & Identity

- **Memory** — Remembers your preferences, projects, and context across conversations
- **SOUL.md / IDENTITY.md / USER.md** — Editable files that shape your assistant's personality and knowledge of you
- **Skill Management** — Create and manage custom skills as your needs evolve

### 🔗 Integrations

- **OAuth Integrations** — Connect to third-party services like GitHub, Notion, Linear, Airtable, Spotify, and more
- **MCP Servers** — Add Model Context Protocol servers for extended tool access
- **ChatGPT Import** — Import conversation history from ChatGPT
- **Voice Input** — Hold Fn to talk to your assistant

And if it can't do something? You can teach it. Skills are modular and extensible. More on that in [Your First Skill](/docs/getting-started/your-first-skill).

## Where does it run?

Your assistant lives in Vellum Cloud by default and is reachable from anywhere. You can also self-host it on your own Mac if you want full control of the runtime.

### ☁️ Vellum Cloud (default)

Sign up and your assistant is provisioned in seconds, hosted in Vellum's secure cloud, always on, always reachable. No install, no servers to manage. Your workspace is encrypted and isolated to your account.

- Use it instantly in your browser at vellum.ai
- Always-on availability, even when your laptop is closed
- Encrypted, isolated workspace tied to your account
- One assistant, reachable across web, desktop, mobile, voice, and chat channels

### 🌐 Web app

Open your assistant in any modern browser. Same conversation, memories, and tools as the desktop app, no install required.

- Works in Chrome, Safari, Firefox, Arc, and the rest
- Same workspace and identity as your desktop and mobile sessions
- Browser extension available for reading open tabs and acting on the page you're looking at

### 🖥️ Desktop apps for macOS and Windows

A menu bar app on macOS and a system tray app on Windows. Same assistant as the web app, plus computer control and voice input. See the [installation guide](/docs/getting-started/installation) for system requirements and setup.

- macOS DMG or Windows EXE installer
- Desktop automation through macOS accessibility APIs or Windows UI Automation
- Voice input with platform-specific shortcuts
- Connects to your Vellum Cloud assistant, or run a fully self-hosted local workspace

### 📱 iOS app

Install Vellum Assistant on your iPhone or iPad and sign in to the same assistant you use on the web and Mac. Your conversations, memories, tools, and workspace stay with you across devices.

- Available from the App Store
- Talk to your assistant from your iPhone or iPad
- Review approval requests from mobile notifications

### 📡 Channels

Beyond the apps, you can reach your assistant through external channels, so it's available wherever you are.

- **Telegram** — Chat with your assistant from any device via a Telegram bot
- **Slack** — Message your assistant directly in Slack, useful for work contexts
- **Phone** — Call your assistant or have it take calls on your behalf via Twilio

## How does it work? (The 30-second version)

1. **You talk to it.** In your browser, the desktop app, by voice, or through chat channels like Telegram, Slack, and phone.
2. **It thinks.** Your message, along with relevant context (your preferences, memories, workspace files), is sent to a cloud AI model to generate a response.
3. **It acts.** If the response involves doing something (reading a file, sending an email, building an app, or controlling your desktop), your assistant uses its tools to make it happen. For desktop actions, it sees your screen, plans the steps, and executes them automatically. But it won't go rogue — your assistant always asks for permission before taking sensitive actions like sending emails, making purchases, or accessing new services. You stay in control, and you can configure exactly what requires approval and what your assistant can handle on its own.
4. **It learns.** Important facts, preferences, and context are saved to your workspace so it gets better over time.

> **Transparency moment:** Whether your assistant lives in Vellum Cloud or on your own machine, it *thinks* by talking to an AI model provider (like Anthropic). Your prompts and context are sent there to generate responses. This is the trade-off of a smart assistant. We'd rather tell you upfront than have you discover it in a footnote.

## Is it safe?

Vellum has a built-in trust system. Sensitive actions like sending emails, making purchases, or controlling your desktop require your explicit approval. You can configure trust rules per channel. Credentials are encrypted at rest in Vellum Cloud, or stored in the macOS Keychain when you self-host, never in plain text.

Learn more in [Trust & Security](/docs/trust-security).
