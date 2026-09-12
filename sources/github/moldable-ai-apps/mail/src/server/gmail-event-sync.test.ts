import {
  type GmailEventCursorState,
  type GmailEventSyncDependencies,
  buildMailReceivedEvent,
  stopGmailEventSync,
  syncGmailEventAccountNow,
  syncGmailHistoryOnce,
} from './gmail-event-sync'
import type { MailMessageDetail } from './gmail-service'
import type { MailAccount } from './mail-accounts'
import { afterEach, describe, expect, it, vi } from 'vitest'

const account: MailAccount = {
  workspaceId: 'personal',
  accountId: 'account-1',
  emailAddress: 'me@example.com',
  connectedAt: '2026-08-20T00:00:00.000Z',
  lastUsedAt: '2026-08-20T00:00:00.000Z',
}

const message: MailMessageDetail = {
  id: 'message-1',
  threadId: 'thread-1',
  from: 'Carrier <updates@example.com>',
  to: 'me@example.com',
  cc: '',
  subject: 'Package delivered',
  date: 'Wed, 26 Aug 2026 12:00:00 +0000',
  snippet: 'Your package was delivered.',
  labelIds: ['INBOX', 'UNREAD'],
  unread: true,
  starred: false,
  important: false,
  internalDate: Date.parse('2026-08-26T12:00:00.000Z'),
  bodyText: 'Your package was delivered at the front door.',
  bodyHtml: '',
  bodyHtmlText: '',
  attachments: [],
}

afterEach(() => stopGmailEventSync(account))

function dependencies(
  overrides: Partial<GmailEventSyncDependencies> = {},
): GmailEventSyncDependencies {
  return {
    getProfile: vi.fn().mockResolvedValue({ historyId: 'history-20' }),
    listHistoryPage: vi.fn().mockResolvedValue({ historyId: 'history-20' }),
    listRecoveryMessagePage: vi.fn().mockResolvedValue({
      messageIds: [],
      nextPageToken: undefined,
    }),
    getMessage: vi.fn().mockResolvedValue(message),
    removeMessage: vi.fn().mockResolvedValue(true),
    updateMessageLabels: vi.fn().mockResolvedValue(true),
    emit: vi.fn().mockResolvedValue({
      accepted: 1,
      deduplicated: 0,
      acceptedEventIds: ['mail-received-1'],
    }),
    reportHealth: vi.fn().mockResolvedValue({ recorded: true }),
    readState: vi.fn().mockResolvedValue(null),
    writeState: vi.fn().mockResolvedValue(undefined),
    now: () => new Date('2026-08-26T12:01:00.000Z'),
    ...overrides,
  }
}

describe('Gmail proactive event sync', () => {
  it('establishes a cursor without replaying historical mail', async () => {
    const deps = dependencies()
    await syncGmailHistoryOnce(account, deps)
    expect(deps.emit).not.toHaveBeenCalled()
    expect(deps.writeState).toHaveBeenCalledWith('personal', {
      version: 1,
      historyId: 'history-20',
      establishedAt: '2026-08-26T12:01:00.000Z',
      lastSuccessfulAt: '2026-08-26T12:01:00.000Z',
    })
  })

  it('advances the Gmail cursor only after the event journal acknowledges', async () => {
    const order: string[] = []
    const state: GmailEventCursorState = {
      version: 1,
      historyId: 'history-10',
      establishedAt: '2026-08-25T00:00:00.000Z',
      lastSuccessfulAt: '2026-08-26T11:00:00.000Z',
    }
    const deps = dependencies({
      readState: vi.fn().mockResolvedValue(state),
      listHistoryPage: vi.fn().mockResolvedValue({
        historyId: 'history-20',
        history: [
          {
            id: 'history-11',
            messagesAdded: [{ message: { id: 'message-1' } }],
          },
        ],
      }),
      emit: vi.fn().mockImplementation(async () => {
        order.push('ack')
        return { accepted: 1, deduplicated: 0, acceptedEventIds: [] }
      }),
      writeState: vi.fn().mockImplementation(async () => {
        order.push('cursor')
      }),
    })
    await syncGmailHistoryOnce(account, deps)
    expect(order).toEqual(['ack', 'cursor'])
    expect(deps.writeState).toHaveBeenCalledWith(
      'personal',
      expect.objectContaining({ historyId: 'history-20' }),
    )
  })

  it('does not rewrite the cursor or health record for an idle poll', async () => {
    const state: GmailEventCursorState = {
      version: 1,
      historyId: 'history-20',
      establishedAt: '2026-08-25T00:00:00.000Z',
      lastSuccessfulAt: '2026-08-26T11:30:00.000Z',
    }
    const deps = dependencies({
      readState: vi.fn().mockResolvedValue(state),
      listHistoryPage: vi.fn().mockResolvedValue({
        historyId: 'history-20',
        history: [],
      }),
    })

    await syncGmailHistoryOnce(account, deps)

    expect(deps.writeState).not.toHaveBeenCalled()
    expect(deps.reportHealth).not.toHaveBeenCalled()
    expect(deps.getMessage).not.toHaveBeenCalled()
  })

  it('clears durable source degradation on the first successful retry', async () => {
    const state: GmailEventCursorState = {
      version: 1,
      historyId: 'history-20',
      establishedAt: '2026-08-25T00:00:00.000Z',
      lastSuccessfulAt: '2026-08-26T11:30:00.000Z',
    }
    const listHistoryPage = vi
      .fn()
      .mockRejectedValueOnce(new Error('Temporary Gmail transport failure'))
      .mockResolvedValue({ historyId: 'history-20', history: [] })
    const deps = dependencies({
      readState: vi.fn().mockResolvedValue(state),
      listHistoryPage,
    })

    await expect(syncGmailEventAccountNow(account, deps)).rejects.toThrow(
      'Temporary Gmail transport failure',
    )
    await syncGmailEventAccountNow(account, deps)

    expect(deps.reportHealth).toHaveBeenNthCalledWith(1, {
      workspaceId: 'personal',
      accountId: 'account-1',
      displayName: 'me@example.com',
      status: 'degraded',
      issueCode: 'source_unavailable',
      error: 'Temporary Gmail transport failure',
    })
    expect(deps.reportHealth).toHaveBeenNthCalledWith(2, {
      workspaceId: 'personal',
      accountId: 'account-1',
      displayName: 'me@example.com',
      status: 'healthy',
    })
  })

  it('reports an actionable authentication issue only for a real auth failure', async () => {
    const state: GmailEventCursorState = {
      version: 1,
      historyId: 'history-20',
      establishedAt: '2026-08-25T00:00:00.000Z',
      lastSuccessfulAt: '2026-08-26T11:30:00.000Z',
    }
    const deps = dependencies({
      readState: vi.fn().mockResolvedValue(state),
      listHistoryPage: vi.fn().mockRejectedValue(new Error('invalid_grant')),
    })

    await expect(syncGmailHistoryOnce(account, deps)).rejects.toThrow(
      'invalid_grant',
    )
    expect(deps.reportHealth).toHaveBeenCalledWith({
      workspaceId: 'personal',
      accountId: 'account-1',
      displayName: 'me@example.com',
      status: 'blocked',
      issueCode: 'authentication_required',
      error: 'invalid_grant',
    })
  })

  it('applies Gmail label and deletion deltas without a folder rescan', async () => {
    const state: GmailEventCursorState = {
      version: 1,
      historyId: 'history-10',
      establishedAt: '2026-08-25T00:00:00.000Z',
      lastSuccessfulAt: '2026-08-26T11:30:00.000Z',
    }
    const deps = dependencies({
      readState: vi.fn().mockResolvedValue(state),
      listHistoryPage: vi.fn().mockResolvedValue({
        historyId: 'history-20',
        history: [
          {
            id: 'history-11',
            labelsAdded: [
              { message: { id: 'message-labeled' }, labelIds: ['STARRED'] },
            ],
            labelsRemoved: [
              { message: { id: 'message-labeled' }, labelIds: ['UNREAD'] },
            ],
            messagesDeleted: [{ message: { id: 'message-deleted' } }],
          },
        ],
      }),
    })

    await syncGmailHistoryOnce(account, deps)

    expect(deps.updateMessageLabels).toHaveBeenCalledWith(
      'personal',
      'message-labeled',
      expect.objectContaining({
        addLabelIds: ['STARRED'],
        removeLabelIds: ['UNREAD'],
      }),
    )
    expect(deps.removeMessage).toHaveBeenCalledWith(
      'personal',
      'message-deleted',
    )
    expect(deps.getMessage).not.toHaveBeenCalled()
  })

  it('reports a bounded history backlog as catching up and resumes it', async () => {
    let persisted: GmailEventCursorState = {
      version: 1,
      historyId: 'history-10',
      establishedAt: '2026-08-25T00:00:00.000Z',
      lastSuccessfulAt: '2026-08-26T11:00:00.000Z',
    }
    const responses = Array.from({ length: 11 }, (_, index) => ({
      historyId: 'history-30',
      history: [],
      nextPageToken: index < 10 ? `history-page-${index + 1}` : undefined,
    }))
    const listHistoryPage = vi
      .fn()
      .mockImplementation(async () => responses.shift())
    const deps = dependencies({
      readState: vi.fn().mockImplementation(async () => persisted),
      writeState: vi.fn().mockImplementation(async (_workspaceId, state) => {
        persisted = state
      }),
      listHistoryPage,
    })

    await syncGmailHistoryOnce(account, deps)

    expect(listHistoryPage).toHaveBeenCalledTimes(10)
    expect(persisted).toMatchObject({
      historyId: 'history-10',
      lastSuccessfulAt: '2026-08-26T11:00:00.000Z',
      pending: {
        startHistoryId: 'history-10',
        pageToken: 'history-page-10',
      },
    })
    expect(deps.reportHealth).toHaveBeenLastCalledWith({
      workspaceId: 'personal',
      accountId: 'account-1',
      displayName: 'me@example.com',
      status: 'degraded',
      issueCode: 'catching_up',
      error: 'Catching up on a paginated Gmail history backlog.',
    })

    await syncGmailHistoryOnce(account, deps)

    expect(listHistoryPage).toHaveBeenLastCalledWith(
      'personal',
      expect.objectContaining({
        startHistoryId: 'history-10',
        pageToken: 'history-page-10',
      }),
    )
    expect(persisted).toEqual({
      version: 1,
      historyId: 'history-30',
      establishedAt: '2026-08-25T00:00:00.000Z',
      lastSuccessfulAt: '2026-08-26T12:01:00.000Z',
    })
    expect(deps.reportHealth).toHaveBeenLastCalledWith({
      workspaceId: 'personal',
      accountId: 'account-1',
      displayName: 'me@example.com',
      status: 'healthy',
    })
  })

  it('recovers a cursor that expires mid-pagination from the original committed boundary', async () => {
    const state: GmailEventCursorState = {
      version: 1,
      historyId: 'history-10',
      establishedAt: '2026-08-20T00:00:00.000Z',
      lastSuccessfulAt: '2026-08-21T09:00:00.000Z',
      pending: {
        startHistoryId: 'history-10',
        pageToken: 'history-page-7',
      },
    }
    const deps = dependencies({
      readState: vi.fn().mockResolvedValue(state),
      listHistoryPage: vi.fn().mockRejectedValue({ code: 404 }),
      getProfile: vi.fn().mockResolvedValue({ historyId: 'history-current' }),
      listRecoveryMessagePage: vi.fn().mockResolvedValue({
        messageIds: [],
        nextPageToken: undefined,
      }),
    })

    await syncGmailHistoryOnce(account, deps)

    expect(deps.listHistoryPage).toHaveBeenCalledWith('personal', {
      startHistoryId: 'history-10',
      pageToken: 'history-page-7',
      maxResults: 100,
    })
    expect(deps.listRecoveryMessagePage).toHaveBeenCalledWith('personal', {
      afterEpochSeconds: Math.floor(
        Date.parse('2026-08-21T08:55:00.000Z') / 1_000,
      ),
      maxResults: 500,
    })
  })

  it('does not advance when host ingestion fails', async () => {
    const state: GmailEventCursorState = {
      version: 1,
      historyId: 'history-10',
      establishedAt: '2026-08-25T00:00:00.000Z',
      lastSuccessfulAt: '2026-08-26T11:00:00.000Z',
    }
    const writeState = vi.fn()
    const deps = dependencies({
      readState: vi.fn().mockResolvedValue(state),
      listHistoryPage: vi.fn().mockResolvedValue({
        historyId: 'history-20',
        history: [
          {
            id: 'history-11',
            messagesAdded: [{ message: { id: 'message-1' } }],
          },
        ],
      }),
      emit: vi.fn().mockRejectedValue(new Error('host unavailable')),
      writeState,
    })
    await expect(syncGmailHistoryOnce(account, deps)).rejects.toThrow(
      'host unavailable',
    )
    expect(writeState).not.toHaveBeenCalled()
  })

  it('recovers an expired Gmail cursor without an arbitrary age or result cap', async () => {
    const state: GmailEventCursorState = {
      version: 1,
      historyId: 'history-expired',
      establishedAt: '2026-08-20T00:00:00.000Z',
      lastSuccessfulAt: '2026-08-26T11:00:00.000Z',
    }
    const deps = dependencies({
      readState: vi.fn().mockResolvedValue(state),
      listHistoryPage: vi.fn().mockRejectedValue({ code: 404 }),
      getProfile: vi.fn().mockResolvedValue({ historyId: 'history-20' }),
      listRecoveryMessagePage: vi.fn().mockResolvedValue({
        messageIds: ['message-1'],
        nextPageToken: undefined,
      }),
    })

    await syncGmailHistoryOnce(account, deps)

    expect(deps.listRecoveryMessagePage).toHaveBeenCalledWith('personal', {
      afterEpochSeconds: Math.floor(
        Date.parse('2026-08-26T10:55:00.000Z') / 1_000,
      ),
      maxResults: 500,
    })
    expect(deps.emit).toHaveBeenCalledTimes(1)
    expect(deps.writeState).toHaveBeenCalledWith('personal', {
      version: 1,
      historyId: 'history-20',
      establishedAt: '2026-08-20T00:00:00.000Z',
      lastSuccessfulAt: '2026-08-26T12:01:00.000Z',
    })
  })

  it('durably paginates an expired cursor and stays degraded until complete', async () => {
    let persisted: GmailEventCursorState = {
      version: 1,
      historyId: 'history-expired',
      establishedAt: '2026-07-01T00:00:00.000Z',
      lastSuccessfulAt: '2026-07-02T00:00:00.000Z',
    }
    const pageResponses = Array.from({ length: 11 }, (_, index) => ({
      messageIds: [`message-${index + 1}`],
      nextPageToken: index < 10 ? `page-${index + 1}` : undefined,
    }))
    const listRecoveryMessagePage = vi
      .fn()
      .mockImplementation(async () => pageResponses.shift())
    const deps = dependencies({
      readState: vi.fn().mockImplementation(async () => persisted),
      writeState: vi.fn().mockImplementation(async (_workspaceId, state) => {
        persisted = state
      }),
      listHistoryPage: vi.fn().mockRejectedValue({ code: 404 }),
      getProfile: vi.fn().mockResolvedValue({ historyId: 'history-target' }),
      listRecoveryMessagePage,
      getMessage: vi
        .fn()
        .mockImplementation(async (_workspaceId, messageId) => ({
          ...message,
          id: messageId,
        })),
    })

    await syncGmailHistoryOnce(account, deps)

    expect(listRecoveryMessagePage).toHaveBeenCalledTimes(10)
    expect(persisted.historyId).toBe('history-expired')
    expect(persisted.recovery).toMatchObject({
      targetHistoryId: 'history-target',
      pageToken: 'page-10',
      processedCount: 10,
      cutoffInternalDate: Date.parse('2026-07-02T00:00:00.000Z') - 5 * 60_000,
    })
    expect(deps.reportHealth).toHaveBeenLastCalledWith(
      expect.objectContaining({
        status: 'degraded',
        issueCode: 'catching_up',
      }),
    )

    await syncGmailHistoryOnce(account, deps)

    expect(listRecoveryMessagePage).toHaveBeenCalledTimes(11)
    expect(listRecoveryMessagePage).toHaveBeenLastCalledWith(
      'personal',
      expect.objectContaining({ pageToken: 'page-10' }),
    )
    expect(persisted).toEqual({
      version: 1,
      historyId: 'history-target',
      establishedAt: '2026-07-01T00:00:00.000Z',
      lastSuccessfulAt: '2026-08-26T12:01:00.000Z',
    })
    expect(deps.reportHealth).toHaveBeenLastCalledWith({
      workspaceId: 'personal',
      accountId: 'account-1',
      displayName: 'me@example.com',
      status: 'healthy',
    })
  })

  it('does not mistake a host 404 for an expired Gmail cursor', async () => {
    const state: GmailEventCursorState = {
      version: 1,
      historyId: 'history-10',
      establishedAt: '2026-08-20T00:00:00.000Z',
      lastSuccessfulAt: '2026-08-26T11:00:00.000Z',
    }
    const deps = dependencies({
      readState: vi.fn().mockResolvedValue(state),
      listHistoryPage: vi.fn().mockResolvedValue({
        historyId: 'history-20',
        history: [
          {
            id: 'history-11',
            messagesAdded: [{ message: { id: 'message-1' } }],
          },
        ],
      }),
      emit: vi.fn().mockRejectedValue({ status: 404 }),
    })

    await expect(syncGmailHistoryOnce(account, deps)).rejects.toEqual({
      status: 404,
    })
    expect(deps.listRecoveryMessagePage).not.toHaveBeenCalled()
    expect(deps.writeState).not.toHaveBeenCalled()
  })

  it('does not advance when the host gives an incomplete acknowledgement', async () => {
    const state: GmailEventCursorState = {
      version: 1,
      historyId: 'history-10',
      establishedAt: '2026-08-25T00:00:00.000Z',
      lastSuccessfulAt: '2026-08-26T11:00:00.000Z',
    }
    const writeState = vi.fn()
    const deps = dependencies({
      readState: vi.fn().mockResolvedValue(state),
      listHistoryPage: vi.fn().mockResolvedValue({
        historyId: 'history-20',
        history: [
          {
            id: 'history-11',
            messagesAdded: [{ message: { id: 'message-1' } }],
          },
        ],
      }),
      emit: vi.fn().mockResolvedValue({
        accepted: 0,
        deduplicated: 0,
        acceptedEventIds: [],
      }),
      writeState,
    })
    await expect(syncGmailHistoryOnce(account, deps)).rejects.toThrow(
      'complete email event batch',
    )
    expect(writeState).not.toHaveBeenCalled()
  })

  it('skips a history message deleted before its detail fetch', async () => {
    const state: GmailEventCursorState = {
      version: 1,
      historyId: 'history-10',
      establishedAt: '2026-08-25T00:00:00.000Z',
      lastSuccessfulAt: '2026-08-26T11:00:00.000Z',
    }
    const deps = dependencies({
      readState: vi.fn().mockResolvedValue(state),
      listHistoryPage: vi.fn().mockResolvedValue({
        historyId: 'history-20',
        history: [
          {
            id: 'history-11',
            messagesAdded: [{ message: { id: 'deleted-message' } }],
          },
        ],
      }),
      getMessage: vi.fn().mockRejectedValue({ code: 404 }),
    })
    await syncGmailHistoryOnce(account, deps)
    expect(deps.emit).not.toHaveBeenCalled()
    expect(deps.writeState).toHaveBeenCalledWith(
      'personal',
      expect.objectContaining({ historyId: 'history-20' }),
    )
  })

  it('builds bounded canonical Mail events', () => {
    const event = buildMailReceivedEvent({
      account,
      message,
      observedAt: '2026-08-26T12:01:00.000Z',
      historyId: 'history-11',
      providerCursor: 'history-20',
    })
    expect(event.eventType).toBe('mail.message.received')
    expect(event.resource.dataRef).toBe(
      'moldable://mail/account-1/messages/message-1',
    )
    expect(event.matchDocument.contentExcerpt).toContain('front door')
    expect(JSON.stringify(event).length).toBeLessThan(24_000)
  })

  it('bounds hostile headers and includes safe attachment metadata', () => {
    const event = buildMailReceivedEvent({
      account,
      message: {
        ...message,
        subject: ' Invoice '.repeat(1_000),
        from: 'sender@example.com'.repeat(300),
        attachments: [
          {
            id: 'attachment-1',
            filename: 'water-bill.pdf',
            mimeType: 'application/pdf',
            size: 42_000,
            attachmentId: 'provider-attachment-1',
            inline: false,
          },
        ],
      },
      observedAt: '2026-08-26T12:01:00.000Z',
    })
    expect(event.matchDocument.title.length).toBeLessThanOrEqual(512)
    expect(
      event.matchDocument.fields.every((field) => field.value.length <= 2_048),
    ).toBe(true)
    expect(
      event.matchDocument.fields.find((field) => field.name === 'attachments')
        ?.value,
    ).toContain('water-bill.pdf')
  })
})
