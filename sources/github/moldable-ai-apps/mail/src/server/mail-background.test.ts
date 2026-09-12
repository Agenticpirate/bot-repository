import {
  reconcileMailBackgroundWorkspaces,
  startMailAccountBackgroundServices,
  startMailBackgroundServices,
  stopAllMailBackgroundServices,
  stopMailAccountBackgroundServices,
} from './mail-background'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const {
  eventStarts,
  eventStops,
  startBehavior,
  registeredWorkspaceIds,
  syncStarts,
  syncStops,
  tokenStarts,
  tokenStops,
} = vi.hoisted(() => ({
  eventStarts: [] as string[],
  eventStops: [] as string[],
  startBehavior: { throwEventStart: false },
  registeredWorkspaceIds: ['personal'] as string[],
  syncStarts: [] as string[],
  syncStops: [] as string[],
  tokenStarts: [] as string[],
  tokenStops: [] as string[],
}))

vi.mock('./workspace-registry', () => ({
  registeredMailWorkspaceIds: async () => [...registeredWorkspaceIds],
}))

vi.mock('./gmail-event-sync', async () => {
  const { getMailAccountContext } = await import('./mail-account-context')
  return {
    startGmailEventSync: () => {
      eventStarts.push(getMailAccountContext()?.accountId ?? 'missing')
      if (startBehavior.throwEventStart) {
        throw new Error('event startup failed')
      }
    },
    stopGmailEventSync: () => {
      eventStops.push(getMailAccountContext()?.accountId ?? 'missing')
    },
  }
})

vi.mock('./gmail-service', async () => {
  const { getMailAccountContext } = await import('./mail-account-context')
  return {
    startGmailTokenKeepalive: () => {
      tokenStarts.push(getMailAccountContext()?.accountId ?? 'missing')
    },
    startMailBackgroundSync: () => {
      syncStarts.push(getMailAccountContext()?.accountId ?? 'missing')
    },
    stopGmailTokenKeepalive: () => {
      tokenStops.push(getMailAccountContext()?.accountId ?? 'missing')
    },
    stopMailBackgroundSync: () => {
      syncStops.push(getMailAccountContext()?.accountId ?? 'missing')
    },
  }
})

vi.mock('./mail-accounts', () => ({
  getMailAccountsState: async (workspaceId: string) => ({
    activeAccountId: 'account-a',
    accounts: [
      {
        workspaceId,
        accountId: 'account-a',
        vaultGroupId: 'gmail-account-a',
        emailAddress: 'a@example.com',
        connectedAt: '2026-08-22T00:00:00.000Z',
        lastUsedAt: '2026-08-22T00:00:00.000Z',
      },
      {
        workspaceId,
        accountId: 'account-b',
        vaultGroupId: 'gmail-account-b',
        emailAddress: 'b@example.com',
        connectedAt: '2026-08-22T00:00:00.000Z',
        lastUsedAt: '2026-08-22T00:00:00.000Z',
      },
    ],
  }),
}))

describe('Mail background startup', () => {
  beforeEach(() => {
    stopAllMailBackgroundServices()
    syncStarts.length = 0
    tokenStarts.length = 0
    eventStarts.length = 0
    syncStops.length = 0
    tokenStops.length = 0
    eventStops.length = 0
    startBehavior.throwEventStart = false
    registeredWorkspaceIds.splice(0, registeredWorkspaceIds.length, 'personal')
  })

  it('starts refresh and token maintenance for every connected account', async () => {
    await expect(startMailBackgroundServices('work')).resolves.toBe(2)
    expect(syncStarts).toEqual(['account-a', 'account-b'])
    expect(tokenStarts).toEqual(['account-a', 'account-b'])
    expect(eventStarts).toEqual(['account-a', 'account-b'])
  })

  it('stops every account-scoped background service on disconnect', () => {
    stopMailAccountBackgroundServices({
      workspaceId: 'work',
      accountId: 'account-a',
      emailAddress: 'a@example.com',
      connectedAt: '2026-08-22T00:00:00.000Z',
      lastUsedAt: '2026-08-22T00:00:00.000Z',
    })
    expect(eventStops).toEqual(['account-a'])
    expect(tokenStops).toEqual(['account-a'])
    expect(syncStops).toEqual(['account-a'])
  })

  it('rolls back partial startup and permits a later retry', () => {
    const account = {
      workspaceId: 'work',
      accountId: 'account-a',
      emailAddress: 'a@example.com',
      connectedAt: '2026-08-22T00:00:00.000Z',
      lastUsedAt: '2026-08-22T00:00:00.000Z',
    }
    startBehavior.throwEventStart = true
    expect(() => startMailAccountBackgroundServices(account)).toThrow(
      'event startup failed',
    )
    expect(eventStops).toEqual(['account-a'])
    expect(tokenStops).toEqual(['account-a'])
    expect(syncStops).toEqual(['account-a'])

    startBehavior.throwEventStart = false
    expect(() => startMailAccountBackgroundServices(account)).not.toThrow()
    expect(eventStarts).toEqual(['account-a', 'account-a'])
  })

  it('stops retained workspace polling and starts only registered workspaces', async () => {
    await startMailBackgroundServices('deleted')
    syncStops.length = 0
    tokenStops.length = 0
    eventStops.length = 0
    registeredWorkspaceIds.splice(0, registeredWorkspaceIds.length, 'work')

    await reconcileMailBackgroundWorkspaces()

    expect(eventStops).toEqual(['account-a', 'account-b'])
    expect(tokenStops).toEqual(['account-a', 'account-b'])
    expect(syncStops).toEqual(['account-a', 'account-b'])
    expect(syncStarts.slice(-2)).toEqual(['account-a', 'account-b'])
  })
})
