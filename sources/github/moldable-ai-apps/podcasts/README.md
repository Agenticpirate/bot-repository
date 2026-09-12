# Podcasts

Personal, on-demand podcasts with an episode library and playable Moldable chat cards. OpenAI narrates a complete script with one narrator. Episodes stay in the selected workspace; there is no RSS feed or sharing feature.

## Use

Open Podcasts in Moldable, choose a topic and length, and press Create podcast. You stay in the app as it writes, narrates and creates artwork. The episode is saved immediately, and generation continues after the dialog closes. The app uses the same authenticated `/api/llm/generate-json` server endpoint as Git Flow, with a four-minute writing deadline (ten minutes for 20-minute episodes) and no browser-held model credentials.

The header queue appears only while work is active. Episode rows reveal Archive/Restore and retry controls on hover or keyboard focus. Archived rows also offer Delete with a permanent-deletion confirmation, with visible controls on touch devices. Browsing Archived, searching, or archiving an episode keeps the current player selected and playing until another episode is chosen.

Podcast settings save the narration voice and last chosen episode length in the workspace database. The Create dialog starts at five minutes until a new episode saves another length; reopening the dialog on desktop or iPhone uses that saved choice. New episodes snapshot that voice; later preference changes and retries cannot mix voices within an episode. The creating window starts playback once the first saved audio section arrives, waits at the live edge for more, and respects an explicit pause. Opening an old episode or saved card does not auto-start it. The iPhone full-app host permits delayed audio starts for Podcasts; saved cards still require a tap.

Chat can call `podcasts.episodes.generate` with a topic for the same asynchronous workflow, or research and supply a complete script through `podcasts.episodes.create`. Both return a live player card immediately. Existing episodes can be shown through `podcasts.cards.present` without generating anything. The compact card includes playback, scrubbing, 15-second skips and speed. Transcript and volume controls stay in the full app. Active generation details and cancellation live in its queue popover.

The app manifest declares `OPENAI_API_KEY` as a required vault connection. Moldable’s setup flow prompts for it, using the same vault integration as Scribo and Money. Add or update it in Settings → Vault. Speech uses `aivault invoke openai/speech`; app code never receives the credential. OpenAI API billing is separate from ChatGPT/Codex subscriptions. The installed aivault OpenAI registry already supports this endpoint.

## App API

The discoverable `moldable.json` contains the full schema. Regenerate it with `pnpm manifest` after changing the shared input schemas or descriptions.

- `podcasts.episodes.generate`: requires a stable `requestId`, `topic`, and `minutes` (5, 10 or 20). Saves a durable request and returns immediately. Writing, audio and artwork share the existing queue, cancellation and retry controls. An outline and roughly five-minute written sections are checkpointed independently. Narration of saved sections runs concurrently with later writing. Retry reuses the saved outline, written sections and audio.
- `podcasts.episodes.create`: requires a stable `requestId`, `title`, `speakers` and a complete spoken `script`. Reuse the same ID and payload for transport retries to avoid duplicate purchases. Use exactly one narrator; the suggested voice is `marin`.
- `podcasts.settings.get` / `update`: read and persist the workspace narration voice. An explicit voice on a new `generate` request also becomes the saved preference.
- `podcasts.queue.get`: bounded generation queue with active count and recoverable failures.
- `podcasts.episodes.get` / `list`: read saved content and measured generation progress. Do not announce an episode is finished until status is `ready`.
- `podcasts.cards.present` / `read`: present or hydrate the existing player without regenerating audio.
- `podcasts.episodes.cancel` / `retry`: explicit generation control with `expectedRevision`. Completed parts are retained. Retrying an interrupted provider request may charge that part again.
- `podcasts.episodes.delete`: permanently remove an archived episode and its assets at the current revision. Stops generation, makes old cards unavailable, and preserves only a request receipt to prevent delayed creation retries from repurchasing it.
- `podcasts.episodes.archive`: archive or restore while preserving cards and audio.
- `podcasts.playback.update`: save explicit listening interactions. Playback itself remains local to the listener, so one client never starts another client’s audio.

A create input looks like:

```json
{
  "requestId": "wine-episode-unique-request",
  "title": "How Wine Is Made",
  "description": "From vineyard to bottle.",
  "speakers": [{ "id": "narrator", "name": "Marin", "voice": "marin" }],
  "script": [
    { "speakerId": "narrator", "text": "The actual narration goes here." }
  ],
  "sources": []
}
```

Write about 150 spoken words per requested minute: a 20-minute episode targets 3,000 words. Duration is approximate until audio is measured. No stage directions or Markdown in spoken text. The in-app writer has no live research tools and must not invent source links or claim current facts were verified. For current research, chat can supply a researched script and source links through `episodes.create`.

## Runtime and delivery

Moldable owns startup and ports. Do not start app servers manually. Node 22.13+ is required for the SQLite store. Data lives under `$MOLDABLE_HOME/workspaces/{workspace-id}/apps/podcasts/data/`; code lives here in the shared app source. Narration is serialized per workspace, checkpointed per bounded MP3 part, and never automatically retried after an interrupted paid request. Durable queued requests resume after a restart.

Desktop app, desktop chat card, iPhone app and iPhone chat card share the same React player and app RPC contract. Each saved audio part can play before the full episode finishes. The player waits at the end of available audio and resumes when a poll reveals the next part, only while the listener’s play intent remains active. Explicit pause cancels that intent; generation failures stop waiting. Audio stays behind asset URLs with byte-range support; no binary audio enters the conversation stream. The mobile bundle uses Moldable’s existing verified delivery and API resource bridge, with no new Relay wire methods. The Mac must be reachable for audio and app data. Playback starts from Create podcast intent or a tap on Play. Background/lock-screen listening is not implemented by this app.

## Checks

```sh
pnpm check-types
pnpm lint
pnpm test
pnpm build
pnpm build:mobile
```

Tests cover both client workspace headers, read-only card hydration, create deduplication, workspace isolation, audio range requests, cancellation, explicit retry checkpoints, stale generation ownership, and the shared segmented player.

There are no seeded episodes. Topic suggestions appear only in an empty library and prepare a real creation request. The OpenAI key needs Text-to-speech request permission. A revoked local vault secret must be replaced before generation can proceed.

## Episode artwork

Each new episode automatically generates one square thumbnail after its narration, using the Images app’s route: Moldable’s authenticated `/api/llm/images` service with GPT Image 2, then `openai/image-generation` through aivault only if the host explicitly reports unavailable access. Timeouts and uncertain requests never trigger a second purchase. Only the episode title and description are sent as artwork context. The result is decoded and resized to a 512 × 512 JPEG stored in the episode’s workspace. Library rows and desktop/iPhone chat players use the same bounded asset URL.

Audio can play while artwork finishes. Failed artwork never discards narration; `podcasts.episodes.retryArtwork` explicitly retries only the image. Reopening a card, polling, or retrying an already completed create request cannot generate another thumbnail. No images or test episodes are seeded into the library.
