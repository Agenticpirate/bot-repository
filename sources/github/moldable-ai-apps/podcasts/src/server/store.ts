import {
  type CreateEpisode,
  type Episode,
  type EpisodeView,
  type GenerateEpisode,
  type PodcastSettings,
  idSchema,
  listSchema,
  settingsSchema,
  settingsUpdateSchema,
  splitScript,
  summarizeEpisode,
} from '../shared/podcast'
import { PodcastError } from './errors'
import { createHash, randomUUID } from 'node:crypto'
import { mkdirSync, rmSync } from 'node:fs'
import path from 'node:path'
import { DatabaseSync } from 'node:sqlite'

const LEASE_MS = 180_000
type StoredRow = { document: string; fingerprint: string }

/** One workspace database owns episodes, generation leases and create receipts. */
export class EpisodeStore {
  readonly db: DatabaseSync
  constructor(
    readonly directory: string,
    readonly workspaceId: string,
  ) {
    mkdirSync(directory, { recursive: true })
    this.db = new DatabaseSync(path.join(directory, 'podcasts.sqlite'))
    this.db.exec(`
      PRAGMA journal_mode = WAL;
      PRAGMA busy_timeout = 5000;
      CREATE TABLE IF NOT EXISTS episodes (
        id TEXT PRIMARY KEY, request_key TEXT NOT NULL UNIQUE,
        fingerprint TEXT NOT NULL, document TEXT NOT NULL,
        status TEXT NOT NULL, archived INTEGER NOT NULL DEFAULT 0,
        created_at TEXT NOT NULL, owner TEXT, lease_until INTEGER
      );
      CREATE TABLE IF NOT EXISTS deleted_episodes (
        id TEXT PRIMARY KEY, request_key TEXT NOT NULL UNIQUE
      );
      CREATE INDEX IF NOT EXISTS episodes_library ON episodes(archived, created_at DESC, id);
      CREATE TABLE IF NOT EXISTS workspace_settings (id INTEGER PRIMARY KEY CHECK(id = 1), document TEXT NOT NULL);
    `)
  }

  transaction<T>(operation: () => T): T {
    this.db.exec('BEGIN IMMEDIATE')
    try {
      const result = operation()
      this.db.exec('COMMIT')
      return result
    } catch (error) {
      this.db.exec('ROLLBACK')
      throw error
    }
  }

  get(id: string): Episode {
    idSchema.parse(id)
    const row = this.db
      .prepare('SELECT document FROM episodes WHERE id = ?')
      .get(id) as StoredRow | undefined
    if (!row)
      throw new PodcastError(
        'episode_not_found',
        'This episode is no longer available.',
        404,
      )
    return JSON.parse(row.document) as Episode
  }

  settings(): PodcastSettings {
    const row = this.db
      .prepare('SELECT document FROM workspace_settings WHERE id = 1')
      .get() as { document: string } | undefined
    return row
      ? settingsSchema.parse(JSON.parse(row.document))
      : { voice: 'marin', minutes: 5 }
  }

  saveSettings(input: unknown): PodcastSettings {
    const settings = settingsSchema.parse({
      ...this.settings(),
      ...settingsUpdateSchema.parse(input),
    })
    this.db
      .prepare(
        'INSERT INTO workspace_settings(id, document) VALUES (1, ?) ON CONFLICT(id) DO UPDATE SET document = excluded.document',
      )
      .run(JSON.stringify(settings))
    return settings
  }

  generationQueue() {
    const rows = this.db
      .prepare(
        "SELECT document FROM episodes WHERE status IN ('queued', 'generating') OR (archived = 0 AND (status = 'failed' OR (status = 'ready' AND json_extract(document, '$.thumbnail.status') = 'failed'))) ORDER BY CASE WHEN status IN ('queued', 'generating') THEN 0 ELSE 1 END, created_at DESC LIMIT 50",
      )
      .all() as StoredRow[]
    const count = this.db
      .prepare(
        "SELECT count(*) AS total FROM episodes WHERE status IN ('queued', 'generating')",
      )
      .get() as { total: number }
    return {
      items: rows.map((row) =>
        this.summarize(JSON.parse(row.document) as Episode),
      ),
      activeCount: count.total,
    }
  }

  view(id: string): EpisodeView {
    const episode = this.get(id)
    return {
      ...this.summarize(episode),
      sources: episode.sources,
      parts: episode.parts.map((part) => ({
        ...part,
        audioPath:
          part.durationSeconds === null
            ? null
            : `/api/episodes/${episode.id}/audio/${part.index}.mp3?workspace=${encodeURIComponent(this.workspaceId)}`,
      })),
    }
  }

  summarize(episode: Episode) {
    return {
      ...summarizeEpisode(episode),
      thumbnailPath:
        episode.thumbnail?.status === 'ready'
          ? `/api/episodes/${episode.id}/thumbnail.jpg?workspace=${encodeURIComponent(this.workspaceId)}`
          : null,
    }
  }

  list(input: unknown) {
    const params = listSchema.parse(input)
    const rows = this.db.prepare(
      "SELECT document FROM episodes WHERE archived = ? AND (json_extract(document, '$.title') LIKE ? ESCAPE '\\' OR json_extract(document, '$.description') LIKE ? ESCAPE '\\') ORDER BY created_at DESC, id DESC LIMIT ? OFFSET ?",
    )
    const query = `%${params.query.replace(/[\\%_]/g, '\\$&')}%`
    const all = rows.all(
      params.archived ? 1 : 0,
      query,
      query,
      params.limit + 1,
      params.offset,
    ) as StoredRow[]
    const items = all
      .slice(0, params.limit)
      .map((row) => this.summarize(JSON.parse(row.document) as Episode))
    return {
      items,
      nextOffset:
        all.length > params.limit ? params.offset + params.limit : null,
    }
  }

  create(input: CreateEpisode, caller: string): Episode {
    return this.insert(input, caller, {
      title: input.title,
      description: input.description,
      accent: input.accent,
      speakers: input.speakers,
      sources: input.sources,
      parts: splitScript(input.script),
    })
  }

  generate(input: GenerateEpisode, caller: string): Episode {
    return this.insert(input, caller, {
      title: input.topic.slice(0, 180),
      description: '',
      accent: 'blue',
      speakers: [
        {
          id: 'narrator',
          name: 'Narrator',
          voice: input.voice ?? this.settings().voice,
          instructions:
            'Speak naturally, like a warm, curious podcast host. Use conversational pacing and clear pronunciation.',
        },
      ],
      sources: [],
      parts: [],
      creation: {
        topic: input.topic,
        minutes: input.minutes,
        scriptReady: false,
      },
    })
  }

  private insert(
    input: CreateEpisode | GenerateEpisode,
    caller: string,
    initial: Pick<
      Episode,
      | 'title'
      | 'description'
      | 'accent'
      | 'speakers'
      | 'sources'
      | 'parts'
      | 'creation'
    >,
  ): Episode {
    const { requestId, ...content } = input
    const requestKey = createHash('sha256')
      .update(`${caller}\0${requestId}`)
      .digest('hex')
    const fingerprint = createHash('sha256')
      .update(JSON.stringify(content))
      .digest('hex')
    return this.transaction(() => {
      if (
        this.db
          .prepare('SELECT id FROM deleted_episodes WHERE request_key = ?')
          .get(requestKey)
      )
        throw new PodcastError(
          'episode_deleted',
          'This episode was deleted. Use a new request ID to create another.',
          410,
        )
      const previous = this.db
        .prepare(
          'SELECT document, fingerprint FROM episodes WHERE request_key = ?',
        )
        .get(requestKey) as StoredRow | undefined
      if (previous) {
        if (previous.fingerprint !== fingerprint)
          throw new PodcastError(
            'request_conflict',
            'This request ID was already used for a different episode. Use a new request ID.',
            409,
          )
        return JSON.parse(previous.document) as Episode
      }
      const pending = this.db
        .prepare(
          "SELECT count(*) AS total FROM episodes WHERE status IN ('queued', 'generating')",
        )
        .get() as { total: number }
      if (pending.total >= 4)
        throw new PodcastError(
          'queue_full',
          'Four episodes are already being made. Let one finish before adding another.',
          429,
        )
      const now = new Date().toISOString()
      const episode: Episode = {
        id: randomUUID(),
        ...initial,
        thumbnail: { status: 'queued', error: null },
        status: 'queued',
        error: null,
        createdAt: now,
        updatedAt: now,
        revision: 0,
        archived: false,
        playback: { positionSeconds: 0, speed: 1, updatedAt: null },
      }
      this.db
        .prepare(
          'INSERT INTO episodes(id, request_key, fingerprint, document, status, created_at) VALUES (?, ?, ?, ?, ?, ?)',
        )
        .run(
          episode.id,
          requestKey,
          fingerprint,
          JSON.stringify(episode),
          episode.status,
          now,
        )
      if ('topic' in input)
        this.saveSettings({
          minutes: input.minutes,
          ...(input.voice ? { voice: input.voice } : {}),
        })
      return episode
    })
  }

  private persist(episode: Episode): Episode {
    episode.revision++
    episode.updatedAt = new Date().toISOString()
    this.db
      .prepare(
        'UPDATE episodes SET document = ?, status = ?, archived = ? WHERE id = ?',
      )
      .run(
        JSON.stringify(episode),
        episode.status,
        episode.archived ? 1 : 0,
        episode.id,
      )
    return episode
  }

  change(
    id: string,
    expectedRevision: number,
    update: (episode: Episode) => void,
  ): Episode {
    return this.transaction(() => {
      const episode = this.get(id)
      if (episode.revision !== expectedRevision)
        throw new PodcastError(
          'revision_conflict',
          'This episode changed. Refresh before trying again.',
          409,
        )
      update(episode)
      return this.persist(episode)
    })
  }

  deleteArchived(id: string, expectedRevision: number): void {
    this.transaction(() => {
      // Retain only the request receipt so a delayed create retry cannot rebill
      // and resurrect deleted content. Repeated delete calls also remain safe.
      if (
        this.db.prepare('SELECT id FROM deleted_episodes WHERE id = ?').get(id)
      )
        return
      const episode = this.get(id)
      if (episode.revision !== expectedRevision)
        throw new PodcastError(
          'revision_conflict',
          'This episode changed. Refresh before trying again.',
          409,
        )
      if (!episode.archived)
        throw new PodcastError(
          'not_archived',
          'Archive this episode before deleting it.',
          409,
        )
      this.db
        .prepare(
          'INSERT INTO deleted_episodes(id, request_key) SELECT id, request_key FROM episodes WHERE id = ?',
        )
        .run(id)
      this.db.prepare('DELETE FROM episodes WHERE id = ?').run(id)
    })
    // Logical deletion revokes every generation lease before removing assets.
    // If cleanup fails, a repeated delete retries it without restoring content.
    rmSync(this.audioDirectory(id), { recursive: true, force: true })
  }

  savePlayback(id: string, positionSeconds: number, speed: number): Episode {
    return this.transaction(() => {
      const episode = this.get(id)
      const duration = summarizeEpisode(episode).durationSeconds
      episode.playback = {
        positionSeconds: Math.min(positionSeconds, duration),
        speed,
        updatedAt: new Date().toISOString(),
      }
      // Listening progress is independent of the content revision used by retry/archive.
      this.db
        .prepare('UPDATE episodes SET document = ? WHERE id = ?')
        .run(JSON.stringify(episode), id)
      return episode
    })
  }

  queuedIds(): string[] {
    return (
      this.db
        .prepare(
          "SELECT id FROM episodes WHERE status = 'queued' ORDER BY created_at",
        )
        .all() as { id: string }[]
    ).map((row) => row.id)
  }

  claim(id: string, owner: string): Episode | null {
    return this.transaction(() => {
      // Another process may delete an archived queued job after it was listed.
      if (!this.db.prepare('SELECT id FROM episodes WHERE id = ?').get(id))
        return null
      const episode = this.get(id)
      if (episode.status !== 'queued') return null
      // Limit the workspace to one active paid generation even with multiple processes.
      if (
        this.db
          .prepare(
            "SELECT id FROM episodes WHERE status = 'generating' LIMIT 1",
          )
          .get()
      )
        return null
      episode.status = 'generating'
      episode.error = null
      this.db
        .prepare('UPDATE episodes SET owner = ?, lease_until = ? WHERE id = ?')
        .run(owner, Date.now() + LEASE_MS, id)
      return this.persist(episode)
    })
  }

  updateOwned(
    id: string,
    owner: string,
    update: (episode: Episode) => void,
  ): boolean {
    return this.transaction(() => {
      const row = this.db
        .prepare(
          "SELECT id FROM episodes WHERE id = ? AND owner = ? AND status = 'generating'",
        )
        .get(id, owner)
      if (!row) return false
      const episode = this.get(id)
      update(episode)
      this.persist(episode)
      this.db
        .prepare('UPDATE episodes SET lease_until = ? WHERE id = ?')
        .run(Date.now() + LEASE_MS, id)
      return true
    })
  }

  renewLease(id: string, owner: string): boolean {
    return (
      this.db
        .prepare(
          "UPDATE episodes SET lease_until = ? WHERE id = ? AND owner = ? AND status = 'generating'",
        )
        .run(Date.now() + LEASE_MS, id, owner).changes === 1
    )
  }

  recoverExpired(now = Date.now()): void {
    this.transaction(() => {
      const rows = this.db
        .prepare(
          "SELECT document FROM episodes WHERE status = 'generating' AND lease_until < ?",
        )
        .all(now) as StoredRow[]
      for (const row of rows) {
        const episode = JSON.parse(row.document) as Episode
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
        this.persist(episode)
      }
    })
  }

  audioDirectory(id: string): string {
    return path.join(this.directory, 'audio', idSchema.parse(id))
  }
  thumbnailFile(id: string): string {
    return path.join(this.audioDirectory(id), 'thumbnail.jpg')
  }

  audioFile(id: string, index: number): string {
    if (!Number.isSafeInteger(index) || index < 0 || index >= 1000)
      throw new PodcastError('invalid_audio_part', 'Invalid audio part.')
    return path.join(this.audioDirectory(id), `${index}.mp3`)
  }
  close(): void {
    this.db.close()
  }
}
