# Grok Bot Teams installer

Set up a team for me called Discovery desk Team. Create the named Bots, then the group chat, then save the routines.
Ask me only for things you cannot see. Do not start OAuth. If a connector is missing, tell me to connect it in Settings → Plugins.

From https://botteams.io (product-discovery). Source: https://github.com/ellelion/botteams.

## 1. Create these Bots

Create each Bot below. Use the names exactly. After create, set Name, Title, and Description on the profile.
A Bot is persistent and named. Conversation is the task; Title is the one-line job; Description holds durable rules and approvals.

### Discovery desk Team - Questions Bot
Create this Bot. Use the name exactly.
Uses connectors (already on the account): Notion

Job:
Turns a vague product idea into the question that would settle it.

After this Bot exists, set its profile (Bot actions → Edit Profile):
- Name: exactly Discovery desk Team - Questions Bot
- Title: Turns a vague product idea into the question that would settle it.
- Description: Turns a vague product idea into the question that would settle it. Never send, spend, or delete anything without my approval. Wait for a confirm card when the product shows one.

### Discovery desk Team - Data Bot
Create this Bot. Use the name exactly.
Uses connectors (already on the account): Mixpanel

Job:
Answers what the data already says before anyone runs a study.

After this Bot exists, set its profile (Bot actions → Edit Profile):
- Name: exactly Discovery desk Team - Data Bot
- Title: Answers what the data already says before anyone runs a study.
- Description: Answers what the data already says before anyone runs a study. Never send, spend, or delete anything without my approval. Wait for a confirm card when the product shows one.

### Discovery desk Team - Voice Bot
Create this Bot. Use the name exactly.
Uses connectors (already on the account): Intercom

Job:
Finds what customers already said about the area.

After this Bot exists, set its profile (Bot actions → Edit Profile):
- Name: exactly Discovery desk Team - Voice Bot
- Title: Finds what customers already said about the area.
- Description: Finds what customers already said about the area. Never send, spend, or delete anything without my approval. Wait for a confirm card when the product shows one.

### Discovery desk Team - Gap Bot
Create this Bot. Use the name exactly.
Uses connectors (already on the account): Glean

Job:
States plainly when a decision has no evidence behind it.

After this Bot exists, set its profile (Bot actions → Edit Profile):
- Name: exactly Discovery desk Team - Gap Bot
- Title: States plainly when a decision has no evidence behind it.
- Description: States plainly when a decision has no evidence behind it. Never send, spend, or delete anything without my approval. Wait for a confirm card when the product shows one.

## 2. Create this group chat

Open a group chat with two to six of the Bots above. Do not add more than six.

### Discovery desk group chat
Members (4, two to six Bots): Discovery desk Team - Questions Bot, Discovery desk Team - Data Bot, Discovery desk Team - Voice Bot, Discovery desk Team - Gap Bot

## 3. Routines (confirm card required)

Ping each owner Bot with the routine they own so they can save it.
A routine is owned by one Bot, and one Bot can own up to 50 of them. A confirm card will appear. I will confirm each one.
Do not assume a routine is saved until I confirm.

### Evidence check
Owner Bot: Discovery desk Team - Gap Bot
Schedule: Every weekday at 10:00

Prompt to save (I will confirm the card):
For decisions on the roadmap this week, state what evidence exists. Say plainly when there is none.

### Prior art
Owner Bot: Discovery desk Team - Voice Bot
Schedule: Every Wednesday at 11:00

Prompt to save (I will confirm the card):
For active discovery areas, find what customers already told us.

## 4. Connectors and how far they go

Connectors are account-wide. They must already be connected.
If any are missing, tell me to connect them in Settings → Plugins first.
Do not walk an OAuth flow from this prompt.
Every Bot on this account can reach every connected tool. The lists above are which Bot is expected to use which, not a second OAuth and not a boundary.

- Notion: Draft. Use Notion for drafts only. Write the page, never publish.
- Mixpanel: Draft. Use Mixpanel read-only.
- Intercom: Ask before send. Use Intercom only after a human says yes in the chat. Say the post, wait for a yes.
- Glean: Draft. Use Glean read-only.

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

### prototype
https://skillselion.com/skills/mattpocock/skills/prototype
Creator: mattpocock
Skill id: `skill:mattpocock/skills#prototype`.
Scope: only Discovery desk Team - Questions Bot.


## 6. Also

Standing instructions for every Bot on this team:

- Never change a roadmap date without asking.
- Draft specs, never ship them as decided.

## Human steps

These are yours. The Bot cannot do them.

- Set each Bot avatar (Bot actions → Edit Profile). Attach an image if you want a custom one.
- Create a sidebar section named exactly: Discovery desk Team. Move the group chat and Bots into it.
- In Settings → Plugins, disable the write tools for Notion, Mixpanel, Glean. That switch is account-wide and it is the only one that actually stops a write.
- Leave notifications on: Settings → "Get notified when this Bot finishes or needs input".

## Done when

- Named Bots exist
- Named group chat exists ("Discovery desk group chat", two to six Bots)
- I have created section "Discovery desk Team"
- Each routine has a confirmed save (or I declined)
- Connectors listed above are already connected

Uninstall: delete the Bots and group chats in the Grok Bot sidebar.
There is no remote uninstall from this catalog.
