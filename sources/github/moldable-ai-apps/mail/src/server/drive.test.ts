import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest'

interface MockDraft {
  id: string
  composer: {
    mode: 'new' | 'reply'
    draftId: string
    to: string
    cc: string
    bcc: string
    subject: string
    body: string
    threadId?: string
  }
  createdAt: number
  updatedAt: number
}

const { mockGmailDrafts, sentMessages, messageActions, unsubscribedMessages } =
  vi.hoisted(() => ({
    mockGmailDrafts: new Map<string, MockDraft>(),
    sentMessages: [] as Array<Record<string, unknown>>,
    messageActions: [] as Array<{ id: string; action: string }>,
    unsubscribedMessages: [] as string[],
  }))

vi.mock('./gmail-service', async (importOriginal) => {
  const actual = await importOriginal<typeof import('./gmail-service')>()
  return {
    ...actual,
    listGmailDrafts: async () =>
      [...mockGmailDrafts.values()].sort((a, b) => b.updatedAt - a.updatedAt),
    getGmailDraft: async (_workspaceId: string, id: string) => {
      const draft = mockGmailDrafts.get(id)
      if (!draft) throw new Error('Draft not found')
      return draft
    },
    saveGmailDraft: async (
      _workspaceId: string,
      input: {
        draftId?: string
        to: string
        cc?: string
        bcc?: string
        subject: string
        body: string
        threadId?: string
      },
    ) => {
      const now = Date.now()
      const id = input.draftId ?? `draft-${mockGmailDrafts.size + 1}`
      const draft: MockDraft = {
        id,
        composer: {
          mode: input.threadId ? 'reply' : 'new',
          draftId: id,
          to: input.to,
          cc: input.cc ?? '',
          bcc: input.bcc ?? '',
          subject: input.subject,
          body: input.body,
          threadId: input.threadId,
        },
        createdAt: mockGmailDrafts.get(id)?.createdAt ?? now,
        updatedAt: now,
      }
      mockGmailDrafts.set(id, draft)
      return draft
    },
    deleteGmailDraft: async (_workspaceId: string, id: string) => {
      mockGmailDrafts.delete(id)
    },
    sendGmailDraft: async (_workspaceId: string, id: string) => {
      sentMessages.push({ draftId: id })
      mockGmailDrafts.delete(id)
      return { id: 'sent-draft-message', threadId: 'sent-thread' }
    },
    sendMessage: async (
      _workspaceId: string,
      input: Record<string, unknown>,
    ) => {
      sentMessages.push(input)
      return { id: 'sent-message', threadId: 'sent-thread' }
    },
    applyMessageAction: async (
      _workspaceId: string,
      id: string,
      action: string,
    ) => {
      messageActions.push({ id, action })
    },
    unsubscribeAndArchive: async (_workspaceId: string, id: string) => {
      unsubscribedMessages.push(id)
    },
  }
})

let temporaryHome: string
let previousHome: string | undefined
let previousAppId: string | undefined
let app: (typeof import('./app'))['app']
let writeCachedMessage: (typeof import('./message-cache'))['writeCachedMessage']

const WORKSPACE = 'drive-test'
const HEADERS = { 'x-moldable-workspace': WORKSPACE }
const MESSAGE_ID = 'message-1'

function rpc(method: string, params?: unknown) {
  return app.request('/api/moldable/rpc', {
    method: 'POST',
    headers: { ...HEADERS, 'Content-Type': 'application/json' },
    body: JSON.stringify({ method, params }),
  })
}

beforeAll(async () => {
  temporaryHome = await mkdtemp(path.join(tmpdir(), 'mail-drive-'))
  previousHome = process.env.HOME
  previousAppId = process.env.MOLDABLE_APP_ID
  process.env.HOME = temporaryHome
  process.env.MOLDABLE_APP_ID = 'mail'
  ;({ app } = await import('./app'))
  ;({ writeCachedMessage } = await import('./message-cache'))
  await writeCachedMessage(
    WORKSPACE,
    {
      id: MESSAGE_ID,
      threadId: 'thread-1',
      from: 'Earl (Billing) <sender@example.com>',
      to: 'reader@example.com',
      cc: '',
      subject: 'Drive proof',
      date: '2026-07-27',
      snippet: 'Fallback snippet',
      labelIds: ['INBOX', 'UNREAD'],
      unread: true,
      starred: false,
      important: false,
      internalDate: Date.now(),
      bodyText: '',
      bodyHtml: '<p>Hello <strong>world</strong></p>',
      bodyHtmlText:
        'Hello world\n\n\nhttps://tracking.example.com/message/123\n\nRegards,\nSender',
      attachments: [],
    },
    { detailCached: true },
  )
})

afterAll(async () => {
  if (previousHome === undefined) delete process.env.HOME
  else process.env.HOME = previousHome
  if (previousAppId === undefined) delete process.env.MOLDABLE_APP_ID
  else process.env.MOLDABLE_APP_ID = previousAppId
  await rm(temporaryHome, { recursive: true, force: true })
})

describe('Mail drive contract', () => {
  it('describes views and validates message navigation', async () => {
    const describeResponse = await rpc('mail.ui.describe', {})
    const described = (await describeResponse.json()) as {
      result: { views: Array<{ id: string; description: string }> }
    }
    expect(described.result.views.map((view) => view.id)).toEqual([
      'inbox',
      'message',
    ])

    const navigate = await rpc('mail.ui.navigate', {
      view: 'message',
      entityId: MESSAGE_ID,
    })
    const navigateBody = (await navigate.json()) as {
      result: { intentId: string }
    }
    const intent = (await (
      await app.request('/api/moldable/ui-intent', { headers: HEADERS })
    ).json()) as { id: string; view: string; entityId: string }
    expect(intent).toMatchObject({
      id: navigateBody.result.intentId,
      view: 'message',
      entityId: MESSAGE_ID,
    })

    const ack = await app.request(`/api/moldable/ui-intent?id=${intent.id}`, {
      method: 'DELETE',
      headers: HEADERS,
    })
    expect(await ack.json()).toEqual({ ok: true, deleted: true })
  })

  it('reads sanitized speakable text and inbox summaries', async () => {
    const messageRead = await rpc('mail.ui.read', {
      view: 'message',
      entityId: MESSAGE_ID,
    })
    const messageBody = (await messageRead.json()) as {
      result: { message: { body: string; bodyHtml?: string } }
    }
    expect(messageBody.result.message.body).toBe('Hello world Regards, Sender')
    expect(messageBody.result.message).not.toHaveProperty('bodyHtml')

    const inboxRead = await rpc('mail.ui.read', { view: 'inbox' })
    const inboxBody = (await inboxRead.json()) as {
      result: { summary: { messageCount: number; unreadCount: number } }
    }
    expect(inboxBody.result.summary).toMatchObject({
      messageCount: 1,
      unreadCount: 1,
    })

    const nativeMessage = (await (
      await rpc('mail.messages.get', { id: MESSAGE_ID })
    ).json()) as {
      result: {
        subjectDisplay: string
        sender: string
        senderInitials: string
        recipientSummary: string
        recipientCompact: string
        toDetail: string
        dateDetail: string
        bodyDisplay: string
        attachmentEmptyStates: Array<{ title: string }>
        archiveActions: unknown[]
        markReadActions: unknown[]
        starActions: unknown[]
        trashActions: unknown[]
      }
    }
    expect(nativeMessage.result).toMatchObject({
      subjectDisplay: 'Drive proof',
      sender: 'Earl (Billing)',
      senderInitials: 'EB',
      recipientSummary: 'To: reader@example.com',
      recipientCompact: 'to me',
      toDetail: 'reader@example.com',
      bodyDisplay: 'Hello world\n\nRegards,\nSender',
    })
    expect(nativeMessage.result.dateDetail).toContain(' at ')
    expect(nativeMessage.result.attachmentEmptyStates[0]?.title).toBe(
      'No attachments',
    )
    expect(nativeMessage.result.archiveActions).toHaveLength(1)
    expect(nativeMessage.result.markReadActions).toHaveLength(1)
    expect(nativeMessage.result.starActions).toHaveLength(1)
    expect(nativeMessage.result.trashActions).toHaveLength(1)
  })

  it('returns a renderable mobile connection state and validates search', async () => {
    const mailboxes = (await (
      await rpc('mail.native.mailboxes', {})
    ).json()) as {
      result: {
        connected: boolean
        mailboxes: Array<{ id: string; countLabel: string }>
        triageMailboxes: Array<{ id: string }>
        draftMailboxes: Array<{ id: string }>
        otherMailboxes: Array<{ id: string }>
      }
    }
    expect(mailboxes.result.connected).toBe(false)
    expect(mailboxes.result.mailboxes.map((mailbox) => mailbox.id)).toEqual([
      'inbox',
      'unread',
      'starred',
      'sent',
      'drafts',
      'all',
      'trash',
    ])
    expect(
      mailboxes.result.mailboxes.find((mailbox) => mailbox.id === 'inbox')
        ?.countLabel,
    ).toBe('1')
    expect(
      mailboxes.result.triageMailboxes.map((mailbox) => mailbox.id),
    ).toEqual(['inbox', 'unread'])
    expect(
      mailboxes.result.draftMailboxes.map((mailbox) => mailbox.id),
    ).toEqual(['drafts'])
    expect(
      mailboxes.result.otherMailboxes.map((mailbox) => mailbox.id),
    ).toEqual(['starred', 'sent', 'all', 'trash'])

    const inboxResponse = await rpc('mail.native.messages', {
      view: 'inbox',
      maxResults: 30,
    })
    expect(inboxResponse.status).toBe(200)
    const inbox = (await inboxResponse.json()) as {
      result: {
        connected: boolean
        messages: unknown[]
        emptyStates: Array<{ title: string }>
      }
    }
    expect(inbox.result.connected).toBe(false)
    expect(inbox.result.messages).toEqual([])
    expect(inbox.result.emptyStates[0]?.title).toBe('Connect Mail on your Mac')

    const invalidSearch = await rpc('mail.native.messages', { view: 'search' })
    expect(invalidSearch.status).toBe(400)
  })

  it('saves Gmail drafts, sends explicitly, and rejects invalid views', async () => {
    const draftResponse = await rpc('mail.drafts.create', {
      to: 'friend@example.com',
      subject: 'Hello',
      body: 'Draft body',
    })
    const draftBody = (await draftResponse.json()) as {
      result: { draft: { id: string }; sent: boolean }
    }
    expect(draftBody.result.draft.id).toBeTruthy()
    expect(draftBody.result.sent).toBe(false)

    const nativeDrafts = (await (
      await rpc('mail.native.drafts', {})
    ).json()) as {
      result: {
        drafts: Array<{ id: string; recipient: string; subjectDisplay: string }>
      }
    }
    expect(nativeDrafts.result.drafts[0]).toMatchObject({
      id: draftBody.result.draft.id,
      recipient: 'friend@example.com',
      subjectDisplay: 'Hello',
    })

    const editDraft = (await (
      await rpc('mail.native.compose', { draftId: draftBody.result.draft.id })
    ).json()) as {
      result: {
        heading: string
        draft: { draftId: string; to: string; subject: string; body: string }
        deleteActions: Array<{ draftId: string }>
      }
    }
    expect(editDraft.result).toMatchObject({
      heading: 'Edit draft',
      draft: {
        draftId: draftBody.result.draft.id,
        to: 'friend@example.com',
        subject: 'Hello',
        body: 'Draft body',
      },
      deleteActions: [{ draftId: draftBody.result.draft.id }],
    })

    const compose = (await (
      await rpc('mail.native.compose', { replyTo: MESSAGE_ID })
    ).json()) as {
      result: {
        heading: string
        draft: { to: string; subject: string; threadId: string }
      }
    }
    expect(compose.result).toMatchObject({
      heading: 'Reply to Earl (Billing)',
      draft: {
        to: 'sender@example.com',
        subject: 'Re: Drive proof',
        threadId: 'thread-1',
      },
    })

    const replyDraft = (await (
      await rpc('mail.drafts.create', {
        ...compose.result.draft,
        body: 'A reply draft',
      })
    ).json()) as {
      result: {
        draft: { composer: { mode: string; threadId?: string } }
        sent: boolean
      }
    }
    expect(replyDraft.result).toMatchObject({
      draft: { composer: { mode: 'reply', threadId: 'thread-1' } },
      sent: false,
    })

    const send = await rpc('mail.messages.send', {
      to: 'friend@example.com',
      subject: 'Sent from iPhone',
      body: 'This is an explicit send.',
    })
    expect(send.status).toBe(200)
    expect(await send.json()).toMatchObject({
      result: { id: 'sent-message', sent: true },
    })
    expect(sentMessages.at(-1)).toMatchObject({
      to: 'friend@example.com',
      subject: 'Sent from iPhone',
    })

    const invalid = await rpc('mail.ui.navigate', { view: 'sent' })
    const invalidBody = (await invalid.json()) as {
      error: { code: string }
    }
    expect(invalid.status).toBe(400)
    expect(invalidBody.error.code).toBe('invalid_params')
  })

  it('exposes supported spam and unsubscribe mutations through the Mail RPC', async () => {
    const markSpam = await rpc('mail.messages.spam', { messageId: MESSAGE_ID })
    expect(markSpam.status).toBe(200)
    expect(await markSpam.json()).toMatchObject({ result: { ok: true } })
    expect(messageActions.at(-1)).toEqual({ id: MESSAGE_ID, action: 'spam' })

    const unsubscribe = await rpc('mail.messages.unsubscribe', {
      messageId: MESSAGE_ID,
    })
    expect(unsubscribe.status).toBe(200)
    expect(await unsubscribe.json()).toMatchObject({
      result: { ok: true, archived: true },
    })
    expect(unsubscribedMessages.at(-1)).toBe(MESSAGE_ID)

    const invalid = await rpc('mail.messages.spam', {})
    expect(invalid.status).toBe(400)
  })

  it('manages native archive filters through the Mail RPC', async () => {
    const create = await rpc('mail.filters.create', {
      name: 'Coinbase noise',
      match: {
        fromDomains: ['mail.coinbase.com'],
        subjectContains: ['statement'],
      },
      applyExisting: false,
    })
    expect(create.status).toBe(200)
    const created = (await create.json()) as {
      result: {
        filter: {
          id: string
          enabled: boolean
          match: { fromDomains: string[] }
        }
      }
    }
    expect(created.result.filter).toMatchObject({
      enabled: true,
      match: { fromDomains: ['mail.coinbase.com'] },
    })

    const list = await rpc('mail.filters.list', {})
    expect(list.status).toBe(200)
    expect((await list.json()) as unknown).toMatchObject({
      result: {
        filters: [expect.objectContaining({ id: created.result.filter.id })],
      },
    })

    const update = await rpc('mail.filters.update', {
      id: created.result.filter.id,
      enabled: false,
    })
    expect(update.status).toBe(200)
    expect((await update.json()) as unknown).toMatchObject({
      result: { filter: { id: created.result.filter.id, enabled: false } },
    })

    const remove = await rpc('mail.filters.delete', {
      id: created.result.filter.id,
    })
    expect(remove.status).toBe(200)
    expect(await remove.json()).toMatchObject({ result: { deleted: true } })
  })

  it('uses mobile web without a per-app NativeUI package', async () => {
    const { readFile, access } = await import('node:fs/promises')
    const manifest = JSON.parse(
      await readFile(new URL('../../moldable.json', import.meta.url), 'utf8'),
    ) as {
      nativeUI?: string
      mobile?: { type: string }
    }
    expect(manifest.nativeUI).toBeUndefined()
    expect(manifest.mobile?.type).toBe('mobile-web')
    await expect(
      access(new URL('../../native-ui.json', import.meta.url)),
    ).rejects.toMatchObject({ code: 'ENOENT' })
  })
})
