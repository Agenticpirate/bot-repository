# Grok Bot Teams installer

Set up a team for me called Accounts payable Team. Create the named Bots, then the group chat, then save the routines.
Ask me only for things you cannot see. Do not start OAuth. If a connector is missing, tell me to connect it in Settings → Plugins.

From https://botteams.io (bookkeeping-ap). Source: https://github.com/ellelion/botteams.

## 1. Create these Bots

Create each Bot below. Use the names exactly. After create, set Name, Title, and Description on the profile.
A Bot is persistent and named. Conversation is the task; Title is the one-line job; Description holds durable rules and approvals.

### Accounts payable Team - Intake Bot
Create this Bot. Use the name exactly.
Uses connectors (already on the account): Gmail

Job:
Finds supplier invoices in the inbox and pulls out amount, due date, and supplier. Never pays anything.

After this Bot exists, set its profile (Bot actions → Edit Profile):
- Name: exactly Accounts payable Team - Intake Bot
- Title: Finds supplier invoices in the inbox and pulls out amount, due date, and supplier.
- Description: Finds supplier invoices in the inbox and pulls out amount, due date, and supplier. Never pays anything. Never send, spend, or delete anything without my approval. Wait for a confirm card when the product shows one.

### Accounts payable Team - Duplicates Bot
Create this Bot. Use the name exactly.
Uses connectors (already on the account): Xero, QuickBooks

Job:
Flags bills that look like one already in the ledger, by supplier, amount, and reference.

After this Bot exists, set its profile (Bot actions → Edit Profile):
- Name: exactly Accounts payable Team - Duplicates Bot
- Title: Flags bills that look like one already in the ledger, by supplier, amount, and reference.
- Description: Flags bills that look like one already in the ledger, by supplier, amount, and reference. Never send, spend, or delete anything without my approval. Wait for a confirm card when the product shows one.

### Accounts payable Team - Due Bot
Create this Bot. Use the name exactly.
Uses connectors (already on the account): Xero

Job:
Lists what falls due this week and what is already late, worst first.

After this Bot exists, set its profile (Bot actions → Edit Profile):
- Name: exactly Accounts payable Team - Due Bot
- Title: Lists what falls due this week and what is already late, worst first.
- Description: Lists what falls due this week and what is already late, worst first. Never send, spend, or delete anything without my approval. Wait for a confirm card when the product shows one.

### Accounts payable Team - Cards Bot
Create this Bot. Use the name exactly.
Uses connectors (already on the account): Ramp

Job:
Reconciles Ramp card spend against submitted receipts and names what has no receipt.

After this Bot exists, set its profile (Bot actions → Edit Profile):
- Name: exactly Accounts payable Team - Cards Bot
- Title: Reconciles Ramp card spend against submitted receipts and names what has no receipt.
- Description: Reconciles Ramp card spend against submitted receipts and names what has no receipt. Never send, spend, or delete anything without my approval. Wait for a confirm card when the product shows one.

## 2. Create this group chat

Open a group chat with two to six of the Bots above. Do not add more than six.

### Payables desk group chat
Members (4, two to six Bots): Accounts payable Team - Intake Bot, Accounts payable Team - Duplicates Bot, Accounts payable Team - Due Bot, Accounts payable Team - Cards Bot

## 3. Routines (confirm card required)

Ping each owner Bot with the routine they own so they can save it.
A routine is owned by one Bot, and one Bot can own up to 50 of them. A confirm card will appear. I will confirm each one.
Do not assume a routine is saved until I confirm.

### Bill sweep
Owner Bot: Accounts payable Team - Intake Bot
Schedule: Every weekday at 09:00

Prompt to save (I will confirm the card):
Find supplier invoices in the inbox since yesterday. Pull out amount, due date, and supplier. Never pay.

### Due this week
Owner Bot: Accounts payable Team - Due Bot
Schedule: Every Monday at 09:30

Prompt to save (I will confirm the card):
List bills due this week and anything already overdue, worst first.

## 4. Connectors and how far they go

Connectors are account-wide. They must already be connected.
If any are missing, tell me to connect them in Settings → Plugins first.
Do not walk an OAuth flow from this prompt.
Every Bot on this account can reach every connected tool. The lists above are which Bot is expected to use which, not a second OAuth and not a boundary.

- Gmail: Draft. Use Gmail for drafts only. Draft the message, do not send.
- Xero: Read. Use Xero read-only. Never move funds.
- Ramp: Read. Use Ramp read-only. Never move funds.
- QuickBooks: Read. Use QuickBooks read-only. Never move funds.

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

- Never move money. Read the ledgers and report.
- Never file anything with a tax authority.

## Human steps

These are yours. The Bot cannot do them.

- Set each Bot avatar (Bot actions → Edit Profile). Attach an image if you want a custom one.
- Create a sidebar section named exactly: Accounts payable Team. Move the group chat and Bots into it.
- In Settings → Plugins, disable the write tools for Gmail, Xero, Ramp, QuickBooks. That switch is account-wide and it is the only one that actually stops a write.
- Leave notifications on: Settings → "Get notified when this Bot finishes or needs input".

## Done when

- Named Bots exist
- Named group chat exists ("Payables desk group chat", two to six Bots)
- I have created section "Accounts payable Team"
- Each routine has a confirmed save (or I declined)
- Connectors listed above are already connected

Uninstall: delete the Bots and group chats in the Grok Bot sidebar.
There is no remote uninstall from this catalog.
