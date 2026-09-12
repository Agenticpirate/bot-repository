import {
  getAppDataDir,
  getAppId,
  getMoldableHome,
  getWorkspaceId,
  safePath,
} from '@moldable-ai/storage'
import { AsyncLocalStorage } from 'node:async_hooks'

export interface MailAccountContext {
  workspaceId: string
  accountId: string
  vaultGroupId?: string
  useLegacyStorage?: boolean
}

const mailAccountStorage = new AsyncLocalStorage<MailAccountContext>()

export function runWithMailAccountContext<T>(
  context: MailAccountContext,
  task: () => T,
): T {
  return mailAccountStorage.run(context, task)
}

export function enterMailAccountContext(context: MailAccountContext) {
  mailAccountStorage.enterWith(context)
}

export function getMailAccountContext(workspaceId?: string) {
  const context = mailAccountStorage.getStore()
  if (!context) return null
  if (workspaceId && context.workspaceId !== workspaceId) return null
  return context
}

export function getMailAccountDataDir(workspaceId?: string) {
  const context = getMailAccountContext(workspaceId)
  return context
    ? getMailAccountDataDirForAccount(context)
    : getAppDataDir(workspaceId)
}

export function getMailAccountDataDirForAccount(account: MailAccountContext) {
  const base = getAppDataDir(account.workspaceId)
  if (account.useLegacyStorage) return base
  return safePath(base, 'accounts', safeAccountSegment(account.accountId))
}

/**
 * Compatibility implementation of @moldable-ai/storage's getAppCacheDir.
 * Mail can adopt the published helper directly after the next storage-package
 * release without changing its on-disk contract.
 */
function getMailAppCacheDir(workspaceId?: string) {
  const appId = getAppId()
  if (workspaceId && appId) {
    return safePath(
      getMoldableHome(),
      'cache',
      'workspaces',
      safeAccountSegment(workspaceId),
      'apps',
      safeAccountSegment(appId),
    )
  }
  if (process.env.MOLDABLE_APP_CACHE_DIR) {
    return process.env.MOLDABLE_APP_CACHE_DIR
  }
  if (appId) {
    return safePath(
      getMoldableHome(),
      'cache',
      'workspaces',
      safeAccountSegment(getWorkspaceId()),
      'apps',
      safeAccountSegment(appId),
    )
  }
  return safePath(process.cwd(), '.cache')
}

export function getMailAccountCacheDir(workspaceId?: string) {
  const context = getMailAccountContext(workspaceId)
  return context
    ? getMailAccountCacheDirForAccount(context)
    : getMailAppCacheDir(workspaceId)
}

export function getMailAccountCacheDirForAccount(account: MailAccountContext) {
  const base = getMailAppCacheDir(account.workspaceId)
  if (account.useLegacyStorage) return base
  return safePath(base, 'accounts', safeAccountSegment(account.accountId))
}

export function mailAccountScopeKey(workspaceId: string) {
  const context = getMailAccountContext(workspaceId)
  return `${workspaceId}:${context?.accountId ?? 'legacy'}`
}

function safeAccountSegment(accountId: string) {
  return accountId.replace(/[^a-zA-Z0-9_-]/g, '_') || 'account'
}
