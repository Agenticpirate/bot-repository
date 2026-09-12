import { safePath } from '@moldable-ai/storage'
import { upsertXOAuthCredential } from './aivault'
import { writeConnection } from './bookmark-files'
import { bookmarkPaths, ensureBookmarkDataDir } from './paths'
import { createHash, randomBytes } from 'node:crypto'
import { readFile, rm, writeFile } from 'node:fs/promises'

const SCOPES = ['bookmark.read', 'offline.access', 'tweet.read', 'users.read']

interface OAuthState {
  workspaceId: string
  clientId: string
  redirectUri: string
  verifier: string
  createdAt: string
}

export async function beginXOAuth(options: {
  workspaceId: string
  clientId: string
  origin: string
}): Promise<{ authorizeUrl: string; redirectUri: string }> {
  await ensureBookmarkDataDir(options.workspaceId)
  const state = randomBytes(24).toString('base64url')
  const verifier = randomBytes(48).toString('base64url')
  const challenge = createHash('sha256').update(verifier).digest('base64url')
  const redirectUri = `${options.origin}/api/auth/x/callback?workspace=${encodeURIComponent(options.workspaceId)}`
  const stored: OAuthState = {
    workspaceId: options.workspaceId,
    clientId: options.clientId,
    redirectUri,
    verifier,
    createdAt: new Date().toISOString(),
  }
  await writeFile(
    oauthStatePath(options.workspaceId, state),
    JSON.stringify(stored),
    {
      mode: 0o600,
    },
  )

  const authorize = new URL('https://x.com/i/oauth2/authorize')
  authorize.search = new URLSearchParams({
    response_type: 'code',
    client_id: options.clientId,
    redirect_uri: redirectUri,
    scope: SCOPES.join(' '),
    state,
    code_challenge: challenge,
    code_challenge_method: 'S256',
  }).toString()
  return { authorizeUrl: authorize.toString(), redirectUri }
}

export async function finishXOAuth(options: {
  workspaceId: string
  state: string
  code: string
}): Promise<void> {
  const statePath = oauthStatePath(options.workspaceId, options.state)
  let stored: OAuthState
  try {
    stored = JSON.parse(await readFile(statePath, 'utf8')) as OAuthState
  } finally {
    await rm(statePath, { force: true })
  }
  if (stored.workspaceId !== options.workspaceId)
    throw new Error('OAuth workspace mismatch')
  if (Date.now() - Date.parse(stored.createdAt) > 10 * 60 * 1_000) {
    throw new Error('The X authorization attempt expired')
  }

  const tokenResponse = await fetch('https://api.x.com/2/oauth2/token', {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code: options.code,
      grant_type: 'authorization_code',
      client_id: stored.clientId,
      redirect_uri: stored.redirectUri,
      code_verifier: stored.verifier,
    }),
  })
  const tokenJson = (await tokenResponse.json()) as Record<string, unknown>
  if (!tokenResponse.ok || typeof tokenJson.access_token !== 'string') {
    throw new Error('X did not accept the authorization code')
  }
  const profileResponse = await fetch(
    'https://api.x.com/2/users/me?user.fields=username',
    {
      headers: { authorization: `Bearer ${tokenJson.access_token}` },
    },
  )
  const profileJson = (await profileResponse.json()) as {
    data?: { id?: string; username?: string }
  }
  if (!profileResponse.ok || !profileJson.data?.id) {
    throw new Error('X did not return the authorized account')
  }

  const expiresIn =
    typeof tokenJson.expires_in === 'number' ? tokenJson.expires_in : 7_200
  await upsertXOAuthCredential(
    options.workspaceId,
    JSON.stringify({
      clientId: stored.clientId,
      refreshToken:
        typeof tokenJson.refresh_token === 'string'
          ? tokenJson.refresh_token
          : '',
      accessToken: tokenJson.access_token,
      accessTokenExpiresAtMs: Date.now() + expiresIn * 1_000,
    }),
  )
  await writeConnection(options.workspaceId, {
    method: 'oauth',
    clientId: stored.clientId,
    xUserId: profileJson.data.id,
    username: profileJson.data.username,
    connectedAt: new Date().toISOString(),
  })
}

function oauthStatePath(workspaceId: string, state: string): string {
  if (!/^[A-Za-z0-9_-]{20,80}$/.test(state))
    throw new Error('Invalid OAuth state')
  return safePath(bookmarkPaths(workspaceId).oauthDir, `${state}.json`)
}
