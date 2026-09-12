import {
  createEpisodeSchema,
  generateEpisodeSchema,
  listSchema,
  playbackSchema,
  recordSchema,
  revisionSchema,
  settingsUpdateSchema,
} from '../src/shared/podcast'
import { writeFile } from 'node:fs/promises'
import { z } from 'zod'

const scope = (
  id: string,
  name: string,
  description: string,
  schema: z.ZodType,
  risk = 'low',
  changesState = false,
) => ({
  id: `podcasts.${id}`,
  name,
  description,
  risk,
  changesState,
  ...(risk === 'low' ? { surfaces: ['voice'] } : {}),
  inputSchema: z.toJSONSchema(schema, { io: 'input' }),
})
const manifest = {
  name: 'Podcasts',
  version: '0.1.0',
  description:
    'Turn your curiosity into personal podcasts. Create narrated episodes and listen in chat.',
  tagline: 'Anything you’re curious about. Made into a podcast.',
  icon: '🎙️',
  iconPath: 'public/icon.png',
  category: 'entertainment',
  tags: ['podcasts', 'audio', 'learning', 'narration'],
  aliases: ['podcast', 'episodes', 'audio briefings'],
  runtime: 'vite_hono',
  routeName: 'podcasts',
  visibility: 'public',
  author: 'Moldable',
  window: { titlebar: 'app', nativeMaterial: { background: true } },
  mobile: { type: 'mobile-web', path: 'dist-mobile' },
  moldableDependencies: {
    '@moldable-ai/ui': '^0.2.59',
    '@moldable-ai/storage': '^0.1.8',
  },
  env: [],
  vault: [
    {
      key: 'OPENAI_API_KEY',
      name: 'OpenAI API Key',
      description:
        'Creates podcast narration with OpenAI TTS and episode artwork with GPT Image 2 when Moldable image authentication is unavailable. API usage is billed separately from ChatGPT or Codex subscriptions. Your key stays in aivault.',
      url: 'https://platform.openai.com/api-keys',
      required: true,
      capabilities: ['openai/speech', 'openai/image-generation'],
    },
  ],
  appApi: {
    version: 1,
    capabilities: [
      {
        id: 'podcasts.episodes',
        name: 'Personal podcasts',
        description:
          'Create and listen to private, on-demand podcasts. Use episodes.generate to turn a topic and requested length into a script, narration and artwork asynchronously. The app writes through Moldable’s LLM service and uses one OpenAI narrator. For researched content, the conversation agent can research and supply its own complete script to episodes.create. In-app writing has no live research tools. No RSS, publishing or sharing. Both creation methods immediately return a status card. Playback appears only after audio is saved. Never claim completion or an exact duration until episodes.get reports ready. Present existing episodes without regenerating them.',
        scopes: [
          scope(
            'queue.get',
            'Read generation queue',
            'Read active episodes and generation failures for this workspace, independent of library search or archive filters.',
            z.object({}).strict(),
          ),
          scope(
            'settings.get',
            'Read podcast preferences',
            'Read the narration voice and default episode length saved for this workspace. Length defaults to 5 minutes.',
            z.object({}).strict(),
          ),
          scope(
            'settings.update',
            'Save podcast preferences',
            'Update narration voice or default length (5, 10 or 20 minutes) for this workspace. Omitted preferences are preserved. Existing episodes keep their original choices.',
            settingsUpdateSchema,
            'low',
            true,
          ),
          scope(
            'episodes.generate',
            'Generate a podcast from a topic',
            'Save a topic and desired length (5, 10 or 20 minutes), then write and narrate sections concurrently in the background. The requested length becomes the default for subsequent generations. Uses the workspace’s saved voice unless voice is supplied; an explicit voice becomes the preference for subsequent generations. Returns an episode ID and live appCard immediately. Completed audio is playable while later sections generate; the player waits and resumes if it catches up. Use a stable requestId for transport retries. Writing uses Moldable’s LLM service without live web research. Use episodes.create with your researched script when current facts or verified sources are needed. Do not wait inside the RPC or claim full completion until episodes.get reports ready.',
            generateEpisodeSchema,
            'important',
            true,
          ),
          scope(
            'episodes.list',
            'Find episodes',
            'List and search saved episodes. Results are paged, newest first. Does not generate audio.',
            listSchema,
          ),
          scope(
            'episodes.get',
            'Read episode',
            'Read current status, measured duration, script, sources and audio asset references. Poll until ready when waiting for generation. Never sends binary audio in chat.',
            recordSchema,
          ),
          scope(
            'episodes.create',
            'Create a podcast episode',
            'Save a complete spoken script and queue paid OpenAI narration. Supply a stable requestId and reuse it for transport retries; the same ID and content return the existing episode. Exactly one speaker, 50,000 narration characters total. Do not include stage directions, speaker labels or markdown in spoken text. Suggested voice: marin. Returns an appCard immediately; it updates as audio is generated. Include source URLs for factual research. A 10-minute episode needs roughly 1,500 spoken words. All input text is sent to OpenAI. After narration, a square thumbnail is generated automatically from the title and description using the same image service as Images. Artwork failure does not discard audio.',
            createEpisodeSchema,
            'important',
            true,
          ),
          scope(
            'cards.present',
            'Show an episode player in chat',
            'Present a compact player with play/pause, seeking, 15-second skips and speed. Expanded view shows transcript and sources. Does not generate or automatically play audio.',
            recordSchema,
          ),
          scope(
            'cards.read',
            'Read a podcast card',
            'Read the selected episode and its current audio asset references without changing it.',
            recordSchema,
          ),
          scope(
            'playback.update',
            'Save listening progress',
            'Record a user playback interaction and resume position. Actual playback belongs to the observer; this never starts another client’s audio.',
            playbackSchema,
            'low',
            true,
          ),
          scope(
            'episodes.retry',
            'Retry unfinished generation',
            'Explicitly retry a failed or cancelled episode using its current revision. Resumes from its saved outline, completed written sections and completed audio. An interrupted provider request may be charged again. Never retry automatically.',
            revisionSchema,
            'important',
            true,
          ),
          scope(
            'episodes.retryArtwork',
            'Retry episode artwork',
            'Generate missing or failed artwork for a completed episode. Reuses all saved audio. An interrupted image request may be charged again. Never retry automatically.',
            revisionSchema,
            'important',
            true,
          ),
          scope(
            'episodes.cancel',
            'Stop generation',
            'Stop queued or running generation. Finished audio remains available. An in-flight request may already have been billed.',
            revisionSchema,
            'low',
            true,
          ),
          scope(
            'episodes.delete',
            'Delete an archived episode',
            'Permanently delete an archived episode, including its transcript, audio and artwork. Requires explicit user intent and the current revision. Existing cards become unavailable; active generation stops.',
            revisionSchema,
            'important',
            true,
          ),
          scope(
            'episodes.archive',
            'Archive or restore an episode',
            'Hide an episode from the library or restore it. Audio and existing chat cards are preserved.',
            revisionSchema.extend({ archived: z.boolean() }),
            'low',
            true,
          ),
        ],
      },
    ],
  },
}
await writeFile('moldable.json', JSON.stringify(manifest, null, 2) + '\n')
