# Features & Capabilities

A deep dive into the platform's major feature areas — integrations, skill authoring, browser automation, file attachments, and media embeds.

## Integrations

Vellum integrates with third-party services via OAuth2, each exposed as a bundled skill with its own set of tools.

The unified messaging layer provides platform-agnostic tools (`messaging_send`, `messaging_read`, `messaging_search`) that delegate to provider adapters for Gmail, Slack, and Telegram. Platform-specific tools (e.g. `gmail_archive`) extend beyond the generic interface.

Connect via the Settings UI or the `integration_connect` HTTP endpoint. OAuth2 tokens are stored in the credential vault — the LLM never sees raw tokens. Telegram uses a bot token (not OAuth).

## Dynamic Skill Authoring

The assistant can create, test, and persist new skills at runtime when no existing tool covers a user's need.

1. **Evaluate** — drafts a TypeScript snippet, tests in a sandbox via `evaluate_typescript_code`. Iterates until it passes.
2. **Persist** — writes the skill to `~/.vellum/workspace/skills/<id>/` via `scaffold_managed_skill`.
3. **Load** — calls `skill_load` to activate the new skill.
4. **Delete** — removes via `delete_managed_skill`.

| Tool                       | Risk | Description                                      |
| -------------------------- | ---- | ------------------------------------------------ |
| `evaluate_typescript_code` | High | Run a TypeScript snippet in a sandbox            |
| `scaffold_managed_skill`   | High | Write a managed skill with SKILL.md frontmatter  |
| `delete_managed_skill`     | High | Remove a managed skill directory and index entry |

All authoring tools require explicit user approval. Skills can declare child relationships via the `includes` frontmatter field. Managed skills appear in the macOS Settings UI.

## Browser

Web browsing is provided by the bundled `browser` skill. Activate via `/browser` or let the agent load it automatically. Browser automation is executed through `assistant browser` commands.

| Command                             | Description                                |
| ----------------------------------- | ------------------------------------------ |
| `assistant browser navigate`        | Navigate to a URL                          |
| `assistant browser snapshot`        | List interactive elements                  |
| `assistant browser screenshot`      | Take a visual screenshot                   |
| `assistant browser click`           | Click an element                           |
| `assistant browser type`            | Type text into an input                    |
| `assistant browser press_key`       | Press a keyboard key                       |
| `assistant browser wait_for`        | Wait for a condition                       |
| `assistant browser extract`         | Extract page text content                  |
| `assistant browser fill_credential` | Fill a stored credential into a form field |
| `assistant browser close`           | Close the browser page                     |

All browser operations are auto-allowed by default. Navigation with `allow_private_network=true` is elevated to high-risk.

## Attachments

The assistant attaches files and images to replies, delivered across three channels:

- **Desktop** — inline base64 in SSE events; macOS app renders thumbnails
- **Telegram** — gateway delivers via `sendPhoto`/`sendDocument` (20 MB limit)
- **HTTP API** — `GET /v1/assistants/:id/messages` returns metadata; `GET /v1/assistants/:assistantId/attachments/:attachmentId` returns full payload

Sources: `<vellum-attachment>` directives in response text, or auto-converted from tool output. Limit: 100 MB per attachment.

## Inline Media Embeds

The desktop app renders inline previews for images and video URLs (YouTube, Vimeo, Loom).

- Videos use **ephemeral webview storage** — no cookies persist between sessions
- Videos require **click to play**; nothing auto-plays
- Images are **lazy-loaded**
- Video webviews are **torn down when scrolled offscreen**

Controlled via `ui.mediaEmbeds` in `~/.vellum/workspace/config.json`.

| Setting                 | Default                | Description                               |
| ----------------------- | ---------------------- | ----------------------------------------- |
| `enabled`               | `true`                 | Global toggle for all inline media embeds |
| `videoAllowlistDomains` | `["youtube.com", ...]` | Domains allowed to render video embeds    |
| `enabledSince`          | *timestamp*            | Only messages after this date show embeds |
