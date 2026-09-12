import { readJson, writeJson } from '@moldable-ai/storage'
import type {
  BookmarkFolder,
  BookmarkRecord,
  Connection,
  SyncState,
} from '../shared/bookmarks'
import { bookmarkPaths, ensureBookmarkDataDir } from './paths'
import { chmod, readFile, rename, writeFile } from 'node:fs/promises'
import { basename, dirname, join } from 'node:path'

const EMPTY_SYNC_STATE: SyncState = {
  status: 'idle',
  totalBookmarks: 0,
  addedLastSync: 0,
  pagesLastSync: 0,
}

const writeQueues = new Map<string, Promise<void>>()

export async function readBookmarks(
  workspaceId: string,
): Promise<BookmarkRecord[]> {
  const { archive } = bookmarkPaths(workspaceId)
  let contents: string
  try {
    contents = await readFile(archive, 'utf8')
  } catch (error) {
    if (isMissingFile(error)) return []
    throw error
  }

  const records: BookmarkRecord[] = []
  for (const [index, line] of contents.split('\n').entries()) {
    if (!line.trim()) continue
    try {
      const value = JSON.parse(line) as unknown
      if (isBookmarkRecord(value)) records.push(value)
    } catch {
      throw new Error(`Invalid bookmark archive at line ${index + 1}`)
    }
  }
  return records
}

export async function writeBookmarks(
  workspaceId: string,
  records: BookmarkRecord[],
): Promise<void> {
  const previous = writeQueues.get(workspaceId) ?? Promise.resolve()
  const next = previous.then(async () => {
    await ensureBookmarkDataDir(workspaceId)
    const { archive } = bookmarkPaths(workspaceId)
    const tempPath = join(
      dirname(archive),
      `.${basename(archive)}.${process.pid}.${Date.now()}.tmp`,
    )
    const body = records.map((record) => JSON.stringify(record)).join('\n')
    await writeFile(tempPath, body ? `${body}\n` : '', { mode: 0o600 })
    await chmod(tempPath, 0o600)
    await rename(tempPath, archive)
  })
  writeQueues.set(workspaceId, next)
  try {
    await next
  } finally {
    if (writeQueues.get(workspaceId) === next) writeQueues.delete(workspaceId)
  }
}

export async function readFolders(
  workspaceId: string,
): Promise<BookmarkFolder[]> {
  return readJson(bookmarkPaths(workspaceId).folders, [])
}

export async function writeFolders(
  workspaceId: string,
  folders: BookmarkFolder[],
): Promise<void> {
  await writeJson(bookmarkPaths(workspaceId).folders, folders)
}

export async function readConnection(
  workspaceId: string,
): Promise<Connection | null> {
  return readJson(bookmarkPaths(workspaceId).connection, null)
}

export async function writeConnection(
  workspaceId: string,
  connection: Connection | null,
): Promise<void> {
  await writeJson(bookmarkPaths(workspaceId).connection, connection)
}

export async function readSyncState(workspaceId: string): Promise<SyncState> {
  return readJson(bookmarkPaths(workspaceId).syncState, EMPTY_SYNC_STATE)
}

export async function writeSyncState(
  workspaceId: string,
  state: SyncState,
): Promise<void> {
  await writeJson(bookmarkPaths(workspaceId).syncState, state)
}

function isMissingFile(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    error.code === 'ENOENT'
  )
}

function isBookmarkRecord(value: unknown): value is BookmarkRecord {
  if (typeof value !== 'object' || value === null) return false
  const record = value as Record<string, unknown>
  return (
    typeof record.id === 'string' &&
    typeof record.url === 'string' &&
    typeof record.text === 'string' &&
    typeof record.syncedAt === 'string' &&
    Array.isArray(record.links) &&
    Array.isArray(record.media) &&
    Array.isArray(record.folderIds) &&
    Array.isArray(record.folderNames)
  )
}
