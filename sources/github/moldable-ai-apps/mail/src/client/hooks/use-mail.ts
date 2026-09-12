import {
  type InfiniteData,
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query'
import { useCallback, useEffect, useMemo, useRef } from 'react'
import { useWorkspace } from '@moldable-ai/ui'
import { hasGmailConnectionChanged } from '../lib/gmail-connection-state'
import { mailAccountPath, mailMessageKey } from '../lib/mail-identity'
import type {
  ComposerState,
  GeneratedMailSearchQuery,
  MailContact,
  MailDraft,
  MailDraftsResponse,
  MailLabel,
  MailMessageDetail,
  MailMessageSummary,
  MailStatus,
  MailThreadDetail,
  MessageAction,
  MessagesResponse,
} from '../types'

const mailAccountScopeKey = (accountId?: string | null) => accountId ?? 'all'

export function useMailStatus() {
  const { workspaceId, fetchWithWorkspace } = useWorkspace()

  const query = useQuery({
    queryKey: ['mail-status', workspaceId],
    queryFn: async () => {
      const res = await fetchWithWorkspace('/api/status')
      if (!res.ok) throw new Error('Failed to load Gmail status')
      return (await res.json()) as MailStatus
    },
    refetchInterval: (query) =>
      query.state.data?.syncing
        ? 2_000
        : query.state.data?.authenticated
          ? false
          : 2_000,
    refetchIntervalInBackground: true,
  })

  return query
}

type MailMessagesPageParam = string | undefined

type MailMessagesPages = InfiniteData<MessagesResponse, MailMessagesPageParam>
type MailMessagesQueryData = MailMessagesPages | MessagesResponse

function flattenMessagePages(
  data: MailMessagesPages | MessagesResponse | undefined,
): MessagesResponse | undefined {
  if (!data) return undefined

  // Be defensive: older query data may have used a plain MessagesResponse
  // under this infinite-query key. Treat it as one page
  // instead of throwing during render and blanking the app.
  if (!('pages' in data)) {
    return Array.isArray(data.messages) ? data : undefined
  }

  if (!data.pages.length) return undefined

  const messages: MessagesResponse['messages'] = []
  const seen = new Set<string>()
  for (const page of data.pages) {
    for (const message of page.messages) {
      const key = mailMessageKey(message)
      if (seen.has(key)) continue
      seen.add(key)
      messages.push(message)
    }
  }

  const lastPage = data.pages.at(-1)
  const resultSizeEstimate =
    data.pages.find((page) => page.resultSizeEstimate > 0)
      ?.resultSizeEstimate ?? messages.length
  const pageSources = new Set(
    data.pages.flatMap((page) => (page.source ? [page.source] : [])),
  )
  const source =
    pageSources.has('mixed') || pageSources.size > 1
      ? 'mixed'
      : pageSources.values().next().value
  const syncing = data.pages.some((page) => page.syncing)
  const syncedAt = [...data.pages]
    .reverse()
    .find((page) => page.syncedAt)?.syncedAt

  return {
    messages,
    nextPageToken: lastPage?.nextPageToken,
    resultSizeEstimate,
    source,
    syncing,
    syncedAt,
    scope: data.pages.some((page) => page.scope === 'unified')
      ? 'unified'
      : lastPage?.scope,
    accountErrors: [
      ...new Map(
        data.pages
          .flatMap((page) => page.accountErrors ?? [])
          .map((error) => [error.accountId, error]),
      ).values(),
    ],
  }
}

function isInfiniteMessagesData(
  data: MailMessagesQueryData | undefined,
): data is MailMessagesPages {
  return Boolean(data && 'pages' in data && Array.isArray(data.pages))
}

export function useMailMessages({
  folderId,
  query,
  enabled,
  accountId,
}: {
  folderId: string
  query: string
  enabled: boolean
  accountId?: string | null
}) {
  const { workspaceId, fetchWithWorkspace } = useWorkspace()
  const queryClient = useQueryClient()

  const fetchMessageDetail = async (message: MailMessageSummary) => {
    const res = await fetchWithWorkspace(
      mailAccountPath(
        `/api/messages/${encodeURIComponent(message.id)}`,
        message.accountId,
      ),
    )
    if (!res.ok) throw new Error('Failed to load message')
    const data = (await res.json()) as { message: MailMessageDetail }
    return data.message
  }

  const messagesQuery = useInfiniteQuery<
    MessagesResponse,
    Error,
    MailMessagesPages,
    string[],
    MailMessagesPageParam
  >({
    queryKey: [
      'mail-messages',
      workspaceId,
      folderId,
      query,
      mailAccountScopeKey(accountId),
    ],
    enabled,
    initialPageParam: undefined,
    getNextPageParam: (lastPage) => lastPage.nextPageToken || undefined,
    refetchOnMount: 'always',
    refetchInterval: folderId === 'INBOX' && !query ? 15_000 : false,
    refetchIntervalInBackground: true,
    queryFn: async ({ pageParam }) => {
      const params = new URLSearchParams({
        labelId: folderId,
        maxResults: '24',
      })
      if (query) params.set('q', query)
      if (pageParam) params.set('pageToken', pageParam)
      if (accountId) {
        params.set('accountId', accountId)
      } else {
        params.set('scope', 'all')
      }

      const res = await fetchWithWorkspace(`/api/messages?${params.toString()}`)
      if (res.status === 401) {
        await queryClient.invalidateQueries({
          queryKey: ['mail-status', workspaceId],
        })
        throw new Error('Reconnect Gmail to continue')
      }
      if (!res.ok) throw new Error('Failed to load messages')

      const data = (await res.json()) as MessagesResponse

      for (const message of data.messages) {
        void queryClient.prefetchQuery({
          queryKey: [
            'mail-message',
            workspaceId,
            message.accountId ?? 'active',
            message.id,
          ],
          queryFn: () => fetchMessageDetail(message),
          staleTime: 5 * 60_000,
        })
      }

      return data
    },
  })

  const data = useMemo(
    () => flattenMessagePages(messagesQuery.data),
    [messagesQuery.data],
  )

  const refetchMessages = messagesQuery.refetch

  useEffect(() => {
    if (!data?.syncing) return

    const timeout = window.setTimeout(() => {
      void refetchMessages()
    }, 1_800)

    return () => window.clearTimeout(timeout)
  }, [accountId, data?.syncing, refetchMessages, folderId, query, workspaceId])

  return {
    ...messagesQuery,
    data,
  }
}

export function useGenerateMailSearchQuery() {
  const { fetchWithWorkspace } = useWorkspace()

  return useMutation({
    mutationFn: async ({
      query,
      currentLabelId,
    }: {
      query: string
      currentLabelId: string
    }) => {
      const res = await fetchWithWorkspace('/api/search-query', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query, currentLabelId }),
      })
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string }
        throw new Error(data.error ?? 'Failed to translate search')
      }
      return (await res.json()) as GeneratedMailSearchQuery
    },
  })
}

export function useWarmMailFolders({
  enabled,
  accountId,
}: {
  enabled: boolean
  accountId?: string | null
}) {
  const { workspaceId, fetchWithWorkspace } = useWorkspace()
  const queryClient = useQueryClient()
  const warmedScopeRef = useRef<string | null>(null)

  useEffect(() => {
    if (!enabled) return
    const scopeKey = `${workspaceId}:${mailAccountScopeKey(accountId)}`
    if (warmedScopeRef.current === scopeKey) return
    warmedScopeRef.current = scopeKey

    let cancelled = false
    const foldersToWarm = ['INBOX', 'SNOOZED', 'SENT', 'all', 'SPAM', 'TRASH']

    const warm = async () => {
      for (const folderId of foldersToWarm) {
        if (cancelled) return

        const query = ''
        const params = new URLSearchParams({
          labelId: folderId,
          maxResults: '24',
        })
        if (accountId) {
          params.set('accountId', accountId)
        } else {
          params.set('scope', 'all')
        }

        try {
          const res = await fetchWithWorkspace(
            `/api/messages?${params.toString()}`,
          )
          if (!res.ok) continue

          const data = (await res.json()) as MessagesResponse
          const queryKey = [
            'mail-messages',
            workspaceId,
            folderId,
            query,
            mailAccountScopeKey(accountId),
          ]
          queryClient.setQueryData<MailMessagesPages>(queryKey, {
            pages: [data],
            pageParams: [undefined],
          })

          for (const message of data.messages) {
            void queryClient.prefetchQuery({
              queryKey: [
                'mail-message',
                workspaceId,
                message.accountId ?? 'active',
                message.id,
              ],
              queryFn: async () => {
                const detailRes = await fetchWithWorkspace(
                  mailAccountPath(
                    `/api/messages/${encodeURIComponent(message.id)}`,
                    message.accountId,
                  ),
                )
                if (!detailRes.ok) throw new Error('Failed to load message')
                const detailData = (await detailRes.json()) as {
                  message: MailMessageDetail
                }
                return detailData.message
              },
              staleTime: 5 * 60_000,
            })
          }
        } catch (error) {
          console.warn(`Failed to warm ${folderId} mail:`, error)
        }
      }
    }

    void warm()

    return () => {
      cancelled = true
    }
  }, [accountId, enabled, fetchWithWorkspace, queryClient, workspaceId])
}

export function useMailMessage({
  selectedId,
  accountId,
  enabled,
}: {
  selectedId: string | null
  accountId?: string | null
  enabled: boolean
}) {
  const { workspaceId, fetchWithWorkspace } = useWorkspace()

  return useQuery({
    queryKey: ['mail-message', workspaceId, accountId ?? 'active', selectedId],
    enabled: !!selectedId && enabled,
    refetchOnMount: 'always',
    staleTime: 5 * 60_000,
    queryFn: async () => {
      const res = await fetchWithWorkspace(
        mailAccountPath(
          `/api/messages/${encodeURIComponent(selectedId ?? '')}`,
          accountId,
        ),
      )
      if (!res.ok) throw new Error('Failed to load message')
      const data = (await res.json()) as { message: MailMessageDetail }
      return data.message
    },
  })
}

export function useMailThread({
  threadId,
  accountId,
  enabled,
}: {
  threadId: string | null
  accountId?: string | null
  enabled: boolean
}) {
  const { workspaceId, fetchWithWorkspace } = useWorkspace()

  return useQuery({
    queryKey: ['mail-thread', workspaceId, accountId ?? 'active', threadId],
    enabled: !!threadId && enabled,
    refetchOnMount: 'always',
    staleTime: 5 * 60_000,
    queryFn: async () => {
      const res = await fetchWithWorkspace(
        mailAccountPath(
          `/api/threads/${encodeURIComponent(threadId ?? '')}`,
          accountId,
        ),
      )
      if (!res.ok) throw new Error('Failed to load thread')
      const data = (await res.json()) as { thread: MailThreadDetail }
      return data.thread
    },
  })
}

export function useMailContacts({
  enabled,
  query = '',
  accountId,
}: {
  enabled: boolean
  query?: string
  accountId?: string | null
}) {
  const { workspaceId, fetchWithWorkspace } = useWorkspace()
  const normalizedQuery = query.trim()

  return useQuery({
    queryKey: [
      'mail-contacts',
      workspaceId,
      accountId ?? 'active',
      normalizedQuery,
    ],
    enabled,
    staleTime: 10 * 60_000,
    refetchOnMount: 'always',
    queryFn: async () => {
      const params = new URLSearchParams()
      if (normalizedQuery) params.set('query', normalizedQuery)
      if (accountId) params.set('accountId', accountId)
      const queryString = params.toString()
      const res = await fetchWithWorkspace(
        `/api/contacts${queryString ? `?${queryString}` : ''}`,
      )
      if (!res.ok) throw new Error('Failed to load contacts')
      const data = (await res.json()) as { contacts: MailContact[] }
      return data.contacts
    },
  })
}

export function useMailDrafts({
  enabled,
  accountId,
}: {
  enabled: boolean
  accountId?: string | null
}) {
  const { workspaceId, fetchWithWorkspace } = useWorkspace()

  return useQuery({
    queryKey: ['mail-drafts', workspaceId, accountId ?? 'active'],
    enabled,
    queryFn: async () => {
      const path =
        accountId === null
          ? '/api/drafts?scope=all'
          : mailAccountPath('/api/drafts', accountId)
      const res = await fetchWithWorkspace(path)
      if (!res.ok) throw new Error('Failed to load drafts')
      return (await res.json()) as MailDraftsResponse
    },
  })
}

export function useSaveMailDraft() {
  const { workspaceId, fetchWithWorkspace } = useWorkspace()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (draft: ComposerState) => {
      const res = await fetchWithWorkspace(
        mailAccountPath('/api/drafts', draft.accountId),
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(draft),
        },
      )
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string }
        throw new Error(data.error ?? 'Failed to save draft')
      }
      return (await res.json()) as { draft: MailDraft }
    },
    onMutate: async (draft) => {
      const queryKey = [
        'mail-drafts',
        workspaceId,
        draft.accountId ?? 'active',
      ] as const
      await queryClient.cancelQueries({
        queryKey,
      })
      const snapshot = queryClient.getQueryData<MailDraftsResponse>(queryKey)
      const currentDrafts = snapshot?.drafts ?? []
      const now = Date.now()
      const optimisticId = draft.draftId?.trim() || `optimistic:${now}`
      const existing = currentDrafts.find((item) => item.id === optimisticId)
      const optimisticDraft: MailDraft = {
        id: optimisticId,
        composer: { ...draft, draftId: optimisticId },
        createdAt: existing?.createdAt ?? now,
        updatedAt: now,
      }
      const next = [
        optimisticDraft,
        ...currentDrafts.filter((item) => item.id !== optimisticId),
      ]
      queryClient.setQueryData<MailDraftsResponse>(queryKey, {
        ...snapshot,
        drafts: next,
        scope: snapshot?.scope ?? 'account',
      })
      return { snapshot, optimisticId, queryKey }
    },
    onSuccess: (data, _draft, context) => {
      const current = queryClient.getQueryData<MailDraftsResponse>(
        context.queryKey,
      )
      const currentDrafts = current?.drafts ?? []
      const next = [
        data.draft,
        ...currentDrafts.filter(
          (draft) =>
            draft.id !== data.draft.id && draft.id !== context?.optimisticId,
        ),
      ]
      queryClient.setQueryData<MailDraftsResponse>(context.queryKey, {
        ...current,
        drafts: next,
        scope: current?.scope ?? 'account',
      })
    },
    onError: (_error, _draft, context) => {
      if (!context) return
      queryClient.setQueryData<MailDraftsResponse>(
        context.queryKey,
        context.snapshot,
      )
    },
    onSettled: async () => {
      await queryClient.invalidateQueries({
        queryKey: ['mail-drafts', workspaceId],
      })
    },
  })
}

export function useDeleteMailDraft() {
  const { workspaceId, fetchWithWorkspace } = useWorkspace()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      id,
      accountId,
    }: {
      id: string
      accountId?: string | null
    }) => {
      const res = await fetchWithWorkspace(
        mailAccountPath(`/api/drafts/${encodeURIComponent(id)}`, accountId),
        { method: 'DELETE' },
      )
      if (!res.ok) throw new Error('Failed to discard draft')
    },
    onMutate: async ({ id, accountId }) => {
      const queryKey = [
        'mail-drafts',
        workspaceId,
        accountId ?? 'active',
      ] as const
      await queryClient.cancelQueries({
        queryKey,
      })
      const snapshot = queryClient.getQueryData<MailDraftsResponse>(queryKey)
      const next = (snapshot?.drafts ?? []).filter((draft) => draft.id !== id)
      queryClient.setQueryData<MailDraftsResponse>(queryKey, {
        ...snapshot,
        drafts: next,
        scope: snapshot?.scope ?? 'account',
      })
      return { snapshot, queryKey }
    },
    onError: (_error, _variables, context) => {
      if (!context) return
      queryClient.setQueryData<MailDraftsResponse>(
        context.queryKey,
        context.snapshot,
      )
    },
    onSettled: async () => {
      await queryClient.invalidateQueries({
        queryKey: ['mail-drafts', workspaceId],
      })
    },
  })
}

function restoreMessageListSnapshots(
  queryClient: ReturnType<typeof useQueryClient>,
  snapshots: [readonly unknown[], MailMessagesQueryData | undefined][],
) {
  for (const [queryKey, snapshot] of snapshots) {
    queryClient.setQueryData<MailMessagesQueryData>(queryKey, snapshot)
  }
}

function updateMessagesResponse({
  response,
  id,
  accountId,
  updateMessage,
  isVisible,
}: {
  response: MessagesResponse
  id: string
  accountId?: string | null
  updateMessage: (message: MailMessageSummary) => MailMessageSummary
  isVisible: (message: MailMessageSummary) => boolean
}) {
  let removed = 0
  let updatedMessage: MailMessageSummary | undefined
  const messages = response.messages.flatMap((message) => {
    if (!messageMatchesIdentity(message, id, accountId)) return [message]

    const nextMessage = updateMessage(message)
    updatedMessage = nextMessage
    if (isVisible(nextMessage)) return [nextMessage]

    removed += 1
    return []
  })

  return {
    response: {
      ...response,
      messages,
      resultSizeEstimate: Math.max(0, response.resultSizeEstimate - removed),
    },
    updatedMessage,
  }
}

function updateMessagesQueryData({
  data,
  id,
  accountId,
  updateMessage,
  isVisible,
}: {
  data: MailMessagesQueryData
  id: string
  accountId?: string | null
  updateMessage: (message: MailMessageSummary) => MailMessageSummary
  isVisible: (message: MailMessageSummary) => boolean
}) {
  let updatedMessage: MailMessageSummary | undefined

  if (isInfiniteMessagesData(data)) {
    return {
      data: {
        ...data,
        pages: data.pages.map((page) => {
          const next = updateMessagesResponse({
            response: page,
            id,
            accountId,
            updateMessage,
            isVisible,
          })
          updatedMessage ??= next.updatedMessage
          return next.response
        }),
      },
      updatedMessage,
    }
  }

  const next = updateMessagesResponse({
    response: data,
    id,
    accountId,
    updateMessage,
    isVisible,
  })
  return {
    data: next.response,
    updatedMessage: next.updatedMessage,
  }
}

function messageMatchesIdentity(
  message: Pick<MailMessageSummary, 'id' | 'accountId'>,
  id: string,
  accountId?: string | null,
) {
  return (
    message.id === id &&
    (!accountId || !message.accountId || message.accountId === accountId)
  )
}

function messagesQueryContains(
  data: MailMessagesQueryData,
  id: string,
  accountId?: string | null,
) {
  const response = flattenMessagePages(data)
  return (
    response?.messages.some((message) =>
      messageMatchesIdentity(message, id, accountId),
    ) ?? false
  )
}

function insertMessageIntoQueryData(
  data: MailMessagesQueryData,
  message: MailMessageSummary,
): MailMessagesQueryData {
  if (isInfiniteMessagesData(data)) {
    const [firstPage, ...restPages] = data.pages
    if (!firstPage) {
      return {
        ...data,
        pages: [
          {
            messages: [message],
            resultSizeEstimate: 1,
          },
        ],
        pageParams: [undefined],
      }
    }

    return {
      ...data,
      pages: [
        {
          ...firstPage,
          messages: [message, ...firstPage.messages],
          resultSizeEstimate: firstPage.resultSizeEstimate + 1,
        },
        ...restPages,
      ],
    }
  }

  return {
    ...data,
    messages: [message, ...data.messages],
    resultSizeEstimate: data.resultSizeEstimate + 1,
  }
}

function shouldRemoveCurrent(action: MessageAction) {
  return (
    action === 'archive' ||
    action === 'trash' ||
    action === 'spam' ||
    action === 'snooze' ||
    action === 'unsnooze'
  )
}

function applyOptimisticMessageAction({
  queryClient,
  workspaceId,
  id,
  accountId,
  action,
  until,
}: {
  queryClient: ReturnType<typeof useQueryClient>
  workspaceId: string
  id: string
  accountId?: string | null
  action: MessageAction
  until?: number
}) {
  const listSnapshots = queryClient.getQueriesData<MailMessagesQueryData>({
    queryKey: ['mail-messages', workspaceId],
  })
  const detailSnapshot = queryClient.getQueryData<MailMessageDetail>([
    'mail-message',
    workspaceId,
    accountId ?? 'active',
    id,
  ])
  let optimisticMessage: MailMessageSummary | MailMessageDetail | undefined

  for (const [queryKey, current] of listSnapshots) {
    if (!current) continue

    const folderId = Array.isArray(queryKey) ? queryKey[2] : undefined
    const query = Array.isArray(queryKey) ? queryKey[3] : undefined
    const next = updateMessagesQueryData({
      data: current,
      id,
      accountId,
      updateMessage: (message) => messageWithAction(message, action, { until }),
      isVisible: (message) =>
        messageVisibleInFolder(message, folderId, query, action),
    })
    optimisticMessage ??= next.updatedMessage

    queryClient.setQueryData<MailMessagesQueryData>(queryKey, next.data)
  }

  queryClient.setQueryData<MailMessageDetail>(
    ['mail-message', workspaceId, accountId ?? 'active', id],
    (current) => {
      if (!current) return current
      const next = messageWithAction(current, action, { until })
      optimisticMessage = next
      return next
    },
  )

  const source = optimisticMessage ?? detailSnapshot
  if (source) {
    const nextMessage = messageWithAction(source, action, { until })
    for (const [queryKey] of listSnapshots) {
      if (!Array.isArray(queryKey)) continue
      const accountScope = queryKey[4]
      if (
        accountId &&
        typeof accountScope === 'string' &&
        accountScope !== 'all' &&
        accountScope !== accountId
      ) {
        continue
      }
      const folderId = queryKey[2]
      const query = queryKey[3]
      if (!shouldInsertMissingMessage(folderId, query, action)) continue

      const current = queryClient.getQueryData<MailMessagesQueryData>(queryKey)
      if (!current || messagesQueryContains(current, id, accountId)) {
        continue
      }
      if (!messageVisibleInFolder(nextMessage, folderId, query, action)) {
        continue
      }

      const next = insertMessageIntoQueryData(current, nextMessage)
      queryClient.setQueryData<MailMessagesQueryData>(queryKey, next)
    }
  }

  return { listSnapshots, detailSnapshot }
}

function messageWithAction<T extends MailMessageDetail | MailMessageSummary>(
  message: T,
  action: MessageAction,
  options: { until?: number } = {},
): T {
  const labelIds = new Set(message.labelIds)

  const changes: Record<
    MessageAction,
    { addLabelIds?: string[]; removeLabelIds?: string[] }
  > = {
    archive: { removeLabelIds: ['INBOX', 'SNOOZED'] },
    trash: { addLabelIds: ['TRASH'], removeLabelIds: ['INBOX', 'SNOOZED'] },
    untrash: { removeLabelIds: ['TRASH'] },
    markRead: { removeLabelIds: ['UNREAD'] },
    markUnread: { addLabelIds: ['UNREAD'] },
    star: { addLabelIds: ['STARRED'] },
    unstar: { removeLabelIds: ['STARRED'] },
    important: { addLabelIds: ['IMPORTANT'] },
    unimportant: { removeLabelIds: ['IMPORTANT'] },
    spam: { addLabelIds: ['SPAM'], removeLabelIds: ['INBOX', 'SNOOZED'] },
    notSpam: { addLabelIds: ['INBOX'], removeLabelIds: ['SPAM'] },
    snooze: { addLabelIds: ['SNOOZED'], removeLabelIds: ['INBOX'] },
    unsnooze: { addLabelIds: ['INBOX'], removeLabelIds: ['SNOOZED'] },
  }

  for (const labelId of changes[action].removeLabelIds ?? []) {
    labelIds.delete(labelId)
  }
  for (const labelId of changes[action].addLabelIds ?? []) {
    labelIds.add(labelId)
  }

  return {
    ...message,
    snoozedUntil:
      action === 'snooze'
        ? options.until
        : action === 'unsnooze'
          ? undefined
          : message.snoozedUntil,
    labelIds: [...labelIds],
    unread: labelIds.has('UNREAD'),
    starred: labelIds.has('STARRED'),
    important: labelIds.has('IMPORTANT'),
  }
}

function messageVisibleInFolder(
  message: MailMessageSummary,
  folderId: unknown,
  query: unknown,
  action: MessageAction,
) {
  if (action === 'snooze') return false
  if (typeof folderId !== 'string') return true

  if (folderId === 'SNOOZED') {
    return (
      action !== 'archive' &&
      action !== 'trash' &&
      action !== 'spam' &&
      action !== 'unsnooze'
    )
  }

  if (folderId === 'all') {
    return (
      !message.labelIds.includes('TRASH') &&
      !message.labelIds.includes('SPAM') &&
      messageMatchesQuery(message, query)
    )
  }

  if (!message.labelIds.includes(folderId)) return false
  return messageMatchesQuery(message, query)
}

function messageMatchesQuery(message: MailMessageSummary, query: unknown) {
  if (typeof query !== 'string' || !query) return true
  if (query === 'is:unread') return message.unread
  return true
}

function shouldInsertMissingMessage(
  folderId: unknown,
  query: unknown,
  action: MessageAction,
) {
  if (folderId === 'SNOOZED' && action === 'snooze') return true
  if (folderId === 'TRASH' && action === 'trash' && !query) return true
  if (folderId === 'SPAM' && action === 'spam' && !query) return true
  if (folderId === 'all' && action === 'archive' && !query) return true
  if (
    folderId === 'INBOX' &&
    (action === 'unsnooze' || action === 'notSpam') &&
    !query
  ) {
    return true
  }
  if (query === 'is:unread' && action === 'markUnread') return true
  return false
}

export function useLabels(enabled: boolean = true, accountId?: string | null) {
  const { workspaceId, fetchWithWorkspace } = useWorkspace()

  return useQuery({
    queryKey: ['mail-labels', workspaceId, accountId ?? 'active'],
    enabled,
    staleTime: 60_000,
    refetchOnMount: 'always',
    queryFn: async () => {
      const res = await fetchWithWorkspace(
        mailAccountPath('/api/labels', accountId),
      )
      if (!res.ok) throw new Error('Failed to load labels')
      const data = (await res.json()) as { labels: MailLabel[] }
      const labels = data.labels ?? []
      return labels
    },
  })
}

function applyLabelChanges<T extends MailMessageSummary | MailMessageDetail>(
  message: T,
  changes: { addLabelIds?: string[]; removeLabelIds?: string[] },
): T {
  const labelIds = new Set(message.labelIds)
  for (const id of changes.removeLabelIds ?? []) labelIds.delete(id)
  for (const id of changes.addLabelIds ?? []) labelIds.add(id)
  return {
    ...message,
    labelIds: [...labelIds],
    unread: labelIds.has('UNREAD'),
    starred: labelIds.has('STARRED'),
    important: labelIds.has('IMPORTANT'),
  }
}

function messageVisibleWithLabels(
  message: MailMessageSummary,
  folderId: unknown,
  query: unknown,
) {
  if (typeof folderId !== 'string') return true

  if (folderId === 'SNOOZED') {
    return (
      message.labelIds.includes('SNOOZED') &&
      messageMatchesQuery(message, query)
    )
  }

  if (folderId === 'all') {
    return (
      !message.labelIds.includes('TRASH') &&
      !message.labelIds.includes('SPAM') &&
      messageMatchesQuery(message, query)
    )
  }

  if (!message.labelIds.includes(folderId)) return false
  return messageMatchesQuery(message, query)
}

export function useUpdateMessageLabels() {
  const { workspaceId, fetchWithWorkspace } = useWorkspace()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      id,
      accountId,
      addLabelIds,
      removeLabelIds,
    }: {
      id: string
      accountId?: string | null
      addLabelIds?: string[]
      removeLabelIds?: string[]
    }) => {
      const res = await fetchWithWorkspace(
        mailAccountPath(
          `/api/messages/${encodeURIComponent(id)}/labels`,
          accountId,
        ),
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ addLabelIds, removeLabelIds }),
        },
      )
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string }
        throw new Error(data.error ?? 'Failed to update labels')
      }
    },
    onMutate: async (variables) => {
      await Promise.all([
        queryClient.cancelQueries({
          queryKey: ['mail-messages', workspaceId],
        }),
        queryClient.cancelQueries({
          queryKey: [
            'mail-message',
            workspaceId,
            variables.accountId ?? 'active',
            variables.id,
          ],
        }),
      ])
      const listSnapshots = queryClient.getQueriesData<MailMessagesQueryData>({
        queryKey: ['mail-messages', workspaceId],
      })
      const detailSnapshot = queryClient.getQueryData<MailMessageDetail>([
        'mail-message',
        workspaceId,
        variables.accountId ?? 'active',
        variables.id,
      ])
      const changes = {
        addLabelIds: variables.addLabelIds,
        removeLabelIds: variables.removeLabelIds,
      }
      for (const [
        queryKey,
        current,
      ] of queryClient.getQueriesData<MailMessagesQueryData>({
        queryKey: ['mail-messages', workspaceId],
      })) {
        if (!current) continue
        const folderId = Array.isArray(queryKey) ? queryKey[2] : undefined
        const query = Array.isArray(queryKey) ? queryKey[3] : undefined
        const next = updateMessagesQueryData({
          data: current,
          id: variables.id,
          accountId: variables.accountId,
          updateMessage: (message) => applyLabelChanges(message, changes),
          isVisible: (message) =>
            messageVisibleWithLabels(message, folderId, query),
        }).data
        queryClient.setQueryData<MailMessagesQueryData>(queryKey, next)
      }
      queryClient.setQueryData<MailMessageDetail>(
        [
          'mail-message',
          workspaceId,
          variables.accountId ?? 'active',
          variables.id,
        ],
        (current) => {
          if (!current) return current
          const next = applyLabelChanges(current, changes)
          return next
        },
      )
      return {
        listSnapshots,
        detailSnapshot,
        id: variables.id,
        accountId: variables.accountId,
      }
    },
    onError: (_error, _variables, context) => {
      if (!context) return
      restoreMessageListSnapshots(queryClient, context.listSnapshots)
      if (context.detailSnapshot) {
        queryClient.setQueryData<MailMessageDetail>(
          [
            'mail-message',
            workspaceId,
            context.accountId ?? 'active',
            context.id,
          ],
          context.detailSnapshot,
        )
      }
    },
    onSettled: async (_data, _error, variables) => {
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: ['mail-messages', workspaceId],
        }),
        queryClient.invalidateQueries({
          queryKey: [
            'mail-message',
            workspaceId,
            variables.accountId ?? 'active',
            variables.id,
          ],
        }),
      ])
    },
  })
}

export function useMessageAction({
  onRemoveCurrent,
}: {
  onRemoveCurrent: () => void
}) {
  const { workspaceId, fetchWithWorkspace } = useWorkspace()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      id,
      accountId,
      action,
      until,
    }: {
      id: string
      accountId?: string | null
      action: MessageAction
      until?: number
    }) => {
      const res = await fetchWithWorkspace(
        mailAccountPath(
          `/api/messages/${encodeURIComponent(id)}/actions`,
          accountId,
        ),
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action, until }),
        },
      )
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string }
        throw new Error(data.error ?? 'Failed to update message')
      }
    },
    onMutate: async (variables) => {
      await Promise.all([
        queryClient.cancelQueries({
          queryKey: ['mail-messages', workspaceId],
        }),
        queryClient.cancelQueries({
          queryKey: [
            'mail-message',
            workspaceId,
            variables.accountId ?? 'active',
            variables.id,
          ],
        }),
      ])
      const context = applyOptimisticMessageAction({
        queryClient,
        workspaceId,
        id: variables.id,
        accountId: variables.accountId,
        action: variables.action,
        until: variables.until,
      })
      if (shouldRemoveCurrent(variables.action)) {
        onRemoveCurrent()
      }
      return {
        ...context,
        id: variables.id,
        accountId: variables.accountId,
      }
    },
    onError: (_error, _variables, context) => {
      if (!context) return
      restoreMessageListSnapshots(queryClient, context.listSnapshots)
      if (context.detailSnapshot) {
        queryClient.setQueryData<MailMessageDetail>(
          [
            'mail-message',
            workspaceId,
            context.accountId ?? 'active',
            context.id,
          ],
          context.detailSnapshot,
        )
      }
    },
    onSettled: async (_data, _error, variables) => {
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: ['mail-messages', workspaceId],
        }),
        queryClient.invalidateQueries({
          queryKey: [
            'mail-message',
            workspaceId,
            variables.accountId ?? 'active',
            variables.id,
          ],
        }),
      ])
    },
  })
}

export function useUnsubscribeAndArchive({
  onRemoveCurrent,
}: {
  onRemoveCurrent: () => void
}) {
  const { workspaceId, fetchWithWorkspace } = useWorkspace()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      id,
      accountId,
    }: {
      id: string
      accountId?: string | null
    }) => {
      const res = await fetchWithWorkspace(
        mailAccountPath(
          `/api/messages/${encodeURIComponent(id)}/unsubscribe-archive`,
          accountId,
        ),
        {
          method: 'POST',
        },
      )
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string }
        throw new Error(data.error ?? 'Failed to unsubscribe')
      }
    },
    onMutate: async ({ id, accountId }) => {
      await Promise.all([
        queryClient.cancelQueries({
          queryKey: ['mail-messages', workspaceId],
        }),
        queryClient.cancelQueries({
          queryKey: ['mail-message', workspaceId, accountId ?? 'active', id],
        }),
      ])

      const context = applyOptimisticMessageAction({
        queryClient,
        workspaceId,
        id,
        accountId,
        action: 'archive',
      })
      onRemoveCurrent()

      return { ...context, id, accountId }
    },
    onError: (_error, _id, context) => {
      if (!context) return
      restoreMessageListSnapshots(queryClient, context.listSnapshots)
      if (context?.detailSnapshot) {
        queryClient.setQueryData<MailMessageDetail>(
          [
            'mail-message',
            workspaceId,
            context.accountId ?? 'active',
            context.id,
          ],
          context.detailSnapshot,
        )
      }
    },
    onSettled: async (_data, _error, variables) => {
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: ['mail-messages', workspaceId],
        }),
        queryClient.invalidateQueries({
          queryKey: [
            'mail-message',
            workspaceId,
            variables.accountId ?? 'active',
            variables.id,
          ],
        }),
      ])
    },
  })
}

export function useSendMail() {
  const { workspaceId, fetchWithWorkspace } = useWorkspace()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (draft: ComposerState) => {
      const res = await fetchWithWorkspace(
        mailAccountPath('/api/send', draft.accountId),
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(draft),
        },
      )
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string }
        throw new Error(data.error ?? 'Failed to send email')
      }
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: ['mail-messages', workspaceId],
      })
    },
  })
}

export function useDisconnectGmail() {
  const { workspaceId, fetchWithWorkspace } = useWorkspace()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (accountId: string) => {
      const res = await fetchWithWorkspace(
        mailAccountPath('/api/auth/logout', accountId),
        { method: 'POST' },
      )
      if (!res.ok) throw new Error('Failed to disconnect Gmail')
    },
    onSuccess: async () => {
      queryClient.removeQueries({ queryKey: ['mail-messages', workspaceId] })
      queryClient.removeQueries({ queryKey: ['mail-message', workspaceId] })
      queryClient.removeQueries({ queryKey: ['mail-thread', workspaceId] })
      queryClient.removeQueries({ queryKey: ['mail-contacts', workspaceId] })
      queryClient.removeQueries({ queryKey: ['mail-drafts', workspaceId] })
      queryClient.removeQueries({ queryKey: ['mail-labels', workspaceId] })
      await queryClient.invalidateQueries({
        queryKey: ['mail-status', workspaceId],
      })
    },
  })
}

export function useSwitchMailAccount() {
  const { workspaceId, fetchWithWorkspace } = useWorkspace()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (accountId: string) => {
      const res = await fetchWithWorkspace('/api/accounts/active', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ accountId }),
      })
      if (!res.ok) throw new Error('Failed to switch Gmail account')
    },
    onSuccess: async (_data, accountId) => {
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: ['mail-contacts', workspaceId, accountId],
        }),
        queryClient.invalidateQueries({
          queryKey: ['mail-drafts', workspaceId, accountId],
        }),
        queryClient.invalidateQueries({
          queryKey: ['mail-labels', workspaceId, accountId],
        }),
      ])
      await queryClient.invalidateQueries({
        queryKey: ['mail-status', workspaceId],
      })
    },
  })
}

export function useConnectGmail() {
  const { workspaceId, fetchWithWorkspace } = useWorkspace()
  const queryClient = useQueryClient()
  const pollTimerRef = useRef<number | null>(null)
  const pollGenerationRef = useRef(0)

  const stopConnectionPolling = useCallback(() => {
    pollGenerationRef.current += 1
    if (pollTimerRef.current !== null) {
      window.clearTimeout(pollTimerRef.current)
      pollTimerRef.current = null
    }
  }, [])

  useEffect(() => stopConnectionPolling, [stopConnectionPolling, workspaceId])

  const readLatestStatus = useCallback(async () => {
    const res = await fetchWithWorkspace('/api/status', {
      cache: 'no-store',
    })
    if (!res.ok) return undefined
    const status = (await res.json()) as MailStatus
    queryClient.setQueryData(['mail-status', workspaceId], status)
    return status
  }, [fetchWithWorkspace, queryClient, workspaceId])

  const reconcileOAuthCompletion = useCallback(
    (before: MailStatus | undefined) => {
      stopConnectionPolling()
      const generation = pollGenerationRef.current
      const deadline = Date.now() + 3 * 60_000

      const poll = async () => {
        let status: MailStatus | undefined
        try {
          status = await readLatestStatus()
        } catch {
          // The app may be restarting while the system browser finishes OAuth.
        }

        if (generation !== pollGenerationRef.current) return
        if (status && hasGmailConnectionChanged(before, status)) {
          stopConnectionPolling()
          await Promise.all([
            queryClient.invalidateQueries({
              queryKey: ['mail-messages', workspaceId],
            }),
            queryClient.invalidateQueries({
              queryKey: ['mail-contacts', workspaceId],
            }),
            queryClient.invalidateQueries({
              queryKey: ['mail-drafts', workspaceId],
            }),
            queryClient.invalidateQueries({
              queryKey: ['mail-labels', workspaceId],
            }),
          ])
          return
        }

        if (Date.now() >= deadline) {
          stopConnectionPolling()
          return
        }

        pollTimerRef.current = window.setTimeout(() => {
          void poll()
        }, 750)
      }

      pollTimerRef.current = window.setTimeout(() => {
        void poll()
      }, 750)
    },
    [queryClient, readLatestStatus, stopConnectionPolling, workspaceId],
  )

  return useCallback(async () => {
    // Fetch a fresh baseline first. The cached status can itself be stale when
    // an earlier system-browser callback completed while Mail was unfocused.
    const before = await readLatestStatus().catch(() =>
      queryClient.getQueryData<MailStatus>(['mail-status', workspaceId]),
    )
    const res = await fetchWithWorkspace('/api/auth/login')
    const data = (await res.json()) as { url?: string; error?: string }
    if (!data.url) throw new Error(data.error ?? 'Failed to begin Gmail login')

    if (window.parent !== window) {
      window.parent.postMessage(
        { type: 'moldable:open-url', url: data.url },
        '*',
      )
    } else {
      window.open(data.url, '_blank')
    }

    reconcileOAuthCompletion(before)
  }, [
    fetchWithWorkspace,
    queryClient,
    readLatestStatus,
    reconcileOAuthCompletion,
    workspaceId,
  ])
}
