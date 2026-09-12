import type { MailDraft, MailMessageSummary } from '../client/types'
import type { MailAccount } from './mail-accounts'
import {
  createUnifiedMailboxService,
  listUnifiedDrafts,
} from './unified-mailbox'
import { describe, expect, it } from 'vitest'

function account(accountId: string): MailAccount {
  return {
    workspaceId: 'personal',
    accountId,
    emailAddress: `${accountId}@example.com`,
    vaultGroupId: `gmail-account-${accountId}`,
    connectedAt: '2026-08-27T00:00:00.000Z',
    lastUsedAt: '2026-08-27T00:00:00.000Z',
  }
}

function message(id: string, internalDate: number): MailMessageSummary {
  return {
    id,
    threadId: id,
    from: 'Sender <sender@example.com>',
    to: 'recipient@example.com',
    subject: id,
    date: new Date(internalDate).toISOString(),
    snippet: id,
    labelIds: ['INBOX'],
    unread: true,
    starred: false,
    important: false,
    internalDate,
  }
}

describe('unified mailbox', () => {
  it('merges accounts chronologically and keeps pagination account-qualified', async () => {
    const accounts = [account('one'), account('two')]
    let cursorSequence = 0
    const calls: string[] = []
    const service = createUnifiedMailboxService({
      getAccounts: async () => accounts,
      listAccountMessages: async (mailAccount, options) => {
        const key = `${mailAccount.accountId}:${options.pageToken ?? 'first'}`
        calls.push(key)
        const pages = {
          'one:first': {
            messages: [message('shared-id', 100), message('one-70', 70)],
            nextPageToken: 'one-next',
            resultSizeEstimate: 3,
            source: 'cache' as const,
          },
          'one:one-next': {
            messages: [message('one-50', 50)],
            resultSizeEstimate: 3,
            source: 'gmail' as const,
          },
          'two:first': {
            messages: [message('shared-id', 90), message('two-80', 80)],
            nextPageToken: 'two-next',
            resultSizeEstimate: 3,
            source: 'gmail' as const,
          },
          'two:two-next': {
            messages: [message('two-60', 60)],
            resultSizeEstimate: 3,
            source: 'gmail' as const,
          },
        }
        const page = pages[key as keyof typeof pages]
        if (!page) throw new Error(`Unexpected page ${key}`)
        return page
      },
      now: () => 1_000,
      createCursorId: () => `cursor-${++cursorSequence}`,
    })

    const first = await service.listMessages('personal', { maxResults: 2 })
    expect(first.messages.map((item) => [item.accountId, item.id])).toEqual([
      ['one', 'shared-id'],
      ['two', 'shared-id'],
    ])
    expect(first.scope).toBe('unified')
    expect(first.source).toBe('mixed')
    expect(first.resultSizeEstimate).toBe(6)
    expect(first.nextPageToken).toBe('cursor-1')

    const second = await service.listMessages('personal', {
      maxResults: 2,
      pageToken: first.nextPageToken,
    })
    expect(second.messages.map((item) => item.id)).toEqual(['two-80', 'one-70'])

    const repeatedSecond = await service.listMessages('personal', {
      maxResults: 2,
      pageToken: first.nextPageToken,
    })
    expect(repeatedSecond).toEqual(second)
    expect(calls.filter((call) => call === 'two:two-next')).toHaveLength(1)

    const third = await service.listMessages('personal', {
      maxResults: 2,
      pageToken: second.nextPageToken,
    })
    expect(third.messages.map((item) => item.id)).toEqual(['two-60', 'one-50'])
    expect(third.nextPageToken).toBeUndefined()
  })

  it('returns healthy accounts with a scoped partial failure', async () => {
    const accounts = [account('healthy'), account('expired')]
    const service = createUnifiedMailboxService({
      getAccounts: async () => accounts,
      listAccountMessages: async (mailAccount) => {
        if (mailAccount.accountId === 'expired') {
          throw new Error('Gmail authorization expired')
        }
        return {
          messages: [message('healthy-message', 100)],
          resultSizeEstimate: 1,
        }
      },
      now: () => 1_000,
      createCursorId: () => 'unused',
    })

    const result = await service.listMessages('personal')
    expect(result.messages[0]?.accountId).toBe('healthy')
    expect(result.accountErrors).toEqual([
      {
        accountId: 'expired',
        emailAddress: 'expired@example.com',
        message: 'Gmail authorization expired',
      },
    ])
  })

  it('keeps colliding draft ids account-qualified and reports partial failures', async () => {
    const accounts = [
      account('healthy-one'),
      account('healthy-two'),
      account('expired'),
    ]
    const sharedDraft: MailDraft = {
      id: 'shared-draft',
      composer: {
        mode: 'new',
        to: 'person@example.com',
        cc: '',
        bcc: '',
        subject: 'Draft',
        body: '',
      },
      createdAt: 1,
      updatedAt: 2,
    }
    const result = await listUnifiedDrafts('personal', {
      getAccounts: async () => accounts,
      listAccountDrafts: async (mailAccount) => {
        if (mailAccount.accountId === 'expired') {
          throw new Error('Gmail authorization expired')
        }
        return [sharedDraft]
      },
    })

    expect(
      result.drafts.map((draft) => [draft.composer.accountId, draft.id]),
    ).toEqual([
      ['healthy-one', 'shared-draft'],
      ['healthy-two', 'shared-draft'],
    ])
    expect(result.accountErrors).toEqual([
      {
        accountId: 'expired',
        emailAddress: 'expired@example.com',
        message: 'Gmail authorization expired',
      },
    ])
  })
})
