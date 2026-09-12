# Common Issues

Things that go wrong, and how to unblock yourself. Most fixes start with the same move: ask your assistant. It can usually tell you what's broken faster than this page can.

## First things first

Before you dig into a section below, try this:

1. **Ask your assistant directly.** “Why didn't that work?” or “What's wrong with my Gmail connection?” It has access to its own tools and recent errors and will usually tell you exactly what needs fixing.
2. **Refresh.** Reload the web app, restart the desktop app, or close and reopen the iPhone app. Most transient issues clear here.
3. **Try a different surface.** If the iPhone app is acting up, try the web at [vellum.ai](https://vellum.ai). If web is acting up, try the iPhone app or desktop. The same assistant lives on each surface.

## Signing in

### I can't sign in to the web or iPhone app

1. Make sure you're using the same email address you signed up with.
2. Check your spam folder for the magic link or verification email if one was sent.
3. If you have multiple Vellum accounts, sign out fully first, then sign in with the right one.

### I'm signed in but I'm talking to a different assistant than usual

You probably have more than one assistant on your account (one provisioned in Vellum Cloud, one running on your Mac), and the surface you're on is pointed at a different one. Switch which assistant the surface is connected to from the app's settings, or sign out and sign back in to the right account.

## iPhone app

### Push notifications aren't arriving

1. In iOS Settings, find Vellum Assistant and confirm Notifications are turned on, plus Sounds and Banners.
2. In Focus modes (Do Not Disturb, Sleep, Work), confirm Vellum Assistant isn't silenced.
3. Open the app once. iOS sometimes drops the push token if the app hasn't been opened in a while.
4. If your assistant is asking for an approval and you want the prompt to come through as a push, the device needs to be online and notifications need to be allowed. Otherwise the approval lives in the chat until you open the app.

### My conversation history isn't showing up on the iPhone

Pull down to refresh on the conversations list. If it's still empty, confirm you're signed in to the same account you use on the web. History syncs across surfaces but only within one account.

## Desktop app (Mac)

### “Vellum can't be opened because it is from an unidentified developer”

Standard macOS Gatekeeper warning. Right-click the app in Finder, choose **Open**, then click **Open** again in the dialog. This only happens once.

### The app won't launch or crashes on startup

1. Make sure you're on macOS 14 (Sonoma) or later.
2. Check the menu bar for the Vellum icon. If it's missing, the assistant daemon isn't running. Relaunch the app.
3. Open Console.app and filter on `com.vellum.vellum-assistant` for crash logs.
4. As a last resort, delete the app and reinstall.

### “Operation not permitted” or a feature isn't working

Your Mac is missing a system permission. Open **System Settings › Privacy & Security** and toggle Vellum on for whichever category you need:

- **Accessibility** for keyboard and mouse control during computer use
- **Screen Recording** for seeing what's on screen
- **Microphone** for voice input
- **Files and folders / Full Disk Access** if your assistant is hitting permission errors reading or writing local files

## Desktop app (Windows)

### Installation or startup fails

Download the Windows installer from the [Vellum download page](https://www.vellum.ai/download). Use x64 for Intel or AMD PCs and ARM64 for Windows on Arm. Check the system tray for Vellum if the main window is closed. The tray menu offers a restart action.

### Voice, screen capture, or computer control is unavailable

Open Settings > Permissions & Privacy in Vellum and use the settings link beside the affected permission. Windows controls microphone, screen capture, speech, and notification access. There is no Accessibility permission to enable. Elevated apps, UAC prompts, and protected windows cannot be controlled; use a normal, non-administrator app window.

### The vellum command is not found

Launch Vellum once to provision its bundled CLI, then open a new terminal. The dev build adds `%LOCALAPPDATA%\Vellum-dev\bin` to your user PATH; production builds use `%LOCALAPPDATA%\Vellum\bin`. Run `where.exe vellum` to check which installation your terminal finds if another version takes precedence.

### Sending logs with a bug report

Use Help > Send Feedback in the app to send a report with recent logs. Include your Windows version, installer architecture, and the steps that reproduce the problem.

## Approvals

### My assistant keeps asking me to approve the same kind of thing

Each individual action gets its own approval by default, so reading three files means three prompts. To cut down on this:

- When you approve, choose **Allow & Create Rule** to make similar future actions auto-approve.
- In **Settings › Permissions & Privacy**, raise your risk tolerance to auto-approve more action types.
- Review and edit your trust rules in the same settings area whenever the pattern is too narrow or too wide.

### The approval prompt disappeared before I could click it

Approval requests expire after about 5 minutes of no response. Just tell your assistant “try that again” and it'll send a new one.

### I clicked Deny by accident

Tell your assistant to retry: “go ahead and read that file” or “try sending that email again.” A new approval prompt will appear.

## Memory

### My assistant forgot something I told it

A few possibilities:

- **It wasn't saved as a memory.** Filler messages get filtered out. For anything you want kept, be explicit: “Remember this: I prefer meetings before noon.”
- **It's saved but wasn't recalled this turn.** Memories surface based on relevance to the current conversation. Ask more specifically: “What do you remember about Project Moonshot?”
- **It aged out.** Memories have lifetimes based on type, and ones that don't come up again eventually fade. If something important slipped, just tell your assistant again.

See [Memory & Context](/docs/key-concepts/memory-and-context) for how the system actually works.

### My assistant remembers something I want it to forget

Tell it directly: “Forget that I work at Acme” or “Drop everything you remember about that project.” You can also browse and delete memories from the Memories tab in Settings.

## Voice

### Voice input isn't picking up my speech

What to check depends on the surface:

- **Web**: confirm your browser has microphone permission for vellum.ai. The first time you use voice in a browser, you'll get a permission prompt.
- **iPhone**: confirm Vellum Assistant has microphone access in iOS Settings › Privacy & Security › Microphone.
- **Desktop**: confirm Vellum has microphone access in System Settings › Privacy & Security › Microphone, and that you're holding the activation key long enough (there's a short hold to filter out accidental presses).

### Voice transcription is inaccurate

Accuracy depends on the microphone, background noise, and accent. Try speaking more slowly, get closer to the mic, or use a headset. For tricky proper nouns or critical instructions, type instead.

## Channels

### Telegram bot isn't responding

1. Confirm the bot is connected. Ask your assistant: “Is my Telegram bot set up?”
2. If you're running a local install, confirm your Mac is on and the assistant daemon is running. Cloud installs don't need this.
3. Try re-registering the webhook: “Reconnect Telegram.”
4. Verify your bot token is still valid in Telegram's BotFather.

### Slack isn't responding or keeps disconnecting

1. Slack uses Socket Mode and needs both a Bot Token and an App Token. Confirm both are configured.
2. If the connection drops, it usually reconnects on its own. If it doesn't, ask your assistant to “reconnect Slack.”
3. Confirm the Slack app has the right scopes (channels:history, chat:write, app\_mentions:read at minimum).

### Phone calls aren't working

Confirm the phone channel is set up by asking “Is my phone number working?” If you haven't gone through verification, your assistant will walk you through claiming a number. If you have, ask it to test the connection.

## Skills and integrations

### OAuth connection failed (Gmail, Calendar, Slack, etc.)

1. Check your internet connection.
2. Try the connection again: “Reconnect my Gmail.”
3. Confirm you're signing in with the right account (personal vs work).
4. If you're on a corporate Google or Slack workspace, your IT team may block third-party OAuth. Ask them to allow Vellum.

### An integration that worked yesterday stopped working today

OAuth tokens expire. Tell your assistant to reconnect it (“Reconnect my Gmail”), and it'll walk you through a fresh sign-in.

### A custom skill isn't loading

Custom skills live in your assistant's skills directory and need a valid `SKILL.md`. If yours isn't showing up, ask your assistant “Why isn't the \[skill name] skill loading?” and it can read the file and tell you what's wrong. For more on building skills, see the [Your first skill](/docs/getting-started/your-first-skill) guide.

## Performance

### My assistant is slow to respond

Response time depends on the model provider, how complex the task is, how many tools it has to use, and how long the conversation is. Some quick wins:

- Start a fresh conversation if the current one has been going for a while. Long context slows things down.
- Confirm your internet connection is healthy. Voice and streaming responses are especially sensitive.
- If a specific provider feels slow, switch your default model in **Settings › Models & Services**.

### A computer-use session is stuck or repeating itself

Sessions are capped at 50 steps and your assistant has loop detection that pauses if the screen stops changing. If something looks off, cancel the session and try again with a more specific instruction (“click the blue Submit button at the bottom right,” not just “submit”).

## Still stuck?

If your assistant can't self-diagnose and nothing here matches, head to [Getting Help](/docs/help/getting-help) for where to ask. Bring a description of what you tried, what surface you were on, and any error message you saw.
