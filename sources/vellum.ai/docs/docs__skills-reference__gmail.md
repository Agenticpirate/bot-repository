# Gmail

## What it does

Full Gmail management — archive, label, draft, send, unsubscribe, manage filters, track follow-ups, and handle attachments. Your assistant's direct line to your inbox.

## Setup required

OAuth2 connection to Google. Say “Connect my Gmail.” One-time setup.

## Permissions

- OAuth2 with Google (scoped to Gmail only)
- No macOS permissions needed

## Common prompts

| You say...                               | What happens                              |
| ---------------------------------------- | ----------------------------------------- |
| “Archive everything from newsletters”    | Bulk archives matching emails             |
| “Unsubscribe me from marketing emails”   | Finds and unsubscribes from mailing lists |
| “Draft a reply to Alice's last email”    | Creates a draft response                  |
| “What emails need my attention?”         | Scans inbox for important items           |
| “Set up a filter for Jira notifications” | Creates a Gmail filter rule               |
| “Turn on my vacation responder”          | Configures auto-reply                     |
| “Who's been emailing me the most?”       | Runs a sender digest analysis             |

## Configuration

- Connected via OAuth2
- Supports labels, filters, and vacation responder
- Sending requires explicit approval

## Tips & gotchas

- **Sending is gated.** Drafts are created first, you approve before sending.
- **Attachments work both ways.** You can download attachments from emails and attach files to outgoing messages.
- **Cold outreach detection.** The skill can scan for cold outreach and bulk sender patterns.
