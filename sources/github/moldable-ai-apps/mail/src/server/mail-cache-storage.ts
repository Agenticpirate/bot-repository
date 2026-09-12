import { ensureDir, readJson, safePath, writeJson } from '@moldable-ai/storage'
import {
  getMailAccountCacheDir,
  getMailAccountDataDir,
} from './mail-account-context'
import { cp, rename, rm, stat } from 'node:fs/promises'
import { isDeepStrictEqual } from 'node:util'

const CACHE_MIGRATION_MARKER = 'local-cache-migration-v1.json'
const LEGACY_CACHE_ENTRIES = [
  'attachments',
  'contacts.json',
  'messages',
  'profile.json',
  'today.json',
] as const

interface CacheMigrationMarker {
  version: 1
  migratedAt: string
}

const cacheInitializations = new Map<string, Promise<string>>()

/** Compare values as they are represented by writeJson, ignoring fields whose
 * value is undefined and object-key insertion order. */
export function isJsonSemanticallyEqual(left: unknown, right: unknown) {
  const leftJson = JSON.stringify(left)
  const rightJson = JSON.stringify(right)
  if (leftJson === rightJson) return true
  if (leftJson === undefined || rightJson === undefined) return false
  return isDeepStrictEqual(JSON.parse(leftJson), JSON.parse(rightJson))
}

/**
 * Return Mail's local-only cache root after a one-time, non-destructive copy
 * from the former synced cache location. The legacy files are intentionally
 * left untouched so this migration does not create a large Drive deletion.
 */
export function ensureMailAccountCache(workspaceId?: string) {
  const cacheDir = getMailAccountCacheDir(workspaceId)
  const existing = cacheInitializations.get(cacheDir)
  if (existing) return existing

  const initialization = initializeMailAccountCache(
    workspaceId,
    cacheDir,
  ).catch((error) => {
    cacheInitializations.delete(cacheDir)
    throw error
  })
  cacheInitializations.set(cacheDir, initialization)
  return initialization
}

async function initializeMailAccountCache(
  workspaceId: string | undefined,
  cacheDir: string,
) {
  const dataDir = getMailAccountDataDir(workspaceId)
  const markerPath = safePath(dataDir, CACHE_MIGRATION_MARKER)
  const marker = await readJson<CacheMigrationMarker | null>(markerPath, null)
  await ensureDir(cacheDir)
  if (marker?.version === 1) return cacheDir

  for (const entry of LEGACY_CACHE_ENTRIES) {
    await copyEntryOnce(
      safePath(dataDir, entry),
      safePath(cacheDir, entry),
      cacheDir,
    )
  }
  await ensureDir(dataDir)
  await writeJson(markerPath, {
    version: 1,
    migratedAt: new Date().toISOString(),
  } satisfies CacheMigrationMarker)
  return cacheDir
}

async function copyEntryOnce(
  source: string,
  destination: string,
  cacheDir: string,
) {
  if (await pathExists(destination)) return
  if (!(await pathExists(source))) return

  const temporary = safePath(
    cacheDir,
    `.migration-${process.pid}-${Date.now()}-${Math.random().toString(36).slice(2)}`,
  )
  try {
    await cp(source, temporary, {
      recursive: true,
      force: false,
      errorOnExist: true,
    })
    try {
      await rename(temporary, destination)
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'EEXIST') throw error
    }
  } finally {
    await rm(temporary, { recursive: true, force: true }).catch(() => undefined)
  }
}

async function pathExists(path: string) {
  try {
    await stat(path)
    return true
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return false
    throw error
  }
}
