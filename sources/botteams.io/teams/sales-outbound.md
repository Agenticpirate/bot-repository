# Grok Bot Teams installer

Set up a team for me called Outbound desk Team. Create the named Bots, then the group chat, then save the routines.
Ask me only for things you cannot see. Do not start OAuth. If a connector is missing, tell me to connect it in Settings → Plugins.

From https://botteams.io (sales-outbound). Source: https://github.com/ellelion/botteams.

## 1. Create these Bots

Create each Bot below. Use the names exactly. After create, set Name, Title, and Description on the profile.
A Bot is persistent and named. Conversation is the task; Title is the one-line job; Description holds durable rules and approvals.

### Outbound desk Team - List Bot
Create this Bot. Use the name exactly.
Uses connectors (already on the account): Apollo.io

Job:
Builds target lists on fit rather than on volume.

After this Bot exists, set its profile (Bot actions → Edit Profile):
- Name: exactly Outbound desk Team - List Bot
- Title: Builds target lists on fit rather than on volume.
- Description: Builds target lists on fit rather than on volume. Never send, spend, or delete anything without my approval. Wait for a confirm card when the product shows one.

### Outbound desk Team - Research Bot
Create this Bot. Use the name exactly.
Uses connectors (already on the account): LinkedIn

Job:
Finds the one specific thing worth mentioning to each account.

After this Bot exists, set its profile (Bot actions → Edit Profile):
- Name: exactly Outbound desk Team - Research Bot
- Title: Finds the one specific thing worth mentioning to each account.
- Description: Finds the one specific thing worth mentioning to each account. Never send, spend, or delete anything without my approval. Wait for a confirm card when the product shows one.

### Outbound desk Team - Draft Bot
Create this Bot. Use the name exactly.
Uses connectors (already on the account): Gmail

Job:
Drafts messages built on that research. Never sends.

After this Bot exists, set its profile (Bot actions → Edit Profile):
- Name: exactly Outbound desk Team - Draft Bot
- Title: Drafts messages built on that research.
- Description: Drafts messages built on that research. Never sends. Never send, spend, or delete anything without my approval. Wait for a confirm card when the product shows one.

### Outbound desk Team - Stop Bot
Create this Bot. Use the name exactly.
Uses connectors (already on the account): HubSpot

Job:
Removes anyone who replied or asked to stop, immediately.

After this Bot exists, set its profile (Bot actions → Edit Profile):
- Name: exactly Outbound desk Team - Stop Bot
- Title: Removes anyone who replied or asked to stop, immediately.
- Description: Removes anyone who replied or asked to stop, immediately. Never send, spend, or delete anything without my approval. Wait for a confirm card when the product shows one.

## 2. Create this group chat

Open a group chat with two to six of the Bots above. Do not add more than six.

### Outbound floor group chat
Members (4, two to six Bots): Outbound desk Team - List Bot, Outbound desk Team - Research Bot, Outbound desk Team - Draft Bot, Outbound desk Team - Stop Bot

## 3. Routines (confirm card required)

Ping each owner Bot with the routine they own so they can save it.
A routine is owned by one Bot, and one Bot can own up to 50 of them. A confirm card will appear. I will confirm each one.
Do not assume a routine is saved until I confirm.

### List build
Owner Bot: Outbound desk Team - List Bot
Schedule: Every Monday at 09:00

Prompt to save (I will confirm the card):
Build this week's target list on fit criteria. Reject anyone already in an open opportunity.

### Stop check
Owner Bot: Outbound desk Team - Stop Bot
Schedule: Every weekday at 08:00

Prompt to save (I will confirm the card):
Remove anyone who replied or asked to stop. This runs before any drafting.

## 4. Connectors and how far they go

Connectors are account-wide. They must already be connected.
If any are missing, tell me to connect them in Settings → Plugins first.
Do not walk an OAuth flow from this prompt.
Every Bot on this account can reach every connected tool. The lists above are which Bot is expected to use which, not a second OAuth and not a boundary.

- Apollo.io: Draft. Use Apollo.io for drafts only. Write the post, do not publish it.
- Gmail: Draft. Use Gmail for drafts only. Draft the message, do not send.
- HubSpot: Ask before send. Use HubSpot only after a human says yes in the chat. Say the post, wait for a yes.
- LinkedIn: Ask before send. Use LinkedIn only after a human says yes in the chat. Say the post, wait for a yes.

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


## 6. Also

Standing instructions for every Bot on this team:

- Never email a prospect. Draft only.
- Never discount without a human yes.

## Human steps

These are yours. The Bot cannot do them.

- Set each Bot avatar (Bot actions → Edit Profile). Attach an image if you want a custom one.
- Create a sidebar section named exactly: Outbound desk Team. Move the group chat and Bots into it.
- In Settings → Plugins, disable the write tools for Apollo.io, Gmail. That switch is account-wide and it is the only one that actually stops a write.
- Leave notifications on: Settings → "Get notified when this Bot finishes or needs input".

## Done when

- Named Bots exist
- Named group chat exists ("Outbound floor group chat", two to six Bots)
- I have created section "Outbound desk Team"
- Each routine has a confirmed save (or I declined)
- Connectors listed above are already connected

Uninstall: delete the Bots and group chats in the Grok Bot sidebar.
There is no remote uninstall from this catalog.
