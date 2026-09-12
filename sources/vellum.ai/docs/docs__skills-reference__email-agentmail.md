# Email (AgentMail)

## What it does

Gives your assistant its own email address so it can send, receive, read, search, and manage email independently from your personal inbox.

## Setup required

First-time setup needed. Say:

> “Set up your email.”

Your assistant will create its own email address through AgentMail (e.g., `gigi@agentmail.vellum.ai`). This is a one-time process. Once set up, email works automatically going forward.

## Permissions

- No macOS permissions needed
- Uses your assistant's own email address, not yours
- Credential stored in the secure vault

## Common prompts

| You say...                                              | What happens                                                   |
| ------------------------------------------------------- | -------------------------------------------------------------- |
| “Check my email”                                        | Reads and summarizes recent messages in your assistant's inbox |
| “Do I have any important emails?”                       | Triages inbox by priority and relevance                        |
| “Send an email to alex\@example.com about the deadline” | Drafts and sends from your assistant's address                 |
| “Draft a reply to Alice's last email”                   | Composes a response for your review before sending             |
| “Search my email for anything from Stripe”              | Searches inbox by sender, subject, or content                  |
| “Summarize the last 10 emails”                          | Reads and gives you a quick digest                             |
| “Unsubscribe from all these marketing emails”           | Bulk manages unwanted subscriptions                            |

## Configuration

- Email address is assigned during setup
- Your assistant can manage its own inbox organization
- **Custom domains:** You can connect your own domain for a professional email address. Your assistant handles DNS setup and verification.

## Tips & gotchas

- **It's not your email.** Your assistant sends from its own address. Recipients see your assistant's email, not yours. This is by design.
- **Forwarding:** If you want your assistant to see emails sent to *your* address, you'll need to set up forwarding from your email provider to your assistant's AgentMail address.
- **Drafts vs. sends:** By default, your assistant may send emails directly. If you want to review before sending, tell it: “Always show me drafts before sending.”
- **Bulk actions:** Your assistant can triage, archive, and unsubscribe in bulk. Use the interactive UI it generates for selecting multiple messages at once.
