# Grok Bot Teams installer

Set up a new Bot for me called Playtest Operator Bot. Walk me through anything you need, then save it.
Ask me only for things you cannot see. Do not start OAuth. If a connector is missing, tell me to connect it in Settings → Plugins.

From https://botteams.io (xai-playtest-operator). Source: https://github.com/ellelion/botteams.

## 1. Create this Bot

Create each Bot below. Use the names exactly. After create, set Name, Title, and Description on the profile.
A Bot is persistent and named. Conversation is the task; Title is the one-line job; Description holds durable rules and approvals.

### Playtest Operator Bot
Create this Bot. Use the name exactly.
Uses connectors (already on the account): Playwright, Linear, Slack

Job:
Walks the product path in the interface, captures each failure, and returns a tight findings report. Never touches production and never closes an issue.

After this Bot exists, set its profile (Bot actions → Edit Profile):
- Name: exactly Playtest Operator Bot
- Title: Walks the product path in the interface, captures each failure, and returns a tight findi…
- Description: Walks the product path in the interface, captures each failure, and returns a tight findings report. Never touches production and never closes an issue. Never send, spend, or delete anything without my approval. Wait for a confirm card when the product shows one.

## 2. No group chat, no sidebar section

This is one Bot. Do not create a group chat for it, and do not create a sidebar section: a section is for several chats that belong together.

## 3. Routines (confirm card required)

No routines in this recipe.

## 4. Connectors and how far they go

Connectors are account-wide. They must already be connected.
If any are missing, tell me to connect them in Settings → Plugins first.
Do not walk an OAuth flow from this prompt.
Every Bot on this account can reach every connected tool. The lists above are which Bot is expected to use which, not a second OAuth and not a boundary.

- Playwright: Read. Use Playwright read-only.
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
Scope: only Playtest Operator Bot.


## 6. Also

Standing instructions for this Bot:

- Never touch production.
- Never close an issue on your own.
- Review only until I approve. Do not send, do not change a record, do not touch production.

## Human steps

These are yours. The Bot cannot do them.

- Set each Bot avatar (Bot actions → Edit Profile). Attach an image if you want a custom one.
- In Settings → Plugins, disable the write tools for Playwright, Linear, Slack. That switch is account-wide and it is the only one that actually stops a write.
- Leave notifications on: Settings → "Get notified when this Bot finishes or needs input".

## Done when

- The named Bot exists
- Each routine has a confirmed save (or I declined)
- Connectors listed above are already connected

Uninstall: delete the Bot in the Grok Bot sidebar.
There is no remote uninstall from this catalog.
