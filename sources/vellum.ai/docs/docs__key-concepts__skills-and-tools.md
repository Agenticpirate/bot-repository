# Tools & Skills

These are two related but different things. Understanding the difference will help you get more out of your assistant.

![The Skills tab on the About your assistant screen, showing the list of installed skills with icons, descriptions, and category filters in the sidebar](/docs/docs-skills-list.webp)

## Tools: the atomic actions

Tools are individual actions your assistant can take. Each one does exactly one thing.

Core tools are always available in every conversation:

| Tool                        | What it does                                             |
| --------------------------- | -------------------------------------------------------- |
| `file_read`                 | Read a file in the workspace                             |
| `file_write`                | Create or overwrite a file in the workspace              |
| `file_edit`                 | Edit a file in the workspace (surgical find-and-replace) |
| `bash`                      | Run a shell command (sandboxed to the workspace)         |
| `web_search`                | Search the internet                                      |
| `web_fetch`                 | Fetch and extract content from a URL                     |
| `memory_manage`             | Save, update, or delete facts in long-term memory        |
| `memory_recall`             | Search long-term memory                                  |
| `skill_load`                | Activate a skill for the current conversation            |
| `skill_execute`             | Run a tool provided by a loaded skill                    |
| `credential_store`          | Manage credentials (prompt, store, connect OAuth)        |
| `request_system_permission` | Ask you to grant a macOS system permission               |

Host tools can access your full machine, but require your permission:

| Tool              | What it does                                      |
| ----------------- | ------------------------------------------------- |
| `host_file_read`  | Read any file on your computer                    |
| `host_file_write` | Write to any file on your computer                |
| `host_file_edit`  | Edit any file on your computer                    |
| `host_bash`       | Run a shell command on your machine (unsandboxed) |

Skill tools become available when their skill is loaded. For example, loading the Browser skill enables `assistant browser` commands — navigate, click, type, snapshot, extract, and others. Loading the Gmail skill adds tools for archiving, labeling, drafting, sending, unsubscribing, and more.

There are dozens of tools in total. Your assistant picks the right ones based on what you asked for.

## Skills: bundles of capability

A skill is a package that combines tools, instructions, and configuration into a coherent capability.

- **Tool** = "I can draft an email"
- **Skill** = "I know how to browse the web — the Browser skill drives `assistant browser` commands to navigate pages, click elements, fill forms, extract content, take screenshots, and handle authentication"

Skills give your assistant context about how to use tools for a specific purpose. The Gmail skill knows email workflows. The Browser skill knows how to interact with web pages. The Phone Calls skill knows how to make and receive voice calls through Twilio.

At minimum, a skill is just a single file:

- **SKILL.md** — instructions that teach the assistant when and how to use the skill

More complex skills that provide their own tools also include:

- **TOOLS.json** — a manifest defining what tools the skill provides, their inputs, risk levels, and execution targets
- **tools/** — the implementation code behind each tool

## Built-in skills

Your assistant ships with 28 bundled skills:

| Category           | Skills                                                                          | What they enable                                                                                                              |
| ------------------ | ------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| Communication      | Gmail, Slack, Messaging, Phone Calls, Sequences                                 | Read, send, and manage messages across platforms. Make and receive voice calls. Run email drip sequences.                     |
| Research & content | Browser, Document, Image Studio, Media Processing, Transcribe                   | Navigate web pages, write long-form content, generate and edit images, process video/audio, transcribe recordings.            |
| Productivity       | Google Calendar, Contacts, Tasks, Followups, Notifications, Schedule, Playbooks | Manage calendar events and availability, track contacts, manage task queues, set reminders, build trigger-action automations. |
| Computer use       | Computer Use, Screen Watch                                                      | Control your Mac directly — click, type, navigate between apps. Watch your screen with OCR at intervals.                      |
| Monitoring         | Watcher, Heartbeat                                                              | Poll external sources for changes. Run periodic background checklists to keep things healthy.                                 |
| Development        | App Builder, ACP, Subagent                                                      | Build interactive web apps, delegate development tasks through ACP, run autonomous background agents.                         |
| System             | Settings, Skill Management, Skills Catalog, ChatGPT Import                      | Configure the assistant, create custom skills, discover and install community skills, import history from other assistants.   |

## How skills load

Skills aren't all active at once. Your assistant sees a catalog of available skills (names, descriptions, and activation hints) in every conversation. When it determines a skill is relevant — because you asked about email, or said "browse this page" — it calls `skill_load` to activate it.

Once a skill is loaded:

1. Its full instructions (SKILL.md) are injected into the conversation context
2. Its tools become available for use
3. It stays active for the rest of the conversation

This keeps the assistant's context focused. Only the skills that matter for the current conversation take up space.

## Custom and community skills

If the built-in skills don't cover what you need, you have three options:

**Build your own.** Describe what you want and your assistant will scaffold a full skill: SKILL.md with instructions, plus optional companion files like reference notes and reusable scripts, saved to your `skills/` directory. The skill is immediately available.

> "Build me a skill that monitors my favorite subreddit for new posts about TypeScript."

**Learn from completed work.** Your assistant can preserve a reusable procedure after it has actually carried it out. See [Self-improving Skills](/docs/key-concepts/self-improving-skills) for how learned skills are created, reviewed, edited, and removed.

**Install from the community.** Community skills are published on the [skills.sh](https://skills.sh) registry. Ask your assistant to search for a skill, and it can inspect, audit, and install it for you.

Whether custom or community-installed, skills live in your `skills/` directory. You can inspect, modify, or delete any of them — a skill is just a folder with a few files.

## Voice

Voice is one of the built-in capabilities your assistant ships with. How it sounds and how you talk to it are both configurable:

- **TTS provider** — which text-to-speech service to use (ElevenLabs, Fish Audio)
- **Voice ID** — the specific voice model
- **Activation key** — the push-to-talk key for voice input on desktop
- **Conversation timeout** — how long a voice conversation stays open after silence

Voice settings are configured conversationally (“change your voice”) or through the Voice tab in Settings.

## The difference, summarized

|                | Tools                                                       | Skills                                                                                   |
| -------------- | ----------------------------------------------------------- | ---------------------------------------------------------------------------------------- |
| What           | Single atomic action                                        | Bundle of tools + instructions                                                           |
| Example        | `gmail_draft`                                               | Browser skill (`assistant browser` commands: navigate, click, type, extract, screenshot) |
| Availability   | Core tools are always on; skill tools load with their skill | Activated per-conversation when relevant                                                 |
| Permissions    | Gated by execution target (sandbox vs. host)                | Skills themselves don't need permission; their individual tools do                       |
| Extensible     | Via MCP servers or custom skill tools                       | Build your own or install from skills.sh                                                 |
| Think of it as | A single LEGO brick                                         | A LEGO set with instructions                                                             |
