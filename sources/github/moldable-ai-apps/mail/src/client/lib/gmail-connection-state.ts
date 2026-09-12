import type { MailStatus } from '../types'

function accountSignature(status: MailStatus | undefined) {
  return (status?.accounts ?? [])
    .map((account) =>
      [
        account.id,
        account.emailAddress.trim().toLowerCase(),
        account.authenticated === false ? 'disconnected' : 'connected',
      ].join('\u0000'),
    )
    .sort()
}

/**
 * OAuth completes in the system browser, outside the Mail webview. Compare
 * the server state from immediately before login with subsequent snapshots so
 * the webview knows when the callback has registered or reauthenticated an
 * account.
 */
export function hasGmailConnectionChanged(
  before: MailStatus | undefined,
  after: MailStatus,
) {
  if (!before) return after.authenticated || after.accounts.length > 0
  if (before.authenticated !== after.authenticated) return true
  if (before.activeAccountId !== after.activeAccountId) return true

  const beforeAccounts = accountSignature(before)
  const afterAccounts = accountSignature(after)
  if (beforeAccounts.length !== afterAccounts.length) return true
  return beforeAccounts.some(
    (account, index) => account !== afterAccounts[index],
  )
}
