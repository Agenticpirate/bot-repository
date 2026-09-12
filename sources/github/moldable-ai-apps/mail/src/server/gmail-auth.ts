import {
  ensureDir,
  getAppDataDir,
  readJson,
  safePath,
  writeJson,
} from '@moldable-ai/storage'
import { upsertWorkspaceSecret } from './aivault'
import { getMailAccountContext } from './mail-account-context'
import {
  GMAIL_VAULT_SECRET_NAME,
  isMailAccountAuthenticated,
  registerMailAccount,
  removeMailAccount,
} from './mail-accounts'
import crypto from 'node:crypto'
import { readdir, rm, stat, writeFile } from 'node:fs/promises'

interface GoogleTokens {
  access_token?: string
  refresh_token?: string
  expiry_date?: number
  token_type?: string
  scope?: string
  expires_in?: number
}

interface BrokerTokenResponse {
  ok?: boolean
  tokens?: GoogleTokens
  error?: {
    code?: string
    message?: string
  }
}

interface PKCEState {
  candidate_account_id: string
  code_verifier: string
  created_at: number
  state: string
  workspace_id?: string
}

const DEFAULT_CLIENT_ID =
  '41613180648-695hpsmivjfsi02vkge9k713j3un09i4.apps.googleusercontent.com'
const SCOPES = [
  'https://www.googleapis.com/auth/gmail.modify',
  'https://www.googleapis.com/auth/gmail.send',
  'https://www.googleapis.com/auth/gmail.settings.basic',
  'https://www.googleapis.com/auth/contacts.readonly',
]
const PKCE_TTL_MS = 10 * 60 * 1000
const MAX_PKCE_STATES = 32

function getRedirectUri(): string {
  const port = process.env.MOLDABLE_PORT || process.env.PORT || '3007'
  return `http://localhost:${port}/api/auth/callback`
}

function getClientCredentials() {
  return {
    clientId:
      process.env.GMAIL_GOOGLE_CLIENT_ID ??
      process.env.GOOGLE_CLIENT_ID ??
      DEFAULT_CLIENT_ID,
  }
}

function getBrokerUrl() {
  return (
    process.env.GOOGLE_OAUTH_BROKER_URL ??
    process.env.MOLDABLE_AUTH_URL ??
    'https://auth.moldable.sh'
  ).replace(/\/+$/, '')
}

function generateCodeVerifier(): string {
  return crypto.randomBytes(32).toString('base64url')
}

function generateCodeChallenge(verifier: string): string {
  return crypto.createHash('sha256').update(verifier).digest('base64url')
}

function generateOAuthState(): string {
  return crypto.randomBytes(32).toString('base64url')
}

function tokenPath(workspaceId?: string) {
  return safePath(getAppDataDir(workspaceId), 'gmail-tokens.json')
}

function pkcePath(state: string) {
  return safePath(getAppDataDir(), 'oauth', `gmail-${state}.json`)
}

function isPkceState(value: unknown): value is PKCEState {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false
  const state = value as Partial<PKCEState>
  return (
    typeof state.candidate_account_id === 'string' &&
    /^[0-9a-f-]{36}$/i.test(state.candidate_account_id) &&
    typeof state.code_verifier === 'string' &&
    /^[a-zA-Z0-9_-]{40,128}$/.test(state.code_verifier) &&
    typeof state.created_at === 'number' &&
    Number.isFinite(state.created_at) &&
    typeof state.state === 'string' &&
    /^[a-zA-Z0-9_-]{20,100}$/.test(state.state) &&
    (state.workspace_id === undefined ||
      /^[a-zA-Z0-9][a-zA-Z0-9_-]{0,127}$/.test(state.workspace_id))
  )
}

async function prunePkceStates(dataDir: string) {
  const names = await readdir(dataDir).catch((error: NodeJS.ErrnoException) => {
    if (error.code === 'ENOENT') return []
    throw error
  })
  const candidates = await Promise.all(
    names
      .filter((name) => /^gmail-[a-zA-Z0-9_-]{20,100}\.json$/.test(name))
      .map(async (name) => {
        const path = safePath(dataDir, name)
        const metadata = await stat(path).catch(() => null)
        return metadata?.isFile()
          ? { path, modifiedAt: metadata.mtimeMs }
          : null
      }),
  )
  const now = Date.now()
  const sorted = candidates
    .filter(
      (candidate): candidate is NonNullable<typeof candidate> => !!candidate,
    )
    .sort((left, right) => right.modifiedAt - left.modifiedAt)
  await Promise.all(
    sorted
      .filter(
        (candidate, index) =>
          now - candidate.modifiedAt > PKCE_TTL_MS ||
          index >= MAX_PKCE_STATES - 1,
      )
      .map((candidate) => rm(candidate.path, { force: true })),
  )
}

function toVaultOAuthPayload(tokens: GoogleTokens) {
  const { clientId } = getClientCredentials()
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

export async function getAuthUrl(workspaceId?: string) {
  const { clientId } = getClientCredentials()
  const codeVerifier = generateCodeVerifier()
  const codeChallenge = generateCodeChallenge(codeVerifier)
  const state = generateOAuthState()
  const candidateAccountId = crypto.randomUUID()
  const dataDir = safePath(getAppDataDir(), 'oauth')

  if (workspaceId && !/^[a-zA-Z0-9][a-zA-Z0-9_-]{0,127}$/.test(workspaceId)) {
    throw new Error('Invalid workspace for Gmail authentication')
  }

  await ensureDir(dataDir)
  await prunePkceStates(dataDir)
  await writeFile(
    pkcePath(state),
    JSON.stringify({
      candidate_account_id: candidateAccountId,
      code_verifier: codeVerifier,
      created_at: Date.now(),
      state,
      workspace_id: workspaceId,
    } satisfies PKCEState),
    { encoding: 'utf8', flag: 'wx', mode: 0o600 },
  )

  const url = new URL('https://accounts.google.com/o/oauth2/v2/auth')
  url.searchParams.set('client_id', clientId)
  url.searchParams.set('redirect_uri', getRedirectUri())
  url.searchParams.set('response_type', 'code')
  url.searchParams.set('scope', SCOPES.join(' '))
  url.searchParams.set('access_type', 'offline')
  url.searchParams.set('prompt', 'consent select_account')
  url.searchParams.set('state', state)
  url.searchParams.set('code_challenge_method', 'S256')
  url.searchParams.set('code_challenge', codeChallenge)
  return url.toString()
}

export async function saveTokens(code: string, state: string | undefined) {
  if (!state || !/^[a-zA-Z0-9_-]{20,100}$/.test(state)) {
    throw new Error('OAuth state mismatch - please try authenticating again')
  }
  const statePath = pkcePath(state)
  const storedState = await readJson<unknown>(statePath, null)

  if (!isPkceState(storedState)) {
    await rm(statePath, { force: true })
    throw new Error('PKCE state not found - auth flow may have expired')
  }
  const pkceState = storedState
  await rm(statePath, { force: true })

  if (Date.now() - pkceState.created_at > PKCE_TTL_MS) {
    throw new Error('PKCE state expired - please try authenticating again')
  }

  if (state !== pkceState.state) {
    throw new Error('OAuth state mismatch - please try authenticating again')
  }

  const { clientId } = getClientCredentials()
  const response = await fetch(`${getBrokerUrl()}/api/google/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      clientId,
      code,
      codeVerifier: pkceState.code_verifier,
      redirectUri: getRedirectUri(),
    }),
  })
  const brokerResponse = (await response.json()) as BrokerTokenResponse
  const tokens = brokerResponse.tokens

  if (!response.ok || !tokens) {
    throw new Error(
      brokerResponse.error?.message ??
        brokerResponse.error?.code ??
        'Google token exchange failed',
    )
  }

  if (!tokens.refresh_token) {
    throw new Error(
      'Google did not return a refresh token. Please reconnect Gmail.',
    )
  }

  const workspaceId = pkceState.workspace_id ?? 'personal'

  const account = await registerMailAccount({
    workspaceId,
    candidateAccountId: pkceState.candidate_account_id,
    vaultPayload: toVaultOAuthPayload(tokens),
  })

  return { tokens, account }
}

export async function isAuthenticated(
  workspaceId?: string,
  accountId?: string | null,
): Promise<boolean> {
  const id = workspaceId ?? 'personal'
  await migrateLegacyTokensToVault(id)
  return isMailAccountAuthenticated(
    id,
    accountId ?? getMailAccountContext(id)?.accountId,
  )
}

export async function clearTokens(
  workspaceId?: string,
  accountId?: string | null,
): Promise<{ activeAccountId: string | null }> {
  const id = workspaceId ?? 'personal'
  const result = await removeMailAccount(id, accountId ?? '')
  const dataDir = getAppDataDir(workspaceId)
  await ensureDir(dataDir)
  await writeJson(tokenPath(workspaceId), null)
  return result
}

async function migrateLegacyTokensToVault(workspaceId: string) {
  const legacyTokens = await readJson<GoogleTokens | null>(
    tokenPath(workspaceId),
    null,
  )
  if (!legacyTokens?.refresh_token) return

  await upsertWorkspaceSecret(
    workspaceId,
    GMAIL_VAULT_SECRET_NAME,
    toVaultOAuthPayload(legacyTokens),
  )
  await writeJson(tokenPath(workspaceId), null)
}
