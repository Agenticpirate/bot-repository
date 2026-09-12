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
} from './aivault'
import {
  type MailAccountContext,
  getMailAccountCacheDirForAccount,
  getMailAccountDataDirForAccount,
} from './mail-account-context'
import { createHash } from 'node:crypto'
import { rm } from 'node:fs/promises'

export const GMAIL_VAULT_SECRET_NAME = 'GOOGLE_GMAIL_OAUTH'

export interface MailAccount extends MailAccountContext {
  emailAddress: string
  connectedAt: string
  lastUsedAt: string
}

interface MailAccountsStore {
  version: 1
  activeAccountId: string | null
  accounts: MailAccount[]
}

const EMPTY_STORE: MailAccountsStore = {
  version: 1,
  activeAccountId: null,
  accounts: [],
}

const accountUpdates = new Map<string, Promise<void>>()
const LEGACY_PRIVATE_DATA_ENTRIES = [
  'attachments',
  'contacts.json',
  'gmail-event-cursor-v1.json',
  'messages',
  'profile.json',
  'snooze.json',
  'today.json',
  'ui-intent.json',
] as const

function accountsPath(workspaceId: string) {
  return safePath(getAppDataDir(workspaceId), 'mail-accounts.json')
}

async function readStore(workspaceId: string): Promise<MailAccountsStore> {
  const stored = await readJson<MailAccountsStore | null>(
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

async function writeStore(workspaceId: string, store: MailAccountsStore) {
  await ensureDir(getAppDataDir(workspaceId))
  await writeJson(accountsPath(workspaceId), store)
}

async function updateStore<T>(
  workspaceId: string,
  update: (store: MailAccountsStore) => Promise<T> | T,
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
  return `gmail-${digest}`
}

async function ensureLegacyAccount(workspaceId: string) {
  const existing = await readStore(workspaceId)
  if (existing.accounts.length > 0) return existing
  if (!(await findWorkspaceSecret(workspaceId, GMAIL_VAULT_SECRET_NAME))) {
    return existing
  }

  const profile = await invokeAivaultJson<{ emailAddress?: string }>(
    workspaceId,
    'google-gmail/profile',
    { path: '/gmail/v1/users/me/profile' },
    { groupId: null },
  )
  const emailAddress = profile.emailAddress?.trim()
  if (!emailAddress) {
    throw new Error('Gmail profile did not include an email address')
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
      useLegacyStorage: true,
    })
    store.activeAccountId = accountId
    return store
  })
}

export async function listMailAccounts(workspaceId: string) {
  return (await ensureLegacyAccount(workspaceId)).accounts
}

export async function getMailAccountsState(workspaceId: string) {
  const store = await ensureLegacyAccount(workspaceId)
  return {
    accounts: store.accounts,
    activeAccountId: store.activeAccountId,
  }
}

export async function resolveMailAccount(
  workspaceId: string,
  requestedAccountId?: string | null,
): Promise<MailAccount> {
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
    const error = new Error('Gmail is not connected')
    error.name = 'GmailNotConnected'
    throw error
  }
  return account
}

export async function isMailAccountAuthenticated(
  workspaceId: string,
  requestedAccountId?: string | null,
) {
  try {
    const account = await resolveMailAccount(workspaceId, requestedAccountId)
    const secret = account.vaultGroupId
      ? await findGroupSecret(
          workspaceId,
          account.vaultGroupId,
          GMAIL_VAULT_SECRET_NAME,
        )
      : await findWorkspaceSecret(workspaceId, GMAIL_VAULT_SECRET_NAME)
    return Boolean(secret)
  } catch (error) {
    if (error instanceof Error && error.name === 'GmailNotConnected') {
      return false
    }
    throw error
  }
}

export async function setActiveMailAccount(
  workspaceId: string,
  accountId: string,
) {
  return updateStore(workspaceId, (store) => {
    const account = store.accounts.find(
      (candidate) => candidate.accountId === accountId,
    )
    if (!account) throw new Error('Unknown Gmail account')
    account.lastUsedAt = new Date().toISOString()
    store.activeAccountId = account.accountId
    return account
  })
}

export async function registerMailAccount({
  workspaceId,
  candidateAccountId,
  vaultPayload,
}: {
  workspaceId: string
  candidateAccountId: string
  vaultPayload: string
}) {
  const candidateGroupId = `gmail-account-${candidateAccountId}`
  await ensureLegacyAccount(workspaceId)
  await upsertGroupSecret(
    workspaceId,
    candidateGroupId,
    GMAIL_VAULT_SECRET_NAME,
    vaultPayload,
  )

  try {
    const profile = await invokeAivaultJson<{ emailAddress?: string }>(
      workspaceId,
      'google-gmail/profile',
      { path: '/gmail/v1/users/me/profile' },
      { groupId: candidateGroupId },
    )
    const emailAddress = profile.emailAddress?.trim()
    if (!emailAddress) {
      throw new Error('Gmail profile did not include an email address')
    }

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
      const account: MailAccount = {
        accountId: candidateAccountId,
        workspaceId,
        emailAddress,
        vaultGroupId: candidateGroupId,
        connectedAt: now,
        lastUsedAt: now,
      }
      store.accounts.push(account)
      store.activeAccountId = account.accountId
      return { account, created: true as const }
    })

    if (!registration.created) {
      const existing = registration.account
      if (existing.vaultGroupId === candidateGroupId) return existing
      if (existing.vaultGroupId) {
        await upsertGroupSecret(
          workspaceId,
          existing.vaultGroupId,
          GMAIL_VAULT_SECRET_NAME,
          vaultPayload,
        )
      } else {
        await upsertWorkspaceSecret(
          workspaceId,
          GMAIL_VAULT_SECRET_NAME,
          vaultPayload,
        )
      }
      await deleteGroupSecret(
        workspaceId,
        candidateGroupId,
        GMAIL_VAULT_SECRET_NAME,
      )
      return existing
    }
    return registration.account
  } catch (error) {
    await deleteGroupSecret(
      workspaceId,
      candidateGroupId,
      GMAIL_VAULT_SECRET_NAME,
    ).catch(() => {})
    throw error
  }
}

export async function removeMailAccount(
  workspaceId: string,
  accountId: string,
) {
  const account = await resolveMailAccount(workspaceId, accountId)
  // Clear cached bodies and attachments before revoking the credential, then
  // clear once more after removing the registry entry to catch an in-flight
  // sync that was already winding down when disconnect began.
  await purgeMailAccountPrivateData(account)
  if (account.vaultGroupId) {
    await deleteGroupSecret(
      workspaceId,
      account.vaultGroupId,
      GMAIL_VAULT_SECRET_NAME,
    )
  } else {
    await deleteWorkspaceSecret(workspaceId, GMAIL_VAULT_SECRET_NAME)
  }

  const result = await updateStore(workspaceId, (store) => {
    store.accounts = store.accounts.filter(
      (candidate) => candidate.accountId !== account.accountId,
    )
    if (store.activeAccountId === account.accountId) {
      store.activeAccountId = store.accounts[0]?.accountId ?? null
    }
    return { activeAccountId: store.activeAccountId }
  })
  await purgeMailAccountPrivateData(account)
  return result
}

async function purgeMailAccountPrivateData(account: MailAccount) {
  const accountDataDir = getMailAccountDataDirForAccount(account)
  const accountCacheDir = getMailAccountCacheDirForAccount(account)
  await rm(accountCacheDir, { recursive: true, force: true })
  if (!account.useLegacyStorage) {
    await rm(accountDataDir, { recursive: true, force: true })
    return
  }

  await Promise.all(
    LEGACY_PRIVATE_DATA_ENTRIES.map((entry) =>
      rm(safePath(accountDataDir, entry), { recursive: true, force: true }),
    ),
  )
}
