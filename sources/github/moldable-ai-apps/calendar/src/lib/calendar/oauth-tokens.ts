import {
  getAppDataDir,
  readJson,
  safePath,
  writeJson,
} from '@moldable-ai/storage'
import { upsertWorkspaceSecret } from '../aivault'

export const CALENDAR_VAULT_SECRET_NAME = 'GOOGLE_CALENDAR_OAUTH'

export interface GoogleTokens {
  access_token?: string
  refresh_token?: string
  expiry_date?: number
  token_type?: string
  scope?: string
  expires_in?: number
}

const DEFAULT_CLIENT_ID =
  '41613180648-695hpsmivjfsi02vkge9k713j3un09i4.apps.googleusercontent.com'
const legacyMigrations = new Map<string, Promise<void>>()

export function getCalendarClientCredentials() {
  return {
    clientId:
      process.env.CALENDAR_GOOGLE_CLIENT_ID ??
      process.env.GOOGLE_CLIENT_ID ??
      DEFAULT_CLIENT_ID,
  }
}

export function toVaultOAuthPayload(tokens: GoogleTokens) {
  const { clientId } = getCalendarClientCredentials()
  const accessTokenExpiresAtMs =
    tokens.expiry_date ??
    (tokens.expires_in ? Date.now() + tokens.expires_in * 1000 : undefined)

  return JSON.stringify({
    clientId,
    refreshToken: tokens.refresh_token ?? '',
    accessToken: tokens.access_token ?? null,
    accessTokenExpiresAtMs: accessTokenExpiresAtMs ?? 0,
  })
}

function tokenPath(workspaceId: string) {
  return safePath(getAppDataDir(workspaceId), 'tokens.json')
}

export async function migrateLegacyCalendarTokens(workspaceId: string) {
  const existing = legacyMigrations.get(workspaceId)
  if (existing) return existing

  const migration = migrateLegacyCalendarTokensOnce(workspaceId).finally(() => {
    if (legacyMigrations.get(workspaceId) === migration) {
      legacyMigrations.delete(workspaceId)
    }
  })
  legacyMigrations.set(workspaceId, migration)
  return migration
}

async function migrateLegacyCalendarTokensOnce(workspaceId: string) {
  const legacyTokens = await readJson<GoogleTokens | null>(
    tokenPath(workspaceId),
    null,
  )
  if (!legacyTokens?.refresh_token) return

  await upsertWorkspaceSecret(
    workspaceId,
    CALENDAR_VAULT_SECRET_NAME,
    toVaultOAuthPayload(legacyTokens),
  )
  await writeJson(tokenPath(workspaceId), null)
}

export async function clearLegacyCalendarTokens(workspaceId: string) {
  await writeJson(tokenPath(workspaceId), null)
}
