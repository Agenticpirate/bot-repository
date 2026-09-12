import type {
  BookmarkRecord,
  Connection,
  SyncResult,
  SyncState,
} from '../shared/bookmarks'
import {
  readBookmarks,
  readConnection,
  readSyncState,
  writeBookmarks,
  writeFolders,
  writeSyncState,
} from './bookmark-files'
import { readExcludedFolderIds } from './folder-selection'
import { replaceSearchIndex } from './search-index'
import type { BookmarkPageHandler } from './sync-source'
import { fetchApiBookmarks, fetchApiFolders } from './x-api-client'
import {
  XRateLimitError,
  fetchBrowserBookmarks,
  fetchBrowserFolders,
} from './x-browser-client'

const running = new Map<string, Promise<SyncResult>>()
const retryTimers = new Map<string, ReturnType<typeof setTimeout>>()
const DAY_MS = 24 * 60 * 60 * 1_000
const DEFAULT_RATE_LIMIT_MS = 15 * 60 * 1_000

export function startSync(workspaceId: string): Promise<SyncResult> {
  const active = running.get(workspaceId)
  if (active) return active
  const task = synchronize(workspaceId).finally(() =>
    running.delete(workspaceId),
  )
  running.set(workspaceId, task)
  return task
}

export function isSyncRunning(workspaceId: string): boolean {
  return running.has(workspaceId)
}

export async function startSyncIfStale(workspaceId: string): Promise<void> {
  if (running.has(workspaceId)) return
  const [connection, state] = await Promise.all([
    readConnection(workspaceId),
    readSyncState(workspaceId),
  ])
  if (!connection) return
  const retryAt = state.retryAt ? Date.parse(state.retryAt) : 0
  if (Number.isFinite(retryAt) && retryAt > Date.now()) {
    scheduleRetry(workspaceId, retryAt)
    return
  }
  if (state.status === 'syncing') {
    void startSync(workspaceId).catch(() => undefined)
    return
  }
  const lastSync = state.lastSyncAt ? Date.parse(state.lastSyncAt) : 0
  if (!Number.isFinite(lastSync) || Date.now() - lastSync >= DAY_MS) {
    void startSync(workspaceId).catch(() => undefined)
  }
}

async function synchronize(workspaceId: string): Promise<SyncResult> {
  const connection = await readConnection(workspaceId)
  if (!connection) throw new Error('Connect an X account before syncing')
  const startedAt = new Date().toISOString()
  const previousState = await readSyncState(workspaceId)
  await setState(workspaceId, previousState, {
    status: 'syncing',
    phase: 'Reading local archive',
    startedAt,
    lastError: undefined,
    retryAt: undefined,
    addedLastSync: 0,
    pagesLastSync: 0,
  })

  try {
    const [existing, excludedFolderIds] = await Promise.all([
      readBookmarks(workspaceId),
      readExcludedFolderIds(workspaceId),
    ])
    const existingById = new Map(existing.map((record) => [record.id, record]))
    const knownIds = new Set(existingById.keys())
    const liveRecords = new Map(existingById)
    const publishPage: BookmarkPageHandler = async ({
      page,
      synced,
      records: pageRecords,
    }) => {
      for (const incoming of pageRecords) {
        const old = existingById.get(incoming.id)
        liveRecords.set(incoming.id, { ...old, ...incoming })
      }
      const visibleRecords = [...liveRecords.values()].sort(compareBookmarks)
      await writeBookmarks(workspaceId, visibleRecords)
      replaceSearchIndex(workspaceId, visibleRecords)
      await setState(workspaceId, previousState, {
        status: 'syncing',
        phase: `Reading bookmarks · page ${page} · ${synced} new`,
        startedAt,
        totalBookmarks: visibleRecords.length,
        addedLastSync: synced,
        pagesLastSync: page,
      })
    }
    const fetched = await fetchBookmarks(
      workspaceId,
      connection,
      knownIds,
      publishPage,
    )

    const merged = new Map<string, BookmarkRecord>()
    for (const old of existing) {
      const preservedFolders = excludedFolderAssociations(
        old,
        excludedFolderIds,
      )
      merged.set(old.id, { ...old, ...preservedFolders })
    }
    for (const incoming of fetched.records) {
      const old = existingById.get(incoming.id)
      const preservedFolders = old
        ? excludedFolderAssociations(old, excludedFolderIds)
        : { folderIds: [], folderNames: [] }
      merged.set(incoming.id, {
        ...old,
        ...incoming,
        ...preservedFolders,
      })
    }

    const folders = await fetchFolders(
      workspaceId,
      connection,
      merged,
      excludedFolderIds,
      (name) => {
        return setState(workspaceId, previousState, {
          status: 'syncing',
          phase: `Mirroring folder · ${name}`,
          startedAt,
        })
      },
    )
    const records = [...merged.values()].sort(compareBookmarks)
    const completedAt = new Date().toISOString()

    await writeBookmarks(workspaceId, records)
    await writeFolders(workspaceId, folders)
    replaceSearchIndex(workspaceId, records)
    await writeSyncState(workspaceId, {
      status: 'idle',
      lastSyncAt: completedAt,
      lastFullSyncAt: previousState.lastFullSyncAt ?? completedAt,
      totalBookmarks: records.length,
      addedLastSync: fetched.records.length,
      pagesLastSync: fetched.pages,
      retryAt: undefined,
    })
    return {
      added: fetched.records.length,
      total: records.length,
      pages: fetched.pages,
      folders: folders.length,
      completedAt,
    }
  } catch (error) {
    const currentState = await readSyncState(workspaceId)
    const retryAt = rateLimitRetryAt(error)
    await writeSyncState(workspaceId, {
      ...currentState,
      status: 'error',
      startedAt,
      lastError: retryAt
        ? `X hit a temporary rate limit. Sync will resume automatically ${relativeRetryTime(retryAt)}.`
        : errorMessage(error),
      retryAt: retryAt?.toISOString(),
    })
    if (retryAt) scheduleRetry(workspaceId, retryAt.getTime())
    throw error
  }
}

function excludedFolderAssociations(
  record: BookmarkRecord,
  excludedFolderIds: ReadonlySet<string>,
): Pick<BookmarkRecord, 'folderIds' | 'folderNames'> {
  const keptIndexes = record.folderIds
    .map((folderId, index) => ({ folderId, index }))
    .filter(({ folderId }) => excludedFolderIds.has(folderId))
    .map(({ index }) => index)
  return {
    folderIds: keptIndexes.map((index) => record.folderIds[index]),
    folderNames: keptIndexes
      .map((index) => record.folderNames[index])
      .filter((name): name is string => typeof name === 'string'),
  }
}

async function fetchBookmarks(
  workspaceId: string,
  connection: Connection,
  knownIds: Set<string>,
  onPage: BookmarkPageHandler,
) {
  return connection.method === 'browser'
    ? fetchBrowserBookmarks({
        source: connection,
        knownIds,
        onPage,
      })
    : fetchApiBookmarks({
        workspaceId,
        userId: connection.xUserId,
        knownIds,
        onPage,
      })
}

async function fetchFolders(
  workspaceId: string,
  connection: Connection,
  baseRecords: Map<string, BookmarkRecord>,
  excludedFolderIds: ReadonlySet<string>,
  onFolder: (name: string) => void | Promise<void>,
) {
  return connection.method === 'browser'
    ? fetchBrowserFolders({
        source: connection,
        baseRecords,
        excludedFolderIds,
        onFolder,
      })
    : fetchApiFolders({
        workspaceId,
        userId: connection.xUserId,
        baseRecords,
        excludedFolderIds,
        onFolder,
      })
}

async function setState(
  workspaceId: string,
  base: SyncState,
  patch: Partial<SyncState>,
): Promise<void> {
  await writeSyncState(workspaceId, { ...base, ...patch })
}

function compareBookmarks(a: BookmarkRecord, b: BookmarkRecord): number {
  if (
    a.sortIndex &&
    b.sortIndex &&
    /^\d+$/.test(a.sortIndex) &&
    /^\d+$/.test(b.sortIndex)
  ) {
    const aIndex = BigInt(a.sortIndex)
    const bIndex = BigInt(b.sortIndex)
    if (aIndex !== bIndex) return aIndex > bIndex ? -1 : 1
  }
  return String(b.bookmarkedAt ?? b.postedAt ?? b.syncedAt).localeCompare(
    String(a.bookmarkedAt ?? a.postedAt ?? a.syncedAt),
  )
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : 'Bookmark sync failed'
}

function rateLimitRetryAt(error: unknown): Date | null {
  if (error instanceof XRateLimitError) return new Date(error.retryAt)
  if (
    error instanceof Error &&
    /(?:HTTP 429|rate.?limit)/i.test(error.message)
  ) {
    return new Date(Date.now() + DEFAULT_RATE_LIMIT_MS)
  }
  return null
}

function scheduleRetry(workspaceId: string, retryAt: number): void {
  const existing = retryTimers.get(workspaceId)
  if (existing) clearTimeout(existing)
  const timer = setTimeout(
    () => {
      retryTimers.delete(workspaceId)
      void startSync(workspaceId).catch(() => undefined)
    },
    Math.max(1_000, retryAt - Date.now()),
  )
  timer.unref()
  retryTimers.set(workspaceId, timer)
}

function relativeRetryTime(retryAt: Date): string {
  const minutes = Math.max(
    1,
    Math.ceil((retryAt.getTime() - Date.now()) / 60_000),
  )
  return `in about ${minutes} ${minutes === 1 ? 'minute' : 'minutes'}`
}
