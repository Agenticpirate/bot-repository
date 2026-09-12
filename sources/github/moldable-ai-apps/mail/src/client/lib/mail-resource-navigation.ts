import type { MailDraft, MailMessageDetail } from '../types'
import { mailAccountPath } from './mail-identity'
import { z } from 'zod'

const identifier = z.string().regex(/^[A-Za-z0-9][A-Za-z0-9._-]{0,255}$/)
export const mailResourceSchema = z
  .object({
    appId: z.literal('mail'),
    resourceType: z.enum(['mail.message', 'mail.draft']),
    accountId: identifier,
    resourceId: identifier,
  })
  .strict()
export type MailResourceTarget = z.infer<typeof mailResourceSchema>

export function mailResourceFromMessage(
  data: unknown,
  workspaceId: string,
): MailResourceTarget | null {
  const message = z
    .object({
      type: z.literal('moldable:open-resource'),
      workspaceId: z.literal(workspaceId),
      resource: mailResourceSchema,
    })
    .strict()
    .safeParse(data)
  return message.success ? message.data.resource : null
}

export function mailResourceFromSearch(
  search: string,
): MailResourceTarget | null {
  const values = new URLSearchParams(search).getAll('moldableResource')
  if (values.length !== 1 || values[0]!.length > 2048) return null
  try {
    const result = mailResourceSchema.safeParse(JSON.parse(values[0]!))
    return result.success ? result.data : null
  } catch {
    return null
  }
}

export async function loadMailResource(
  target: MailResourceTarget,
  fetchWithWorkspace: (path: string) => Promise<Response>,
): Promise<MailMessageDetail> {
  const resource = mailResourceSchema.parse(target)
  if (resource.resourceType !== 'mail.message')
    throw new Error('This resource is not an email message.')
  const response = await fetchWithWorkspace(
    mailAccountPath(
      `/api/messages/${encodeURIComponent(resource.resourceId)}`,
      resource.accountId,
    ),
  )
  if (!response.ok)
    throw new Error(
      response.status === 404
        ? 'This email is no longer available.'
        : 'Could not open this email. Check the Mail connection and try again.',
    )
  const { message } = (await response.json()) as {
    message?: MailMessageDetail
  }
  if (
    !message ||
    message.id !== resource.resourceId ||
    message.accountId !== resource.accountId
  )
    throw new Error(
      'Mail returned a different email than the requested source.',
    )
  return message
}

export async function loadMailDraftResource(
  target: MailResourceTarget,
  fetchWithWorkspace: (path: string) => Promise<Response>,
): Promise<MailDraft> {
  const resource = mailResourceSchema.parse(target)
  if (resource.resourceType !== 'mail.draft')
    throw new Error('This resource is not a draft.')
  const response = await fetchWithWorkspace(
    mailAccountPath(
      `/api/drafts/${encodeURIComponent(resource.resourceId)}`,
      resource.accountId,
    ),
  )
  if (!response.ok)
    throw new Error(
      'This draft is no longer available. Check Drafts or Sent in Mail.',
    )
  const { draft } = (await response.json()) as { draft?: MailDraft }
  if (
    !draft ||
    draft.id !== resource.resourceId ||
    draft.composer.accountId !== resource.accountId
  )
    throw new Error(
      'Mail returned a different draft than the requested source.',
    )
  return draft
}
