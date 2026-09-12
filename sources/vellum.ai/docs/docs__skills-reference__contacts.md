# Contacts

## What it does

Manages your contacts, communication channels, access control, and invite links. Tracks who can reach your assistant and through which channels.

## Setup required

None for basic contact management. Google Contacts integration available via OAuth.

## Permissions

- Google OAuth (optional, for importing Google Contacts)
- No macOS permissions needed

## Common prompts

| You say...                                    | What happens                                 |
| --------------------------------------------- | -------------------------------------------- |
| “Add Alice as a contact”                      | Opens an add-contact form for you to confirm |
| “Delete Alice” / “Rename Alice”               | Opens an edit or delete confirmation         |
| “What's Jake's email?”                        | Searches contact details                     |
| “Send Alice an invite to connect on Telegram” | Generates a channel-specific invite link     |
| “Import my Google Contacts”                   | Syncs contacts from Google                   |
| “Make Alice a trusted contact”                | Grants access control privileges             |
| “Block messages from this number”             | Updates channel status                       |

## Configuration

- Contacts can have multiple channels (Telegram, Slack, phone)
- Channel statuses: active, revoked, blocked
- Trusted contacts can interact with your assistant on your behalf

## Tips & gotchas

- **Access management.** Contacts are how you manage who can reach your assistant through external channels.
- **You approve every write.** The assistant can look up and search contacts on its own, but creating, editing, deleting, merging, or adding a channel to one opens a form in your app first. Nothing is written until you submit it, and you can edit the values it proposes before you do.
- **A contact is not access.** Adding someone records who they are. It does not let them message your assistant: that takes a verified channel, through an invite they redeem themselves or an address you enter and verify.
- **Trusted contacts.** Making someone a “trusted contact” gives them limited access to your assistant: they can chat but can't access your memories or sensitive tools without guardian approval.
- **Invite links.** Invite links are channel-specific and can be revoked.
