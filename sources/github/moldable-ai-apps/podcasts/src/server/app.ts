import {
  createEpisodeSchema,
  generateEpisodeSchema,
  idSchema,
  listSchema,
  playbackSchema,
  recordSchema,
  revisionSchema,
  settingsUpdateSchema,
  summarizeEpisode,
} from '../shared/podcast'
import { audioResponse } from './audio-route'
import { PodcastError } from './errors'
import { PodcastRuntime, workspaceFor } from './runtime'
import { thumbnailResponse } from './thumbnail-route'
import { Hono } from 'hono'
import { bodyLimit } from 'hono/body-limit'
import { z } from 'zod'

export function episodeCard(id: string, title: string) {
  return {
    version: 1 as const,
    title,
    resourcePath: '/index.html?card=episode',
    input: { id },
    readMethod: 'podcasts.cards.read',
    actions: [
      {
        id: 'retry-artwork',
        label: 'Retry episode artwork',
        method: 'podcasts.episodes.retryArtwork',
      },
      {
        id: 'playback',
        label: 'Update listening progress',
        method: 'podcasts.playback.update',
      },
      {
        id: 'retry',
        label: 'Retry unfinished narration',
        method: 'podcasts.episodes.retry',
      },
      {
        id: 'cancel',
        label: 'Stop generating episode',
        method: 'podcasts.episodes.cancel',
      },
    ],
    height: 340,
  }
}

const rpcSchema = z
  .object({
    method: z.string().max(100),
    params: z.record(z.string(), z.unknown()).default({}),
  })
  .strict()

export function createApp(runtime: PodcastRuntime) {
  const app = new Hono()
  app.use(
    '/api/*',
    bodyLimit({
      maxSize: 256 * 1024,
      onError: (c) =>
        c.json(
          {
            ok: false,
            error: {
              code: 'request_too_large',
              message:
                'This script is too large. Keep narration under 50,000 characters.',
            },
          },
          413,
        ),
    }),
  )
  app.onError((error, c) => {
    if (error instanceof z.ZodError)
      return c.json(
        {
          ok: false,
          error: {
            code: 'invalid_input',
            message: error.issues
              .map((issue) => `${issue.path.join('.')}: ${issue.message}`)
              .join('; ')
              .slice(0, 1500),
          },
        },
        400,
      )
    if (error instanceof PodcastError)
      return c.json(
        { ok: false, error: { code: error.code, message: error.message } },
        error.status,
      )
    console.error(
      'Podcasts request failed:',
      error instanceof Error ? error.name : 'Unknown error',
    )
    return c.json(
      {
        ok: false,
        error: {
          code: 'internal_error',
          message:
            'Podcasts could not complete this request. Please try again.',
        },
      },
      500,
    )
  })
  app.get('/api/moldable/health', (c) =>
    c.json({ appId: 'podcasts', status: 'ok' }),
  )
  app.get('/api/moldable/today', (c) =>
    c.json({ items: [], resume: null, generatedAt: new Date().toISOString() }),
  )
  app.get('/api/episodes', (c) => {
    const { store } = runtime.forWorkspace(workspaceFor(c))
    return c.json(
      store.list(
        listSchema.parse({
          query: c.req.query('query') ?? '',
          archived: c.req.query('archived') === 'true',
          offset: Number(c.req.query('offset') ?? 0),
        }),
      ),
    )
  })
  app.get('/api/episodes/:id', (c) =>
    c.json(
      runtime
        .forWorkspace(workspaceFor(c))
        .store.view(idSchema.parse(c.req.param('id'))),
    ),
  )
  app.on(['GET', 'HEAD'], '/api/episodes/:id/audio/:file', (c) =>
    audioResponse(c, runtime.forWorkspace(workspaceFor(c)).store),
  )

  app.on(['GET', 'HEAD'], '/api/episodes/:id/thumbnail.jpg', (c) =>
    thumbnailResponse(c, runtime.forWorkspace(workspaceFor(c)).store),
  )

  // Full app and both chat clients use the same operations and authoritative store.
  app.post('/api/moldable/rpc', async (c) => {
    const { method, params } = rpcSchema.parse(await c.req.json())
    const { store, queue } = runtime.forWorkspace(workspaceFor(c))
    if (method === 'podcasts.queue.get')
      return c.json({ ok: true, result: store.generationQueue() })
    if (method === 'podcasts.settings.get')
      return c.json({ ok: true, result: store.settings() })
    if (method === 'podcasts.settings.update')
      return c.json({
        ok: true,
        result: store.saveSettings(settingsUpdateSchema.parse(params)),
      })
    if (method === 'podcasts.episodes.list')
      return c.json({ ok: true, result: store.list(params) })
    if (
      method === 'podcasts.episodes.create' ||
      method === 'podcasts.episodes.generate'
    ) {
      const caller = (c.req.header('x-moldable-caller-id') ?? 'podcasts').slice(
        0,
        128,
      )
      const episode =
        method === 'podcasts.episodes.generate'
          ? store.generate(generateEpisodeSchema.parse(params), caller)
          : store.create(createEpisodeSchema.parse(params), caller)
      queue.pump()
      return c.json({
        ok: true,
        result: {
          episode: summarizeEpisode(episode),
          appCard: episodeCard(episode.id, episode.title),
          message:
            'The episode is saved and generation is queued. The card shows progress and becomes playable when ready. Read episodes.get to check completion; do not claim it is ready yet.',
        },
      })
    }
    if (
      method === 'podcasts.episodes.get' ||
      method === 'podcasts.cards.read'
    ) {
      const { id } = recordSchema.parse(params)
      return c.json({ ok: true, result: store.view(id) })
    }
    if (method === 'podcasts.cards.present') {
      const { id } = recordSchema.parse(params)
      const episode = store.get(id)
      return c.json({
        ok: true,
        result: { appCard: episodeCard(id, episode.title) },
      })
    }
    if (method === 'podcasts.playback.update') {
      const input = playbackSchema.parse(params)
      const episode = store.savePlayback(
        input.id,
        input.positionSeconds,
        input.speed,
      )
      return c.json({ ok: true, result: { playback: episode.playback } })
    }
    if (method === 'podcasts.episodes.retryArtwork') {
      const { id, expectedRevision } = revisionSchema.parse(params)
      const episode = store.change(id, expectedRevision, (record) => {
        if (record.status !== 'ready' || record.thumbnail?.status === 'ready')
          throw new PodcastError(
            'artwork_not_retryable',
            'Only missing artwork for a completed episode can be retried.',
            409,
          )
        record.thumbnail = { status: 'queued', error: null }
        record.status = 'queued'
      })
      queue.pump()
      return c.json({ ok: true, result: store.summarize(episode) })
    }
    if (method === 'podcasts.episodes.retry') {
      const { id, expectedRevision } = revisionSchema.parse(params)
      const episode = store.change(id, expectedRevision, (record) => {
        if (record.status !== 'failed' && record.status !== 'cancelled')
          throw new PodcastError(
            'not_retryable',
            'Only interrupted or failed episodes can be retried.',
            409,
          )
        record.status = 'queued'
        record.error = null
      })
      queue.pump()
      return c.json({ ok: true, result: summarizeEpisode(episode) })
    }
    if (method === 'podcasts.episodes.cancel') {
      const { id, expectedRevision } = revisionSchema.parse(params)
      const episode = store.change(id, expectedRevision, (record) => {
        if (record.status !== 'queued' && record.status !== 'generating')
          throw new PodcastError(
            'not_generating',
            'This episode is no longer generating.',
            409,
          )
        record.status = 'cancelled'
        if (record.thumbnail?.status === 'generating')
          record.thumbnail = {
            status: 'failed',
            error: {
              code: 'artwork_cancelled',
              message: 'Artwork generation stopped.',
            },
          }
        record.error = {
          code: 'cancelled',
          message:
            'Generation stopped. Completed audio is saved. Retry resumes the remaining parts.',
        }
      })
      queue.cancel(id)
      return c.json({ ok: true, result: summarizeEpisode(episode) })
    }
    if (method === 'podcasts.episodes.delete') {
      const { id, expectedRevision } = revisionSchema.parse(params)
      store.deleteArchived(id, expectedRevision)
      queue.cancel(id)
      return c.json({ ok: true, result: { id, deleted: true } })
    }
    if (method === 'podcasts.episodes.archive') {
      const input = revisionSchema
        .extend({ archived: z.boolean() })
        .parse(params)
      const episode = store.change(
        input.id,
        input.expectedRevision,
        (record) => {
          record.archived = input.archived
        },
      )
      return c.json({ ok: true, result: summarizeEpisode(episode) })
    }
    throw new PodcastError('unknown_method', 'Unknown Podcasts method.', 404)
  })
  return app
}

export const runtime = new PodcastRuntime()
export const app = createApp(runtime)
