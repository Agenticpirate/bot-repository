# Grok Bot Teams installer

Set up a new Bot for me called New-hire 30-60-90 Bot. Walk me through anything you need, then save it.
Ask me only for things you cannot see. Do not start OAuth. If a connector is missing, tell me to connect it in Settings → Plugins.

From https://botteams.io (new-hire-ramp). Source: https://github.com/ellelion/botteams.

## 1. Create this Bot

Create each Bot below. Use the names exactly. After create, set Name, Title, and Description on the profile.
A Bot is persistent and named. Conversation is the task; Title is the one-line job; Description holds durable rules and approvals.

### Ramp planner Bot
Create this Bot. Use the name exactly.
Uses connectors (already on the account): Google Docs, Google Calendar, Notion, Microsoft Teams, Gmail

Job:
Writes a 30-60-90 from the role brief, parks check-ins on the calendar, and drafts the day-one note. Never grants access and never sends.

After this Bot exists, set its profile (Bot actions → Edit Profile):
- Name: exactly Ramp planner Bot
- Title: Writes a 30-60-90 from the role brief, parks check-ins on the calendar, and drafts the da…
- Description: Writes a 30-60-90 from the role brief, parks check-ins on the calendar, and drafts the day-one note. Never grants access and never sends. Never send, spend, or delete anything without my approval. Wait for a confirm card when the product shows one.

## 2. No group chat, no sidebar section

This is one Bot. Do not create a group chat for it, and do not create a sidebar section: a section is for several chats that belong together.

## 3. Routines (confirm card required)

Ping the Bot with each routine so it can save them.
A routine is owned by one Bot, and one Bot can own up to 50 of them. A confirm card will appear. I will confirm each one.
Do not assume a routine is saved until I confirm.

### Ramp pass
Owner Bot: Ramp planner Bot
Schedule: Every weekday at 09:00

Prompt to save (I will confirm the card):
For each new starter without a 30-60-90, draft the plan and the first three check-ins. Do not send. Do not grant access.

## 4. Connectors and how far they go

Connectors are account-wide. They must already be connected.
If any are missing, tell me to connect them in Settings → Plugins first.
Do not walk an OAuth flow from this prompt.
Every Bot on this account can reach every connected tool. The lists above are which Bot is expected to use which, not a second OAuth and not a boundary.

- Google Docs: Draft. Use Google Docs for drafts only. Write the page, never publish.
- Google Calendar: Draft. Use Google Calendar for drafts only. Draft the event, do not send invites.
- Notion: Draft. Use Notion for drafts only. Write the page, never publish.
- Microsoft Teams: Draft. Use Microsoft Teams for drafts only. Write the post, do not publish it.
- Gmail: Draft. Use Gmail for drafts only. Draft the message, do not send.

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

### triage
https://skillselion.com/skills/mattpocock/skills/triage
Creator: mattpocock
Skill id: `skill:mattpocock/skills#triage`.
Scope: only Ramp planner Bot.


## 6. Also

Standing instructions for this Bot:

- Never grant access to anything.
- Never send mail. Draft only.
- Never invent a goal the manager did not write.

## Human steps

These are yours. The Bot cannot do them.

- Set each Bot avatar (Bot actions → Edit Profile). Attach an image if you want a custom one.
- In Settings → Plugins, disable the write tools for Google Docs, Google Calendar, Notion, Microsoft Teams, Gmail. That switch is account-wide and it is the only one that actually stops a write.
- Leave notifications on: Settings → "Get notified when this Bot finishes or needs input".

## Done when

- The named Bot exists
- Each routine has a confirmed save (or I declined)
- Connectors listed above are already connected

Uninstall: delete the Bot in the Grok Bot sidebar.
There is no remote uninstall from this catalog.
