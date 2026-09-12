> ## Documentation Index
> Fetch the complete documentation index at: https://docs.moldable.sh/llms.txt
> Use this file to discover all available pages before exploring further.

# Channels

> Messaging platforms supported by the gateway.

Channels are how people talk to the gateway (for example: Telegram or WhatsApp).

**Example:** enable Telegram to let DMs reach the gateway.

Channels connect messaging platforms to the gateway and deliver outbound text responses back to those platforms.

## Built-in channels

* [Telegram](/channels/telegram)
* [Discord](/channels/discord)
* [Slack](/channels/slack)
* [WhatsApp Cloud](/channels/whatsapp-cloud)

## Shared settings

All channels support:

* `enabled`: turn the adapter on/off.
* `allow_from`: sender IDs that bypass pairing checks.
* `groups`: allowed group chat IDs (`*` to allow all).
* `require_mention`: require a bot mention in groups.

## Group behavior

If `require_mention` is true and a message does not mention the bot, the gateway ignores it.
