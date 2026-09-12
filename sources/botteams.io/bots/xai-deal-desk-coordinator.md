# Grok Bot Teams installer

Set up a new Bot for me called Deal Desk Coordinator Bot. Walk me through anything you need, then save it.
Ask me only for things you cannot see. Do not start OAuth. If a connector is missing, tell me to connect it in Settings → Plugins.

From https://botteams.io (xai-deal-desk-coordinator). Source: https://github.com/ellelion/botteams.

## 1. Create this Bot

Create each Bot below. Use the names exactly. After create, set Name, Title, and Description on the profile.
A Bot is persistent and named. Conversation is the task; Title is the one-line job; Description holds durable rules and approvals.

### Deal Desk Bot
Create this Bot. Use the name exactly.
Uses connectors (already on the account): Salesforce, Gmail, Gong, Notion

Job:
Builds the deal note from past mail, CRM and calls, and parks it for review. Never writes to the CRM and never offers a term change.

After this Bot exists, set its profile (Bot actions → Edit Profile):
- Name: exactly Deal Desk Bot
- Title: Builds the deal note from past mail, CRM and calls, and parks it for review.
- Description: Builds the deal note from past mail, CRM and calls, and parks it for review. Never writes to the CRM and never offers a term change. Never send, spend, or delete anything without my approval. Wait for a confirm card when the product shows one.

## 2. No group chat, no sidebar section

This is one Bot. Do not create a group chat for it, and do not create a sidebar section: a section is for several chats that belong together.

## 3. Routines (confirm card required)

No routines in this recipe.

## 4. Connectors and how far they go

Connectors are account-wide. They must already be connected.
If any are missing, tell me to connect them in Settings → Plugins first.
Do not walk an OAuth flow from this prompt.
Every Bot on this account can reach every connected tool. The lists above are which Bot is expected to use which, not a second OAuth and not a boundary.

- Salesforce: Read. Use Salesforce read-only. Read and summarise it. Do not post, send, or reply in Salesforce.
- Gmail: Draft. Use Gmail for drafts only. Draft the message, do not send.
- Gong: Read. Use Gong read-only.
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


## 6. Also

Standing instructions for this Bot:

- Never change the CRM. Propose the edit and wait.
- Never offer a discount or a term change.
- Review only until I approve. Do not send, do not change a record, do not touch production.

## Human steps

These are yours. The Bot cannot do them.

- Set each Bot avatar (Bot actions → Edit Profile). Attach an image if you want a custom one.
- In Settings → Plugins, disable the write tools for Salesforce, Gmail, Gong, Notion. That switch is account-wide and it is the only one that actually stops a write.
- Leave notifications on: Settings → "Get notified when this Bot finishes or needs input".

## Done when

- The named Bot exists
- Each routine has a confirmed save (or I declined)
- Connectors listed above are already connected

Uninstall: delete the Bot in the Grok Bot sidebar.
There is no remote uninstall from this catalog.
