> ## Documentation Index
> Fetch the complete documentation index at: https://docs.moldable.sh/llms.txt
> Use this file to discover all available pages before exploring further.

# Markdown formatting

> How outbound Markdown is parsed, chunked, and rendered per channel.

The gateway formats AI responses so they look right in each chat client. It parses Markdown once into an intermediate representation (IR), then renders per channel and chunks safely so style boundaries are preserved.

## Default behavior

* Enabled by default.
* Formatting behavior varies by channel.
* Tables are converted per channel default.
* Chunking is applied per channel limit.

## Channel defaults (focus: Slack + Discord)

| Channel | Outbound format                                       | Table mode | Default chunk limit |
| ------- | ----------------------------------------------------- | ---------- | ------------------- |
| Slack   | `slack_mrkdwn`                                        | `code`     | `4000`              |
| Discord | `plaintext` transport with Discord markdown rendering | `code`     | `2000`              |

Discord uses plaintext transport because Discord accepts markdown in the `content` field directly (no parse mode flag), but the formatter now preserves markdown styles instead of flattening to plain text.

## Config

All settings live under `gateway.markdown`.

### Settings

* `enabled`: master switch for formatting. When false, the gateway sends raw Markdown.
* `tables`: how to handle Markdown tables (for example: render as code, convert to text, or disable).
* `chunk_limit`: optional maximum size per message (if you want long replies split into multiple messages).
* `channels.<id>.format`: per-channel render mode override.
* `channels.<id>.tables`: per-channel table mode override.
* `channels.<id>.chunk_limit`: per-channel chunk override.

## Slack rendering

Slack output is rendered as mrkdwn:

* `**bold**` -> `*bold*`
* `*italic*` / `_italic_` -> `_italic_`
* `~~strike~~` -> `~strike~`
* Inline/fenced code remain code-formatted.
* Markdown links render as `<url|label>`.

Slack escaping rules:

* Escapes unsafe `&`, `<`, `>` in normal text.
* Preserves Slack angle-bracket tokens like `<@U...>`, `<#C...>`, `<!here>`, `<https://...>`, `<mailto:...>`, `<tel:...>`, `<slack://...>`.
* Preserves blockquote prefixes (`> `) while still escaping the quoted content.

## Discord rendering

Discord output is rendered as Discord markdown text:

* Bold: `**...**`
* Italic: `*...*`
* Strike: `~~...~~`
* Inline code: `` `...` ``
* Fenced code blocks: triple backticks
* Links: `[label](url)`

This keeps formatting readable in Discord while still using plaintext transport semantics.

## Chunking

Chunking splits long replies into multiple messages to fit channel limits:

* Slack default: 4000 chars
* Discord default: 2000 chars

Chunks are built from IR spans so style/link markers stay balanced at chunk boundaries.

## Links

Links are rendered per channel:

* Slack: `<url|label>`
* Discord: `[label](url)`
* Telegram: `<a href="url">label</a>`
* Plaintext channels: `label (url)` when the label differs from the URL

## Spoilers

Some channels may not support spoiler formatting; the gateway will fall back to a readable text representation.
