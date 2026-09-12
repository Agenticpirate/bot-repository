import { ensureDir, readJson, safePath, writeJson } from '@moldable-ai/storage'
import { getMailAccountCacheDir } from './mail-account-context'
import { ensureMailAccountCache } from './mail-cache-storage'

const TODAY_CACHE_FILENAME = 'today.json'

export interface CachedTodayPayload {
  generatedAt: string
  items: unknown[]
  resume: unknown
}

function todayCachePath(workspaceId?: string) {
  return safePath(getMailAccountCacheDir(workspaceId), TODAY_CACHE_FILENAME)
}

export async function readCachedToday(workspaceId?: string) {
  await ensureMailAccountCache(workspaceId)
  return readJson<CachedTodayPayload | null>(todayCachePath(workspaceId), null)
}

export async function writeCachedToday(
  workspaceId: string | undefined,
  payload: CachedTodayPayload,
) {
  await ensureMailAccountCache(workspaceId)
  await ensureDir(getMailAccountCacheDir(workspaceId))
  await writeJson(todayCachePath(workspaceId), payload)
}
