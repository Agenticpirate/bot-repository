# Grok Bot Teams installer

Set up a team for me called Support during incidents Team. Create the named Bots, then the group chat, then save the routines.
Ask me only for things you cannot see. Do not start OAuth. If a connector is missing, tell me to connect it in Settings → Plugins.

From https://botteams.io (support-incident). Source: https://github.com/ellelion/botteams.

## 1. Create these Bots

Create each Bot below. Use the names exactly. After create, set Name, Title, and Description on the profile.
A Bot is persistent and named. Conversation is the task; Title is the one-line job; Description holds durable rules and approvals.

### Support during incidents Team - Detect Bot
Create this Bot. Use the name exactly.
Uses connectors (already on the account): Zendesk

Job:
Notices ticket spikes that mean something is broken.

After this Bot exists, set its profile (Bot actions → Edit Profile):
- Name: exactly Support during incidents Team - Detect Bot
- Title: Notices ticket spikes that mean something is broken.
- Description: Notices ticket spikes that mean something is broken. Never send, spend, or delete anything without my approval. Wait for a confirm card when the product shows one.

### Support during incidents Team - Link Bot
Create this Bot. Use the name exactly.
Uses connectors (already on the account): PagerDuty

Job:
Connects the ticket spike to the open incident.

After this Bot exists, set its profile (Bot actions → Edit Profile):
- Name: exactly Support during incidents Team - Link Bot
- Title: Connects the ticket spike to the open incident.
- Description: Connects the ticket spike to the open incident. Never send, spend, or delete anything without my approval. Wait for a confirm card when the product shows one.

### Support during incidents Team - Message Bot
Create this Bot. Use the name exactly.
Uses connectors (already on the account): Notion

Job:
Drafts one accurate holding message and keeps it current. Never sends.

After this Bot exists, set its profile (Bot actions → Edit Profile):
- Name: exactly Support during incidents Team - Message Bot
- Title: Drafts one accurate holding message and keeps it current.
- Description: Drafts one accurate holding message and keeps it current. Never sends. Never send, spend, or delete anything without my approval. Wait for a confirm card when the product shows one.

### Support during incidents Team - Affected Bot
Create this Bot. Use the name exactly.
Uses connectors (already on the account): Intercom

Job:
Lists which accounts actually hit the problem.

After this Bot exists, set its profile (Bot actions → Edit Profile):
- Name: exactly Support during incidents Team - Affected Bot
- Title: Lists which accounts actually hit the problem.
- Description: Lists which accounts actually hit the problem. Never send, spend, or delete anything without my approval. Wait for a confirm card when the product shows one.

## 2. Create this group chat

Open a group chat with two to six of the Bots above. Do not add more than six.

### Incident support desk group chat
Members (4, two to six Bots): Support during incidents Team - Detect Bot, Support during incidents Team - Link Bot, Support during incidents Team - Message Bot, Support during incidents Team - Affected Bot

## 3. Routines (confirm card required)

Ping each owner Bot with the routine they own so they can save it.
A routine is owned by one Bot, and one Bot can own up to 50 of them. A confirm card will appear. I will confirm each one.
Do not assume a routine is saved until I confirm.

### Spike watch
Owner Bot: Support during incidents Team - Detect Bot
Schedule: Every 30 minutes

Prompt to save (I will confirm the card):
Report ticket volume against the hourly baseline. Flag anything over three times normal.

### Message refresh
Owner Bot: Support during incidents Team - Message Bot
Schedule: Every 30 minutes during an incident

Prompt to save (I will confirm the card):
Update the holding message with what is known. Never claim a fix that is not confirmed.

## 4. Connectors and how far they go

Connectors are account-wide. They must already be connected.
If any are missing, tell me to connect them in Settings → Plugins first.
Do not walk an OAuth flow from this prompt.
Every Bot on this account can reach every connected tool. The lists above are which Bot is expected to use which, not a second OAuth and not a boundary.

- Zendesk: Ask before send. Use Zendesk only after a human says yes in the chat. Say the post, wait for a yes.
- Intercom: Ask before send. Use Intercom only after a human says yes in the chat. Say the post, wait for a yes.
- PagerDuty: Draft. Use PagerDuty read-only.
- Notion: Draft. Use Notion for drafts only. Write the page, never publish.

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

### handoff
https://skillselion.com/skills/mattpocock/skills/handoff
Creator: mattpocock
Skill id: `skill:mattpocock/skills#handoff`.
Scope: every Bot on this team (team scope).

### triage
https://skillselion.com/skills/mattpocock/skills/triage
Creator: mattpocock
Skill id: `skill:mattpocock/skills#triage`.
Scope: only Support during incidents Team - Detect Bot.


## 6. Also

Standing instructions for every Bot on this team:

- Never send a reply without a human yes.
- Never promise a refund.

## Human steps

These are yours. The Bot cannot do them.

- Set each Bot avatar (Bot actions → Edit Profile). Attach an image if you want a custom one.
- Create a sidebar section named exactly: Support during incidents Team. Move the group chat and Bots into it.
- In Settings → Plugins, disable the write tools for PagerDuty, Notion. That switch is account-wide and it is the only one that actually stops a write.
- Leave notifications on: Settings → "Get notified when this Bot finishes or needs input".

## Done when

- Named Bots exist
- Named group chat exists ("Incident support desk group chat", two to six Bots)
- I have created section "Support during incidents Team"
- Each routine has a confirmed save (or I declined)
- Connectors listed above are already connected

Uninstall: delete the Bots and group chats in the Grok Bot sidebar.
There is no remote uninstall from this catalog.
