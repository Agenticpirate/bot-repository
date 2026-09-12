import { locatePosition, playableParts } from '../client/lib/playback'
import {
  type EpisodeView,
  createEpisodeSchema,
  splitScript,
} from '../shared/podcast'
import { createApp } from './app'
import type { GenerateArtwork } from './artwork'
import { PodcastError } from './errors'
import { PodcastRuntime } from './runtime'
import type { WriteScript } from './script'
import { type SynthesizeSpeech, inspectSpeechAudio, speechArgs } from './speech'
import { mkdtemp, readFile, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { afterEach, describe, expect, it, vi } from 'vitest'

const input = () =>
  createEpisodeSchema.parse({
    requestId: 'test-request',
    title: 'A real topic',
    speakers: [{ id: 'alex', name: 'Alex', voice: 'marin' }],
    script: [
      { speakerId: 'alex', text: 'First turn.' },
      { speakerId: 'alex', text: 'Second turn.' },
    ],
  })
const resources: PodcastRuntime[] = []
afterEach(async () => {
  for (const runtime of resources.splice(0)) {
    await runtime.close()
    await rm(runtime.home, { recursive: true, force: true })
  }
})
async function setup(
  synthesize: SynthesizeSpeech = async () => ({
    bytes: Buffer.from('ID3test-audio'),
    durationSeconds: 10,
  }),
  artwork: GenerateArtwork = async () => Buffer.from('test-artwork'),
  script?: WriteScript,
) {
  const runtime = new PodcastRuntime(
    await mkdtemp(path.join(tmpdir(), 'podcasts-test-')),
    synthesize,
    artwork,
    script,
  )
  resources.push(runtime)
  const app = createApp(runtime)
  const rpc = (
    method: string,
    params: unknown,
    workspace = 'personal',
    mobile = false,
  ) =>
    app.request('/api/moldable/rpc', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        [mobile ? 'x-moldable-workspace-id' : 'x-moldable-workspace']:
          workspace,
      },
      body: JSON.stringify({ method, params }),
    })
  return { runtime, app, rpc, ...runtime.forWorkspace('personal') }
}

describe('shared desktop, mobile and card contract', () => {
  it('deletes only archived episodes at the current revision and removes their assets and card data across clients', async () => {
    const { rpc, queue, store, app } = await setup()
    const created = (
      await (await rpc('podcasts.episodes.create', input())).json()
    ).result.episode
    await queue.idle()
    const id = created.id as string
    const view = store.view(id)
    const initial = { id, expectedRevision: view.revision }
    expect((await rpc('podcasts.episodes.delete', initial)).status).toBe(409)
    expect(
      (await rpc('podcasts.episodes.delete', initial, 'other', true)).status,
    ).toBe(404)
    await rpc('podcasts.episodes.archive', { ...initial, archived: true })
    expect((await rpc('podcasts.episodes.delete', initial)).status).toBe(409)
    const deletion = { id, expectedRevision: store.get(id).revision }
    expect(
      (await rpc('podcasts.episodes.delete', deletion, 'personal', true))
        .status,
    ).toBe(200)
    expect((await rpc('podcasts.episodes.delete', deletion)).status).toBe(200)
    expect((await rpc('podcasts.episodes.get', { id })).status).toBe(404)
    expect(
      (await rpc('podcasts.cards.read', { id }, 'personal', true)).status,
    ).toBe(404)
    expect((await app.request(view.parts[0]!.audioPath!)).status).toBe(404)
    expect((await app.request(view.thumbnailPath!)).status).toBe(404)
    await expect(readFile(store.audioFile(id, 0))).rejects.toThrow()
    await expect(readFile(store.thumbnailFile(id))).rejects.toThrow()
    expect(store.list({ archived: true }).items).toEqual([])
    expect(store.claim(id, 'late-worker')).toBeNull()
    expect((await rpc('podcasts.episodes.create', input())).status).toBe(410)
    expect(store.queuedIds()).toEqual([])
  })

  it('revokes active generation before deleting and cannot publish a late provider result', async () => {
    let release!: () => void
    let entered!: () => void
    const started = new Promise<void>((resolve) => {
      entered = resolve
    })
    const waiting = new Promise<void>((resolve) => {
      release = resolve
    })
    const { rpc, queue, store } = await setup(async () => {
      entered()
      await waiting
      return { bytes: Buffer.from('late audio'), durationSeconds: 10 }
    })
    const created = (
      await (await rpc('podcasts.episodes.create', input())).json()
    ).result.episode
    await started
    await rpc('podcasts.episodes.archive', {
      id: created.id,
      expectedRevision: store.get(created.id).revision,
      archived: true,
    })
    expect(
      (
        await rpc('podcasts.episodes.delete', {
          id: created.id,
          expectedRevision: store.get(created.id).revision,
        })
      ).status,
    ).toBe(200)
    release()
    await queue.idle()
    expect(store.generationQueue().activeCount).toBe(0)
    await expect(readFile(store.audioFile(created.id, 0))).rejects.toThrow()
    expect(() => store.get(created.id)).toThrow()
  })

  it('persists workspace defaults across clients and restarts', async () => {
    const { rpc, runtime } = await setup()
    expect(
      (await (await rpc('podcasts.settings.get', {})).json()).result,
    ).toEqual({ voice: 'marin', minutes: 5 })
    expect(
      (await rpc('podcasts.settings.update', { voice: 'not-a-voice' })).status,
    ).toBe(400)
    await rpc(
      'podcasts.settings.update',
      { voice: 'cedar', minutes: 10 },
      'personal',
      true,
    )
    expect(
      (await (await rpc('podcasts.settings.get', {})).json()).result,
    ).toEqual({ voice: 'cedar', minutes: 10 })
    expect(
      (await (await rpc('podcasts.settings.get', {}, 'other', true)).json())
        .result,
    ).toEqual({ voice: 'marin', minutes: 5 })
    await runtime.close()
    resources.splice(resources.indexOf(runtime), 1)
    const restarted = new PodcastRuntime(runtime.home)
    resources.push(restarted)
    expect(restarted.forWorkspace('personal').store.settings()).toEqual({
      voice: 'cedar',
      minutes: 10,
    })
  })

  it('remembers the last new episode length, preserves it on voice changes, and ignores duplicate requests', async () => {
    const { store, rpc } = await setup()
    store.db
      .prepare('INSERT INTO workspace_settings(id, document) VALUES (1, ?)')
      .run(JSON.stringify({ voice: 'cedar' }))
    expect(store.settings()).toEqual({ voice: 'cedar', minutes: 5 })
    const first = {
      requestId: 'long-episode',
      topic: 'Stars',
      minutes: 20 as const,
    }
    store.generate(first, 'test')
    expect(store.settings()).toEqual({ voice: 'cedar', minutes: 20 })
    await rpc('podcasts.settings.update', { voice: 'coral' }, 'personal', true)
    expect(store.settings()).toEqual({ voice: 'coral', minutes: 20 })
    store.generate(
      { requestId: 'short-episode', topic: 'Birds', minutes: 10 },
      'test',
    )
    store.generate(first, 'test')
    expect(store.settings()).toEqual({ voice: 'coral', minutes: 10 })
    expect((await rpc('podcasts.settings.update', { minutes: 7 })).status).toBe(
      400,
    )
    expect(
      (await (await rpc('podcasts.settings.get', {}, 'other', true)).json())
        .result.minutes,
    ).toBe(5)
  })

  it('freezes the requested voice through writing and retry without duplicate requests changing preferences', async () => {
    const writer = vi.fn<WriteScript>(async () => input())
    const speech = vi
      .fn<SynthesizeSpeech>()
      .mockRejectedValueOnce(new PodcastError('speech_failed', 'Try again.'))
      .mockResolvedValue({ bytes: Buffer.from('audio'), durationSeconds: 10 })
    const { rpc, queue, store } = await setup(speech, undefined, writer)
    const params = {
      requestId: 'voice-snapshot',
      topic: 'Time',
      minutes: 5,
      voice: 'cedar',
    }
    const created = (
      await (await rpc('podcasts.episodes.generate', params)).json()
    ).result.episode
    await queue.idle()
    expect(store.settings()).toEqual({ voice: 'cedar', minutes: 5 })
    expect(store.get(created.id).speakers[0]?.voice).toBe('cedar')
    await rpc('podcasts.settings.update', { voice: 'coral' })
    const duplicate = (
      await (await rpc('podcasts.episodes.generate', params)).json()
    ).result.episode
    expect(duplicate.id).toBe(created.id)
    expect(store.settings()).toEqual({ voice: 'coral', minutes: 5 })
    await rpc(
      'podcasts.episodes.retry',
      { id: created.id, expectedRevision: store.get(created.id).revision },
      'personal',
      true,
    )
    await queue.idle()
    expect(store.get(created.id).status).toBe('ready')
    expect(
      speech.mock.calls.every(([request]) => request.speaker.voice === 'cedar'),
    ).toBe(true)
    expect(writer).toHaveBeenCalledOnce()
    const next = store.generate(
      { requestId: 'next-voice', topic: 'Space', minutes: 5 },
      'test',
    )
    expect(next.speakers[0]?.voice).toBe('coral')
  })

  it('shows archived active jobs and unarchived failures in the same bounded queue on both clients', async () => {
    const { rpc, store } = await setup()
    const first = store.create(input(), 'test')
    store.change(first.id, first.revision, (episode) => {
      episode.archived = true
    })
    const failed = store.create({ ...input(), requestId: 'failed' }, 'test')
    store.change(failed.id, failed.revision, (episode) => {
      episode.status = 'failed'
    })
    const desktop = await (await rpc('podcasts.queue.get', {})).json()
    const mobile = await (
      await rpc('podcasts.queue.get', {}, 'personal', true)
    ).json()
    expect(mobile).toEqual(desktop)
    expect(desktop.result.activeCount).toBe(1)
    expect(desktop.result.items.map((item: EpisodeView) => item.id)).toEqual([
      first.id,
      failed.id,
    ])
    store.change(failed.id, store.get(failed.id).revision, (episode) => {
      episode.archived = true
    })
    expect(store.generationQueue().items.map((item) => item.id)).toEqual([
      first.id,
    ])
    expect(
      (await (await rpc('podcasts.queue.get', {}, 'other', true)).json())
        .result,
    ).toEqual({ items: [], activeCount: 0 })
  })

  it('resumes a saved writing section and reuses its audio after a later writing failure', async () => {
    const first = {
      title: 'A story',
      description: '',
      outline: ['First', 'Last'],
      sections: [['The first section.']],
    }
    let calls = 0
    const writer: WriteScript = async ({ draft, checkpoint }) => {
      if (++calls === 1) {
        checkpoint?.(first)
        throw new PodcastError(
          'script_generation_failed',
          'Later writing failed.',
        )
      }
      expect(draft).toEqual(first)
      const full = {
        ...first,
        sections: [...first.sections, ['The last section.']],
      }
      checkpoint?.(full)
      return createEpisodeSchema.parse({
        requestId: 'written',
        title: first.title,
        speakers: [{ id: 'narrator', name: 'Marin', voice: 'marin' }],
        script: full.sections
          .flat()
          .map((text) => ({ speakerId: 'narrator', text })),
      })
    }
    const speech = vi.fn<SynthesizeSpeech>(async () => ({
      bytes: Buffer.from('audio'),
      durationSeconds: 10,
    }))
    const { rpc, store, queue } = await setup(speech, undefined, writer)
    const created = await (
      await rpc('podcasts.episodes.generate', {
        requestId: 'partial-retry',
        topic: 'A story',
        minutes: 10,
      })
    ).json()
    const id = created.result.episode.id as string
    await queue.idle()
    expect(store.view(id)).toMatchObject({
      status: 'failed',
      completedParts: 1,
      creation: { scriptReady: false, completedSections: 1 },
    })
    const audio = await readFile(store.audioFile(id, 0))
    await rpc('podcasts.episodes.retry', {
      id,
      expectedRevision: store.get(id).revision,
    })
    await queue.idle()
    expect(store.view(id)).toMatchObject({
      status: 'ready',
      completedParts: 2,
    })
    expect(await readFile(store.audioFile(id, 0))).toEqual(audio)
    expect(speech).toHaveBeenCalledTimes(2)
  })

  it('publishes early section audio while writing continues and preserves it through completion', async () => {
    let release!: () => void
    const waiting = new Promise<void>((resolve) => {
      release = resolve
    })
    const draft = {
      title: 'A story',
      description: '',
      outline: ['First', 'Last'],
      sections: [['The first section.']],
    }
    const writer: WriteScript = async ({ checkpoint, signal }) => {
      checkpoint?.(draft)
      await Promise.race([
        waiting,
        new Promise<void>((resolve) =>
          signal.addEventListener('abort', () => resolve(), { once: true }),
        ),
      ])
      signal.throwIfAborted()
      checkpoint?.({
        ...draft,
        sections: [...draft.sections, ['The last section.']],
      })
      return createEpisodeSchema.parse({
        requestId: 'written',
        title: draft.title,
        speakers: [{ id: 'narrator', name: 'Marin', voice: 'marin' }],
        script: ['The first section.', 'The last section.'].map((text) => ({
          speakerId: 'narrator',
          text,
        })),
      })
    }
    const speech = vi.fn<SynthesizeSpeech>(async ({ text }) => ({
      bytes: Buffer.from(text),
      durationSeconds: 10,
    }))
    const { rpc, queue, store } = await setup(speech, undefined, writer)
    const created = await (
      await rpc('podcasts.episodes.generate', {
        requestId: 'progressive',
        topic: 'A story',
        minutes: 10,
      })
    ).json()
    const id = created.result.episode.id as string
    await vi.waitFor(() => expect(store.view(id).completedParts).toBe(1))
    const early = store.view(id)
    expect(early).toMatchObject({
      status: 'generating',
      creation: { scriptReady: false, completedSections: 1, totalSections: 2 },
      durationSeconds: 10,
    })
    expect(early.creation).not.toHaveProperty('draft')
    const desktop = await (await rpc('podcasts.episodes.get', { id })).json()
    const mobile = await (
      await rpc('podcasts.cards.read', { id }, 'personal', true)
    ).json()
    expect(mobile).toEqual(desktop)
    const firstAudio = await readFile(store.audioFile(id, 0))
    release()
    await queue.idle()
    expect(store.view(id)).toMatchObject({
      status: 'ready',
      completedParts: 2,
      durationSeconds: 20,
    })
    expect(await readFile(store.audioFile(id, 0))).toEqual(firstAudio)
    expect(speech).toHaveBeenCalledTimes(2)
  })

  it('returns a topic episode before writing finishes and shares its writing state across clients', async () => {
    let release!: (script: ReturnType<typeof input>) => void
    const waiting = new Promise<ReturnType<typeof input>>((resolve) => {
      release = resolve
    })
    const writer = vi.fn<WriteScript>(() => waiting)
    const speech = vi.fn<SynthesizeSpeech>(async () => ({
      bytes: Buffer.from('audio'),
      durationSeconds: 10,
    }))
    const { rpc, queue, store } = await setup(speech, undefined, writer)
    const params = {
      requestId: 'topic-request',
      topic: 'Why do songs get stuck in your head?',
      minutes: 5,
    }
    const created = await (
      await rpc('podcasts.episodes.generate', params)
    ).json()
    const id = created.result.episode.id as string
    expect(created.result.appCard.readMethod).toBe('podcasts.cards.read')
    const desktop = await (await rpc('podcasts.episodes.get', { id })).json()
    const mobile = await (
      await rpc('podcasts.cards.read', { id }, 'personal', true)
    ).json()
    expect(mobile).toEqual(desktop)
    expect(desktop.result).toMatchObject({
      status: 'generating',
      totalParts: 0,
      creation: { scriptReady: false },
    })
    const duplicate = await (
      await rpc('podcasts.episodes.generate', params, 'personal', true)
    ).json()
    expect(duplicate.result.episode.id).toBe(id)
    await vi.waitFor(() => expect(writer).toHaveBeenCalledOnce())
    expect(speech).not.toHaveBeenCalled()
    expect((await rpc('podcasts.episodes.get', { id }, 'other')).status).toBe(
      404,
    )
    release(input())
    await queue.idle()
    expect(store.view(id)).toMatchObject({
      status: 'ready',
      creation: { scriptReady: true },
      title: 'A real topic',
      durationSeconds: 20,
    })
    expect(writer.mock.calls[0]?.[0]).toMatchObject({
      workspaceId: 'personal',
      topic: params.topic,
      minutes: 5,
    })
    const present = await (
      await rpc('podcasts.cards.present', { id }, 'personal', true)
    ).json()
    expect(present.result.appCard.input).toEqual({ id })
    expect(writer).toHaveBeenCalledOnce()
  })

  it('saves writing before narration so retry does not rewrite the episode', async () => {
    const writer = vi.fn<WriteScript>(async () => input())
    const speech = vi
      .fn<SynthesizeSpeech>()
      .mockRejectedValueOnce(
        new PodcastError('speech_failed', 'Speech failed.'),
      )
      .mockResolvedValue({ bytes: Buffer.from('audio'), durationSeconds: 10 })
    const { rpc, queue, store } = await setup(speech, undefined, writer)
    const created = await (
      await rpc('podcasts.episodes.generate', {
        requestId: 'retry-writing',
        topic: 'Time',
        minutes: 10,
      })
    ).json()
    const id = created.result.episode.id as string
    await queue.idle()
    expect(store.get(id)).toMatchObject({
      status: 'failed',
      creation: { scriptReady: true },
    })
    await rpc('podcasts.episodes.retry', {
      id,
      expectedRevision: store.get(id).revision,
    })
    await queue.idle()
    expect(store.get(id).status).toBe('ready')
    expect(writer).toHaveBeenCalledOnce()
  })

  it('cancels writing without publishing its late result or starting narration', async () => {
    let release!: (script: ReturnType<typeof input>) => void
    const waiting = new Promise<ReturnType<typeof input>>((resolve) => {
      release = resolve
    })
    const writer = vi.fn<WriteScript>(() => waiting)
    const speech = vi.fn<SynthesizeSpeech>()
    const { rpc, queue, store } = await setup(speech, undefined, writer)
    const created = await (
      await rpc('podcasts.episodes.generate', {
        requestId: 'cancel-writing',
        topic: 'Time',
        minutes: 20,
      })
    ).json()
    const id = created.result.episode.id as string
    await rpc(
      'podcasts.episodes.cancel',
      { id, expectedRevision: store.get(id).revision },
      'personal',
      true,
    )
    release(input())
    await queue.idle()
    expect(store.get(id)).toMatchObject({
      status: 'cancelled',
      creation: { scriptReady: false },
      parts: [],
    })
    expect(speech).not.toHaveBeenCalled()
  })

  it('rejects multi-speaker creation before queueing paid work', async () => {
    const { rpc, store } = await setup()
    const params = input()
    params.speakers.push({
      ...params.speakers[0]!,
      id: 'other',
      name: 'Other',
      voice: 'cedar',
    })
    expect((await rpc('podcasts.episodes.create', params)).status).toBe(400)
    expect(store.queuedIds()).toEqual([])
  })

  it('creates once, narrates each segment, reads without paid work, serves ranges, and isolates workspaces', async () => {
    const speech = vi.fn<SynthesizeSpeech>(async () => ({
      bytes: Buffer.from('ID3test-audio'),
      durationSeconds: 10,
    }))
    const { rpc, queue, app, store } = await setup(speech)
    const created = await (
      await rpc('podcasts.episodes.create', input())
    ).json()
    const id = created.result.episode.id as string
    expect(created.result.appCard).toMatchObject({
      version: 1,
      input: { id },
      readMethod: 'podcasts.cards.read',
      resourcePath: '/index.html?card=episode',
    })
    const repeated = await (
      await rpc('podcasts.episodes.create', input())
    ).json()
    expect(repeated.result.episode.id).toBe(id)
    expect(
      (await rpc('podcasts.episodes.create', { ...input(), title: 'Changed' }))
        .status,
    ).toBe(409)
    await queue.idle()
    const desktop = await (await rpc('podcasts.episodes.get', { id })).json()
    const mobile = await (
      await rpc('podcasts.cards.read', { id }, 'personal', true)
    ).json()
    expect(mobile).toEqual(desktop)
    expect(mobile.result.thumbnail).toMatchObject({ status: 'ready' })
    const thumbnail = await app.request(mobile.result.thumbnailPath)
    expect(thumbnail.headers.get('Content-Type')).toBe('image/jpeg')
    expect(await thumbnail.text()).toBe('test-artwork')
    expect(
      (
        await app.request(mobile.result.thumbnailPath, {
          headers: { 'x-moldable-workspace-id': 'other' },
        })
      ).status,
    ).toBe(404)
    expect(
      (
        await app.request(mobile.result.thumbnailPath, { method: 'HEAD' })
      ).headers.get('Content-Length'),
    ).toBe('12')

    expect(mobile.result).toMatchObject({
      status: 'ready',
      durationSeconds: 20,
      completedParts: 2,
    })
    expect(speech.mock.calls.map(([request]) => request.speaker.voice)).toEqual(
      ['marin', 'marin'],
    )
    expect(speech).toHaveBeenCalledTimes(2)
    expect(
      (await rpc('podcasts.cards.read', { id }, 'other', true)).status,
    ).toBe(404)
    const range = await app.request(mobile.result.parts[0].audioPath, {
      headers: { Range: 'bytes=3-6' },
    })
    expect(range.status).toBe(206)
    expect(range.headers.get('content-range')).toBe('bytes 3-6/13')
    expect(await range.text()).toBe('test')
    const suffix = await app.request(mobile.result.parts[0].audioPath, {
      headers: { Range: 'bytes=-5' },
    })
    expect(await suffix.text()).toBe('audio')
    expect(
      (
        await app.request(mobile.result.parts[0].audioPath, {
          headers: { Range: 'bytes=900-' },
        })
      ).status,
    ).toBe(416)
    const head = await app.request(mobile.result.parts[0].audioPath, {
      method: 'HEAD',
    })
    expect(await head.text()).toBe('')
    expect(
      (
        await app.request(mobile.result.parts[0].audioPath, {
          headers: { 'x-moldable-workspace-id': 'other' },
        })
      ).status,
    ).toBe(404)
    const revision = store.get(id).revision
    await rpc(
      'podcasts.playback.update',
      { id, positionSeconds: 15, speed: 1.5, event: 'pause' },
      'personal',
      true,
    )
    expect(store.get(id).revision).toBe(revision)
    expect(store.get(id).playback.positionSeconds).toBe(15)
    expect(store.list({ query: '%' }).items).toHaveLength(0)
    expect(store.list({ query: 'real' }).items).toHaveLength(1)
  })

  it('retries only unfinished audio and rejects stale revisions', async () => {
    let calls = 0
    const { rpc, queue, store } = await setup(async () => {
      if (++calls === 2)
        throw new PodcastError('rate_limit_exceeded', 'Wait and retry.')
      return { bytes: Buffer.from('ID3saved'), durationSeconds: 8 }
    })
    const created = await (
      await rpc('podcasts.episodes.create', input())
    ).json()
    const id = created.result.episode.id as string
    await queue.idle()
    const failed = store.get(id)
    expect(failed.status).toBe('failed')
    expect(failed.parts[0]?.durationSeconds).toBe(8)
    const first = await readFile(store.audioFile(id, 0))
    expect(
      (await rpc('podcasts.episodes.retry', { id, expectedRevision: 0 }))
        .status,
    ).toBe(409)
    expect(
      (
        await rpc('podcasts.episodes.retry', {
          id,
          expectedRevision: failed.revision,
        })
      ).status,
    ).toBe(200)
    await queue.idle()
    expect(store.get(id).status).toBe('ready')
    expect(calls).toBe(3)
    expect(await readFile(store.audioFile(id, 0))).toEqual(first)
  })

  it('cancels an in-flight provider result before publishing and resumes on explicit retry', async () => {
    let release!: () => void
    let entered!: () => void
    const began = new Promise<void>((resolve) => {
      entered = resolve
    })
    const waiting = new Promise<void>((resolve) => {
      release = resolve
    })
    let calls = 0
    const { rpc, queue, store } = await setup(async () => {
      if (++calls === 1) {
        entered()
        await waiting
      }
      return { bytes: Buffer.from(`audio-${calls}`), durationSeconds: 8 }
    })
    const created = await (
      await rpc('podcasts.episodes.create', input())
    ).json()
    const id = created.result.episode.id as string
    await began
    await rpc('podcasts.episodes.cancel', {
      id,
      expectedRevision: store.get(id).revision,
    })
    release()
    await queue.idle()
    expect(store.get(id).status).toBe('cancelled')
    expect(
      store.get(id).parts.every((part) => part.durationSeconds === null),
    ).toBe(true)
    await expect(readFile(store.audioFile(id, 0))).rejects.toThrow()
    await rpc('podcasts.episodes.retry', {
      id,
      expectedRevision: store.get(id).revision,
    })
    await queue.idle()
    expect(store.get(id).status).toBe('ready')
    expect((await readFile(store.audioFile(id, 0))).toString()).toBe('audio-2')
  })

  it('preserves playable audio when artwork fails and retries only the missing image', async () => {
    const speech = vi.fn<SynthesizeSpeech>(async () => ({
      bytes: Buffer.from('ID3test-audio'),
      durationSeconds: 10,
    }))
    const artwork = vi
      .fn<GenerateArtwork>()
      .mockRejectedValueOnce(
        new PodcastError('artwork_permission', 'Image access is missing.'),
      )
      .mockResolvedValueOnce(Buffer.from('thumbnail'))
    const { rpc, queue, store } = await setup(speech, artwork)
    const created = await (
      await rpc('podcasts.episodes.create', input())
    ).json()
    const id = created.result.episode.id as string
    await queue.idle()
    expect(store.view(id)).toMatchObject({
      status: 'ready',
      durationSeconds: 20,
      thumbnail: { status: 'failed' },
      thumbnailPath: null,
    })
    const firstAudio = await readFile(store.audioFile(id, 0))
    const retry = await rpc('podcasts.episodes.retryArtwork', {
      id,
      expectedRevision: store.get(id).revision,
    })
    expect(retry.status).toBe(200)
    await queue.idle()
    expect(store.view(id).thumbnail?.status).toBe('ready')
    expect(speech).toHaveBeenCalledTimes(2)
    expect(artwork).toHaveBeenCalledTimes(2)
    expect(await readFile(store.audioFile(id, 0))).toEqual(firstAudio)
    await rpc('podcasts.cards.read', { id })
    await rpc('podcasts.episodes.create', input())
    await queue.idle()
    expect(artwork).toHaveBeenCalledTimes(2)
  })

  it('does not publish artwork after cancellation, and keeps completed audio', async () => {
    let release!: () => void
    let entered!: () => void
    const began = new Promise<void>((resolve) => {
      entered = resolve
    })
    const waiting = new Promise<void>((resolve) => {
      release = resolve
    })
    const { rpc, queue, store } = await setup(undefined, async () => {
      entered()
      await waiting
      return Buffer.from('cancelled-image')
    })
    const created = await (
      await rpc('podcasts.episodes.create', input())
    ).json()
    const id = created.result.episode.id as string
    await began
    expect(store.view(id)).toMatchObject({
      durationSeconds: 20,
      thumbnail: { status: 'generating' },
    })
    await rpc('podcasts.episodes.cancel', {
      id,
      expectedRevision: store.get(id).revision,
    })
    release()
    await queue.idle()
    expect(store.view(id)).toMatchObject({
      status: 'cancelled',
      durationSeconds: 20,
      thumbnailPath: null,
    })
    await expect(readFile(store.thumbnailFile(id))).rejects.toThrow()
  })

  it('recovers stale leases without silently rebilling a request', async () => {
    const { store } = await setup()
    const episode = store.create(input(), 'test')
    store.claim(episode.id, 'old-process')
    store.recoverExpired(Date.now() + 200_000)
    expect(store.get(episode.id).status).toBe('failed')
    expect(
      store.updateOwned(episode.id, 'old-process', () => {
        throw new Error('must not run')
      }),
    ).toBe(false)
    expect(store.queuedIds()).toEqual([])
  })
})

describe('bounded narration and shared player timeline', () => {
  it('preserves speaker order and unicode while splitting long narration', () => {
    const script = [
      { speakerId: 'alex', text: '🌿'.repeat(1300) },
      { speakerId: 'jordan', text: 'Last sentence.' },
    ]
    const parts = splitScript(script)
    expect(
      parts.every(
        (part) => part.text.length <= 1800 && part.text.isWellFormed(),
      ),
    ).toBe(true)
    expect(
      parts
        .filter((part) => part.speakerId === 'alex')
        .map((part) => part.text)
        .join(''),
    ).toBe(script[0]?.text)
    expect(parts.at(-1)?.speakerId).toBe('jordan')
  })
  it('seeks across speaker segments, clamps bounds, and resumes the next segment at its boundary', async () => {
    const { rpc, queue, store } = await setup()
    const created = await (
      await rpc('podcasts.episodes.create', input())
    ).json()
    await queue.idle()
    const view: EpisodeView = store.view(created.result.episode.id)
    const parts = playableParts(view)
    expect(locatePosition(parts, 10)).toMatchObject({
      part: { index: 1 },
      localTime: 0,
    })
    expect(locatePosition(parts, 15)).toMatchObject({
      part: { index: 1 },
      localTime: 5,
    })
    expect(locatePosition(parts, -10)?.position).toBe(0)
    expect(locatePosition(parts, 999)?.position).toBe(20)
  })
  it('uses only the vault speech capability and sanitizes provider errors', async () => {
    expect(speechArgs('/tmp/body.json', 'personal')).toContain('openai/speech')
    expect(speechArgs('/tmp/body.json', 'personal')).toContain(
      '--body-file-path',
    )
    await expect(
      inspectSpeechAudio(
        Buffer.from(
          JSON.stringify({
            error: { code: 'invalid_api_key', message: 'secret-content' },
          }),
        ),
      ),
    ).rejects.toMatchObject({ code: 'invalid_api_key' })
    await expect(
      inspectSpeechAudio(
        Buffer.from(
          JSON.stringify({
            error: { code: 'missing_scope', type: 'invalid_request_error' },
          }),
        ),
      ),
    ).rejects.toMatchObject({ code: 'missing_speech_permission' })
    await expect(
      inspectSpeechAudio(Buffer.from('<html>not audio</html>')),
    ).rejects.toMatchObject({ code: 'invalid_audio' })
  })
})
