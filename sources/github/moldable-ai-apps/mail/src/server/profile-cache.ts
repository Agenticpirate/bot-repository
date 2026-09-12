import { ensureDir, readJson, safePath, writeJson } from '@moldable-ai/storage'
import type { MailProfile } from './gmail-service'
import { getMailAccountCacheDir } from './mail-account-context'
import {
  ensureMailAccountCache,
  isJsonSemanticallyEqual,
} from './mail-cache-storage'

const PROFILE_CACHE_FILENAME = 'profile.json'

export interface CachedMailProfile {
  cachedAt: string
  profile: MailProfile | null
}

function profileCachePath(workspaceId?: string) {
  return safePath(getMailAccountCacheDir(workspaceId), PROFILE_CACHE_FILENAME)
}

export async function readCachedProfile(workspaceId?: string) {
  await ensureMailAccountCache(workspaceId)
  const cached = await readJson<CachedMailProfile | null>(
    profileCachePath(workspaceId),
    null,
  )
  return cached?.profile ?? null
}

export async function writeCachedProfile(
  workspaceId: string | undefined,
  profile: MailProfile | null,
) {
  await ensureMailAccountCache(workspaceId)
  const current = await readJson<CachedMailProfile | null>(
    profileCachePath(workspaceId),
    null,
  )
  if (current && isJsonSemanticallyEqual(current.profile, profile)) return false
  await ensureDir(getMailAccountCacheDir(workspaceId))
  await writeJson(profileCachePath(workspaceId), {
    cachedAt: new Date().toISOString(),
    profile,
  } satisfies CachedMailProfile)
  return true
}
