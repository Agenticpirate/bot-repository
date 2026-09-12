import { getMessage, getThread } from './gmail-service'
import { z } from 'zod'

const selection = z
  .object({
    messageIds: z.array(z.string().min(1).max(256)).min(1).max(8),
    detailId: z.string().min(1).max(256).optional(),
  })
  .strict()

export async function handleMessageCard(
  method: string,
  value: unknown,
  workspaceId: string,
  accountId: string,
) {
  const input = selection.parse(value)
  if (input.detailId && !input.messageIds.includes(input.detailId))
    throw new Error('This email is not part of the card.')
  if (method === 'mail.cards.messages.present') {
    return {
      appCard: {
        version: 1,
        title:
          input.messageIds.length === 1
            ? 'Email'
            : `${input.messageIds.length} emails`,
        resourcePath: '/index.html?card=messages',
        input: { accountId, messageIds: [...new Set(input.messageIds)] },
        openResource: {
          resourceType: 'mail.message',
          idKey: 'messageIds',
          accountIdKey: 'accountId',
        },
        readMethod: 'mail.cards.messages.read',
        actions: [],
        height: 400,
      },
    }
  }
  if (method !== 'mail.cards.messages.read')
    throw new Error('Unknown email card method.')
  const ids = input.detailId ? [input.detailId] : [...new Set(input.messageIds)]
  const selected = await Promise.all(
    ids.map((id) => getMessage(workspaceId, id)),
  )
  // Thread identity is derived from the bound message, never supplied by the frame.
  const thread = input.detailId
    ? await getThread(workspaceId, selected[0]!.threadId)
    : undefined
  const source = thread
    ? thread.messages.filter(
        (message) => message.threadId === selected[0]!.threadId,
      )
    : selected
  const messages = source.slice(-30).map((message) => {
    const summary = {
      id: message.id,
      threadId: message.threadId,
      from: message.from.slice(0, 2000),
      to: message.to.slice(0, 4000),
      subject: message.subject.slice(0, 1000),
      date: message.date,
      snippet: message.snippet.slice(0, 1000),
      unread: message.unread,
    }
    if (!input.detailId) return summary
    const html = message.bodyHtml ?? ''
    const text = message.bodyText ?? ''
    // Large messages remain readable as a bounded text preview. Never cut HTML
    // midway through markup; the full reader remains the owner of large mail.
    const bodyBudget = Math.max(
      2000,
      Math.floor(140_000 / Math.min(source.length || 1, 30)),
    )
    let fullHtml = Buffer.byteLength(html) <= bodyBudget ? html : ''
    const bodyText = Buffer.from(text).subarray(0, bodyBudget).toString('utf8')
    if (Buffer.byteLength(JSON.stringify({ fullHtml, bodyText })) > 210_000)
      fullHtml = ''
    return {
      ...summary,
      cc: message.cc?.slice(0, 4000),
      bodyHtml: fullHtml,
      bodyText,
      truncated:
        (html.length > 0 && fullHtml.length === 0) ||
        Buffer.byteLength(text) > bodyBudget,
      attachments: (message.attachments ?? []).slice(0, 30).map((file) => ({
        filename: file.filename.slice(0, 256),
        mimeType: file.mimeType,
        size: file.size,
      })),
    }
  })
  const result = {
    messages,
    ...(thread
      ? {
          threadId: thread.id,
          totalMessages: source.length,
          threadTruncated: source.length > messages.length,
        }
      : {}),
  }
  if (Buffer.byteLength(JSON.stringify(result)) > 240_000)
    throw new Error('This thread is too large for a preview. Open it in Mail.')
  return result
}
