import { ensureDir, readJson, safePath, writeJson } from '@moldable-ai/storage'
import type { MailDraft } from '../client/types'
import { getGmailDraft, saveGmailDraft, sendGmailDraft } from './gmail-service'
import { getMailAccountDataDir } from './mail-account-context'
import { createHash } from 'node:crypto'
import { z } from 'zod'

const readInput = z
  .object({ draftId: z.string().trim().min(1).max(256) })
  .strict()
const writeInput = readInput
  .extend({
    expectedRevision: z.string().regex(/^[a-f0-9]{64}$/),
    to: z.string().max(4096),
    cc: z.string().max(4096),
    bcc: z.string().max(4096),
    subject: z.string().max(1000),
    body: z.string().max(24_000),
  })
  .strict()
const receiptSchema = z.object({
  status: z.enum(['sending', 'sent', 'uncertain']),
  updatedAt: z.string(),
  messageId: z.string().optional(),
})
type Receipt = z.infer<typeof receiptSchema>
const locks = new Map<string, Promise<unknown>>()
const hash = (value: unknown) =>
  createHash('sha256').update(JSON.stringify(value)).digest('hex')
const revision = (draft: MailDraft) =>
  hash([
    draft.id,
    draft.composer.to,
    draft.composer.cc,
    draft.composer.bcc,
    draft.composer.subject,
    draft.composer.body,
    draft.composer.threadId,
    draft.attachments ?? [],
  ])

async function withDraftLock<T>(
  key: string,
  operation: () => Promise<T>,
): Promise<T> {
  const previous = locks.get(key) ?? Promise.resolve()
  const next = previous.catch(() => {}).then(operation)
  locks.set(key, next)
  try {
    return await next
  } finally {
    if (locks.get(key) === next) locks.delete(key)
  }
}

export async function handleMailCard(
  method: string,
  value: unknown,
  workspaceId: string,
  accountId: string,
) {
  const input =
    method === 'mail.cards.save' || method === 'mail.cards.send'
      ? writeInput.parse(value)
      : readInput.parse(value)
  const folder = safePath(
    getMailAccountDataDir(workspaceId),
    'chat-card-receipts',
  )
  const receiptPath = safePath(
    folder,
    `${hash([accountId, input.draftId])}.json`,
  )
  const loadReceipt = async () => {
    const value = await readJson<unknown>(receiptPath, null)
    return value === null ? undefined : receiptSchema.parse(value)
  }
  const saveReceipt = async (receipt: Receipt) => {
    await ensureDir(folder)
    await writeJson(receiptPath, receipt)
  }
  return withDraftLock(receiptPath, async () => {
    const receipt = await loadReceipt()
    if (receipt) {
      if (
        receipt.status !== 'sent' &&
        (method === 'mail.cards.save' || method === 'mail.cards.send')
      )
        throw new Error(
          'The send result is unresolved. Check Sent in Mail before trying again.',
        )
      return {
        state:
          receipt.status === 'sent'
            ? ('sent' as const)
            : ('uncertain' as const),
        messageId: receipt.messageId,
      }
    }
    const draft = await getGmailDraft(workspaceId, input.draftId)
    if (method === 'mail.cards.present') {
      return {
        appCard: {
          version: 1,
          title: draft.composer.subject || 'Email draft',
          resourcePath: '/index.html?card=draft',
          input: { draftId: draft.id, accountId },
          openResource: {
            resourceType: 'mail.draft',
            idKey: 'draftId',
            accountIdKey: 'accountId',
          },
          readMethod: 'mail.cards.read',
          actions: [
            {
              id: 'save',
              label: 'Save email draft',
              method: 'mail.cards.save',
            },
            { id: 'send', label: 'Send email', method: 'mail.cards.send' },
          ],
          height: 560,
        },
      }
    }
    // Existing attached drafts must not be rewritten as plain text. Their
    // attachment metadata remains app-owned; open Mail to edit/send those.
    if (draft.attachments?.length) {
      if (method !== 'mail.cards.read')
        throw new Error(
          'Open this attached draft in Mail to preserve its attachments.',
        )
      return { state: 'attachments' as const, draftId: draft.id }
    }
    if (method === 'mail.cards.read')
      return {
        state: 'draft' as const,
        draft,
        revision: revision(draft),
        accountId,
      }
    if (method !== 'mail.cards.save' && method !== 'mail.cards.send')
      throw new Error('Unknown Mail card operation.')
    const fields = writeInput.parse(input)
    if (fields.expectedRevision !== revision(draft))
      throw new Error(
        'This draft changed in Mail or on another device. Refresh before saving or sending.',
      )
    if (method === 'mail.cards.send' && !fields.to.trim())
      throw new Error('Add a recipient before sending.')
    const saved = await saveGmailDraft(workspaceId, {
      draftId: draft.id,
      to: fields.to,
      cc: fields.cc,
      bcc: fields.bcc,
      subject: fields.subject,
      body: fields.body,
      threadId: draft.composer.threadId,
    })
    if (method === 'mail.cards.save')
      return {
        state: 'draft' as const,
        draft: saved,
        revision: revision(saved),
        accountId,
      }
    // Persist before the provider send: a lost response or app restart must
    // never automatically resend a submitted card. The Gmail draft remains
    // the source of content; this file records only its submission outcome.
    await saveReceipt({
      status: 'sending',
      updatedAt: new Date().toISOString(),
    })
    try {
      const sent = await sendGmailDraft(workspaceId, saved.id)
      await saveReceipt({
        status: 'sent',
        updatedAt: new Date().toISOString(),
        ...(sent.id ? { messageId: sent.id } : {}),
      })
      return { state: 'sent' as const, messageId: sent.id }
    } catch (error) {
      await saveReceipt({
        status: 'uncertain',
        updatedAt: new Date().toISOString(),
      })
      throw error
    }
  })
}
