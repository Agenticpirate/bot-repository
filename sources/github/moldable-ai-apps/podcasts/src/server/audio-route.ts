import { idSchema } from '../shared/podcast'
import { PodcastError } from './errors'
import type { EpisodeStore } from './store'
import type { Context } from 'hono'
import { createReadStream } from 'node:fs'
import { stat } from 'node:fs/promises'
import { Readable } from 'node:stream'

export function byteRange(
  header: string | undefined,
  size: number,
): { start: number; end: number } | null {
  if (!header) return null
  const match = /^bytes=(\d*)-(\d*)$/.exec(header)
  if (!match || (!match[1] && !match[2])) throw new Error('Invalid byte range')
  const suffix = !match[1]
  const start = suffix ? Math.max(0, size - Number(match[2])) : Number(match[1])
  const end =
    suffix || !match[2] ? size - 1 : Math.min(Number(match[2]), size - 1)
  if (
    !Number.isSafeInteger(start) ||
    !Number.isSafeInteger(end) ||
    start < 0 ||
    start > end ||
    start >= size
  )
    throw new Error('Unsatisfiable byte range')
  return { start, end }
}

export async function audioResponse(
  c: Context,
  store: EpisodeStore,
): Promise<Response> {
  const id = idSchema.parse(c.req.param('id'))
  const match = /^(\d{1,3})\.mp3$/.exec(c.req.param('file') ?? '')
  if (!match) throw new PodcastError('audio_not_found', 'Audio not found.', 404)
  const index = Number(match[1])
  const part = store.get(id).parts[index]
  if (!part || part.durationSeconds === null)
    throw new PodcastError(
      'audio_not_ready',
      'This audio part is not ready yet.',
      404,
    )
  const file = store.audioFile(id, index)
  const info = await stat(file).catch(() => null)
  if (!info?.isFile())
    throw new PodcastError(
      'audio_not_found',
      'The saved audio file is missing.',
      404,
    )
  const headers: Record<string, string> = {
    'Content-Type': 'audio/mpeg',
    'Accept-Ranges': 'bytes',
    'Cache-Control': 'private, max-age=86400',
    'X-Content-Type-Options': 'nosniff',
  }
  let range: ReturnType<typeof byteRange>
  try {
    range = byteRange(c.req.header('range'), info.size)
  } catch {
    return new Response(null, {
      status: 416,
      headers: { ...headers, 'Content-Range': `bytes */${info.size}` },
    })
  }
  const start = range?.start ?? 0
  const end = range?.end ?? info.size - 1
  headers['Content-Length'] = String(end - start + 1)
  if (range) headers['Content-Range'] = `bytes ${start}-${end}/${info.size}`
  const body =
    c.req.method === 'HEAD'
      ? null
      : (Readable.toWeb(
          createReadStream(file, { start, end }),
        ) as ReadableStream<Uint8Array>)
  return new Response(body, { status: range ? 206 : 200, headers })
}
