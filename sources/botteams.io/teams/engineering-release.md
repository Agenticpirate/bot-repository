# Grok Bot Teams installer

Set up a team for me called Release desk Team. Create the named Bots, then the group chat, then save the routines.
Ask me only for things you cannot see. Do not start OAuth. If a connector is missing, tell me to connect it in Settings → Plugins.

From https://botteams.io (engineering-release). Source: https://github.com/ellelion/botteams.

## 1. Create these Bots

Create each Bot below. Use the names exactly. After create, set Name, Title, and Description on the profile.
A Bot is persistent and named. Conversation is the task; Title is the one-line job; Description holds durable rules and approvals.

### Release desk Team - Notes Bot
Create this Bot. Use the name exactly.
Uses connectors (already on the account): GitHub

Job:
Drafts release notes from merged pull requests in language a non-engineer can read.

After this Bot exists, set its profile (Bot actions → Edit Profile):
- Name: exactly Release desk Team - Notes Bot
- Title: Drafts release notes from merged pull requests in language a non-engineer can read.
- Description: Drafts release notes from merged pull requests in language a non-engineer can read. Never send, spend, or delete anything without my approval. Wait for a confirm card when the product shows one.

### Release desk Team - Deploys Bot
Create this Bot. Use the name exactly.
Uses connectors (already on the account): Vercel

Job:
Tracks what deployed, when, and which build failed.

After this Bot exists, set its profile (Bot actions → Edit Profile):
- Name: exactly Release desk Team - Deploys Bot
- Title: Tracks what deployed, when, and which build failed.
- Description: Tracks what deployed, when, and which build failed. Never send, spend, or delete anything without my approval. Wait for a confirm card when the product shows one.

### Release desk Team - After Bot
Create this Bot. Use the name exactly.
Uses connectors (already on the account): Sentry

Job:
Compares error rates before and after each release and names regressions.

After this Bot exists, set its profile (Bot actions → Edit Profile):
- Name: exactly Release desk Team - After Bot
- Title: Compares error rates before and after each release and names regressions.
- Description: Compares error rates before and after each release and names regressions. Never send, spend, or delete anything without my approval. Wait for a confirm card when the product shows one.

### Release desk Team - Rollback Bot
Create this Bot. Use the name exactly.
Uses connectors (already on the account): Linear

Job:
Assembles the case for a rollback when errors spike. Never triggers one.

After this Bot exists, set its profile (Bot actions → Edit Profile):
- Name: exactly Release desk Team - Rollback Bot
- Title: Assembles the case for a rollback when errors spike.
- Description: Assembles the case for a rollback when errors spike. Never triggers one. Never send, spend, or delete anything without my approval. Wait for a confirm card when the product shows one.

## 2. Create this group chat

Open a group chat with two to six of the Bots above. Do not add more than six.

### Release room group chat
Members (4, two to six Bots): Release desk Team - Notes Bot, Release desk Team - Deploys Bot, Release desk Team - After Bot, Release desk Team - Rollback Bot

## 3. Routines (confirm card required)

Ping each owner Bot with the routine they own so they can save it.
A routine is owned by one Bot, and one Bot can own up to 50 of them. A confirm card will appear. I will confirm each one.
Do not assume a routine is saved until I confirm.

### Notes draft
Owner Bot: Release desk Team - Notes Bot
Schedule: Every weekday at 17:00

Prompt to save (I will confirm the card):
Draft release notes from today's merges, readable by someone outside the team.

### Post-release watch
Owner Bot: Release desk Team - After Bot
Schedule: Every 2 hours during working hours

Prompt to save (I will confirm the card):
Compare error rates against the pre-release baseline. Name anything worse. Never roll back.

## 4. Connectors and how far they go

Connectors are account-wide. They must already be connected.
If any are missing, tell me to connect them in Settings → Plugins first.
Do not walk an OAuth flow from this prompt.
Every Bot on this account can reach every connected tool. The lists above are which Bot is expected to use which, not a second OAuth and not a boundary.

- GitHub: Draft. Use GitHub for drafts only. Draft the PR or branch, never merge.
- Vercel: Draft. Use Vercel for drafts only. Do not deploy to production.
- Sentry: Draft. Use Sentry read-only.
- Linear: Draft. Use Linear for drafts only. Write the page, never publish.

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

### tdd
https://skillselion.com/skills/mattpocock/skills/tdd
Creator: mattpocock
Skill id: `skill:mattpocock/skills#tdd`.
Scope: only Release desk Team - Notes Bot.

### improve-codebase-architecture
https://skillselion.com/skills/mattpocock/skills/improve-codebase-architecture
Creator: mattpocock
Skill id: `skill:mattpocock/skills#improve-codebase-architecture`.
Scope: only Release desk Team - Notes Bot.

### setup-matt-pocock-skills
https://skillselion.com/skills/mattpocock/skills/setup-matt-pocock-skills
Creator: mattpocock
Skill id: `skill:mattpocock/skills#setup-matt-pocock-skills`.
Scope: only Release desk Team - Notes Bot.


## 6. Also

Standing instructions for every Bot on this team:

- Never merge or deploy. Draft only.
- Never touch production data.

## Human steps

These are yours. The Bot cannot do them.

- Set each Bot avatar (Bot actions → Edit Profile). Attach an image if you want a custom one.
- Create a sidebar section named exactly: Release desk Team. Move the group chat and Bots into it.
- In Settings → Plugins, disable the write tools for GitHub, Vercel, Sentry, Linear. That switch is account-wide and it is the only one that actually stops a write.
- Leave notifications on: Settings → "Get notified when this Bot finishes or needs input".

## Done when

- Named Bots exist
- Named group chat exists ("Release room group chat", two to six Bots)
- I have created section "Release desk Team"
- Each routine has a confirmed save (or I declined)
- Connectors listed above are already connected

Uninstall: delete the Bots and group chats in the Grok Bot sidebar.
There is no remote uninstall from this catalog.
