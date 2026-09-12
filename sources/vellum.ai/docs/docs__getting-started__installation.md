# Installation

## What you need

- **For the web app:** any modern browser on Mac, Windows, Linux, or a phone. No install, no setup. The fastest way in. Connects to a cloud assistant.
- **For the iOS app:** an iPhone or iPad and your Vellum account. Connects to your cloud assistant.
- **For the Android app:** Android 7.0 or later and your Vellum account. Connects to your cloud assistant.
- **For the Mac app:** macOS 15 (Sequoia) or later, Apple Silicon or Intel, plus \~500 MB free disk space. Connects to a cloud or local assistant.
- **For the Windows app:** Windows 10 or later. Choose the x64 installer for Intel or AMD PCs, or ARM64 for Windows on Arm. Connects to a cloud or local assistant.
- There is no shipped Linux desktop client.
- Internet connection (your assistant uses cloud AI models to think)
- About 5 minutes and a willingness to talk to your computer

[Sign up](https://www.vellum.ai/account/signup) and your assistant is provisioned in seconds.

## Web

The fastest way to meet your assistant. No install, no setup wizard, no config files. Your assistant runs in Vellum Cloud and you reach it from your browser.

1. Go to [vellum.ai/signup](https://www.vellum.ai/account/signup) and create your account.
2. Set your privacy preferences and accept the Terms of Service.
3. Watch your assistant hatch in the browser. About 30 seconds.
4. Say hi.

Your assistant lives in Vellum Cloud, encrypted and isolated to your account, reachable from any browser. You can also connect the desktop app, mobile app, voice, and chat channels (Telegram, Slack, phone) to the same assistant.

## iOS app

Install Vellum Assistant on your iPhone or iPad to use the same assistant, conversations, memories, tools, and workspace you have on the web and Mac.

1. Install Vellum Assistant from the [App Store](https://apps.apple.com/us/app/vellum-assistant/id6759934423).
2. Open the app and sign in with your Vellum account.
3. Your cloud assistant appears automatically. Say hi.

Approval requests can arrive as mobile notifications, so you can review sensitive actions from your phone.

## Android app

Install Vellum Assistant on your Android phone or tablet to use the same assistant, conversations, memories, tools, and workspace you have on the web and Mac.

1. Install Vellum Assistant from [Google Play](https://play.google.com/store/apps/details?id=ai.vellum.assistant).
2. Open the app and sign in with your Vellum account.
3. Your cloud assistant appears automatically. Say hi.

The Android app is a client for your cloud assistant. It does not run a local assistant on the phone. See [Downloads](https://www.vellum.ai/downloads).

## Desktop app (macOS and Windows)

The desktop app is available on macOS and Windows, with a menu bar or system tray presence, voice input, and computer control. It connects to a cloud assistant by default (so your conversations and memory show up in both the web and desktop apps), but it can also run a local assistant entirely on your machine. See [Hosting options](/docs/hosting-options) for the local-only setup.

The Windows download is currently a **dev build**. It connects to Vellum's development environment, so your production cloud assistant and its history will not appear there. The main download is x64; select Other downloads for ARM64.

1. [Sign up](https://www.vellum.ai/account/signup) for Vellum if you haven't already.
2. Download the macOS `.dmg` or Windows `.exe` from [vellum.ai/downloads](https://www.vellum.ai/downloads).
3. On macOS, open the `.dmg`, drag Vellum to Applications, and launch it. On Windows, run the `.exe` installer and open Vellum from Start.
4. Sign in with your Vellum account. Production builds connect to your existing cloud assistant; the Windows dev build connects to the development environment.

The installers include everything needed to run the app. macOS downloads are signed and notarized; Windows downloads are Authenticode-signed. No terminal setup is needed. On Windows, the app also installs the `vellum` CLI for your user account. Open a new terminal after the first launch to use it. The same page also offers the [Chrome extension](https://chromewebstore.google.com/detail/vellum-assistant-browser/hphbdmpffeigpcdjkckleobjmhhokpne) for browser automation.

## Linux

There is no shipped Linux desktop client. A Linux desktop shell is in development and is not distributed.

On a Linux computer you can:

- Use the web app in any modern browser after you [sign up](https://www.vellum.ai/account/signup).
- Install the [Chrome extension](https://chromewebstore.google.com/detail/vellum-assistant-browser/hphbdmpffeigpcdjkckleobjmhhokpne) so the assistant can drive a logged-in Chrome session on that computer.
- Self-host the assistant runtime on that machine. That is the server, not a desktop app. See [Hosting options](/docs/hosting-options).

Do not wait for a Linux desktop installer, and do not treat a self-hosted Linux runtime as a replacement for the Mac or Windows desktop app's computer-use features.

## Self-hosting

Want to run Vellum entirely on your own machine or your own infrastructure? You can. The runtime is open source and supports local-only mode (workspace at `~/.vellum/workspace/`) as well as remote deployment to your own GCP project or any Linux host.

Head to [Hosting options](/docs/hosting-options) for the full guide on local hosting and advanced deployment.

## Two ways to connect

- **Sign in with Vellum (default)** — Authenticate with your Vellum account for the managed experience. Your assistant runs in Vellum Cloud, billing is handled through your account, no API keys to manage.
- **Bring your own API key** — Self-host the runtime and connect it to your own Anthropic API key. Useful if you want to run everything on your own machine. Vellum manages your credentials separately from the assistant.

## What gets installed

If you run the desktop app or self-host, Vellum creates one directory on your machine. (Vellum Cloud users don't need to think about this. Your workspace lives in your encrypted cloud account and is available through the web app.)

```
~/.vellum/
├── workspace/
│   ├── IDENTITY.md        # Name, personality, emoji
│   ├── SOUL.md            # Principles and behavior rules
│   ├── USER.md            # What the assistant knows about you
│   ├── NOW.md             # Current focus, goals, and context
│   ├── config.json        # Runtime configuration
│   ├── skills/            # Installed and custom skills
│   └── data/
│       └── db/
│           └── assistant.db   # Conversations, memory, schedules (SQLite)
├── lockfile.json          # Running assistant instances and ports
```

Everything is plain text (aside from the SQLite database). You can open these files in any editor, read them, change them, even put them in version control. Your assistant's brain is not a black box. It's a folder on your computer.

Session logs are stored in `~/Library/Application Support/vellum-assistant/logs/`. The daemon binary lives inside the `.app` bundle, not in `~/.vellum/`.

## Permissions

Vellum doesn't ask for all its permissions upfront. Instead, permissions are requested only when they're actually needed:

| Permission             | Purpose                                  | When requested                                             |
| ---------------------- | ---------------------------------------- | ---------------------------------------------------------- |
| **Screen Recording**   | See your screen for computer-use tasks   | First time your assistant needs to see your screen         |
| **Microphone**         | Voice input (hold Fn to talk)            | First time you use voice input                             |
| **Speech Recognition** | Convert voice to text                    | First time you use voice input                             |
| **Accessibility**      | Control your Mac (click, type, navigate) | First time your assistant needs to interact with your apps |
| **Notifications**      | Status updates and reminders             | Optional, on first notification                            |

On Windows, open Settings > Permissions & Privacy in Vellum to check microphone, screen capture, speech, and notification access. Use the settings link beside a permission to open the corresponding Windows settings page. Accessibility, Input Monitoring, and Automation permissions are macOS-only and do not appear on Windows. Computer control cannot interact with elevated or protected windows.

**Worth knowing:** The app accesses files through normal sandbox entitlements, not Full Disk Access. Individual file and shell actions still require your approval through the in-app permission system. Check out [Trust & Security](/docs/trust-security) for the full picture.

## Updates

Vellum checks for updates automatically in the background. When an update is available, you'll see a green update button in the top right corner of the app. You can install immediately or defer until later. Updates are signed and verified before installation.

## Definitions

Key terms and concepts used throughout the Vellum Assistant ecosystem.

- [Assistant](/docs/getting-started/what-is-vellum)

  An AI-powered agent configured to perform tasks on your behalf. Each assistant is backed by a large language model and can be customized with specific instructions, skills, and channels.

- [Channel](/docs/key-concepts/channels)

  The surface through which users interact with the assistant. Channels include the desktop app, command-line tool, and other application integrations like Telegram.

- [Environment](/docs/hosting-options)

  The runtime context in which an assistant operates.

- Guardian

  The user who is in charge of the assistant. The guardian oversees the assistant's behavior, manages its configuration, and ensures it operates within defined boundaries.

- Hatch

  The process of creating and initializing a new assistant. When you hatch an assistant, it is configured and made ready to receive messages.

- Retire

  The process of deactivating an assistant. Retiring an assistant stops it from receiving new messages and frees up associated resources.

- [Skill](/docs/key-concepts/skills-and-tools)

  An action or capability that the assistant can invoke during a conversation. Skills allow the assistant to interact with external systems, run code, search the web, and more.
