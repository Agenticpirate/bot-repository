# Messaging

## What it does

Read, search, send, and manage messages across multiple platforms including Slack, Gmail, and Telegram from a single conversation with your assistant.

## Setup required

Each platform requires its own connection:

- **Slack:** OAuth2 authorization. Say “Connect my Slack.”
- **Gmail:** OAuth2 authorization. Say “Connect my Gmail.”
- **Telegram:** Bot token from @BotFather. Say “Connect my Telegram.”

## Permissions

- OAuth2 tokens stored in the secure credential vault
- No macOS permissions needed
- Your assistant sends messages as itself or with your explicit approval, depending on the platform

## Common prompts

| You say...                                          | What happens                                  |
| --------------------------------------------------- | --------------------------------------------- |
| “What's happening in #general on Slack?”            | Reads recent messages in a Slack channel      |
| “Send a message in #design: mockups are ready”      | Posts to a Slack channel                      |
| “Summarize my unread Slack messages”                | Digest of what you missed                     |
| “Search Slack for messages about the API migration” | Finds relevant conversations                  |
| “Check my Gmail for anything from Amazon”           | Searches your Gmail inbox                     |
| “What did Alice say in #engineering yesterday?”     | Finds specific messages by person and channel |

## Configuration

- Each platform is connected independently
- Channel access depends on what you've authorized
- Each platform is connected independently via OAuth (Slack, Gmail) or bot token (Telegram). Channel access depends on what you've authorized for each platform

## Tips & gotchas

- **Multi-platform:** You can ask about messages across platforms in one request: “Do I have anything important on Slack or Gmail?”
- **Sending messages:** Your assistant will confirm before sending messages on your behalf. Gmail and Outlook compose into a mailbox draft first so you can review before anything is sent. If you want it to send without asking, set that preference explicitly.
- **Context awareness:** Your assistant remembers which channels and contacts you mention frequently. Over time, “check the design channel” is enough without specifying “Slack.”
- **Rate limits:** Some platforms throttle API access. If your assistant can't fetch messages, it may be a temporary rate limit. Wait a few minutes and try again.
