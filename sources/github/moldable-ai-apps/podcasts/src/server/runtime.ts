import { getMoldableHome } from '@moldable-ai/storage'
import { idSchema } from '../shared/podcast'
import { type GenerateArtwork, generateArtwork } from './artwork'
import { GenerationQueue } from './generation'
import { type WriteScript, writeScript } from './script'
import { type SynthesizeSpeech, synthesizeSpeech } from './speech'
import { EpisodeStore } from './store'
import type { Context } from 'hono'
import { readdir } from 'node:fs/promises'
import path from 'node:path'

export function workspaceFor(c: Context): string {
  return idSchema.parse(
    c.req.header('x-moldable-workspace') ??
      c.req.header('x-moldable-workspace-id') ??
      c.req.query('workspace') ??
      process.env.MOLDABLE_WORKSPACE_ID ??
      'personal',
  )
}

export class PodcastRuntime {
  private readonly services = new Map<
    string,
    { store: EpisodeStore; queue: GenerationQueue }
  >()
  private timer: ReturnType<typeof setInterval> | undefined
  constructor(
    readonly home = getMoldableHome(),
    readonly synthesize: SynthesizeSpeech = synthesizeSpeech,
    readonly artwork: GenerateArtwork = generateArtwork,
    readonly script: WriteScript = writeScript,
  ) {}
  forWorkspace(workspaceId: string) {
    idSchema.parse(workspaceId)
    let service = this.services.get(workspaceId)
    if (!service) {
      const store = new EpisodeStore(
        path.join(
          this.home,
          'workspaces',
          workspaceId,
          'apps',
          'podcasts',
          'data',
        ),
        workspaceId,
      )
      service = {
        store,
        queue: new GenerationQueue(
          store,
          this.synthesize,
          this.artwork,
          this.script,
        ),
      }
      this.services.set(workspaceId, service)
    }
    return service
  }
  async start(): Promise<void> {
    const workspaces = await readdir(path.join(this.home, 'workspaces'), {
      withFileTypes: true,
    }).catch(() => [])
    for (const workspace of workspaces) {
      if (
        !workspace.isDirectory() ||
        !idSchema.safeParse(workspace.name).success
      )
        continue
      const files: string[] = await readdir(
        path.join(
          this.home,
          'workspaces',
          workspace.name,
          'apps',
          'podcasts',
          'data',
        ),
      ).catch(() => [])
      if (files.includes('podcasts.sqlite')) this.forWorkspace(workspace.name)
    }
    const recover = () => {
      for (const { store, queue } of this.services.values()) {
        store.recoverExpired()
        queue.pump()
      }
    }
    recover()
    this.timer = setInterval(recover, 30_000)
    this.timer.unref()
  }
  async close(): Promise<void> {
    clearInterval(this.timer)
    for (const { queue, store } of this.services.values()) {
      await queue.close()
      store.close()
    }
    this.services.clear()
  }
}
