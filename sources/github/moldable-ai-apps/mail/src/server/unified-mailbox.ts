import type {
  MailDraft,
  MailMessageDetail,
  MailMessageSummary,
  MailThreadDetail,
  MessagesResponse,
} from '../client/types'
import {
  listGmailDrafts,
  listMessages as listGmailMessages,
} from './gmail-service'
import { runWithMailAccountContext } from './mail-account-context'
import { type MailAccount, getMailAccountsState } from './mail-accounts'
import { readCachedMessages } from './message-cache'
import { randomUUID } from 'node:crypto'

export interface UnifiedMailboxListOptions {
  labelId?: string
  query?: string
  pageToken?: string
  maxResults?: number
}

interface AccountMailboxStream {
  account: MailAccount
  messages: MailMessageSummary[]
  nextPageToken?: string
  requestedPageTokens: Set<string>
  resultSizeEstimate: number
  source?: MessagesResponse['source']
  syncing?: boolean
  syncedAt?: string
  error?: string
}

interface UnifiedCursorState {
  workspaceId: string
  signature: string
  options: Omit<UnifiedMailboxListOptions, 'pageToken'>
  streams: AccountMailboxStream[]
}

interface CursorEntry {
  expiresAt: number
  state: UnifiedCursorState
  result?: Promise<MessagesResponse>
}

interface AccountMessageListResponse {
  messages: MailMessageSummary[]
  nextPageToken?: string
  resultSizeEstimate: number
  source?: 'cache' | 'gmail'
  syncing?: boolean
  syncedAt?: string
}

export interface UnifiedMailboxDependencies {
  getAccounts(workspaceId: string): Promise<MailAccount[]>
  listAccountMessages(
    account: MailAccount,
    options: UnifiedMailboxListOptions,
  ): Promise<AccountMessageListResponse>
  now(): number
  createCursorId(): string
}

const CURSOR_TTL_MS = 10 * 60_000
const MAX_CURSOR_COUNT = 128

const defaultDependencies: UnifiedMailboxDependencies = {
  getAccounts: async (workspaceId) =>
    (await getMailAccountsState(workspaceId)).accounts,
  listAccountMessages: async (account, options) =>
    runWithMailAccountContext(account, () =>
      listGmailMessages(account.workspaceId, options),
    ),
  now: Date.now,
  createCursorId: randomUUID,
}

export function tagMessageForAccount<T extends MailMessageSummary>(
  account: Pick<MailAccount, 'accountId' | 'emailAddress'>,
  message: T,
): T & { accountId: string; accountEmailAddress: string } {
  return {
    ...message,
    accountId: account.accountId,
    accountEmailAddress: account.emailAddress,
  }
}

export function tagThreadForAccount(
  account: Pick<MailAccount, 'accountId' | 'emailAddress'>,
  thread: MailThreadDetail,
): MailThreadDetail {
  return {
    ...thread,
    messages: thread.messages.map((message) =>
      tagMessageForAccount(account, message),
    ),
  }
}

export function createUnifiedMailboxService(
  dependencies: UnifiedMailboxDependencies = defaultDependencies,
) {
  const cursors = new Map<string, CursorEntry>()

  function normalizeOptions(
    options: UnifiedMailboxListOptions,
  ): Omit<UnifiedMailboxListOptions, 'pageToken'> {
    return {
      labelId: options.labelId ?? 'INBOX',
      query: options.query?.trim() || undefined,
      maxResults: Math.max(1, Math.min(100, options.maxResults ?? 20)),
    }
  }

  function signatureFor(
    workspaceId: string,
    options: Omit<UnifiedMailboxListOptions, 'pageToken'>,
  ) {
    return JSON.stringify([
      workspaceId,
      options.labelId,
      options.query ?? '',
      options.maxResults,
    ])
  }

  function pruneCursors() {
    const now = dependencies.now()
    for (const [id, entry] of cursors) {
      if (entry.expiresAt <= now) cursors.delete(id)
    }

    while (cursors.size >= MAX_CURSOR_COUNT) {
      const oldest = cursors.keys().next().value as string | undefined
      if (!oldest) break
      cursors.delete(oldest)
    }
  }

  function saveCursor(state: UnifiedCursorState) {
    pruneCursors()
    const id = dependencies.createCursorId()
    cursors.set(id, {
      state,
      expiresAt: dependencies.now() + CURSOR_TTL_MS,
    })
    return id
  }

  async function consumePage(state: UnifiedCursorState) {
    const maxResults = state.options.maxResults ?? 20
    const messages: MailMessageSummary[] = []

    while (messages.length < maxResults) {
      const emptyStreams = state.streams.filter(
        (stream) =>
          stream.messages.length === 0 &&
          Boolean(stream.nextPageToken) &&
          !stream.error,
      )
      if (emptyStreams.length > 0) {
        await Promise.all(
          emptyStreams.map(async (stream) => {
            const pageToken = stream.nextPageToken
            if (!pageToken) return
            if (stream.requestedPageTokens.has(pageToken)) {
              stream.nextPageToken = undefined
              stream.error = 'Gmail returned a repeated pagination cursor.'
              return
            }
            stream.requestedPageTokens.add(pageToken)
            try {
              const result = await dependencies.listAccountMessages(
                stream.account,
                { ...state.options, pageToken },
              )
              stream.messages = sortMessages(
                result.messages.map((message) =>
                  tagMessageForAccount(stream.account, message),
                ),
              )
              stream.nextPageToken = result.nextPageToken
              stream.resultSizeEstimate = Math.max(
                stream.resultSizeEstimate,
                result.resultSizeEstimate,
              )
              stream.source = mergeSource(stream.source, result.source)
              stream.syncing ||= result.syncing
              stream.syncedAt = oldestIsoDate(stream.syncedAt, result.syncedAt)
            } catch (error) {
              stream.nextPageToken = undefined
              stream.error = publicAccountError(error)
            }
          }),
        )
      }

      const nextStream = state.streams
        .filter((stream) => stream.messages.length > 0)
        .sort(
          (left, right) =>
            (right.messages[0]?.internalDate ?? 0) -
            (left.messages[0]?.internalDate ?? 0),
        )[0]
      if (!nextStream) break

      const nextMessage = nextStream.messages.shift()
      if (nextMessage) messages.push(nextMessage)
    }

    const hasMore = state.streams.some(
      (stream) => stream.messages.length > 0 || Boolean(stream.nextPageToken),
    )
    const source = state.streams.reduce<MessagesResponse['source']>(
      (current, stream) => mergeSource(current, stream.source),
      undefined,
    )
    const accountErrors = state.streams
      .filter((stream) => stream.error)
      .map((stream) => ({
        accountId: stream.account.accountId,
        emailAddress: stream.account.emailAddress,
        message: stream.error!,
      }))

    if (
      messages.length === 0 &&
      accountErrors.length === state.streams.length
    ) {
      const error = new Error(
        'Mail could not load any connected account.',
      ) as Error & { status?: number; accountErrors?: typeof accountErrors }
      error.status = 502
      error.accountErrors = accountErrors
      throw error
    }

    return {
      messages,
      nextPageToken: hasMore ? saveCursor(state) : undefined,
      resultSizeEstimate: state.streams.reduce(
        (total, stream) => total + stream.resultSizeEstimate,
        0,
      ),
      source,
      syncing: state.streams.some((stream) => stream.syncing),
      syncedAt: state.streams.reduce<string | undefined>(
        (current, stream) => oldestIsoDate(current, stream.syncedAt),
        undefined,
      ),
      scope: 'unified' as const,
      accountErrors: accountErrors.length > 0 ? accountErrors : undefined,
    }
  }

  async function createInitialState(
    workspaceId: string,
    options: Omit<UnifiedMailboxListOptions, 'pageToken'>,
  ) {
    const accounts = await dependencies.getAccounts(workspaceId)
    if (accounts.length === 0) {
      const error = new Error('Gmail is not connected')
      error.name = 'GmailNotConnected'
      throw error
    }

    const streams = await Promise.all(
      accounts.map(async (account): Promise<AccountMailboxStream> => {
        try {
          const result = await dependencies.listAccountMessages(
            account,
            options,
          )
          return {
            account,
            messages: sortMessages(
              result.messages.map((message) =>
                tagMessageForAccount(account, message),
              ),
            ),
            nextPageToken: result.nextPageToken,
            requestedPageTokens: new Set(),
            resultSizeEstimate: result.resultSizeEstimate,
            source: result.source,
            syncing: result.syncing,
            syncedAt: result.syncedAt,
          }
        } catch (error) {
          return {
            account,
            messages: [],
            requestedPageTokens: new Set(),
            resultSizeEstimate: 0,
            error: publicAccountError(error),
          }
        }
      }),
    )

    return {
      workspaceId,
      signature: signatureFor(workspaceId, options),
      options,
      streams,
    } satisfies UnifiedCursorState
  }

  return {
    async listMessages(
      workspaceId: string,
      requestedOptions: UnifiedMailboxListOptions = {},
    ): Promise<MessagesResponse> {
      pruneCursors()
      const options = normalizeOptions(requestedOptions)
      const signature = signatureFor(workspaceId, options)

      if (!requestedOptions.pageToken) {
        return consumePage(await createInitialState(workspaceId, options))
      }

      const entry = cursors.get(requestedOptions.pageToken)
      if (!entry || entry.expiresAt <= dependencies.now()) {
        cursors.delete(requestedOptions.pageToken)
        const error = new Error(
          'This unified-inbox page expired. Refresh the inbox to continue.',
        ) as Error & { status?: number; code?: string }
        error.status = 409
        error.code = 'unified_cursor_expired'
        throw error
      }
      if (
        entry.state.workspaceId !== workspaceId ||
        entry.state.signature !== signature
      ) {
        const error = new Error(
          'Unified-inbox cursor does not match this view.',
        ) as Error & { status?: number; code?: string }
        error.status = 400
        error.code = 'unified_cursor_mismatch'
        throw error
      }

      entry.expiresAt = dependencies.now() + CURSOR_TTL_MS
      entry.result ??= consumePage(entry.state)
      return entry.result
    },
    clearWorkspace(workspaceId: string) {
      for (const [id, entry] of cursors) {
        if (entry.state.workspaceId === workspaceId) cursors.delete(id)
      }
    },
  }
}

function sortMessages(messages: MailMessageSummary[]) {
  return [...messages].sort(
    (left, right) => right.internalDate - left.internalDate,
  )
}

function mergeSource(
  left: MessagesResponse['source'],
  right: MessagesResponse['source'],
): MessagesResponse['source'] {
  if (!left) return right
  if (!right || left === right) return left
  return 'mixed'
}

function oldestIsoDate(left?: string, right?: string) {
  if (!left) return right
  if (!right) return left
  return Date.parse(left) <= Date.parse(right) ? left : right
}

function publicAccountError(error: unknown) {
  if (error instanceof Error) return error.message
  return 'This Gmail account could not be loaded.'
}

export const unifiedMailbox = createUnifiedMailboxService()

export interface UnifiedDraftDependencies {
  getAccounts(workspaceId: string): Promise<MailAccount[]>
  listAccountDrafts(account: MailAccount): Promise<MailDraft[]>
}

const defaultDraftDependencies: UnifiedDraftDependencies = {
  getAccounts: async (workspaceId) =>
    (await getMailAccountsState(workspaceId)).accounts,
  listAccountDrafts: async (account) =>
    runWithMailAccountContext(account, () =>
      listGmailDrafts(account.workspaceId),
    ),
}

export async function listUnifiedMessages(
  workspaceId: string,
  options: UnifiedMailboxListOptions = {},
) {
  return unifiedMailbox.listMessages(workspaceId, options)
}

export async function listUnifiedDrafts(
  workspaceId: string,
  dependencies: UnifiedDraftDependencies = defaultDraftDependencies,
) {
  const accounts = await dependencies.getAccounts(workspaceId)
  const results = await Promise.allSettled(
    accounts.map(async (account) => ({
      account,
      drafts: await dependencies.listAccountDrafts(account),
    })),
  )

  const drafts = results
    .flatMap((result): MailDraft[] =>
      result.status === 'fulfilled'
        ? result.value.drafts.map((draft) => ({
            ...draft,
            composer: {
              ...draft.composer,
              accountId: result.value.account.accountId,
            },
          }))
        : [],
    )
    .sort((left, right) => right.updatedAt - left.updatedAt)
  const accountErrors = results.flatMap((result, index) =>
    result.status === 'rejected'
      ? [
          {
            accountId: accounts[index]!.accountId,
            emailAddress: accounts[index]!.emailAddress,
            message: publicAccountError(result.reason),
          },
        ]
      : [],
  )

  return {
    drafts,
    scope: 'unified' as const,
    accountErrors: accountErrors.length > 0 ? accountErrors : undefined,
  }
}

export async function readUnifiedCachedMessages(workspaceId: string) {
  const state = await getMailAccountsState(workspaceId)
  const messages = await Promise.all(
    state.accounts.map((account) =>
      runWithMailAccountContext(account, async () =>
        (await readCachedMessages(workspaceId)).map((message) =>
          tagMessageForAccount(account, message),
        ),
      ),
    ),
  )
  return messages
    .flat()
    .sort((left, right) => right.internalDate - left.internalDate)
}

export function tagMessageDetailForAccount(
  account: Pick<MailAccount, 'accountId' | 'emailAddress'>,
  message: MailMessageDetail,
) {
  return tagMessageForAccount(account, message)
}
