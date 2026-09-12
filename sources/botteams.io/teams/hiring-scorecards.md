# Grok Bot Teams installer

Set up a team for me called Interview scorecards Team. Create the named Bots, then the group chat, then save the routines.
Ask me only for things you cannot see. Do not start OAuth. If a connector is missing, tell me to connect it in Settings → Plugins.

From https://botteams.io (hiring-scorecards). Source: https://github.com/ellelion/botteams.

## 1. Create these Bots

Create each Bot below. Use the names exactly. After create, set Name, Title, and Description on the profile.
A Bot is persistent and named. Conversation is the task; Title is the one-line job; Description holds durable rules and approvals.

### Interview scorecards Team - Missing Bot
Create this Bot. Use the name exactly.
Uses connectors (already on the account): Ashby

Job:
Names interviews held with no scorecard filed.

After this Bot exists, set its profile (Bot actions → Edit Profile):
- Name: exactly Interview scorecards Team - Missing Bot
- Title: Names interviews held with no scorecard filed.
- Description: Names interviews held with no scorecard filed. Never send, spend, or delete anything without my approval. Wait for a confirm card when the product shows one.

### Interview scorecards Team - Thin Bot
Create this Bot. Use the name exactly.
Uses connectors (already on the account): Ashby

Job:
Flags scorecards with a rating but no evidence written.

After this Bot exists, set its profile (Bot actions → Edit Profile):
- Name: exactly Interview scorecards Team - Thin Bot
- Title: Flags scorecards with a rating but no evidence written.
- Description: Flags scorecards with a rating but no evidence written. Never send, spend, or delete anything without my approval. Wait for a confirm card when the product shows one.

### Interview scorecards Team - Panel Bot
Create this Bot. Use the name exactly.
Uses connectors (already on the account): Notion

Job:
Checks each panel covers the attributes the role actually needs.

After this Bot exists, set its profile (Bot actions → Edit Profile):
- Name: exactly Interview scorecards Team - Panel Bot
- Title: Checks each panel covers the attributes the role actually needs.
- Description: Checks each panel covers the attributes the role actually needs. Never send, spend, or delete anything without my approval. Wait for a confirm card when the product shows one.

### Interview scorecards Team - Summary Bot
Create this Bot. Use the name exactly.
Uses connectors (already on the account): Calendar, Gmail

Job:
Drafts the decision summary from the evidence, not the impressions.

After this Bot exists, set its profile (Bot actions → Edit Profile):
- Name: exactly Interview scorecards Team - Summary Bot
- Title: Drafts the decision summary from the evidence, not the impressions.
- Description: Drafts the decision summary from the evidence, not the impressions. Never send, spend, or delete anything without my approval. Wait for a confirm card when the product shows one.

## 2. Create this group chat

Open a group chat with two to six of the Bots above. Do not add more than six.

### Scorecard desk group chat
Members (4, two to six Bots): Interview scorecards Team - Missing Bot, Interview scorecards Team - Thin Bot, Interview scorecards Team - Panel Bot, Interview scorecards Team - Summary Bot

## 3. Routines (confirm card required)

Ping each owner Bot with the routine they own so they can save it.
A routine is owned by one Bot, and one Bot can own up to 50 of them. A confirm card will appear. I will confirm each one.
Do not assume a routine is saved until I confirm.

### Missing scorecards
Owner Bot: Interview scorecards Team - Missing Bot
Schedule: Every day at 18:00

Prompt to save (I will confirm the card):
List interviews held today with no scorecard filed, and who owns each.

### Evidence check
Owner Bot: Interview scorecards Team - Thin Bot
Schedule: Every weekday at 09:00

Prompt to save (I will confirm the card):
Flag scorecards with a rating and no supporting evidence.

## 4. Connectors and how far they go

Connectors are account-wide. They must already be connected.
If any are missing, tell me to connect them in Settings → Plugins first.
Do not walk an OAuth flow from this prompt.
Every Bot on this account can reach every connected tool. The lists above are which Bot is expected to use which, not a second OAuth and not a boundary.

- Ashby: Draft. Use Ashby for drafts only. Write the page, never publish.
- Calendar: Draft. Use Google Calendar for drafts only. Draft the event, do not send invites.
- Notion: Draft. Use Notion for drafts only. Write the page, never publish.
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

### handoff
https://skillselion.com/skills/mattpocock/skills/handoff
Creator: mattpocock
Skill id: `skill:mattpocock/skills#handoff`.
Scope: every Bot on this team (team scope).

### triage
https://skillselion.com/skills/mattpocock/skills/triage
Creator: mattpocock
Skill id: `skill:mattpocock/skills#triage`.
Scope: every Bot on this team (team scope).


## 6. Also

Standing instructions for every Bot on this team:

- Never mail a candidate without a human yes.
- Never reject anyone automatically.

## Human steps

These are yours. The Bot cannot do them.

- Set each Bot avatar (Bot actions → Edit Profile). Attach an image if you want a custom one.
- Create a sidebar section named exactly: Interview scorecards Team. Move the group chat and Bots into it.
- In Settings → Plugins, disable the write tools for Ashby, Calendar, Notion, Gmail. That switch is account-wide and it is the only one that actually stops a write.
- Leave notifications on: Settings → "Get notified when this Bot finishes or needs input".

## Done when

- Named Bots exist
- Named group chat exists ("Scorecard desk group chat", two to six Bots)
- I have created section "Interview scorecards Team"
- Each routine has a confirmed save (or I declined)
- Connectors listed above are already connected

Uninstall: delete the Bots and group chats in the Grok Bot sidebar.
There is no remote uninstall from this catalog.
