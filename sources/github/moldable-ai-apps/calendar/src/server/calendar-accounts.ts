import {
  ensureDir,
  getAppDataDir,
  readJson,
  safePath,
  writeJson,
} from '@moldable-ai/storage'
import {
  deleteGroupSecret,
  deleteWorkspaceSecret,
  findGroupSecret,
  findWorkspaceSecret,
  invokeAivaultJson,
  upsertGroupSecret,
  upsertWorkspaceSecret,
} from '../lib/aivault'
import type { CalendarAccountContext } from '../lib/calendar/account-context'
import {
  CALENDAR_VAULT_SECRET_NAME,
  migrateLegacyCalendarTokens,
} from '../lib/calendar/oauth-tokens'
import { createHash } from 'node:crypto'

export interface CalendarAccount extends CalendarAccountContext {
  emailAddress: string
  connectedAt: string
  lastUsedAt: string
  legacyIdentityUnavailable?: boolean
}

interface CalendarAccountsStore {
  version: 1
  activeAccountId: string | null
  accounts: CalendarAccount[]
}

interface PrimaryCalendarProfile {
  id?: string | null
  summary?: string | null
}

const EMPTY_STORE: CalendarAccountsStore = {
  version: 1,
  activeAccountId: null,
  accounts: [],
}

const accountUpdates = new Map<string, Promise<void>>()

function accountsPath(workspaceId: string) {
  return safePath(getAppDataDir(workspaceId), 'calendar-accounts.json')
}

async function readStore(workspaceId: string): Promise<CalendarAccountsStore> {
  const stored = await readJson<CalendarAccountsStore | null>(
    accountsPath(workspaceId),
    null,
  )
  if (!stored || stored.version !== 1 || !Array.isArray(stored.accounts)) {
    return { ...EMPTY_STORE, accounts: [] }
  }

  const accounts = stored.accounts.filter(
    (account) =>
      account &&
      account.workspaceId === workspaceId &&
      typeof account.accountId === 'string' &&
      typeof account.emailAddress === 'string',
  )
  const activeAccountId = accounts.some(
    (account) => account.accountId === stored.activeAccountId,
  )
    ? stored.activeAccountId
    : (accounts[0]?.accountId ?? null)

  return { version: 1, activeAccountId, accounts }
}

async function writeStore(workspaceId: string, store: CalendarAccountsStore) {
  await ensureDir(getAppDataDir(workspaceId))
  await writeJson(accountsPath(workspaceId), store)
}

async function updateStore<T>(
  workspaceId: string,
  update: (store: CalendarAccountsStore) => Promise<T> | T,
): Promise<T> {
  const previous = accountUpdates.get(workspaceId) ?? Promise.resolve()
  let release = () => {}
  const current = new Promise<void>((resolve) => {
    release = resolve
  })
  const queued = previous.then(() => current)
  accountUpdates.set(workspaceId, queued)

  await previous
  try {
    const store = await readStore(workspaceId)
    const result = await update(store)
    await writeStore(workspaceId, store)
    return result
  } finally {
    release()
    if (accountUpdates.get(workspaceId) === queued) {
      accountUpdates.delete(workspaceId)
    }
  }
}

function legacyAccountId(emailAddress: string) {
  const digest = createHash('sha256')
    .update(emailAddress.trim().toLowerCase())
    .digest('hex')
    .slice(0, 16)
  return `google-calendar-${digest}`
}

function profileEmailAddress(profile: PrimaryCalendarProfile) {
  const calendarId = profile.id?.trim()
  if (calendarId) return calendarId
  const summary = profile.summary?.trim()
  if (summary) return summary
  throw new Error('Google Calendar did not identify the connected account')
}

function isCredentialAuthError(error: unknown) {
  const candidate = error as {
    code?: number
    status?: number
    response?: { status?: number }
    message?: string
  }
  const message = candidate.message?.toLowerCase() ?? ''
  return (
    candidate.code === 401 ||
    candidate.status === 401 ||
    candidate.response?.status === 401 ||
    message.includes('unauthorized') ||
    message.includes('invalid_grant') ||
    message.includes('oauth')
  )
}

async function readPrimaryCalendarProfile(
  workspaceId: string,
  groupId: string | null,
) {
  return invokeAivaultJson<PrimaryCalendarProfile>(
    workspaceId,
    'google-calendar/lists',
    {
      method: 'GET',
      path: '/calendar/v3/users/me/calendarList/primary',
    },
    { groupId },
  )
}

async function ensureLegacyAccount(workspaceId: string) {
  await migrateLegacyCalendarTokens(workspaceId)
  const existing = await readStore(workspaceId)
  if (existing.accounts.length > 0) return existing
  if (!(await findWorkspaceSecret(workspaceId, CALENDAR_VAULT_SECRET_NAME))) {
    return existing
  }

  let emailAddress: string
  let legacyIdentityUnavailable = false
  try {
    const profile = await readPrimaryCalendarProfile(workspaceId, null)
    emailAddress = profileEmailAddress(profile)
  } catch (error) {
    if (!isCredentialAuthError(error)) throw error
    emailAddress = 'Google Calendar account'
    legacyIdentityUnavailable = true
  }

  return updateStore(workspaceId, (store) => {
    if (store.accounts.length > 0) return store
    const now = new Date().toISOString()
    const accountId = legacyAccountId(emailAddress)
    store.accounts.push({
      accountId,
      workspaceId,
      emailAddress,
      connectedAt: now,
      lastUsedAt: now,
      legacyIdentityUnavailable,
    })
    store.activeAccountId = accountId
    return store
  })
}

export async function getCalendarAccountsState(workspaceId: string) {
  const store = await ensureLegacyAccount(workspaceId)
  return {
    accounts: store.accounts,
    activeAccountId: store.activeAccountId,
  }
}

export async function resolveCalendarAccount(
  workspaceId: string,
  requestedAccountId?: string | null,
): Promise<CalendarAccount> {
  const store = await ensureLegacyAccount(workspaceId)
  const requested = requestedAccountId?.trim()
  const account = requested
    ? store.accounts.find(
        (candidate) =>
          candidate.accountId === requested ||
          candidate.emailAddress.toLowerCase() === requested.toLowerCase(),
      )
    : (store.accounts.find(
        (candidate) => candidate.accountId === store.activeAccountId,
      ) ?? store.accounts[0])

  if (!account) {
    const error = new Error('Calendar is not connected')
    error.name = 'CalendarNotConnected'
    throw error
  }
  return account
}

export async function isCalendarAccountAuthenticated(
  workspaceId: string,
  requestedAccountId?: string | null,
) {
  try {
    const account = await resolveCalendarAccount(
      workspaceId,
      requestedAccountId,
    )
    const secret = account.vaultGroupId
      ? await findGroupSecret(
          workspaceId,
          account.vaultGroupId,
          CALENDAR_VAULT_SECRET_NAME,
        )
      : await findWorkspaceSecret(workspaceId, CALENDAR_VAULT_SECRET_NAME)
    return Boolean(secret)
  } catch (error) {
    if (error instanceof Error && error.name === 'CalendarNotConnected') {
      return false
    }
    throw error
  }
}

export async function setActiveCalendarAccount(
  workspaceId: string,
  accountId: string,
) {
  return updateStore(workspaceId, (store) => {
    const account = store.accounts.find(
      (candidate) => candidate.accountId === accountId,
    )
    if (!account) throw new Error('Unknown Google Calendar account')
    account.lastUsedAt = new Date().toISOString()
    store.activeAccountId = account.accountId
    return account
  })
}

export async function registerCalendarAccount({
  workspaceId,
  candidateAccountId,
  vaultPayload,
}: {
  workspaceId: string
  candidateAccountId: string
  vaultPayload: string
}) {
  const candidateGroupId = `calendar-account-${candidateAccountId}`
  await ensureLegacyAccount(workspaceId)
  await upsertGroupSecret(
    workspaceId,
    candidateGroupId,
    CALENDAR_VAULT_SECRET_NAME,
    vaultPayload,
  )

  try {
    const profile = await readPrimaryCalendarProfile(
      workspaceId,
      candidateGroupId,
    )
    const emailAddress = profileEmailAddress(profile)

    const registration = await updateStore(workspaceId, (store) => {
      const existing = store.accounts.find(
        (account) =>
          account.emailAddress.toLowerCase() === emailAddress.toLowerCase(),
      )
      if (existing) {
        existing.lastUsedAt = new Date().toISOString()
        store.activeAccountId = existing.accountId
        return { account: existing, created: false as const }
      }

      const now = new Date().toISOString()
      const account: CalendarAccount = {
        accountId: candidateAccountId,
        workspaceId,
        emailAddress,
        vaultGroupId: candidateGroupId,
        connectedAt: now,
        lastUsedAt: now,
      }
      const removedUnavailableLegacyAccount = store.accounts.some(
        (candidate) =>
          candidate.legacyIdentityUnavailable && !candidate.vaultGroupId,
      )
      if (removedUnavailableLegacyAccount) {
        store.accounts = store.accounts.filter(
          (candidate) =>
            !candidate.legacyIdentityUnavailable || candidate.vaultGroupId,
        )
      }
      store.accounts.push(account)
      store.activeAccountId = account.accountId
      return {
        account,
        created: true as const,
        removedUnavailableLegacyAccount,
      }
    })

    if (!registration.created) {
      const existing = registration.account
      if (existing.vaultGroupId === candidateGroupId) return existing
      if (existing.vaultGroupId) {
        await upsertGroupSecret(
          workspaceId,
          existing.vaultGroupId,
          CALENDAR_VAULT_SECRET_NAME,
          vaultPayload,
        )
      } else {
        await upsertWorkspaceSecret(
          workspaceId,
          CALENDAR_VAULT_SECRET_NAME,
          vaultPayload,
        )
      }
      await deleteGroupSecret(
        workspaceId,
        candidateGroupId,
        CALENDAR_VAULT_SECRET_NAME,
      )
      return existing
    }
    if (registration.removedUnavailableLegacyAccount) {
      await deleteWorkspaceSecret(workspaceId, CALENDAR_VAULT_SECRET_NAME)
    }
    return registration.account
  } catch (error) {
    await deleteGroupSecret(
      workspaceId,
      candidateGroupId,
      CALENDAR_VAULT_SECRET_NAME,
    ).catch(() => {})
    throw error
  }
}

export async function removeCalendarAccount(
  workspaceId: string,
  accountId: string,
) {
  const account = await resolveCalendarAccount(workspaceId, accountId)
  if (account.vaultGroupId) {
    await deleteGroupSecret(
      workspaceId,
      account.vaultGroupId,
      CALENDAR_VAULT_SECRET_NAME,
    )
  } else {
    await deleteWorkspaceSecret(workspaceId, CALENDAR_VAULT_SECRET_NAME)
  }

  return updateStore(workspaceId, (store) => {
    store.accounts = store.accounts.filter(
      (candidate) => candidate.accountId !== account.accountId,
    )
    if (store.activeAccountId === account.accountId) {
      store.activeAccountId = store.accounts[0]?.accountId ?? null
    }
    return { activeAccountId: store.activeAccountId }
  })
}
