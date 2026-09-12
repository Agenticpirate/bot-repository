import { ensureDir, readJson, safePath, writeJson } from '@moldable-ai/storage'
import type { MailContact } from './gmail-service'
import { getMailAccountCacheDir } from './mail-account-context'
import {
  ensureMailAccountCache,
  isJsonSemanticallyEqual,
} from './mail-cache-storage'

interface CachedContacts {
  cachedAt: string
  contacts: MailContact[]
}

function contactsCachePath(workspaceId: string) {
  return safePath(getMailAccountCacheDir(workspaceId), 'contacts.json')
}

export async function readCachedContacts(workspaceId: string) {
  await ensureMailAccountCache(workspaceId)
  const cached = await readJson<CachedContacts | null>(
    contactsCachePath(workspaceId),
    null,
  )
  return cached?.contacts ?? null
}

export async function writeCachedContacts(
  workspaceId: string,
  contacts: MailContact[],
) {
  await ensureMailAccountCache(workspaceId)
  const current = await readJson<CachedContacts | null>(
    contactsCachePath(workspaceId),
    null,
  )
  if (current && isJsonSemanticallyEqual(current.contacts, contacts)) {
    return false
  }
  await ensureDir(getMailAccountCacheDir(workspaceId))
  await writeJson(contactsCachePath(workspaceId), {
    cachedAt: new Date().toISOString(),
    contacts,
  } satisfies CachedContacts)
  return true
}
