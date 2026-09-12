# Grok Bot Teams installer

Set up a new Bot for me called Product Performance Bot. Walk me through anything you need, then save it.
Ask me only for things you cannot see. Do not start OAuth. If a connector is missing, tell me to connect it in Settings → Plugins.

From https://botteams.io (xai-product-performance). Source: https://github.com/ellelion/botteams.

## 1. Create this Bot

Create each Bot below. Use the names exactly. After create, set Name, Title, and Description on the profile.
A Bot is persistent and named. Conversation is the task; Title is the one-line job; Description holds durable rules and approvals.

### Performance Watch Bot
Create this Bot. Use the name exactly.
Uses connectors (already on the account): Datadog, Grafana Cloud, Linear, Slack

Job:
Reads the observability tools, works through the traces, and writes up the hotspots with screenshots. Reads the dashboards and never changes a monitor.

After this Bot exists, set its profile (Bot actions → Edit Profile):
- Name: exactly Performance Watch Bot
- Title: Reads the observability tools, works through the traces, and writes up the hotspots with…
- Description: Reads the observability tools, works through the traces, and writes up the hotspots with screenshots. Reads the dashboards and never changes a monitor. Never send, spend, or delete anything without my approval. Wait for a confirm card when the product shows one.

## 2. No group chat, no sidebar section

This is one Bot. Do not create a group chat for it, and do not create a sidebar section: a section is for several chats that belong together.

## 3. Routines (confirm card required)

Ping the Bot with each routine so it can save them.
A routine is owned by one Bot, and one Bot can own up to 50 of them. A confirm card will appear. I will confirm each one.
Do not assume a routine is saved until I confirm.

### Product Performance pass
Owner Bot: Performance Watch Bot
Schedule: Every Monday at 09:00

Prompt to save (I will confirm the card):
Run the job above and post the result for review. Change nothing without a human yes.

## 4. Connectors and how far they go

Connectors are account-wide. They must already be connected.
If any are missing, tell me to connect them in Settings → Plugins first.
Do not walk an OAuth flow from this prompt.
Every Bot on this account can reach every connected tool. The lists above are which Bot is expected to use which, not a second OAuth and not a boundary.

- Datadog: Read. Use Datadog read-only.
- Grafana Cloud: Read. Use Grafana Cloud read-only.
- Linear: Draft. Use Linear for drafts only. Write the page, never publish.
- Slack: Draft. Use Slack for drafts only. Write the post, do not publish it.

## 5. Skills

Skills live under Settings → Plugins → Yours, and they are per Bot. Reference a skill with /.
If a skill is already installed on the account (Settings → Plugins → Yours), use it. Enable it for this Bot if / does not show it.
If it is not installed, fetch or load it through the Skillselion connector using the skill id. Do not install a second copy.
Connect the Skillselion connector only when a fetch is needed. Do not start OAuth from this prompt.
Do not pin or hide a Bot unless I say so. Hide does not pause routines.
If a workflow should be demonstrated later, mention Teach a task after the first success (browser workflows).

### find-skills
https://skillselion.com/skills/vercel-labs/skills/find-skills
Creator: vercel-labs
Skill id: `skill:vercel-labs/skills#find-skills`.
Scope: every Bot on this team (team scope).

### tdd
https://skillselion.com/skills/mattpocock/skills/tdd
Creator: mattpocock
Skill id: `skill:mattpocock/skills#tdd`.
Scope: only Performance Watch Bot.


## 6. Also

Standing instructions for this Bot:

- Read the dashboards. Never change an alert or a monitor.
- Never touch production.
- Review only until I approve. Do not send, do not change a record, do not touch production.

## Human steps

These are yours. The Bot cannot do them.

- Set each Bot avatar (Bot actions → Edit Profile). Attach an image if you want a custom one.
- In Settings → Plugins, disable the write tools for Datadog, Grafana Cloud, Linear, Slack. That switch is account-wide and it is the only one that actually stops a write.
- Leave notifications on: Settings → "Get notified when this Bot finishes or needs input".

## Done when

- The named Bot exists
- Each routine has a confirmed save (or I declined)
- Connectors listed above are already connected

Uninstall: delete the Bot in the Grok Bot sidebar.
There is no remote uninstall from this catalog.
