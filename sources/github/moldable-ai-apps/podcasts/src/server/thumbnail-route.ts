import { idSchema } from '../shared/podcast'
import { PodcastError } from './errors'
import type { EpisodeStore } from './store'
import type { Context } from 'hono'
import { readFile } from 'node:fs/promises'

export async function thumbnailResponse(
  c: Context,
  store: EpisodeStore,
): Promise<Response> {
  const id = idSchema.parse(c.req.param('id'))
  if (store.get(id).thumbnail?.status !== 'ready')
    throw new PodcastError(
      'artwork_not_ready',
      'Episode artwork is not available.',
      404,
    )
  const bytes = await readFile(store.thumbnailFile(id)).catch(() => null)
  if (!bytes)
    throw new PodcastError(
      'artwork_not_found',
      'The saved artwork is missing.',
      404,
    )
  return new Response(c.req.method === 'HEAD' ? null : new Uint8Array(bytes), {
    headers: {
      'Content-Type': 'image/jpeg',
      'Content-Length': String(bytes.length),
      'Cache-Control': 'private, max-age=86400',
      'X-Content-Type-Options': 'nosniff',
    },
  })
}
