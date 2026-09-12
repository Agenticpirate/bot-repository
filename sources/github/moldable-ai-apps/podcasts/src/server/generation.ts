import {
  type CreateEpisode,
  type Episode,
  createEpisodeSchema,
  splitScript,
} from '../shared/podcast'
import type { GenerateArtwork } from './artwork'
import { PodcastError } from './errors'
import type { WriteScript } from './script'
import type { SynthesizeSpeech } from './speech'
import type { EpisodeStore } from './store'
import { randomUUID } from 'node:crypto'
import { renameSync } from 'node:fs'
import { mkdir, rm, writeFile } from 'node:fs/promises'

/** Paid work starts only from a saved create/retry request or runtime queue recovery. */
export class GenerationQueue {
  private active: {
    id: string
    controller: AbortController
    promise: Promise<void>
  } | null = null
  private stopped = false
  private readonly owner = randomUUID()
  constructor(
    readonly store: EpisodeStore,
    private readonly synthesize: SynthesizeSpeech,
    private readonly artwork: GenerateArtwork,
    private readonly writeScript: WriteScript,
  ) {}

  pump(): void {
    if (this.stopped || this.active) return
    for (const id of this.store.queuedIds()) {
      if (!this.store.claim(id, this.owner)) continue
      const controller = new AbortController()
      const lease = setInterval(() => {
        if (!this.store.renewLease(id, this.owner)) controller.abort()
      }, 30_000)
      lease.unref()
      const promise = this.generate(id, controller.signal).finally(() => {
        clearInterval(lease)
        this.active = null
        this.pump()
      })
      this.active = { id, controller, promise }
      return
    }
  }

  cancel(id: string): void {
    if (this.active?.id === id) this.active.controller.abort()
  }

  async idle(): Promise<void> {
    while (this.active) await this.active.promise
  }

  async close(): Promise<void> {
    this.stopped = true
    if (this.active) {
      this.store.updateOwned(this.active.id, this.owner, (episode) => {
        episode.status = 'failed'
        if (episode.thumbnail?.status === 'generating')
          episode.thumbnail = {
            status: 'failed',
            error: {
              code: 'artwork_interrupted',
              message:
                'Artwork was interrupted. Retrying may charge the image request again.',
            },
          }
        episode.error = {
          code: 'generation_interrupted',
          message:
            'Generation was interrupted. Finished audio is saved. Retry resumes the remaining parts; an interrupted request may be charged again.',
        }
      })
      this.active.controller.abort()
      await this.active.promise
    }
  }

  private async generate(id: string, signal: AbortSignal): Promise<void> {
    try {
      await mkdir(this.store.audioDirectory(id), { recursive: true })
      const initial = this.store.get(id)
      if (initial.creation && !initial.creation.scriptReady) {
        const workAbort = new AbortController()
        const workSignal = AbortSignal.any([signal, workAbort.signal])
        let audioFailure: unknown
        let audioWork = Promise.resolve()
        const scheduleAudio = () => {
          audioWork = audioWork
            .then(async () => {
              if (!workSignal.aborted)
                await this.narrateAvailable(id, workSignal)
            })
            .catch((error: unknown) => {
              audioFailure = error
              workAbort.abort()
            })
        }
        // Saved draft sections can already have unfinished audio on retry.
        scheduleAudio()
        try {
          const script = createEpisodeSchema.parse(
            await this.writeScript({
              topic: initial.creation.topic,
              minutes: initial.creation.minutes,
              workspaceId: this.store.workspaceId,
              signal: workSignal,
              draft: initial.creation.draft,
              checkpoint: (draft) => {
                workSignal.throwIfAborted()
                if (
                  !this.store.updateOwned(id, this.owner, (episode) => {
                    if (episode.creation) episode.creation.draft = draft
                    episode.title = draft.title
                    episode.description = draft.description
                    this.appendScript(
                      episode,
                      draft.sections
                        .flat()
                        .map((text) => ({ speakerId: 'narrator', text })),
                    )
                  })
                )
                  throw new PodcastError(
                    'generation_interrupted',
                    'Writing stopped because this generation is no longer active.',
                    409,
                  )
                scheduleAudio()
              },
            }),
          )
          workSignal.throwIfAborted()
          if (
            !this.store.updateOwned(id, this.owner, (episode) => {
              episode.title = script.title
              episode.description = script.description
              // Voice is frozen when the episode is requested, including retries.
              const voice = episode.speakers[0]?.voice ?? 'marin'
              episode.speakers = script.speakers.map((speaker) => ({
                ...speaker,
                voice,
              }))
              episode.sources = script.sources
              this.appendScript(episode, script.script)
              if (episode.creation) episode.creation.scriptReady = true
            })
          )
            return
          scheduleAudio()
        } catch (error) {
          // Let any already purchased audio finish and checkpoint before surfacing
          // a writing failure. Cancellation still aborts both provider paths.
          await audioWork
          throw audioFailure ?? error
        } finally {
          await audioWork
        }
        if (audioFailure) throw audioFailure
        if (signal.aborted) return
      } else {
        await this.narrateAvailable(id, signal)
        if (signal.aborted) return
      }
      if (initial.thumbnail && initial.thumbnail.status !== 'ready') {
        await this.generateThumbnail(id, signal)
        if (signal.aborted) return
      }
      this.store.updateOwned(id, this.owner, (episode) => {
        episode.status = 'ready'
        episode.error = null
      })
    } catch (error) {
      if (signal.aborted) return
      this.store.updateOwned(id, this.owner, (episode) => {
        episode.status = 'failed'
        if (episode.thumbnail?.status === 'generating')
          episode.thumbnail = {
            status: 'failed',
            error: {
              code: 'artwork_interrupted',
              message:
                'Artwork was interrupted. Retrying may charge the image request again.',
            },
          }
        episode.error =
          error instanceof PodcastError
            ? { code: error.code, message: error.message }
            : {
                code: 'generation_failed',
                message:
                  'This episode could not finish. Completed audio is saved. Retry resumes the remaining parts.',
              }
      })
    }
  }

  private appendScript(
    episode: Episode,
    script: CreateEpisode['script'],
  ): void {
    const next = splitScript(script)
    if (
      episode.parts.some(
        (part, index) =>
          next[index]?.text !== part.text ||
          next[index]?.speakerId !== part.speakerId,
      )
    )
      throw new PodcastError(
        'script_conflict',
        'A saved script section changed. Existing audio has been kept.',
        409,
      )
    episode.parts = next.map((part, index) => episode.parts[index] ?? part)
  }

  private async narrateAvailable(
    id: string,
    signal: AbortSignal,
  ): Promise<void> {
    const initial = this.store.get(id)
    for (const part of initial.parts) {
      if (signal.aborted) return
      if (part.durationSeconds !== null) continue
      if (!this.store.updateOwned(id, this.owner, () => {})) return
      const speaker = initial.speakers.find(
        (item) => item.id === part.speakerId,
      )
      if (!speaker)
        throw new PodcastError(
          'speaker_missing',
          'The script references an unknown speaker.',
        )
      const audio = await this.synthesize({
        text: part.text,
        speaker,
        workspaceId: this.store.workspaceId,
        signal,
      })
      if (signal.aborted) return
      const destination = this.store.audioFile(id, part.index)
      const temporary = `${destination}.${this.owner}.tmp`
      try {
        await writeFile(temporary, audio.bytes, { mode: 0o600 })
        const saved = this.store.updateOwned(id, this.owner, (episode) => {
          const target = episode.parts[part.index]
          if (!target)
            throw new PodcastError(
              'part_missing',
              'This audio part no longer exists.',
            )
          // Publish only while holding the current generation lease. A cancelled
          // worker cannot overwrite a newer retry's audio across processes.
          renameSync(temporary, destination)
          target.durationSeconds = audio.durationSeconds
          target.byteLength = audio.bytes.length
        })
        if (!saved) return
      } finally {
        await rm(temporary, { force: true })
      }
    }
  }

  private async generateThumbnail(
    id: string,
    signal: AbortSignal,
  ): Promise<void> {
    if (
      !this.store.updateOwned(id, this.owner, (episode) => {
        episode.thumbnail = { status: 'generating', error: null }
      })
    )
      return
    const episode = this.store.get(id)
    const temporary = `${this.store.thumbnailFile(id)}.${this.owner}.tmp`
    try {
      const bytes = await this.artwork({
        title: episode.title,
        description: episode.description,
        workspaceId: this.store.workspaceId,
        signal,
      })
      if (signal.aborted) return
      await writeFile(temporary, bytes, { mode: 0o600 })
      this.store.updateOwned(id, this.owner, (record) => {
        renameSync(temporary, this.store.thumbnailFile(id))
        record.thumbnail = { status: 'ready', error: null }
      })
    } catch (error) {
      if (signal.aborted) return
      this.store.updateOwned(id, this.owner, (record) => {
        record.thumbnail = {
          status: 'failed',
          error:
            error instanceof PodcastError
              ? { code: error.code, message: error.message }
              : {
                  code: 'artwork_failed',
                  message:
                    'Artwork could not be generated. Your audio is saved; you can retry just the artwork.',
                },
        }
      })
    } finally {
      await rm(temporary, { force: true })
    }
  }
}
