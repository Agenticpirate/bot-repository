import {
  ensureDir,
  getWorkspaceFromRequest,
  readJson,
  safePath,
  writeJson,
} from '@moldable-ai/storage'
import type { MailMessageSummary } from '../client/types'
import {
  attachmentMaterializeSchema,
  materializeMessageAttachment,
  messageAttachmentReference,
} from './attachment-materializer'
import {
  attachmentReadSchema,
  readMessageAttachment,
  readableAttachmentMetadata,
} from './attachment-reader'
import { handleMailCard } from './chat-cards'
import { handleMessageCard } from './chat-message-cards'
import {
  type MailFilter,
  type MailFilterInput,
  createMailFilter,
  deleteMailFilter,
  listMailFilters,
  matchesMailFilter,
  updateMailFilter,
} from './filters'
import {
  clearTokens,
  getAuthUrl,
  isAuthenticated,
  saveTokens,
} from './gmail-auth'
import {
  getGmailEventSyncStatus,
  syncGmailEventAccountNow,
} from './gmail-event-sync'
import {
  applyMessageAction,
  assertAllowedRecipientEnvelope,
  deleteGmailDraft,
  forwardMessage,
  getAttachment,
  getGmailDraft,
  getLabels,
  getMessage,
  getProfile,
  getThread,
  isAuthError,
  listContacts,
  listGmailDrafts,
  listMessages,
  listMessagesFresh,
  modifyMessageLabels,
  replyToMessage,
  saveGmailDraft,
  sendGmailDraft,
  sendMessage,
  startGmailTokenKeepalive,
  startMailBackgroundSync,
  unsubscribeAndArchive,
} from './gmail-service'
import {
  enterMailAccountContext,
  getMailAccountContext,
  getMailAccountDataDir,
  mailAccountScopeKey,
  runWithMailAccountContext,
} from './mail-account-context'
import {
  getMailAccountsState,
  resolveMailAccount,
  setActiveMailAccount,
} from './mail-accounts'
import {
  disconnectMailAccountBackgroundServices,
  resumeMailAccountBackgroundServices,
  startMailAccountBackgroundServices,
} from './mail-background'
import { readCachedMessages } from './message-cache'
import { readCachedProfile, writeCachedProfile } from './profile-cache'
import {
  applyMailCorsHeaders,
  authorizeMailApiRequest,
} from './request-security'
import { generateMailSearchQuery } from './search-query'
import { readCachedToday, writeCachedToday } from './today-cache'
import {
  type UnifiedMailboxListOptions,
  listUnifiedDrafts,
  listUnifiedMessages,
  readUnifiedCachedMessages,
  tagMessageDetailForAccount,
  tagMessageForAccount,
  tagThreadForAccount,
  unifiedMailbox,
} from './unified-mailbox'
import { Hono } from 'hono'
import { randomUUID } from 'node:crypto'
import { z } from 'zod'

export const app = new Hono()

app.use('/api/moldable/today', async (c, next) => {
  if (c.req.method !== 'GET') {
    await next()
    return
  }

  await next()

  const response = c.res
  const contentType = response.headers.get('content-type') ?? ''
  if (!contentType.includes('application/json')) return

  const data = (await response
    .clone()
    .json()
    .catch(() => null)) as unknown
  if (!isMoldableTodayResponse(data)) return

  const dismissals = await readMoldableTodayDismissals(c.req.raw)
  const items = filterMoldableTodayDismissedItems(data.items, dismissals)
  if (items.length === data.items.length) return

  const headers = new Headers(response.headers)
  headers.delete('content-length')
  c.res = new Response(JSON.stringify({ ...data, items }), {
    status: response.status,
    statusText: response.statusText,
    headers,
  })
})
app.use('/api/*', async (c, next) => {
  const authorization = authorizeMailApiRequest(c.req.raw)
  if (!authorization.allowed) {
    return c.json({ error: authorization.message }, authorization.status)
  }

  if (c.req.method === 'OPTIONS') {
    const headers = new Headers()
    applyMailCorsHeaders(headers, authorization.corsOrigin)
    return new Response(null, { status: 204, headers })
  }

  await next()
  applyMailCorsHeaders(c.res.headers, authorization.corsOrigin)
})
app.use('/api/*', async (c, next) => {
  const workspaceId = getWorkspaceId(c.req.raw)
  const requestedAccountId =
    c.req.header('x-mail-account-id') ?? c.req.query('accountId')
  const account = await resolveMailAccount(
    workspaceId,
    requestedAccountId,
  ).catch((error) => {
    if (error instanceof Error && error.name === 'GmailNotConnected') {
      return null
    }
    throw error
  })
  if (!account) return next()
  return runWithMailAccountContext(account, next)
})
app.all('/api/action-suggestions', (c) => c.notFound())
app.all('/api/action-suggestions/*', (c) => c.notFound())
app.all('/api/briefing', (c) => c.notFound())
app.all('/api/briefing/*', (c) => c.notFound())

const profileRefreshes = new Map<string, Promise<void>>()
const profileRefreshedAt = new Map<string, number>()
const PROFILE_REFRESH_MIN_INTERVAL_MS = 60_000

const sendMailSchema = z.object({
  accountId: z.string().trim().min(1).optional(),
  replyToMessageId: z.string().trim().min(1).optional(),
  from: z.string().trim().optional(),
  to: z.string().trim().min(1),
  cc: z.string().trim().optional(),
  bcc: z.string().trim().optional(),
  subject: z.string().trim().min(1),
  body: z.string().trim().min(1),
  html: z.boolean().optional(),
  threadId: z.string().trim().optional(),
})

const draftComposerSchema = z.object({
  mode: z.enum(['new', 'reply']),
  accountId: z.string().trim().min(1).optional(),
  draftId: z.string().trim().optional(),
  replyToMessageId: z.string().trim().optional(),
  to: z.string(),
  cc: z.string(),
  bcc: z.string(),
  subject: z.string(),
  body: z.string(),
  threadId: z.string().trim().optional(),
})

const messageActionSchema = z.object({
  action: z.enum([
    'archive',
    'trash',
    'untrash',
    'markRead',
    'markUnread',
    'star',
    'unstar',
    'important',
    'unimportant',
    'spam',
    'notSpam',
    'snooze',
    'unsnooze',
  ]),
  until: z.number().int().positive().optional(),
})

const rpcRequestSchema = z.object({
  method: z.string(),
  params: z.unknown().optional(),
})

function rpcAccountId(params: unknown) {
  if (!params || typeof params !== 'object' || Array.isArray(params)) {
    return undefined
  }
  const value = (params as Record<string, unknown>).accountId
  return typeof value === 'string' && value.trim() ? value.trim() : undefined
}

function withoutRpcAccountId(params: unknown) {
  if (!params || typeof params !== 'object' || Array.isArray(params)) {
    return params
  }
  const { accountId: _accountId, ...rest } = params as Record<string, unknown>
  return rest
}

const searchQuerySchema = z.object({
  query: z.string().trim().min(1).max(500),
  currentLabelId: z.string().trim().optional(),
})

const messageSearchParamsSchema = z
  .object({
    query: z.string().optional(),
    labelId: z.string().optional(),
    maxResults: z.number().int().min(1).max(50).optional(),
  })
  .optional()

const nativeMessageListParamsSchema = z
  .object({
    view: z
      .enum(['inbox', 'unread', 'starred', 'sent', 'all', 'trash', 'search'])
      .nullish()
      .transform((view) => view ?? 'inbox'),
    query: z
      .string()
      .trim()
      .max(500)
      .nullish()
      .transform((query) => query ?? undefined),
    maxResults: z.number().int().min(1).max(50).optional(),
  })
  .strict()
  .superRefine((value, context) => {
    if (value.view === 'search' && !value.query?.trim()) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'query is required for search.',
        path: ['query'],
      })
    }
  })

const messageListParamsSchema = z
  .object({
    query: z.string().optional(),
    labelId: z.string().optional(),
    pageToken: z.string().optional(),
    maxResults: z.number().int().min(1).max(100).optional(),
    includeBodies: z.boolean().optional(),
  })
  .optional()

const messageGetParamsSchema = z.object({
  id: z.string().min(1),
  attachment: z
    .union([attachmentMaterializeSchema, attachmentReadSchema])
    .optional(),
})

type MailUiView = 'inbox' | 'message'

type MailUiIntent = {
  id: string
  view: MailUiView
  entityId?: string
  params?: Record<string, unknown>
  createdAt: string
}

const MAIL_UI_VIEWS = [
  {
    id: 'inbox',
    name: 'Inbox',
    description:
      'The workspace inbox list with sender, subject, snippet, date, and unread state. Takes no entityId and no params.',
  },
  {
    id: 'message',
    name: 'Message reader',
    description:
      'The reader for one email, including its sender, recipients, subject, sanitized speakable body, attachments, and message actions. Requires entityId set to a message id from mail.messages.inbox, mail.messages.list, or mail.messages.search.',
  },
] as const

const mailUiViewSchema = z.enum(['inbox', 'message'])
const mailUiNavigateParamsSchema = z
  .object({
    view: mailUiViewSchema,
    entityId: z.string().trim().min(1).optional(),
    params: z.object({}).strict().optional(),
  })
  .strict()
const mailUiReadParamsSchema = z
  .object({
    view: mailUiViewSchema.optional(),
    entityId: z.string().trim().min(1).optional(),
  })
  .strict()
  .optional()
const openMessageParamsSchema = z
  .object({ messageId: z.string().trim().min(1) })
  .strict()
const archiveMessageParamsSchema = openMessageParamsSchema
const unsubscribeMessageParamsSchema = openMessageParamsSchema
const createDraftParamsSchema = z
  .object({
    draftId: z.string().trim().min(1).optional(),
    to: z.string().optional(),
    cc: z.string().optional(),
    bcc: z.string().optional(),
    subject: z.string().optional(),
    body: z.string().optional(),
    threadId: z.string().trim().min(1).optional(),
  })
  .strict()
const allowedRecipientsSchema = z
  .array(z.string().trim().min(3).max(320))
  .min(1)
  .max(64)
const nativeSendParamsSchema = z
  .object({
    draftId: z.string().trim().min(1).optional(),
    from: z.string().optional(),
    to: z.string().trim().min(1),
    cc: z.string().optional(),
    bcc: z.string().optional(),
    subject: z.string().optional(),
    body: z.string().optional(),
    html: z.boolean().optional(),
    threadId: z.string().trim().min(1).optional(),
    allowedRecipients: allowedRecipientsSchema.optional(),
  })
  .strict()
const replyParamsSchema = z
  .object({
    messageId: z.string().trim().min(1),
    body: z.string().min(1),
    from: z.string().optional(),
    to: z.string().optional(),
    cc: z.string().optional(),
    bcc: z.string().optional(),
    html: z.boolean().optional(),
    draft: z.boolean().optional(),
    remove: z.string().optional(),
    allowedRecipients: allowedRecipientsSchema.optional(),
  })
  .strict()
const forwardParamsSchema = z
  .object({
    messageId: z.string().trim().min(1),
    to: z.string().trim().min(1),
    body: z.string().optional(),
    from: z.string().optional(),
    cc: z.string().optional(),
    bcc: z.string().optional(),
    html: z.boolean().optional(),
    draft: z.boolean().optional(),
    allowedRecipients: allowedRecipientsSchema.optional(),
  })
  .strict()
const triageSummaryParamsSchema = z
  .object({
    query: z.string().trim().max(500).optional(),
    maxResults: z.number().int().min(1).max(100).optional(),
    includeLabels: z.boolean().optional(),
  })
  .strict()
  .optional()
const readMessageParamsSchema = z
  .object({
    messageId: z.string().trim().min(1),
    includeHeaders: z.boolean().optional(),
    html: z.boolean().optional(),
    attachment: z
      .union([attachmentMaterializeSchema, attachmentReadSchema])
      .optional(),
  })
  .strict()
const nativeComposeParamsSchema = z
  .object({
    replyTo: z.string().trim().min(1).optional(),
    draftId: z.string().trim().min(1).optional(),
  })
  .strict()
  .refine((value) => !(value.replyTo && value.draftId), {
    message: 'replyTo and draftId are mutually exclusive.',
  })
  .optional()
const emptyParamsSchema = z.object({}).strict().optional()
const filterMatchSchema = z
  .object({
    fromAddresses: z
      .array(z.string().trim().min(3).max(320))
      .min(1)
      .max(50)
      .optional(),
    fromDomains: z
      .array(z.string().trim().min(3).max(253))
      .min(1)
      .max(50)
      .optional(),
    subjectContains: z
      .array(z.string().trim().min(1).max(500))
      .min(1)
      .max(50)
      .optional(),
    subjectEquals: z
      .array(z.string().trim().min(1).max(500))
      .min(1)
      .max(50)
      .optional(),
  })
  .strict()
  .refine(
    (match) =>
      Object.values(match).some((values) => values && values.length > 0),
    { message: 'A Mail filter needs at least one matching condition.' },
  )
const filterCreateParamsSchema = z
  .object({
    name: z.string().trim().min(1).max(160),
    accountId: z.string().trim().min(1).max(256).optional(),
    enabled: z.boolean().optional(),
    applyExisting: z.boolean().optional(),
    match: filterMatchSchema,
  })
  .strict()
const filterListParamsSchema = z
  .object({ accountId: z.string().trim().min(1).max(256).optional() })
  .strict()
  .optional()
const filterUpdateParamsSchema = z
  .object({
    id: z.string().uuid(),
    name: z.string().trim().min(1).max(160).optional(),
    accountId: z.string().trim().min(1).max(256).nullable().optional(),
    enabled: z.boolean().optional(),
    match: filterMatchSchema.optional(),
  })
  .strict()
  .refine(
    (params) =>
      params.name !== undefined ||
      params.accountId !== undefined ||
      params.enabled !== undefined ||
      params.match !== undefined,
    { message: 'Provide at least one filter field to update.' },
  )
const filterDeleteParamsSchema = z.object({ id: z.string().uuid() }).strict()
const filterApplyParamsSchema = z
  .object({ id: z.string().uuid().optional() })
  .strict()
  .optional()

function uiIntentPath(workspaceId: string) {
  return safePath(getMailAccountDataDir(workspaceId), 'ui-intent.json')
}

async function readUiIntent(workspaceId: string): Promise<MailUiIntent | null> {
  return readJson<MailUiIntent | null>(uiIntentPath(workspaceId), null)
}

async function writeUiIntent(workspaceId: string, intent: MailUiIntent | null) {
  await ensureDir(getMailAccountDataDir(workspaceId))
  await writeJson(uiIntentPath(workspaceId), intent)
}

type ExistingFilterApplyResult = {
  accountId: string
  scanned: number
  matched: number
  archived: number
  failed: number
}

/**
 * Snapshot each Inbox before mutating it so pagination cannot skip messages
 * as matching conversations are archived. New arrivals are covered by the
 * inbound event filter immediately after the filter is stored.
 */
async function applyFilterToExistingInbox(
  workspaceId: string,
  filter: MailFilter,
): Promise<ExistingFilterApplyResult[]> {
  if (!filter.enabled) return []

  const { accounts } = await getMailAccountsState(workspaceId)
  const applicableAccounts = accounts.filter(
    (account) => !filter.accountId || filter.accountId === account.accountId,
  )

  return Promise.all(
    applicableAccounts.map((account) =>
      runWithMailAccountContext(account, async () => {
        const inbox = [] as MailMessageSummary[]
        let pageToken: string | undefined
        do {
          const page = await listMessagesFresh(workspaceId, {
            labelId: 'INBOX',
            maxResults: 100,
            ...(pageToken ? { pageToken } : {}),
          })
          inbox.push(...page.messages)
          pageToken = page.nextPageToken
        } while (pageToken)

        const matches = inbox.filter(
          (message) =>
            message.labelIds.includes('INBOX') &&
            matchesMailFilter(filter.match, message),
        )
        const outcomes = await Promise.allSettled(
          matches.map((message) =>
            applyMessageAction(workspaceId, message.id, 'archive'),
          ),
        )
        const archived = outcomes.filter(
          (outcome) => outcome.status === 'fulfilled',
        ).length
        return {
          accountId: account.accountId,
          scanned: inbox.length,
          matched: matches.length,
          archived,
          failed: matches.length - archived,
        }
      }),
    ),
  )
}

async function queueUiIntent(
  workspaceId: string,
  input: Omit<MailUiIntent, 'id' | 'createdAt'>,
) {
  const intent: MailUiIntent = {
    id: randomUUID(),
    ...input,
    createdAt: new Date().toISOString(),
  }
  await writeUiIntent(workspaceId, intent)
  return intent
}

function cleanReadableMailText(value: string) {
  return value
    .replaceAll('\r\n', '\n')
    .split('\n')
    .map((line) => line.trimEnd())
    .filter((line) => !/^\s*(?:https?:\/\/|www\.)\S+\s*$/i.test(line))
    .join('\n')
    .replaceAll(/\n{3,}/g, '\n\n')
    .trim()
}

function speakableMessage(message: Awaited<ReturnType<typeof getMessage>>) {
  const readableBody = cleanReadableMailText(
    message.bodyText || message.bodyHtmlText || message.snippet,
  )
  return {
    id: message.id,
    threadId: message.threadId,
    from: message.from,
    to: message.to,
    cc: message.cc,
    subject: message.subject,
    subjectDisplay: message.subject.trim() || '(No subject)',
    date: message.date,
    body: readableBody.replaceAll(/\s+/g, ' ').trim(),
    unread: message.unread,
    starred: message.starred,
    important: message.important,
    attachments: message.attachments,
  }
}

function getWorkspaceId(request: Request) {
  const urlWorkspace = new URL(request.url).searchParams.get('workspace')
  return getWorkspaceFromRequest(request) ?? urlWorkspace ?? 'personal'
}

function senderName(raw: string) {
  if (!raw) return 'Unknown sender'
  const match = raw.match(/^\s*"?([^"<]+?)"?\s*<[^>]+>\s*$/)
  if (match && match[1]) return match[1].trim()
  const emailMatch = raw.match(/<([^>]+)>/) ?? raw.match(/([\w.+-]+@[\w.-]+)/)
  if (emailMatch && emailMatch[1]) return emailMatch[1].trim()
  return raw.trim()
}

function formatMailDate(value: string, fallbackTimestamp?: number) {
  const date = new Date(value || fallbackTimestamp || 0)
  if (Number.isNaN(date.getTime())) return value || 'Date unavailable'
  return new Intl.DateTimeFormat(undefined, {
    month: 'short',
    day: 'numeric',
    year:
      date.getFullYear() === new Date().getFullYear() ? undefined : 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(date)
}

function formatMailDateDetail(value: string, fallbackTimestamp?: number) {
  const date = new Date(value || fallbackTimestamp || 0)
  if (Number.isNaN(date.getTime())) return value || 'Date unavailable'
  const dateLabel = new Intl.DateTimeFormat(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(date)
  const timeLabel = new Intl.DateTimeFormat(undefined, {
    hour: 'numeric',
    minute: '2-digit',
  }).format(date)
  return `${dateLabel} at ${timeLabel}`
}

function initialsForName(name: string) {
  const source = name.includes('@') ? (name.split('@', 1)[0] ?? name) : name
  const words = source.match(/[\p{L}\p{N}]+/gu) ?? []
  const selected =
    words.length > 1 ? [words[0], words.at(-1)] : words.slice(0, 1)
  return (
    selected
      .flatMap((word) => Array.from(word ?? '').slice(0, 1))
      .join('')
      .toLocaleUpperCase() || '?'
  )
}

function formatByteCount(value: number) {
  if (!Number.isFinite(value) || value <= 0) return 'Size unavailable'
  if (value < 1024) return `${value} B`
  if (value < 1024 * 1024) return `${Math.round(value / 1024)} KB`
  return `${(value / (1024 * 1024)).toFixed(1)} MB`
}

function senderAddress(raw: string) {
  const angleAddress = raw.match(/<([^>]+)>/)?.[1]?.trim()
  if (angleAddress) return angleAddress
  return raw.match(/[\w.+-]+@[\w.-]+/)?.[0] ?? raw.trim()
}

const NATIVE_MAILBOXES = [
  { id: 'inbox', title: 'Inbox', icon: 'tray', labelId: 'INBOX' },
  { id: 'unread', title: 'Unread', icon: 'envelope.badge', labelId: 'INBOX' },
  { id: 'starred', title: 'Starred', icon: 'star', labelId: 'STARRED' },
  { id: 'sent', title: 'Sent', icon: 'paperplane', labelId: 'SENT' },
  { id: 'drafts', title: 'Drafts', icon: 'doc', labelId: 'DRAFT' },
  { id: 'all', title: 'All Mail', icon: 'archivebox', labelId: undefined },
  { id: 'trash', title: 'Trash', icon: 'trash', labelId: 'TRASH' },
] as const

type NativeMailboxId = (typeof NATIVE_MAILBOXES)[number]['id']

function nativeMailbox(view: NativeMailboxId) {
  return NATIVE_MAILBOXES.find((mailbox) => mailbox.id === view)!
}

function numberQuery(value: string | undefined, fallback: number) {
  const parsed = Number(value ?? fallback)
  return Number.isFinite(parsed) ? parsed : fallback
}

function rpcMessageSummary(message: MailMessageSummary) {
  return {
    accountId: message.accountId ?? getMailAccountContext()?.accountId,
    accountEmailAddress: message.accountEmailAddress,
    id: message.id,
    threadId: message.threadId,
    from: message.from,
    to: message.to,
    subject: message.subject,
    subjectDisplay: message.subject.trim() || '(No subject)',
    date: message.date,
    snippet: message.snippet,
    labelIds: message.labelIds,
    unread: message.unread,
    starred: message.starred,
    important: message.important,
    internalDate: message.internalDate,
    sender: senderName(message.from),
    dateLabel: formatMailDate(message.date, message.internalDate),
    stateLabel: `${message.starred ? '★ · ' : ''}${formatMailDate(message.date, message.internalDate)}`,
    snoozedUntil: message.snoozedUntil,
    bodyCached: message.bodyCached,
    attachments: message.attachments,
    unsubscribe: message.unsubscribe,
  }
}

function nativeMailMessage(message: Awaited<ReturnType<typeof getMessage>>) {
  const accountId = getMailAccountContext()?.accountId
  const attachments = message.attachments.map((attachment) => ({
    ...readableAttachmentMetadata(attachment),
    reference: messageAttachmentReference(
      getMailAccountContext()!.workspaceId,
      message.id,
      attachment.id,
    ),
    sizeLabel: formatByteCount(attachment.size),
  }))
  return {
    accountId,
    id: message.id,
    subjectDisplay: message.subject.trim() || '(No subject)',
    sender: senderName(message.from),
    senderInitials: initialsForName(senderName(message.from)),
    from: message.from,
    recipientSummary: `To: ${message.to || 'Recipient unavailable'}`,
    recipientCompact: 'to me',
    toDetail: message.to || 'Recipient unavailable',
    dateLabel: formatMailDate(message.date, message.internalDate),
    dateDetail: formatMailDateDetail(message.date, message.internalDate),
    unread: message.unread,
    starred: message.starred,
    canArchive: message.labelIds.includes('INBOX'),
    canMarkRead: message.unread,
    canMarkUnread: !message.unread,
    canStar: !message.starred,
    canUnstar: message.starred,
    canTrash: !message.labelIds.includes('TRASH'),
    statusBadges: [
      ...(message.unread
        ? [{ text: 'Unread', tone: 'info', icon: 'envelope.badge' }]
        : []),
      ...(message.starred
        ? [{ text: 'Starred', tone: 'warning', icon: 'star.fill' }]
        : []),
      ...(message.important
        ? [{ text: 'Important', tone: 'warning', icon: 'arrow.up.circle' }]
        : []),
    ],
    replyDestinations: [{ accountId, messageId: message.id }],
    archiveActions: message.labelIds.includes('INBOX')
      ? [{ accountId, messageId: message.id }]
      : [],
    markReadActions: message.unread
      ? [{ accountId, messageId: message.id }]
      : [],
    markUnreadActions: message.unread
      ? []
      : [{ accountId, messageId: message.id }],
    starActions: message.starred ? [] : [{ accountId, messageId: message.id }],
    unstarActions: message.starred
      ? [{ accountId, messageId: message.id }]
      : [],
    trashActions: message.labelIds.includes('TRASH')
      ? []
      : [{ accountId, messageId: message.id }],
    bodyDisplay: boundedNativeText(
      cleanReadableMailText(
        message.bodyText || message.bodyHtmlText || message.snippet,
      ) || 'This message has no readable text content.',
    ),
    bodyHtml: boundedNativeEmailHtml(message.bodyHtml),
    attachments,
    attachmentEmptyStates:
      attachments.length === 0
        ? [
            {
              title: 'No attachments',
              description: 'This message does not include any files.',
            },
          ]
        : [],
  }
}

function boundedNativeEmailHtml(html: string) {
  const sanitized = html
    .replace(/<meta\b[^>]*>/gi, '')
    .replace(/<base\b[^>]*>/gi, '')
    .replace(/<\/?form\b[^>]*>/gi, '')
    .replace(/\son[a-z]+\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+)/gi, '')
    .replace(/javascript\s*:/gi, '')
    .trim()
  return Buffer.byteLength(sanitized, 'utf8') <= 64 * 1024 ? sanitized : ''
}

function boundedNativeText(text: string) {
  const bytes = Buffer.from(text, 'utf8')
  if (bytes.byteLength <= 12 * 1024) return text
  return `${bytes
    .subarray(0, 12 * 1024)
    .toString('utf8')
    .replace(/\uFFFD$/u, '')}\n\n…`
}

function errorDetails(error: unknown) {
  if (!(error instanceof Error)) return { value: error }

  const candidate = error as Error & {
    code?: unknown
    status?: unknown
    response?: { status?: unknown }
    stack?: string
  }
  return {
    name: error.name,
    message: error.message,
    code: candidate.code,
    status: candidate.status,
    responseStatus: candidate.response?.status,
    stack: candidate.stack,
  }
}

function logGmailError(error: unknown, context: Record<string, unknown>) {
  try {
    console.error(
      '[emails:gmail-error]',
      JSON.stringify(
        {
          ...context,
          error: errorDetails(error),
        },
        null,
        2,
      ),
    )
  } catch {
    console.error('[emails:gmail-error]', context, {
      name: error instanceof Error ? error.name : 'UnknownError',
      message: error instanceof Error ? error.message : 'Gmail request failed',
    })
  }
}

function refreshProfileInBackground(workspaceId: string) {
  const scopeKey = mailAccountScopeKey(workspaceId)
  const accountId = getMailAccountContext(workspaceId)?.accountId
  const existing = profileRefreshes.get(scopeKey)
  if (existing) return true

  const lastRefreshedAt = profileRefreshedAt.get(scopeKey) ?? 0
  if (Date.now() - lastRefreshedAt < PROFILE_REFRESH_MIN_INTERVAL_MS) {
    return false
  }

  const refresh = getProfile(workspaceId)
    .then(async (profile) => {
      if (accountId) {
        const accountStillConnected = await resolveMailAccount(
          workspaceId,
          accountId,
        ).catch(() => null)
        if (!accountStillConnected) return
      }
      await writeCachedProfile(workspaceId, profile)
    })
    .catch((error) => {
      if (isAuthError(error)) return
      console.warn('Gmail profile refresh failed:', error)
    })
    .finally(() => {
      profileRefreshedAt.set(scopeKey, Date.now())
      if (profileRefreshes.get(scopeKey) === refresh) {
        profileRefreshes.delete(scopeKey)
      }
    })

  profileRefreshes.set(scopeKey, refresh)
  return true
}

function gmailErrorResponse(
  error: unknown,
  context: Record<string, unknown> = {},
) {
  logGmailError(error, context)

  if (error instanceof Error && error.name === 'GmailNotConnected') {
    return {
      body: { error: 'Gmail is not connected', authenticated: false },
      status: 401 as const,
    }
  }

  if (isAuthError(error)) {
    return {
      body: { error: 'Gmail authorization expired', authenticated: false },
      status: 401 as const,
    }
  }

  const typedError = error as { status?: unknown; code?: unknown }
  if (
    (typedError.code === 'unified_cursor_expired' &&
      typedError.status === 409) ||
    (typedError.code === 'unified_cursor_mismatch' && typedError.status === 400)
  ) {
    return {
      body: {
        error: error instanceof Error ? error.message : 'Invalid mail cursor',
        code: typedError.code,
      },
      status: typedError.status === 409 ? (409 as const) : (400 as const),
    }
  }

  const message =
    error instanceof Error ? error.message : 'Gmail request failed'

  return {
    body: {
      error: message,
      code: message.includes('Gmail API has not been used')
        ? 'gmail_api_disabled'
        : 'gmail_failed',
    },
    status: 500 as const,
  }
}

function authSuccessHtml(accountId: string) {
  return `<!doctype html>
    <html>
      <head><meta charset="utf-8"><title>Gmail connected</title></head>
      <body style="font-family: system-ui, sans-serif; display: grid; place-items: center; height: 100vh; margin: 0; background: #09090b; color: #fafafa;">
        <main style="text-align: center;">
          <h1>Gmail connected</h1>
          <p style="color: #a1a1aa;">You can close this window.</p>
          <script>
            if (window.opener) {
              window.opener.postMessage({ type: 'oauth-success', appId: 'mail', accountId: ${JSON.stringify(accountId)} }, '*');
              setTimeout(() => window.close(), 700);
            }
          </script>
        </main>
      </body>
    </html>`
}

function escapeHtml(value: string) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;')
}

function contentDisposition(
  filename: string,
  disposition: 'attachment' | 'inline',
) {
  const safeFilename = filename.replaceAll(/[\r\n"]/g, '_')
  return `${disposition}; filename="${safeFilename}"; filename*=UTF-8''${encodeURIComponent(
    filename,
  )}`
}

function authFailureHtml(message: string) {
  return `<!doctype html>
    <html>
      <head><meta charset="utf-8"><title>Gmail connection failed</title></head>
      <body style="font-family: system-ui, sans-serif; display: grid; place-items: center; height: 100vh; margin: 0; background: #09090b; color: #fafafa;">
        <main style="max-width: 420px; text-align: center;">
          <h1>Gmail connection failed</h1>
          <p style="color: #a1a1aa;">${escapeHtml(message)}</p>
        </main>
      </body>
    </html>`
}

app.get('/api/moldable/health', (c) => {
  return c.json(
    {
      appId: process.env.MOLDABLE_APP_ID ?? 'mail',
      port: Number(process.env.MOLDABLE_PORT ?? process.env.PORT ?? 0) || null,
      status: 'ok',
      ts: Date.now(),
    },
    200,
    { 'Cache-Control': 'no-store' },
  )
})

app.get('/api/moldable/today', async (c) => {
  const workspaceId = getWorkspaceId(c.req.raw)
  const generatedAt = new Date().toISOString()
  const cachedToday = await readCachedToday(workspaceId).catch((error) => {
    console.warn('Failed to read Today mail cache:', error)
    return null
  })
  const items: unknown[] = []
  let resume: unknown = null

  try {
    if ((await getMailAccountsState(workspaceId)).accounts.length === 0) {
      return c.json({ items, resume, generatedAt })
    }

    // TIMELY: surface only the messages Gmail itself flagged as important AND
    // still unread — the genuinely actionable subset, not the raw unread pile.
    // Silent when there's nothing important waiting.
    const important = await listUnifiedMessages(workspaceId, {
      labelId: 'INBOX',
      query: 'is:important is:unread',
      maxResults: 5,
    })

    if (important && important.messages.length > 0) {
      const messages = important.messages
      const count =
        important.resultSizeEstimate && important.resultSizeEstimate > 0
          ? important.resultSizeEstimate
          : messages.length
      const top = messages[0]
      const sender = senderName(top.from)
      const subject = top.subject.trim() || '(no subject)'

      items.push({
        id: 'mail:important-unread',
        kind: 'timely',
        title:
          count === 1
            ? `${sender}: ${subject}`
            : `${count} important emails unread`,
        subtitle:
          count === 1 ? undefined : `Latest from ${sender} · ${subject}`,
        icon: '📨',
        priority: 75,
        actions: [{ type: 'open-app', label: 'Open inbox' }],
      })
    }

    // RESUME: an unfinished draft left untouched for over an hour. Lead with the
    // thing being written, not a "Finish your draft" prefix.
    const draftResult = await listUnifiedDrafts(workspaceId).catch(() => ({
      drafts: [],
    }))
    const staleDraft = draftResult.drafts.find(
      (draft) => Date.now() - draft.updatedAt > 60 * 60 * 1000,
    )
    if (staleDraft) {
      const subject = staleDraft.composer.subject.trim()
      const recipient = staleDraft.composer.to.trim()
      resume = {
        title: subject || (recipient ? `To ${recipient}` : 'Unsent draft'),
        subtitle: subject && recipient ? `To ${recipient}` : undefined,
        icon: '✍️',
        lastTouchedAt: new Date(staleDraft.updatedAt).toISOString(),
      }
    }
  } catch {
    // Transient Gmail failures should not make Today cards flicker out.
    if (cachedToday) return c.json(cachedToday)
    return c.json({ items: [], resume: null, generatedAt })
  }

  const payload = { items, resume, generatedAt }
  await writeCachedToday(workspaceId, payload).catch((error) => {
    console.warn('Failed to write Today mail cache:', error)
  })
  return c.json(payload)
})

app.get('/api/moldable/commands', async (c) => {
  const draftCount = (
    await listUnifiedDrafts(getWorkspaceId(c.req.raw)).catch(() => ({
      drafts: [],
    }))
  ).drafts.length

  return c.json(
    {
      commands: [
        {
          id: 'mail.compose',
          label: 'Compose email',
          description: 'Start a new message',
          icon: 'pen-line',
          group: 'Mail',
          action: { type: 'message', command: 'mail.compose' },
        },
        {
          id: 'mail.search',
          label: 'Search mail',
          description: 'Focus the mail search field',
          icon: 'search',
          group: 'Mail',
          action: { type: 'message', command: 'mail.search' },
        },
        {
          id: 'mail.refresh',
          label: 'Refresh mail',
          description: 'Fetch the latest messages',
          icon: 'refresh-cw',
          group: 'Mail',
          action: { type: 'message', command: 'mail.refresh' },
        },
        {
          id: 'mail.open-inbox',
          label: 'Open Inbox',
          icon: 'folder',
          group: 'Folders',
          action: { type: 'message', command: 'mail.open-inbox' },
        },
        {
          id: 'mail.open-sent',
          label: 'Open Sent',
          icon: 'send',
          group: 'Folders',
          action: { type: 'message', command: 'mail.open-sent' },
        },
        {
          id: 'mail.open-all',
          label: 'Open All Mail',
          icon: 'archive',
          group: 'Folders',
          action: { type: 'message', command: 'mail.open-all' },
        },
        {
          id: 'mail.open-spam',
          label: 'Open Spam',
          icon: 'ban',
          group: 'Folders',
          action: { type: 'message', command: 'mail.open-spam' },
        },
        {
          id: 'mail.open-trash',
          label: 'Open Trash',
          icon: 'trash-2',
          group: 'Folders',
          action: { type: 'message', command: 'mail.open-trash' },
        },
        ...(draftCount > 0
          ? [
              {
                id: 'mail.open-drafts',
                label: 'Open Drafts',
                description: 'Show Gmail drafts',
                icon: 'file-text',
                group: 'Folders',
                action: { type: 'message', command: 'mail.open-drafts' },
              },
            ]
          : []),
      ],
    },
    200,
    { 'Cache-Control': 'no-store' },
  )
})

app.get('/api/auth/login', async (c) => {
  try {
    const url = await getAuthUrl(getWorkspaceId(c.req.raw))
    return c.json({ url })
  } catch (error) {
    console.error('Gmail login failed:', error)
    return c.json(gmailErrorResponse(error).body, 500)
  }
})

app.get('/api/auth/callback', async (c) => {
  const code = c.req.query('code')
  const state = c.req.query('state')
  if (!code) return c.json({ error: 'No code provided' }, 400)

  try {
    const { account } = await saveTokens(code, state)
    unifiedMailbox.clearWorkspace(account.workspaceId)
    startMailAccountBackgroundServices(account)
    return c.html(authSuccessHtml(account.accountId))
  } catch (error) {
    console.error('Gmail callback failed:', error)
    return c.html(
      authFailureHtml(
        error instanceof Error ? error.message : 'Failed to connect Gmail',
      ),
      500,
    )
  }
})

app.post('/api/auth/logout', async (c) => {
  const workspaceId = getWorkspaceId(c.req.raw)
  const account = await resolveMailAccount(
    workspaceId,
    c.req.query('accountId'),
  )
  disconnectMailAccountBackgroundServices(account)
  try {
    const result = await clearTokens(workspaceId, account.accountId)
    unifiedMailbox.clearWorkspace(workspaceId)
    return c.json({ success: true, ...result })
  } catch (error) {
    const accountStillRegistered = (
      await getMailAccountsState(workspaceId).catch(() => ({ accounts: [] }))
    ).accounts.some((candidate) => candidate.accountId === account.accountId)
    if (accountStillRegistered) resumeMailAccountBackgroundServices(account)
    throw error
  }
})

app.get('/api/accounts', async (c) => {
  const workspaceId = getWorkspaceId(c.req.raw)
  const state = await getMailAccountsState(workspaceId)
  return c.json({
    activeAccountId: state.activeAccountId,
    accounts: state.accounts.map(({ accountId, emailAddress }) => ({
      id: accountId,
      emailAddress,
    })),
  })
})

app.post('/api/accounts/active', async (c) => {
  const workspaceId = getWorkspaceId(c.req.raw)
  const input = z
    .object({ accountId: z.string().trim().min(1) })
    .strict()
    .parse(await c.req.json())
  const account = await setActiveMailAccount(workspaceId, input.accountId)
  return c.json({
    activeAccountId: account.accountId,
    account: { id: account.accountId, emailAddress: account.emailAddress },
  })
})

app.get('/api/status', async (c) => {
  const workspaceId = getWorkspaceId(c.req.raw)

  try {
    const state = await getMailAccountsState(workspaceId)
    const authentication = await Promise.all(
      state.accounts.map(async (candidate) => {
        try {
          return {
            account: candidate,
            authenticated: await isAuthenticated(
              workspaceId,
              candidate.accountId,
            ),
          }
        } catch (error) {
          console.warn(
            `Failed to check Gmail credential for ${candidate.emailAddress}:`,
            error instanceof Error ? error.message : 'Unknown error',
          )
          return { account: candidate, authenticated: false }
        }
      }),
    )
    let account = authentication.find(
      (candidate) =>
        candidate.account.accountId === state.activeAccountId &&
        candidate.authenticated,
    )?.account
    account ??= authentication.find(
      (candidate) => candidate.authenticated,
    )?.account
    if (account && account.accountId !== state.activeAccountId) {
      account = await setActiveMailAccount(workspaceId, account.accountId)
    }
    const accounts = authentication.map(
      ({ account: candidate, authenticated }) => ({
        id: candidate.accountId,
        emailAddress: candidate.emailAddress,
        authenticated,
      }),
    )
    if (!account) {
      return c.json({
        authenticated: false,
        profile: null,
        accounts,
        activeAccountId: state.activeAccountId,
      })
    }

    return runWithMailAccountContext(account, async () => {
      startGmailTokenKeepalive(workspaceId)
      startMailBackgroundSync(workspaceId)
      const profile = (await readCachedProfile(workspaceId)) ?? {
        emailAddress: account.emailAddress,
      }
      const syncing = refreshProfileInBackground(workspaceId)
      return c.json({
        authenticated: true,
        profile,
        syncing,
        accounts,
        activeAccountId: account.accountId,
      })
    })
  } catch (error) {
    const response = gmailErrorResponse(error)
    if (response.status === 401) {
      return c.json({ authenticated: false, profile: null }, 200)
    }
    return c.json(response.body, response.status)
  }
})

app.get('/api/labels', async (c) => {
  try {
    return c.json({ labels: await getLabels(getWorkspaceId(c.req.raw)) })
  } catch (error) {
    const response = gmailErrorResponse(error)
    return c.json(response.body, response.status)
  }
})

app.post('/api/search-query', async (c) => {
  const workspaceId = getWorkspaceId(c.req.raw)

  try {
    const input = searchQuerySchema.parse(await c.req.json())
    const labels = await getLabels(workspaceId).catch((error) => {
      console.warn('Failed to load labels for AI mail search:', error)
      return []
    })
    return c.json(
      await generateMailSearchQuery(
        {
          query: input.query,
          currentLabelId: input.currentLabelId,
          labels,
        },
        workspaceId,
      ),
    )
  } catch (error) {
    if (error instanceof z.ZodError) {
      return c.json({ error: 'Search query is invalid.' }, 400)
    }
    console.warn('Failed to translate natural-language mail search:', error)
    return c.json({ error: 'Failed to translate search query.' }, 500)
  }
})

app.get('/api/messages', async (c) => {
  const workspaceId = getWorkspaceId(c.req.raw)
  const options = {
    labelId: c.req.query('labelId') ?? 'INBOX',
    query: c.req.query('q') ?? undefined,
    pageToken: c.req.query('pageToken') ?? undefined,
    maxResults: numberQuery(c.req.query('maxResults'), 20),
  }

  try {
    if (c.req.query('scope') === 'all') {
      return c.json(await listUnifiedMessages(workspaceId, options))
    }

    const account = await resolveMailAccount(
      workspaceId,
      c.req.query('accountId'),
    )
    const result = await runWithMailAccountContext(account, () =>
      listMessages(workspaceId, options),
    )
    return c.json({
      ...result,
      messages: result.messages.map((message) =>
        tagMessageForAccount(account, message),
      ),
      scope: 'account' as const,
    })
  } catch (error) {
    const response = gmailErrorResponse(error)
    return c.json(response.body, response.status)
  }
})

app.get('/api/messages/:id', async (c) => {
  try {
    const workspaceId = getWorkspaceId(c.req.raw)
    const account = await resolveMailAccount(
      workspaceId,
      c.req.query('accountId'),
    )
    return c.json({
      message: tagMessageDetailForAccount(
        account,
        await runWithMailAccountContext(account, () =>
          getMessage(workspaceId, c.req.param('id')),
        ),
      ),
    })
  } catch (error) {
    const response = gmailErrorResponse(error)
    return c.json(response.body, response.status)
  }
})

app.get('/api/threads/:id', async (c) => {
  try {
    const workspaceId = getWorkspaceId(c.req.raw)
    const account = await resolveMailAccount(
      workspaceId,
      c.req.query('accountId'),
    )
    return c.json({
      thread: tagThreadForAccount(
        account,
        await runWithMailAccountContext(account, () =>
          getThread(workspaceId, c.req.param('id')),
        ),
      ),
    })
  } catch (error) {
    const response = gmailErrorResponse(error)
    return c.json(response.body, response.status)
  }
})

app.get('/api/messages/:id/attachments/:attachmentId', async (c) => {
  try {
    const filename = c.req.query('filename') ?? 'attachment'
    const mimeType = c.req.query('mimeType') ?? 'application/octet-stream'
    const disposition =
      c.req.query('disposition') === 'inline' ? 'inline' : 'attachment'
    const attachment = await getAttachment(
      getWorkspaceId(c.req.raw),
      c.req.param('id'),
      c.req.param('attachmentId'),
      mimeType,
    )

    const body = Uint8Array.from(attachment.data)

    return new Response(body, {
      headers: {
        'Content-Type': attachment.mimeType,
        'Content-Length': String(attachment.data.byteLength),
        'Content-Disposition': contentDisposition(filename, disposition),
        'Cache-Control': 'private, max-age=300',
      },
    })
  } catch (error) {
    const response = gmailErrorResponse(error)
    return c.json(response.body, response.status)
  }
})

app.get('/api/contacts', async (c) => {
  try {
    return c.json({
      contacts: await listContacts(
        getWorkspaceId(c.req.raw),
        c.req.query('query') ?? '',
      ),
    })
  } catch (error) {
    const response = gmailErrorResponse(error)
    return c.json(response.body, response.status)
  }
})

app.get('/api/drafts/:id', async (c) => {
  try {
    const workspaceId = getWorkspaceId(c.req.raw)
    const id = z
      .string()
      .regex(/^[A-Za-z0-9][A-Za-z0-9._-]{0,255}$/)
      .parse(c.req.param('id'))
    // A source handoff requires the exact account; never fall back to selection.
    const accountId = z
      .string()
      .regex(/^[A-Za-z0-9][A-Za-z0-9._-]{0,255}$/)
      .parse(c.req.query('accountId'))
    const account = await resolveMailAccount(workspaceId, accountId)
    const draft = await runWithMailAccountContext(account, () =>
      getGmailDraft(workspaceId, id),
    )
    return c.json({
      draft: {
        ...draft,
        composer: { ...draft.composer, accountId: account.accountId },
      },
    })
  } catch (error) {
    if (error instanceof z.ZodError)
      return c.json({ error: 'Invalid draft reference' }, 400)
    const response = gmailErrorResponse(error)
    return c.json(response.body, response.status)
  }
})

app.get('/api/drafts', async (c) => {
  try {
    const workspaceId = getWorkspaceId(c.req.raw)
    if (c.req.query('scope') === 'all') {
      return c.json(await listUnifiedDrafts(workspaceId))
    }

    const account = await resolveMailAccount(
      workspaceId,
      c.req.query('accountId'),
    )
    const drafts = await runWithMailAccountContext(account, () =>
      listGmailDrafts(workspaceId),
    )
    return c.json({
      scope: 'account',
      drafts: drafts.map((draft) => ({
        ...draft,
        composer: { ...draft.composer, accountId: account.accountId },
      })),
    })
  } catch (error) {
    const response = gmailErrorResponse(error)
    return c.json(response.body, response.status)
  }
})

app.get('/api/moldable/ui-intent', async (c) => {
  if (c.req.query('scope') === 'all') {
    const workspaceId = getWorkspaceId(c.req.raw)
    const state = await getMailAccountsState(workspaceId)
    const intents = await Promise.all(
      state.accounts.map(async (account) => {
        const intent = await runWithMailAccountContext(account, () =>
          readUiIntent(workspaceId),
        )
        return intent ? { ...intent, accountId: account.accountId } : null
      }),
    )
    return c.json(
      intents
        .filter((intent): intent is NonNullable<typeof intent> => !!intent)
        .sort(
          (left, right) =>
            Date.parse(right.createdAt) - Date.parse(left.createdAt),
        )[0] ?? null,
    )
  }
  return c.json(await readUiIntent(getWorkspaceId(c.req.raw)))
})

app.delete('/api/moldable/ui-intent', async (c) => {
  const workspaceId = getWorkspaceId(c.req.raw)
  const expectedId = c.req.query('id')
  const intent = await readUiIntent(workspaceId)
  if (!intent || (expectedId && expectedId !== intent.id)) {
    return c.json({ ok: true, deleted: false })
  }
  await writeUiIntent(workspaceId, null)
  return c.json({ ok: true, deleted: true })
})

app.post('/api/drafts', async (c) => {
  try {
    const composer = draftComposerSchema.parse(await c.req.json())
    const workspaceId = getWorkspaceId(c.req.raw)
    const account = await resolveMailAccount(
      workspaceId,
      c.req.query('accountId') ?? composer.accountId,
    )
    const draft = await runWithMailAccountContext(account, () =>
      saveGmailDraft(workspaceId, composer),
    )
    return c.json({
      draft: {
        ...draft,
        composer: { ...draft.composer, accountId: account.accountId },
      },
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return c.json({ error: 'Invalid draft' }, 400)
    }
    throw error
  }
})

app.delete('/api/drafts/:id', async (c) => {
  try {
    await deleteGmailDraft(getWorkspaceId(c.req.raw), c.req.param('id'))
    return c.json({ ok: true })
  } catch (error) {
    const response = gmailErrorResponse(error)
    return c.json(response.body, response.status)
  }
})

app.post('/api/messages/:id/actions', async (c) => {
  let body: z.infer<typeof messageActionSchema> | null = null
  try {
    body = messageActionSchema.parse(await c.req.json())
    await applyMessageAction(
      getWorkspaceId(c.req.raw),
      c.req.param('id'),
      body.action,
      { until: body.until },
    )
    unifiedMailbox.clearWorkspace(getWorkspaceId(c.req.raw))
    return c.json({ ok: true })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return c.json({ error: 'Invalid message action' }, 400)
    }
    const response = gmailErrorResponse(error, {
      route: 'POST /api/messages/:id/actions',
      messageId: c.req.param('id'),
      body,
    })
    return c.json(response.body, response.status)
  }
})

app.post('/api/messages/:id/unsubscribe-archive', async (c) => {
  try {
    await unsubscribeAndArchive(getWorkspaceId(c.req.raw), c.req.param('id'))
    unifiedMailbox.clearWorkspace(getWorkspaceId(c.req.raw))
    return c.json({ ok: true })
  } catch (error) {
    const response = gmailErrorResponse(error, {
      route: 'POST /api/messages/:id/unsubscribe-archive',
      messageId: c.req.param('id'),
    })
    return c.json(response.body, response.status)
  }
})

const labelChangeSchema = z
  .object({
    addLabelIds: z.array(z.string().min(1)).max(50).optional(),
    removeLabelIds: z.array(z.string().min(1)).max(50).optional(),
  })
  .refine(
    (value) =>
      (value.addLabelIds?.length ?? 0) + (value.removeLabelIds?.length ?? 0) >
      0,
    { message: 'At least one label change is required' },
  )

app.post('/api/messages/:id/labels', async (c) => {
  let body: z.infer<typeof labelChangeSchema> | null = null
  try {
    body = labelChangeSchema.parse(await c.req.json())
    await modifyMessageLabels(
      getWorkspaceId(c.req.raw),
      c.req.param('id'),
      body,
    )
    unifiedMailbox.clearWorkspace(getWorkspaceId(c.req.raw))
    return c.json({ ok: true })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return c.json({ error: 'Invalid label change' }, 400)
    }
    const response = gmailErrorResponse(error, {
      route: 'POST /api/messages/:id/labels',
      messageId: c.req.param('id'),
      body,
    })
    return c.json(response.body, response.status)
  }
})

app.post('/api/send', async (c) => {
  try {
    const body = sendMailSchema.parse(await c.req.json())
    const workspaceId = getWorkspaceId(c.req.raw)
    const result = body.replyToMessageId
      ? await replyToMessage(workspaceId, {
          messageId: body.replyToMessageId,
          body: body.body,
          from: body.from,
          to: body.to,
          cc: body.cc,
          bcc: body.bcc,
          html: body.html,
        })
      : await sendMessage(workspaceId, body)

    unifiedMailbox.clearWorkspace(workspaceId)

    return c.json({ ok: true, ...result })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return c.json({ error: 'Recipient, subject, and body are required' }, 400)
    }
    const response = gmailErrorResponse(error)
    return c.json(response.body, response.status)
  }
})

app.post('/api/moldable/rpc', async (c) => {
  const workspaceId = getWorkspaceId(c.req.raw)

  try {
    let body = rpcRequestSchema.parse(await c.req.json())
    const originalParams = body.params

    if (body.method === 'mail.accounts.list') {
      emptyParamsSchema.parse(body.params)
      const state = await getMailAccountsState(workspaceId)
      return c.json({
        ok: true,
        result: {
          activeAccountId: state.activeAccountId,
          accounts: state.accounts.map(({ accountId, emailAddress }) => ({
            id: accountId,
            emailAddress,
          })),
        },
      })
    }

    if (body.method === 'mail.accounts.setActive') {
      const params = z
        .object({ accountId: z.string().trim().min(1) })
        .strict()
        .parse(originalParams)
      const account = await setActiveMailAccount(workspaceId, params.accountId)
      return c.json({
        ok: true,
        result: {
          activeAccountId: account.accountId,
          account: {
            id: account.accountId,
            emailAddress: account.emailAddress,
          },
        },
      })
    }

    if (body.method === 'mail.filters.list') {
      const params = filterListParamsSchema.parse(originalParams)
      const filters = await listMailFilters(workspaceId)
      return c.json({
        ok: true,
        result: {
          filters: params?.accountId
            ? filters.filter(
                (filter) =>
                  !filter.accountId || filter.accountId === params.accountId,
              )
            : filters,
        },
      })
    }

    if (body.method === 'mail.filters.create') {
      const params = filterCreateParamsSchema.parse(originalParams)
      if (params.accountId) {
        const state = await getMailAccountsState(workspaceId)
        if (
          !state.accounts.some(
            (account) => account.accountId === params.accountId,
          )
        ) {
          throw new z.ZodError([
            {
              code: 'custom',
              path: ['accountId'],
              message:
                'The requested Mail account is not connected in this workspace.',
            },
          ])
        }
      }
      const filter = await createMailFilter(
        workspaceId,
        params satisfies MailFilterInput,
      )
      const existingInbox =
        params.applyExisting === false
          ? []
          : await applyFilterToExistingInbox(workspaceId, filter)
      unifiedMailbox.clearWorkspace(workspaceId)
      return c.json({ ok: true, result: { filter, existingInbox } })
    }

    if (body.method === 'mail.filters.apply') {
      const params = filterApplyParamsSchema.parse(originalParams)
      const filters = await listMailFilters(workspaceId)
      const selected = params?.id
        ? filters.filter((filter) => filter.id === params.id)
        : filters
      if (params?.id && selected.length === 0) {
        return c.json(
          {
            ok: false,
            error: { code: 'not_found', message: 'Mail filter was not found.' },
          },
          404,
        )
      }
      const existingInbox = await Promise.all(
        selected.map(async (filter) => ({
          filterId: filter.id,
          accounts: await applyFilterToExistingInbox(workspaceId, filter),
        })),
      )
      unifiedMailbox.clearWorkspace(workspaceId)
      return c.json({ ok: true, result: { existingInbox } })
    }

    if (body.method === 'mail.filters.update') {
      const params = filterUpdateParamsSchema.parse(originalParams)
      if (params.accountId) {
        const state = await getMailAccountsState(workspaceId)
        if (
          !state.accounts.some(
            (account) => account.accountId === params.accountId,
          )
        ) {
          throw new z.ZodError([
            {
              code: 'custom',
              path: ['accountId'],
              message:
                'The requested Mail account is not connected in this workspace.',
            },
          ])
        }
      }
      const filter = await updateMailFilter(workspaceId, params.id, {
        name: params.name,
        accountId: params.accountId,
        enabled: params.enabled,
        match: params.match,
      })
      if (!filter) {
        return c.json(
          {
            ok: false,
            error: { code: 'not_found', message: 'Mail filter was not found.' },
          },
          404,
        )
      }
      return c.json({ ok: true, result: { filter } })
    }

    if (body.method === 'mail.filters.delete') {
      const params = filterDeleteParamsSchema.parse(originalParams)
      const deleted = await deleteMailFilter(workspaceId, params.id)
      if (!deleted) {
        return c.json(
          {
            ok: false,
            error: { code: 'not_found', message: 'Mail filter was not found.' },
          },
          404,
        )
      }
      return c.json({ ok: true, result: { deleted: true } })
    }

    if (body.method === 'mail.status') {
      const state = await getMailAccountsState(workspaceId)
      const requestedAccountId = rpcAccountId(originalParams)
      const account = requestedAccountId
        ? state.accounts.find((item) => item.accountId === requestedAccountId)
        : state.accounts.find(
            (item) => item.accountId === state.activeAccountId,
          )
      if (!account) {
        return c.json({
          ok: true,
          result: {
            connected: false,
            accountId: null,
            emailAddress: null,
            activeAccountId: state.activeAccountId,
          },
        })
      }
      enterMailAccountContext(account)
      return c.json({
        ok: true,
        result: {
          connected: await isAuthenticated(workspaceId, account.accountId),
          accountId: account.accountId,
          emailAddress: account.emailAddress,
          activeAccountId: state.activeAccountId,
        },
      })
    }

    const requestedAccountId = rpcAccountId(originalParams)
    body = { ...body, params: withoutRpcAccountId(originalParams) }
    const account = await resolveMailAccount(
      workspaceId,
      requestedAccountId,
    ).catch((error) => {
      if (error instanceof Error && error.name === 'GmailNotConnected') {
        return {
          workspaceId,
          accountId: 'disconnected',
          emailAddress: '',
          connectedAt: '',
          lastUsedAt: '',
          useLegacyStorage: true,
        }
      }
      throw error
    })
    enterMailAccountContext(account)
    const useUnifiedRpcScope =
      !requestedAccountId &&
      (await getMailAccountsState(workspaceId)).accounts.length > 1
    const listMessagesForRpc = async (options: UnifiedMailboxListOptions) => {
      if (useUnifiedRpcScope) {
        return listUnifiedMessages(workspaceId, options)
      }
      const result = await listMessages(workspaceId, options)
      return {
        ...result,
        scope: 'account' as const,
        accountErrors: undefined,
        messages: result.messages.map((message) =>
          tagMessageForAccount(account, message),
        ),
      }
    }
    const readCachedMessagesForRpc = async () => {
      if (useUnifiedRpcScope) return readUnifiedCachedMessages(workspaceId)
      return (await readCachedMessages(workspaceId)).map((message) =>
        tagMessageForAccount(account, message),
      )
    }
    const listDraftsForRpc = async () => {
      if (useUnifiedRpcScope) return listUnifiedDrafts(workspaceId)
      return {
        scope: 'account' as const,
        accountErrors: undefined,
        drafts: (await listGmailDrafts(workspaceId)).map((draft) => ({
          ...draft,
          composer: { ...draft.composer, accountId: account.accountId },
        })),
      }
    }

    if (body.method.startsWith('mail.cards.messages.')) {
      return c.json({
        ok: true,
        result: await handleMessageCard(
          body.method,
          body.params,
          workspaceId,
          account.accountId,
        ),
      })
    }
    if (body.method.startsWith('mail.cards.')) {
      const result = await handleMailCard(
        body.method,
        body.params,
        workspaceId,
        account.accountId,
      )
      if (
        body.method === 'mail.cards.save' ||
        body.method === 'mail.cards.send'
      )
        unifiedMailbox.clearWorkspace(workspaceId)
      return c.json({ ok: true, result })
    }
    if (body.method === 'mail.proactive.status') {
      emptyParamsSchema.parse(body.params)
      return c.json({
        ok: true,
        result: await getGmailEventSyncStatus(account),
      })
    }

    if (body.method === 'mail.proactive.sync') {
      emptyParamsSchema.parse(body.params)
      await syncGmailEventAccountNow(account)
      return c.json({
        ok: true,
        result: {
          synced: true,
          ...(await getGmailEventSyncStatus(account)),
        },
      })
    }

    if (body.method === 'mail.ui.describe') {
      emptyParamsSchema.parse(body.params)
      return c.json({
        ok: true,
        result: {
          views: MAIL_UI_VIEWS,
          entities:
            'Use Gmail message ids returned by mail.messages.inbox, mail.messages.list, or mail.messages.search.',
        },
      })
    }

    if (body.method === 'mail.ui.navigate') {
      const params = mailUiNavigateParamsSchema.parse(body.params)
      if (params.view === 'inbox') {
        if (params.entityId || params.params) {
          throw new z.ZodError([
            {
              code: 'custom',
              path: ['params'],
              message: 'The inbox view takes no entityId or params.',
            },
          ])
        }
      } else {
        if (!params.entityId) {
          throw new z.ZodError([
            {
              code: 'custom',
              path: ['entityId'],
              message: 'The message view requires a message entityId.',
            },
          ])
        }
        await getMessage(workspaceId, params.entityId)
      }
      const intent = await queueUiIntent(workspaceId, params)
      return c.json({ ok: true, result: { ok: true, intentId: intent.id } })
    }

    if (body.method === 'mail.ui.openMessage') {
      const params = openMessageParamsSchema.parse(body.params)
      await getMessage(workspaceId, params.messageId)
      const intent = await queueUiIntent(workspaceId, {
        view: 'message',
        entityId: params.messageId,
      })
      return c.json({ ok: true, result: { ok: true, intentId: intent.id } })
    }

    if (body.method === 'mail.messages.archive') {
      const params = archiveMessageParamsSchema.parse(body.params)
      await getMessage(workspaceId, params.messageId)
      await applyMessageAction(workspaceId, params.messageId, 'archive')
      unifiedMailbox.clearWorkspace(workspaceId)
      return c.json({ ok: true, result: { ok: true } })
    }

    if (body.method === 'mail.messages.spam') {
      const params = openMessageParamsSchema.parse(body.params)
      await getMessage(workspaceId, params.messageId)
      await applyMessageAction(workspaceId, params.messageId, 'spam')
      unifiedMailbox.clearWorkspace(workspaceId)
      return c.json({ ok: true, result: { ok: true } })
    }

    if (body.method === 'mail.messages.unsubscribe') {
      const params = unsubscribeMessageParamsSchema.parse(body.params)
      await getMessage(workspaceId, params.messageId)
      await unsubscribeAndArchive(workspaceId, params.messageId)
      unifiedMailbox.clearWorkspace(workspaceId)
      return c.json({ ok: true, result: { ok: true, archived: true } })
    }

    const nativeMessageActions = {
      'mail.messages.markRead': 'markRead',
      'mail.messages.markUnread': 'markUnread',
      'mail.messages.star': 'star',
      'mail.messages.unstar': 'unstar',
      'mail.messages.trash': 'trash',
    } as const
    if (body.method in nativeMessageActions) {
      const params = openMessageParamsSchema.parse(body.params)
      await getMessage(workspaceId, params.messageId)
      await applyMessageAction(
        workspaceId,
        params.messageId,
        nativeMessageActions[body.method as keyof typeof nativeMessageActions],
      )
      unifiedMailbox.clearWorkspace(workspaceId)
      return c.json({ ok: true, result: { ok: true } })
    }

    if (body.method === 'mail.drafts.create') {
      const params = createDraftParamsSchema.parse(body.params)
      const draft = await saveGmailDraft(workspaceId, {
        draftId: params.draftId,
        to: params.to ?? '',
        cc: params.cc ?? '',
        bcc: params.bcc ?? '',
        subject: params.subject ?? '',
        body: params.body ?? '',
        threadId: params.threadId,
      })
      unifiedMailbox.clearWorkspace(workspaceId)
      return c.json({ ok: true, result: { draft, sent: false } })
    }

    if (body.method === 'mail.drafts.delete') {
      const params = z
        .object({ draftId: z.string().trim().min(1) })
        .strict()
        .parse(body.params)
      await deleteGmailDraft(workspaceId, params.draftId)
      unifiedMailbox.clearWorkspace(workspaceId)
      return c.json({ ok: true, result: { ok: true } })
    }

    if (body.method === 'mail.reply' || body.method === 'mail.replyAll') {
      const params = replyParamsSchema.parse(body.params)
      const result = await replyToMessage(
        workspaceId,
        params,
        body.method === 'mail.replyAll',
      )
      unifiedMailbox.clearWorkspace(workspaceId)
      return c.json({
        ok: true,
        result: { ...result, accountId: account.accountId },
      })
    }

    if (body.method === 'mail.forward') {
      const params = forwardParamsSchema.parse(body.params)
      const result = await forwardMessage(workspaceId, params)
      unifiedMailbox.clearWorkspace(workspaceId)
      return c.json({
        ok: true,
        result: { ...result, accountId: account.accountId },
      })
    }

    if (body.method === 'mail.read') {
      const params = readMessageParamsSchema.parse(body.params)
      const message = await getMessage(workspaceId, params.messageId)
      if (params.attachment && 'mode' in params.attachment) {
        return c.json({
          ok: true,
          result: {
            attachmentContent: await materializeMessageAttachment(
              workspaceId,
              message,
              params.attachment,
            ),
          },
        })
      }
      return c.json({
        ok: true,
        result: {
          accountId: account.accountId,
          id: message.id,
          threadId: message.threadId,
          body: params.html
            ? message.bodyHtml || message.bodyText
            : message.bodyText || message.bodyHtmlText,
          attachments: message.attachments.map((attachment) => ({
            ...readableAttachmentMetadata(attachment),
            reference: messageAttachmentReference(
              workspaceId,
              message.id,
              attachment.id,
            ),
          })),
          ...(params.attachment
            ? {
                attachmentContent: await readMessageAttachment(
                  workspaceId,
                  message,
                  params.attachment,
                ),
              }
            : {}),
          ...(params.includeHeaders
            ? {
                headers: {
                  from: message.from,
                  to: message.to,
                  cc: message.cc,
                  subject: message.subject,
                  date: message.date,
                },
              }
            : {}),
        },
      })
    }

    if (body.method === 'mail.triage') {
      const params = triageSummaryParamsSchema.parse(body.params)
      const query = params?.query?.trim() || 'is:unread'
      const result = await listMessagesForRpc({
        labelId: 'INBOX',
        query,
        maxResults: params?.maxResults ?? 20,
      })
      return c.json({
        ok: true,
        result: {
          accountId: useUnifiedRpcScope ? null : account.accountId,
          scope: useUnifiedRpcScope ? 'unified' : 'account',
          query,
          resultSizeEstimate: result.resultSizeEstimate,
          accountErrors: result.accountErrors,
          messages: result.messages.map((message) => ({
            accountId: message.accountId,
            accountEmailAddress: message.accountEmailAddress,
            id: message.id,
            from: message.from,
            subject: message.subject,
            date: message.date,
            ...(params?.includeLabels ? { labelIds: message.labelIds } : {}),
          })),
        },
      })
    }

    if (body.method.startsWith('mail.triage.')) {
      return c.json(
        {
          ok: false,
          error: {
            code: 'method_not_found',
            message: `${body.method} was removed with AI mail triaging. Use mail.triage for a deterministic unread summary.`,
          },
        },
        404,
      )
    }

    if (body.method === 'mail.messages.send' || body.method === 'mail.send') {
      const params = nativeSendParamsSchema.parse(body.params)
      assertAllowedRecipientEnvelope(params)
      let result
      if (params.draftId) {
        const draft = await saveGmailDraft(workspaceId, {
          draftId: params.draftId,
          from: params.from,
          to: params.to,
          cc: params.cc,
          bcc: params.bcc,
          subject: params.subject ?? '',
          body: params.body ?? '',
          html: params.html,
          threadId: params.threadId,
          allowedRecipients: params.allowedRecipients,
        })
        result = await sendGmailDraft(workspaceId, draft.id)
      } else {
        result = await sendMessage(workspaceId, {
          to: params.to,
          from: params.from,
          cc: params.cc,
          bcc: params.bcc,
          subject: params.subject ?? '',
          body: params.body ?? '',
          html: params.html,
          threadId: params.threadId,
          allowedRecipients: params.allowedRecipients,
        })
      }
      unifiedMailbox.clearWorkspace(workspaceId)
      return c.json({
        ok: true,
        result: { ...result, sent: true, accountId: account.accountId },
      })
    }

    if (body.method === 'mail.ui.read') {
      const params = mailUiReadParamsSchema.parse(body.params)
      if (params?.entityId) {
        const message = await getMessage(workspaceId, params.entityId)
        return c.json({
          ok: true,
          result: {
            view: 'message',
            message: speakableMessage(message),
          },
        })
      }
      if (params?.view === 'message') {
        throw new z.ZodError([
          {
            code: 'custom',
            path: ['entityId'],
            message: 'Reading the message view requires an entityId.',
          },
        ])
      }
      const cached = (await readCachedMessagesForRpc())
        .filter((message) => message.labelIds.includes('INBOX'))
        .sort((a, b) => b.internalDate - a.internalDate)
      return c.json({
        ok: true,
        result: {
          view: 'inbox',
          summary: {
            messageCount: cached.length,
            unreadCount: cached.filter((message) => message.unread).length,
            importantCount: cached.filter((message) => message.important)
              .length,
          },
          messages: cached.map(rpcMessageSummary),
        },
      })
    }

    if (body.method === 'mail.native.mailboxes') {
      emptyParamsSchema.parse(body.params)
      const [cached, draftResult] = await Promise.all([
        readCachedMessagesForRpc(),
        listDraftsForRpc(),
      ])
      const drafts = draftResult.drafts
      const countFor = (mailbox: (typeof NATIVE_MAILBOXES)[number]) => {
        if (mailbox.id === 'drafts') return drafts.length
        if (mailbox.id === 'all') return cached.length
        if (mailbox.id === 'unread') {
          return cached.filter(
            (message) => message.labelIds.includes('INBOX') && message.unread,
          ).length
        }
        return cached.filter((message) =>
          mailbox.labelId ? message.labelIds.includes(mailbox.labelId) : true,
        ).length
      }
      const mailboxes = NATIVE_MAILBOXES.map((mailbox) => ({
        id: mailbox.id,
        title: mailbox.title,
        icon: mailbox.icon,
        countLabel: countFor(mailbox).toLocaleString(),
      }))
      return c.json({
        ok: true,
        result: {
          connected: useUnifiedRpcScope
            ? (await getMailAccountsState(workspaceId)).accounts.length > 0
            : await isAuthenticated(workspaceId),
          scope: useUnifiedRpcScope ? 'unified' : 'account',
          accountErrors: draftResult.accountErrors,
          mailboxes,
          triageMailboxes: mailboxes.filter((mailbox) =>
            ['inbox', 'unread'].includes(mailbox.id),
          ),
          draftMailboxes: mailboxes.filter(
            (mailbox) => mailbox.id === 'drafts',
          ),
          otherMailboxes: mailboxes.filter(
            (mailbox) => !['inbox', 'unread', 'drafts'].includes(mailbox.id),
          ),
          composeDestinations: [{}],
          searchDestinations: [{}],
        },
      })
    }

    if (body.method === 'mail.native.compose') {
      const params = nativeComposeParamsSchema.parse(body.params)
      if (params?.draftId) {
        const draft = await getGmailDraft(workspaceId, params.draftId)
        return c.json({
          ok: true,
          result: {
            accountId: account.accountId,
            heading: 'Edit draft',
            draft: { ...draft.composer, accountId: account.accountId },
            deleteActions: [
              { draftId: draft.id, accountId: account.accountId },
            ],
          },
        })
      }
      if (!params?.replyTo) {
        return c.json({
          ok: true,
          result: {
            accountId: account.accountId,
            heading: 'New message',
            draft: {
              accountId: account.accountId,
              to: '',
              cc: '',
              bcc: '',
              subject: '',
              body: '',
              threadId: '',
            },
            deleteActions: [],
          },
        })
      }
      const message = await getMessage(workspaceId, params.replyTo)
      return c.json({
        ok: true,
        result: {
          accountId: account.accountId,
          heading: `Reply to ${senderName(message.from)}`,
          draft: {
            accountId: account.accountId,
            to: senderAddress(message.from),
            cc: '',
            bcc: '',
            subject: /^re:/i.test(message.subject.trim())
              ? message.subject.trim()
              : `Re: ${message.subject.trim() || '(No subject)'}`,
            body: '',
            threadId: message.threadId,
          },
          deleteActions: [],
        },
      })
    }

    if (body.method === 'mail.native.drafts') {
      emptyParamsSchema.parse(body.params)
      const draftResult = await listDraftsForRpc()
      const drafts = draftResult.drafts
      return c.json({
        ok: true,
        result: {
          title: 'Drafts',
          scope: draftResult.scope,
          accountErrors: draftResult.accountErrors,
          subtitle: `${drafts.length} ${drafts.length === 1 ? 'draft' : 'drafts'}`,
          drafts: drafts.map((draft) => ({
            accountId: draft.composer.accountId,
            id: draft.id,
            recipient: draft.composer.to.trim() || 'No recipient',
            subjectDisplay: draft.composer.subject.trim() || '(No subject)',
            snippet: draft.composer.body.trim() || 'Empty draft',
            dateLabel: formatMailDate(
              new Date(draft.updatedAt).toISOString(),
              draft.updatedAt,
            ),
          })),
          emptyStates:
            drafts.length === 0
              ? [
                  {
                    title: 'No saved drafts',
                    description: 'Drafts saved on iPhone or Mac appear here.',
                  },
                ]
              : [],
        },
      })
    }

    if (
      body.method === 'mail.messages.search' ||
      body.method === 'mail.messages.unread'
    ) {
      const params = messageSearchParamsSchema.parse(body.params)
      const query =
        body.method === 'mail.messages.unread'
          ? ['is:unread', params?.query].filter(Boolean).join(' ')
          : params?.query
      const result = await listMessagesForRpc({
        labelId: params?.labelId ?? 'INBOX',
        query,
        maxResults: params?.maxResults ?? 10,
      })

      return c.json({
        ok: true,
        result: {
          messages: result.messages,
          scope: result.scope,
          accountErrors: result.accountErrors,
        },
      })
    }

    if (body.method === 'mail.native.messages') {
      const params = nativeMessageListParamsSchema.parse(body.params)
      const mailbox =
        params.view === 'search' ? null : nativeMailbox(params.view)
      const query =
        params.view === 'unread'
          ? 'is:unread'
          : params.view === 'search'
            ? params.query
            : undefined
      try {
        const result = await listMessagesForRpc({
          labelId: mailbox?.labelId,
          query,
          maxResults: params.maxResults ?? 30,
        })
        const messages = result.messages.map(rpcMessageSummary)
        return c.json({
          ok: true,
          result: {
            connected: true,
            scope: result.scope,
            accountErrors: result.accountErrors,
            messages,
            title: params.view === 'search' ? 'Search results' : mailbox?.title,
            subtitle: `${messages.length} ${messages.length === 1 ? 'message' : 'messages'}${params.view === 'search' ? ` for “${params.query}”` : ''}`,
            emptyStates:
              messages.length === 0
                ? [
                    {
                      title:
                        params.view === 'search'
                          ? 'No matching mail'
                          : params.view === 'unread'
                            ? 'You are all caught up'
                            : `No ${mailbox?.title.toLowerCase() ?? 'mail'}`,
                      description:
                        params.view === 'search'
                          ? 'Try another sender, subject, or Gmail query.'
                          : 'There are no messages in this view.',
                    },
                  ]
                : [],
          },
        })
      } catch (error) {
        if (
          isAuthError(error) ||
          (error instanceof Error && error.name === 'GmailNotConnected')
        ) {
          return c.json({
            ok: true,
            result: {
              connected: false,
              messages: [],
              title:
                params.view === 'search'
                  ? 'Search results'
                  : nativeMailbox(params.view).title,
              subtitle: 'Mail needs attention',
              emptyStates: [
                {
                  title: 'Connect Mail on your Mac',
                  description:
                    'Open Mail on desktop to reconnect your Gmail account.',
                },
              ],
            },
          })
        }
        throw error
      }
    }

    if (
      body.method === 'mail.messages.list' ||
      body.method === 'mail.messages.inbox'
    ) {
      const params = messageListParamsSchema.parse(body.params)
      const result = await listMessagesForRpc({
        labelId:
          body.method === 'mail.messages.inbox'
            ? 'INBOX'
            : (params?.labelId ?? 'INBOX'),
        query: params?.query,
        pageToken: params?.pageToken,
        maxResults: params?.maxResults ?? 25,
      })

      return c.json({
        ok: true,
        result: {
          scope: result.scope,
          accountErrors: result.accountErrors,
          messages: params?.includeBodies
            ? result.messages
            : result.messages.map(rpcMessageSummary),
          nextPageToken: result.nextPageToken,
          resultSizeEstimate: result.resultSizeEstimate,
        },
      })
    }

    if (body.method === 'mail.messages.get') {
      const params = messageGetParamsSchema.parse(body.params)
      const message = await getMessage(workspaceId, params.id)
      if (params.attachment && 'mode' in params.attachment) {
        return c.json({
          ok: true,
          result: {
            attachmentContent: await materializeMessageAttachment(
              workspaceId,
              message,
              params.attachment,
            ),
          },
        })
      }
      return c.json({
        ok: true,
        result: {
          ...nativeMailMessage(message),
          ...(params.attachment
            ? {
                attachmentContent: await readMessageAttachment(
                  workspaceId,
                  message,
                  params.attachment,
                ),
              }
            : {}),
        },
      })
    }

    return c.json(
      {
        ok: false,
        error: {
          code: 'method_not_found',
          message: `Mail does not expose ${body.method}.`,
        },
      },
      404,
    )
  } catch (error) {
    if (error instanceof Error && error.name === 'GmailNotConnected') {
      return c.json({
        ok: false,
        error: {
          code: 'gmail_not_connected',
          message: 'Connect Gmail before reading email in this workspace.',
        },
      })
    }

    if (error instanceof z.ZodError) {
      return c.json(
        {
          ok: false,
          error: {
            code: 'invalid_params',
            message: 'Mail received invalid RPC parameters.',
            detail: error.flatten(),
          },
        },
        400,
      )
    }

    const response = gmailErrorResponse(error)
    return c.json(
      {
        ok: false,
        error: {
          code:
            response.status === 401 ? 'gmail_not_connected' : 'gmail_failed',
          message: response.body.error,
        },
      },
      response.status,
    )
  }
})

app.post('/api/moldable/today/dismiss', async (c) => {
  const body = (await c.req.json().catch(() => null)) as unknown
  if (!isMoldableTodayDismissalRequest(body)) {
    return c.json({ error: 'Invalid Today dismissal payload.' }, 400)
  }

  const dismissals = await recordMoldableTodayDismissal(c.req.raw, {
    id: body.id,
    dismissalKey: body.dismissalKey,
    materialDismissalKey: body.materialDismissalKey,
    dismissedAt: body.dismissedAt ?? new Date().toISOString(),
    item: body.item,
  })

  return c.json({ ok: true, dismissals: dismissals.length })
})

type MoldableTodayItem = {
  id?: unknown
  kind?: unknown
  title?: unknown
  subtitle?: unknown
  groupHint?: unknown
}

type MoldableTodayDismissal = {
  id: string
  dismissalKey?: string
  materialDismissalKey?: string
  dismissedAt: string
  item?: {
    kind?: string
    title?: string
    subtitle?: string
    groupHint?: string
  }
}

function isMoldableTodayResponse(value: unknown): value is {
  items: MoldableTodayItem[]
  [key: string]: unknown
} {
  return isMoldableTodayRecord(value) && Array.isArray(value.items)
}

function isMoldableTodayDismissalRequest(
  value: unknown,
): value is MoldableTodayDismissal {
  if (!isMoldableTodayRecord(value)) return false
  return (
    typeof value.id === 'string' &&
    value.id.trim().length > 0 &&
    optionalMoldableTodayString(value.dismissalKey) &&
    optionalMoldableTodayString(value.materialDismissalKey) &&
    optionalMoldableTodayString(value.dismissedAt) &&
    (value.item === undefined || isMoldableTodayDismissalItem(value.item))
  )
}

function isMoldableTodayDismissalItem(value: unknown): value is {
  kind?: string
  title?: string
  subtitle?: string
  groupHint?: string
} {
  if (!isMoldableTodayRecord(value)) return false
  return (
    optionalMoldableTodayString(value.kind) &&
    optionalMoldableTodayString(value.title) &&
    optionalMoldableTodayString(value.subtitle) &&
    optionalMoldableTodayString(value.groupHint)
  )
}

function optionalMoldableTodayString(value: unknown): boolean {
  return value === undefined || typeof value === 'string'
}

function isMoldableTodayRecord(
  value: unknown,
): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

async function recordMoldableTodayDismissal(
  request: Request,
  dismissal: MoldableTodayDismissal,
): Promise<MoldableTodayDismissal[]> {
  const current = await readMoldableTodayDismissals(request)
  const key = dismissal.dismissalKey ?? dismissal.id
  const next = [
    ...current.filter((entry) => (entry.dismissalKey ?? entry.id) !== key),
    dismissal,
  ].sort((a, b) => a.id.localeCompare(b.id))
  await writeMoldableTodayDismissals(request, next)
  return next
}

async function readMoldableTodayDismissals(
  request: Request,
): Promise<MoldableTodayDismissal[]> {
  const filePath = await moldableTodayDismissalsPath(request)
  const { readFile } = await import('node:fs/promises')
  try {
    const data = JSON.parse(await readFile(filePath, 'utf8')) as unknown
    return Array.isArray(data)
      ? data.filter(isMoldableTodayDismissalRequest)
      : []
  } catch (error) {
    if (isNodeFileNotFound(error)) return []
    throw error
  }
}

async function writeMoldableTodayDismissals(
  request: Request,
  dismissals: MoldableTodayDismissal[],
): Promise<void> {
  const filePath = await moldableTodayDismissalsPath(request)
  const fs = await import('node:fs/promises')
  const path = await import('node:path')
  await fs.mkdir(path.dirname(filePath), { recursive: true })
  const tempPath = path.join(
    path.dirname(filePath),
    '.' +
      path.basename(filePath) +
      '.' +
      process.pid +
      '.' +
      Date.now() +
      '.tmp',
  )
  await fs.writeFile(tempPath, JSON.stringify(dismissals, null, 2), 'utf8')
  await fs.rename(tempPath, filePath)
}

async function moldableTodayDismissalsPath(request: Request): Promise<string> {
  const path = await import('node:path')
  return path.join(moldableTodayDataDir(request), 'today-dismissals.json')
}

function moldableTodayDataDir(request: Request): string {
  const workspaceId =
    request.headers.get('x-moldable-workspace') ??
    request.headers.get('x-moldable-workspace-id') ??
    process.env.MOLDABLE_WORKSPACE_ID ??
    'personal'
  const appId = process.env.MOLDABLE_APP_ID

  if (appId) {
    const home =
      process.env.MOLDABLE_HOME ??
      (process.env.HOME ?? process.cwd()) + '/.moldable'
    return home + '/workspaces/' + workspaceId + '/apps/' + appId + '/data'
  }

  return process.env.MOLDABLE_APP_DATA_DIR ?? process.cwd() + '/data'
}

function filterMoldableTodayDismissedItems<T extends MoldableTodayItem>(
  items: T[],
  dismissals: MoldableTodayDismissal[],
): T[] {
  if (dismissals.length === 0) return items
  const dismissedIds = new Set(dismissals.map((entry) => entry.id))
  const dismissedMaterialKeys = new Set(
    dismissals
      .map((entry) => entry.materialDismissalKey)
      .filter((key): key is string => Boolean(key)),
  )

  return items.filter((item) => {
    if (typeof item.id === 'string' && dismissedIds.has(item.id)) return false
    return !dismissedMaterialKeys.has(moldableTodayMaterialKey(item))
  })
}

function moldableTodayMaterialKey(item: MoldableTodayItem): string {
  return [
    'material',
    process.env.MOLDABLE_APP_ID ?? '',
    typeof item.kind === 'string' ? item.kind : '',
    'text',
    normalizeMoldableTodayText(item.title),
    normalizeMoldableTodayText(item.subtitle),
    typeof item.groupHint === 'string' ? item.groupHint : '',
    '',
  ].join('\u001e')
}

function normalizeMoldableTodayText(value: unknown): string {
  return typeof value === 'string'
    ? value.trim().replace(/\s+/g, ' ').toLowerCase()
    : ''
}

function isNodeFileNotFound(error: unknown): boolean {
  return (
    error instanceof Error &&
    'code' in error &&
    (error as NodeJS.ErrnoException).code === 'ENOENT'
  )
}
