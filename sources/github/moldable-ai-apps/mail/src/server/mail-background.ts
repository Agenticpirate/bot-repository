import { startGmailEventSync, stopGmailEventSync } from './gmail-event-sync'
import {
  startGmailTokenKeepalive,
  startMailBackgroundSync,
  stopGmailTokenKeepalive,
  stopMailBackgroundSync,
} from './gmail-service'
import { runWithMailAccountContext } from './mail-account-context'
import { type MailAccount, getMailAccountsState } from './mail-accounts'
import { registeredMailWorkspaceIds } from './workspace-registry'

const WORKSPACE_RECONCILIATION_INTERVAL_MS = 5_000
const activeAccounts = new Map<string, MailAccount>()
const disconnectedAccounts = new Set<string>()
let workspaceReconciliationInterval: ReturnType<typeof setInterval> | undefined

function accountKey(account: Pick<MailAccount, 'workspaceId' | 'accountId'>) {
  return `${account.workspaceId}\0${account.accountId}`
}

export function startMailAccountBackgroundServices(account: MailAccount) {
  const key = accountKey(account)
  if (disconnectedAccounts.has(key)) return
  if (activeAccounts.has(key)) return
  activeAccounts.set(key, account)
  try {
    runWithMailAccountContext(account, () => {
      startGmailTokenKeepalive(account.workspaceId)
      startMailBackgroundSync(account.workspaceId)
      startGmailEventSync(account)
    })
  } catch (error) {
    try {
      runWithMailAccountContext(account, () => {
        stopGmailEventSync(account)
        stopGmailTokenKeepalive(account.workspaceId)
        stopMailBackgroundSync(account.workspaceId)
      })
    } catch (cleanupError) {
      console.warn('Failed to roll back Mail background startup:', cleanupError)
    }
    activeAccounts.delete(key)
    throw error
  }
}

export function stopMailAccountBackgroundServices(account: MailAccount) {
  activeAccounts.delete(accountKey(account))
  runWithMailAccountContext(account, () => {
    stopGmailEventSync(account)
    stopGmailTokenKeepalive(account.workspaceId)
    stopMailBackgroundSync(account.workspaceId)
  })
}

export function disconnectMailAccountBackgroundServices(account: MailAccount) {
  disconnectedAccounts.add(accountKey(account))
  stopMailAccountBackgroundServices(account)
}

export function resumeMailAccountBackgroundServices(account: MailAccount) {
  disconnectedAccounts.delete(accountKey(account))
  startMailAccountBackgroundServices(account)
}

export async function startMailBackgroundServices(workspaceId: string) {
  const state = await getMailAccountsState(workspaceId)
  for (const account of state.accounts) {
    startMailAccountBackgroundServices(account)
  }
  return state.accounts.length
}

export async function startMailBackgroundServicesForAllWorkspaces(
  preferredWorkspaceId?: string,
) {
  const workspaceIds = await discoverMailWorkspaceIds(preferredWorkspaceId)
  let accountCount = 0
  for (const workspaceId of workspaceIds) {
    accountCount += await startMailBackgroundServices(workspaceId)
  }
  startWorkspaceReconciliation()
  return { workspaceCount: workspaceIds.length, accountCount }
}

export async function discoverMailWorkspaceIds(preferredWorkspaceId?: string) {
  const registered = await registeredMailWorkspaceIds()
  if (!preferredWorkspaceId || !registered.includes(preferredWorkspaceId)) {
    return registered
  }
  return [
    preferredWorkspaceId,
    ...registered.filter((workspaceId) => workspaceId !== preferredWorkspaceId),
  ]
}

export async function reconcileMailBackgroundWorkspaces() {
  const registered = new Set(await registeredMailWorkspaceIds())
  for (const account of [...activeAccounts.values()]) {
    if (!registered.has(account.workspaceId)) {
      stopMailAccountBackgroundServices(account)
    }
  }
  for (const workspaceId of registered) {
    await startMailBackgroundServices(workspaceId)
  }
}

export function stopAllMailBackgroundServices() {
  if (workspaceReconciliationInterval) {
    clearInterval(workspaceReconciliationInterval)
    workspaceReconciliationInterval = undefined
  }
  for (const account of [...activeAccounts.values()]) {
    stopMailAccountBackgroundServices(account)
  }
}

function startWorkspaceReconciliation() {
  if (workspaceReconciliationInterval) return
  workspaceReconciliationInterval = setInterval(() => {
    void reconcileMailBackgroundWorkspaces().catch((error) => {
      console.warn('Failed to reconcile Mail workspaces:', error)
    })
  }, WORKSPACE_RECONCILIATION_INTERVAL_MS)
  workspaceReconciliationInterval.unref?.()
}
