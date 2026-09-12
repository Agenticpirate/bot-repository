# Grok Bot Teams installer

Set up a team for me called Editorial standards Team. Create the named Bots, then the group chat, then save the routines.
Ask me only for things you cannot see. Do not start OAuth. If a connector is missing, tell me to connect it in Settings → Plugins.

From https://botteams.io (content-editorial). Source: https://github.com/ellelion/botteams.

## 1. Create these Bots

Create each Bot below. Use the names exactly. After create, set Name, Title, and Description on the profile.
A Bot is persistent and named. Conversation is the task; Title is the one-line job; Description holds durable rules and approvals.

### Editorial standards Team - Claims Bot
Create this Bot. Use the name exactly.
Uses connectors (already on the account): Notion

Job:
Flags every factual claim without a source and every number without a date.

After this Bot exists, set its profile (Bot actions → Edit Profile):
- Name: exactly Editorial standards Team - Claims Bot
- Title: Flags every factual claim without a source and every number without a date.
- Description: Flags every factual claim without a source and every number without a date. Never send, spend, or delete anything without my approval. Wait for a confirm card when the product shows one.

### Editorial standards Team - Style Bot
Create this Bot. Use the name exactly.
Uses connectors (already on the account): Notion

Job:
Checks a draft against the house style sheet and lists the breaks, quoting each one.

After this Bot exists, set its profile (Bot actions → Edit Profile):
- Name: exactly Editorial standards Team - Style Bot
- Title: Checks a draft against the house style sheet and lists the breaks, quoting each one.
- Description: Checks a draft against the house style sheet and lists the breaks, quoting each one. Never send, spend, or delete anything without my approval. Wait for a confirm card when the product shows one.

### Editorial standards Team - Links Bot
Create this Bot. Use the name exactly.
Uses connectors (already on the account): Google Drive

Job:
Checks links resolve and that nothing points at a competitor by accident.

After this Bot exists, set its profile (Bot actions → Edit Profile):
- Name: exactly Editorial standards Team - Links Bot
- Title: Checks links resolve and that nothing points at a competitor by accident.
- Description: Checks links resolve and that nothing points at a competitor by accident. Never send, spend, or delete anything without my approval. Wait for a confirm card when the product shows one.

### Editorial standards Team - Handoff Bot
Create this Bot. Use the name exactly.
Uses connectors (already on the account): Gmail

Job:
Writes the note the human editor reads first: what is solid, what needs a decision.

After this Bot exists, set its profile (Bot actions → Edit Profile):
- Name: exactly Editorial standards Team - Handoff Bot
- Title: Writes the note the human editor reads first: what is solid, what needs a decision.
- Description: Writes the note the human editor reads first: what is solid, what needs a decision. Never send, spend, or delete anything without my approval. Wait for a confirm card when the product shows one.

## 2. Create this group chat

Open a group chat with two to six of the Bots above. Do not add more than six.

### Editorial desk group chat
Members (4, two to six Bots): Editorial standards Team - Claims Bot, Editorial standards Team - Style Bot, Editorial standards Team - Links Bot, Editorial standards Team - Handoff Bot

## 3. Routines (confirm card required)

Ping each owner Bot with the routine they own so they can save it.
A routine is owned by one Bot, and one Bot can own up to 50 of them. A confirm card will appear. I will confirm each one.
Do not assume a routine is saved until I confirm.

### Draft review
Owner Bot: Editorial standards Team - Claims Bot
Schedule: Every weekday at 11:00

Prompt to save (I will confirm the card):
For drafts marked ready, flag claims without a source and numbers without a date.

### Style pass
Owner Bot: Editorial standards Team - Style Bot
Schedule: Every weekday at 11:30

Prompt to save (I will confirm the card):
Check drafts against the house style sheet. Quote each break. Never rewrite the draft yourself.

## 4. Connectors and how far they go

Connectors are account-wide. They must already be connected.
If any are missing, tell me to connect them in Settings → Plugins first.
Do not walk an OAuth flow from this prompt.
Every Bot on this account can reach every connected tool. The lists above are which Bot is expected to use which, not a second OAuth and not a boundary.

- Notion: Draft. Use Notion for drafts only. Write the page, never publish.
- Google Drive: Draft. Use Google Drive for drafts only. Write the page, never publish.
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

### seo-content-writing
https://skillselion.com/skills/aaaaqwq/claude-code-skills/seo-content-writing
Creator: aaaaqwq
Skill id: `skill:aaaaqwq/claude-code-skills#seo-content-writing`.
Scope: every Bot on this team (team scope).

### frontend-design
https://skillselion.com/skills/anthropics/skills/frontend-design
Creator: anthropics
Skill id: `skill:anthropics/skills#frontend-design`.
Scope: every Bot on this team (team scope).


## 6. Also

Standing instructions for every Bot on this team:

- Never publish. Draft only.
- Never claim a number you cannot source.

## Human steps

These are yours. The Bot cannot do them.

- Set each Bot avatar (Bot actions → Edit Profile). Attach an image if you want a custom one.
- Create a sidebar section named exactly: Editorial standards Team. Move the group chat and Bots into it.
- In Settings → Plugins, disable the write tools for Notion, Google Drive, Gmail. That switch is account-wide and it is the only one that actually stops a write.
- Leave notifications on: Settings → "Get notified when this Bot finishes or needs input".

## Done when

- Named Bots exist
- Named group chat exists ("Editorial desk group chat", two to six Bots)
- I have created section "Editorial standards Team"
- Each routine has a confirmed save (or I declined)
- Connectors listed above are already connected

Uninstall: delete the Bots and group chats in the Grok Bot sidebar.
There is no remote uninstall from this catalog.
