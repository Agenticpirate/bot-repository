import type { MailMessageDetail } from './gmail-service'
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest'

vi.mock('./mail-accounts', async (importOriginal) => ({
  ...(await importOriginal<typeof import('./mail-accounts')>()),
  resolveMailAccount: async (workspaceId: string, accountId = 'account-a') => ({
    workspaceId,
    accountId,
  }),
  getMailAccountsState: async () => ({
    accounts: [{ accountId: 'account-a' }, { accountId: 'account-b' }],
  }),
}))

let app: (typeof import('./app'))['app']
let temporaryHome: string
let previousHome: string | undefined
let previousAppId: string | undefined

interface ReadResponse {
  ok: boolean
  result?: {
    accountId: string
    unread: boolean
    attachments: Array<{ id: string; canReadText: boolean }>
    attachmentContent?: {
      pages: Array<{ text: string; needsOcr: boolean }>
      next: unknown
    }
  }
}

beforeAll(async () => {
  temporaryHome = await mkdtemp(join(tmpdir(), 'mail-attachment-rpc-'))
  previousHome = process.env.HOME
  previousAppId = process.env.MOLDABLE_APP_ID
  process.env.HOME = temporaryHome
  process.env.MOLDABLE_APP_ID = 'mail'
  ;({ app } = await import('./app'))
  const { writeCachedMessage, writeCachedAttachment } = await import(
    './message-cache'
  )
  const { runWithMailAccountContext } = await import('./mail-account-context')
  for (const workspaceId of ['personal', 'work']) {
    for (const accountId of ['account-a', 'account-b']) {
      await runWithMailAccountContext({ workspaceId, accountId }, async () => {
        const message: MailMessageDetail = {
          id: 'same-message',
          threadId: 'thread-1',
          from: 'school@example.com',
          to: 'parent@example.com',
          cc: '',
          subject: 'Statement',
          date: '2026-09-08',
          snippet: 'The amount is attached.',
          bodyText: 'The amount is attached.',
          bodyHtml: '',
          bodyHtmlText: '',
          labelIds: ['INBOX', 'UNREAD'],
          unread: true,
          starred: false,
          important: false,
          internalDate: Date.now(),
          attachments: [
            {
              id: 'part-1',
              filename: 'statement.txt',
              mimeType: 'text/plain',
              size: 100,
              attachmentId: 'same-provider-id',
              inline: false,
            },
          ],
        }
        await writeCachedMessage(workspaceId, message, { detailCached: true })
        await writeCachedAttachment({
          workspaceId,
          messageId: message.id,
          attachmentId: 'same-provider-id',
          data: Buffer.from(`Verified source: ${workspaceId}/${accountId}`),
        })
      })
    }
  }
})

afterAll(async () => {
  if (previousHome === undefined) delete process.env.HOME
  else process.env.HOME = previousHome
  if (previousAppId === undefined) delete process.env.MOLDABLE_APP_ID
  else process.env.MOLDABLE_APP_ID = previousAppId
  await rm(temporaryHome, { recursive: true, force: true })
})

async function rpc(
  workspaceId: string,
  method: string,
  params: Record<string, unknown>,
) {
  const response = await app.request('/api/moldable/rpc', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-moldable-workspace': workspaceId,
    },
    body: JSON.stringify({ method, params }),
  })
  return (await response.json()) as ReadResponse
}

describe('Mail attachment RPC', () => {
  it.each(['mail.messages.get', 'mail.read'])(
    '%s reads the same authorized message part without changing unread state',
    async (method) => {
      const idKey = method === 'mail.read' ? 'messageId' : 'id'
      for (const workspaceId of ['personal', 'work']) {
        for (const accountId of ['account-a', 'account-b']) {
          const params = { accountId, [idKey]: 'same-message' }
          const metadata = await rpc(workspaceId, method, params)
          expect(metadata).toMatchObject({
            ok: true,
            result: {
              accountId,
              attachments: [{ id: 'part-1', canReadText: true }],
            },
          })
          expect(metadata.result?.attachmentContent).toBeUndefined()
          const read = await rpc(workspaceId, method, {
            ...params,
            attachment: { id: metadata.result!.attachments[0]!.id },
          })
          expect(read).toMatchObject({
            ok: true,
            result: {
              accountId,
              attachmentContent: {
                pages: [
                  {
                    text: `Verified source: ${workspaceId}/${accountId}`,
                    needsOcr: false,
                  },
                ],
                next: null,
              },
            },
          })
          const after = await rpc(workspaceId, 'mail.messages.get', {
            accountId,
            id: 'same-message',
          })
          expect(after.result?.unread).toBe(true)
        }
      }
    },
  )

  it('rejects a foreign attachment or arbitrary fetch target through the real RPC parser', async () => {
    for (const attachment of [
      { id: 'other-part' },
      { id: 'part-1', url: 'https://attacker.example' },
    ]) {
      const result = await rpc('personal', 'mail.messages.get', {
        accountId: 'account-a',
        id: 'same-message',
        attachment,
      })
      expect(result.ok).toBe(false)
      expect(result.result?.attachmentContent).toBeUndefined()
    }
  })
})
