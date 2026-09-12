import { useQueryClient } from '@tanstack/react-query'
import {
  Check,
  ChevronDown,
  FileText,
  Loader2,
  LogOut,
  PenLine,
  RefreshCcw,
  Search,
  UserPlus,
  X,
} from 'lucide-react'
import {
  type FormEvent,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  type AppCommand,
  AppHeader,
  Button,
  DesktopOnly,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  Input,
  MoldableLoadingScreen,
  Toolbar,
  ToolbarActions,
  ToolbarButton,
  ToolbarControlGroup,
  ToolbarIconButton,
  Tooltip,
  TooltipContent,
  TooltipTrigger,
  cn,
  popMoldableNavigation,
  pushMoldableNavigation,
  resetMoldableNavigation,
  useMoldableNavigationPop,
  useWorkspace,
} from '@moldable-ai/ui'
import { folders } from './lib/folders'
import { emptyComposer, replyComposer, senderName } from './lib/mail-format'
import { mailAccountPath, mailMessageKey } from './lib/mail-identity'
import { createMailReaderNavigation } from './lib/mail-reader-navigation'
import {
  useConnectGmail,
  useDeleteMailDraft,
  useDisconnectGmail,
  useGenerateMailSearchQuery,
  useMailContacts,
  useMailDrafts,
  useMailMessage,
  useMailMessages,
  useMailStatus,
  useMailThread,
  useMessageAction,
  useSaveMailDraft,
  useSendMail,
  useSwitchMailAccount,
  useUnsubscribeAndArchive,
  useUpdateMessageLabels,
  useWarmMailFolders,
} from './hooks/use-mail'
import { useMailKeyboard } from './hooks/use-mail-keyboard'
import { useMailResourceNavigation } from './hooks/use-mail-resource-navigation'
import { AttachedDraftPreview } from './components/attached-draft-preview'
import { Composer } from './components/composer'
import { ConnectScreen } from './components/connect-screen'
import {
  BulkEmailActionDock,
  EmailActionDock,
} from './components/email-action-dock'
import { EmailView } from './components/email-view'
import { InboxView } from './components/inbox-view'
import type {
  ComposerState,
  GeneratedMailSearchQuery,
  MailAccount,
  MailDraft,
  MailMessageDetail,
  MailMessageSummary,
  MessageAction,
} from './types'

const DRAFT_FOLDER_ID = 'DRAFTS'
const READER_CLOSE_ANIMATION_MS = 110

type MailUiIntent = {
  id: string
  accountId?: string
  view: 'inbox' | 'message'
  entityId?: string
  createdAt: string
}

type AppApiChangedMessage = {
  type: 'moldable:app-api-changed'
  workspaceId?: string
  callerAppId?: string
  targetAppId?: string
  method?: string
  scopes?: string[]
}

function collapseMessagesIntoThreads(messages: MailMessageSummary[]) {
  const groups = new Map<string, MailMessageSummary[]>()
  for (const message of messages) {
    const key = `${message.accountId ?? 'active'}:${message.threadId || message.id}`
    const group = groups.get(key)
    if (group) {
      group.push(message)
    } else {
      groups.set(key, [message])
    }
  }

  return [...groups.values()]
    .map((group) => {
      if (group.length === 1) return group[0]!

      const latest = [...group].sort(
        (a, b) => b.internalDate - a.internalDate,
      )[0]!
      const labelIds = new Set<string>()
      const participants: string[] = []
      const seenParticipants = new Set<string>()

      for (const message of group) {
        for (const labelId of message.labelIds) labelIds.add(labelId)
        const participant = senderName(message.from)
        if (participant && !seenParticipants.has(participant)) {
          seenParticipants.add(participant)
          participants.push(participant)
        }
      }

      return {
        ...latest,
        labelIds: [...labelIds],
        unread: group.some((message) => message.unread),
        starred: group.some((message) => message.starred),
        important: group.some((message) => message.important),
        threadMessageCount: group.length,
        threadUnreadCount: group.filter((message) => message.unread).length,
        threadParticipants: participants,
      }
    })
    .sort((a, b) => b.internalDate - a.internalDate)
}

function singleSelectedAccountId(
  messages: MailMessageSummary[],
  selectedKeys: Set<string>,
) {
  const accountIds = new Set(
    messages
      .filter((message) => selectedKeys.has(mailMessageKey(message)))
      .map((message) => message.accountId)
      .filter((accountId): accountId is string => Boolean(accountId)),
  )
  return accountIds.size === 1 ? [...accountIds][0] : null
}

function commandAction(command: string) {
  return {
    type: 'message' as const,
    command,
    payload: { command },
  }
}

const MAIL_BASE_COMMANDS = [
  {
    id: 'mail.compose',
    label: 'Compose email',
    description: 'Start a new message',
    icon: 'pen-line',
    group: 'Mail',
    action: commandAction('mail.compose'),
  },
  {
    id: 'mail.search',
    label: 'Search mail',
    description: 'Focus the mail search field',
    icon: 'search',
    group: 'Mail',
    action: commandAction('mail.search'),
  },
  {
    id: 'mail.refresh',
    label: 'Refresh mail',
    description: 'Fetch the latest messages',
    icon: 'refresh-cw',
    group: 'Mail',
    action: commandAction('mail.refresh'),
  },
  {
    id: 'mail.open-inbox',
    label: 'Open Inbox',
    icon: 'folder',
    group: 'Folders',
    action: commandAction('mail.open-inbox'),
  },
  {
    id: 'mail.open-sent',
    label: 'Open Sent',
    icon: 'send',
    group: 'Folders',
    action: commandAction('mail.open-sent'),
  },
  {
    id: 'mail.open-all',
    label: 'Open All Mail',
    icon: 'archive',
    group: 'Folders',
    action: commandAction('mail.open-all'),
  },
  {
    id: 'mail.open-spam',
    label: 'Open Spam',
    icon: 'ban',
    group: 'Folders',
    action: commandAction('mail.open-spam'),
  },
  {
    id: 'mail.open-trash',
    label: 'Open Trash',
    icon: 'trash-2',
    group: 'Folders',
    action: commandAction('mail.open-trash'),
  },
] satisfies AppCommand[]

const MAIL_DRAFTS_COMMAND = {
  id: 'mail.open-drafts',
  label: 'Open Drafts',
  description: 'Show saved local drafts',
  icon: 'file-text',
  group: 'Folders',
  action: commandAction('mail.open-drafts'),
} satisfies AppCommand

const MAIL_SNOOZED_COMMAND = {
  id: 'mail.open-snoozed',
  label: 'Open Snoozed',
  description: 'Show snoozed messages',
  icon: 'clock',
  group: 'Folders',
  action: commandAction('mail.open-snoozed'),
} satisfies AppCommand

const MAIL_DETAIL_COMMANDS = [
  {
    id: 'mail.reply',
    label: 'Reply to email',
    description: 'Reply to the open email',
    icon: 'reply',
    group: 'Email Actions',
    action: commandAction('mail.reply'),
  },
  {
    id: 'mail.archive',
    label: 'Archive email',
    description: 'Archive the open email',
    icon: 'archive',
    group: 'Email Actions',
    action: commandAction('mail.archive'),
  },
  {
    id: 'mail.trash',
    label: 'Move email to trash',
    description: 'Move the open email to Trash',
    icon: 'trash-2',
    group: 'Email Actions',
    action: commandAction('mail.trash'),
  },
  {
    id: 'mail.spam',
    label: 'Mark email as spam',
    description: 'Move the open email to Spam',
    icon: 'ban',
    group: 'Email Actions',
    action: commandAction('mail.spam'),
  },
  {
    id: 'mail.toggle-read',
    label: 'Mark email read or unread',
    description: 'Toggle read state for the open email',
    icon: 'mail',
    group: 'Email Actions',
    action: commandAction('mail.toggle-read'),
  },
  {
    id: 'mail.toggle-star',
    label: 'Star or unstar email',
    description: 'Toggle starred state for the open email',
    icon: 'star',
    group: 'Email Actions',
    action: commandAction('mail.toggle-star'),
  },
  {
    id: 'mail.toggle-important',
    label: 'Mark email important or not important',
    description: 'Toggle important state for the open email',
    icon: 'sparkles',
    group: 'Email Actions',
    action: commandAction('mail.toggle-important'),
  },
  {
    id: 'mail.add-label',
    label: 'Add label to email',
    description: 'Open the label picker for the open email',
    icon: 'tag',
    group: 'Email Actions',
    action: commandAction('mail.add-label'),
  },
] satisfies AppCommand[]

function hasDraftContent(composer: ComposerState) {
  if (composer.body.trim()) return true
  if (composer.mode === 'reply') {
    return Boolean(composer.cc.trim() || composer.bcc.trim())
  }
  return Boolean(
    composer.to.trim() ||
      composer.cc.trim() ||
      composer.bcc.trim() ||
      composer.subject.trim(),
  )
}

function draftToMessage(draft: MailDraft): MailMessageSummary {
  const subject = draft.composer.subject.trim() || '(No subject)'
  const recipient = draft.composer.to.trim()
  const snippet =
    draft.composer.body.trim() || (recipient ? `To ${recipient}` : '')

  return {
    id: `draft:${draft.id}`,
    threadId: draft.composer.threadId ?? draft.id,
    accountId: draft.composer.accountId,
    from: 'Draft',
    to: recipient,
    subject,
    date: new Date(draft.updatedAt).toISOString(),
    snippet,
    labelIds: [DRAFT_FOLDER_ID],
    unread: false,
    starred: false,
    important: false,
    internalDate: draft.updatedAt,
    bodyText: draft.composer.body,
    bodyHtmlText: draft.composer.body,
    bodyCached: true,
    attachments: [],
  }
}

export function App() {
  const queryClient = useQueryClient()
  const { workspaceId, fetchWithWorkspace } = useWorkspace()
  const connectGmail = useConnectGmail()
  const disconnectGmail = useDisconnectGmail()
  const switchMailAccount = useSwitchMailAccount()
  const generateSearchQuery = useGenerateMailSearchQuery()
  const [folderId, setFolderId] = useState('INBOX')
  const [searchInput, setSearchInput] = useState('')
  const [query, setQuery] = useState('')
  const [generatedSearch, setGeneratedSearch] =
    useState<GeneratedMailSearchQuery | null>(null)
  const [searchError, setSearchError] = useState<string | null>(null)
  const [mailboxAccountId, setMailboxAccountId] = useState<string | null>(null)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [linkedMessage, setLinkedMessage] = useState<{
    workspaceId: string
    message: MailMessageDetail
  } | null>(null)
  const [selectedBulkIds, setSelectedBulkIds] = useState<Set<string>>(
    () => new Set(),
  )
  const [attachedDraft, setAttachedDraft] = useState<{
    workspaceId: string
    draft: MailDraft
  } | null>(null)
  const [composer, setComposer] = useState<ComposerState | null>(null)
  const [contactSearch, setContactSearch] = useState('')
  const [draftClosePromptOpen, setDraftClosePromptOpen] = useState(false)
  const [readerClosing, setReaderClosing] = useState(false)
  const [pendingUiIntent, setPendingUiIntent] = useState<MailUiIntent | null>(
    null,
  )
  const seenUiIntentIds = useRef<Set<string>>(new Set())
  const selectedIdRef = useRef<string | null>(null)
  const [readerNavigation] = useState(() =>
    createMailReaderNavigation({
      push: pushMoldableNavigation,
      pop: popMoldableNavigation,
    }),
  )
  const readerCloseTimerRef = useRef<number | null>(null)
  const searchRequestIdRef = useRef(0)

  const statusQuery = useMailStatus()
  const accounts = useMemo(
    () => statusQuery.data?.accounts ?? [],
    [statusQuery.data?.accounts],
  )
  const mailboxScopeAccountId =
    accounts.length > 1
      ? mailboxAccountId
      : (accounts[0]?.id ?? statusQuery.data?.activeAccountId ?? null)
  const composeAccountId =
    composer?.accountId ??
    mailboxScopeAccountId ??
    statusQuery.data?.activeAccountId ??
    undefined
  const showingDrafts = folderId === DRAFT_FOLDER_ID
  const showingSnoozed = folderId === 'SNOOZED'
  const messagesQuery = useMailMessages({
    folderId: showingDrafts ? 'INBOX' : folderId,
    query,
    enabled: statusQuery.data?.authenticated === true && !showingDrafts,
    accountId: mailboxScopeAccountId,
  })
  const refetchMessages = messagesQuery.refetch
  const snoozedQuery = useMailMessages({
    folderId: 'SNOOZED',
    query: '',
    enabled: statusQuery.data?.authenticated === true && !showingSnoozed,
    accountId: mailboxScopeAccountId,
  })
  const inboxUnreadQuery = useMailMessages({
    folderId: 'INBOX',
    query: 'is:unread',
    enabled: statusQuery.data?.authenticated === true,
    accountId: mailboxScopeAccountId,
  })
  const draftsQuery = useMailDrafts({
    enabled: statusQuery.data?.authenticated === true,
    accountId: mailboxScopeAccountId,
  })
  const drafts = useMemo(
    () => draftsQuery.data?.drafts ?? [],
    [draftsQuery.data?.drafts],
  )
  const snoozedCount =
    (showingSnoozed ? messagesQuery.data : snoozedQuery.data)
      ?.resultSizeEstimate ?? 0
  const draftMessages = useMemo(
    () => drafts.map((draft) => draftToMessage(draft)),
    [drafts],
  )
  const inboxMessages = useMemo(
    () => collapseMessagesIntoThreads(messagesQuery.data?.messages ?? []),
    [messagesQuery.data?.messages],
  )
  const messages = useMemo(
    () => (showingDrafts ? draftMessages : inboxMessages),
    [draftMessages, inboxMessages, showingDrafts],
  )
  const selectedMessage = useMemo(
    () =>
      messages.find((message) => mailMessageKey(message) === selectedId) ??
      (linkedMessage?.workspaceId === workspaceId &&
      mailMessageKey(linkedMessage.message) === selectedId
        ? linkedMessage.message
        : undefined),
    [linkedMessage, messages, selectedId, workspaceId],
  )
  const selectedIndex = selectedId
    ? messages.findIndex((message) => mailMessageKey(message) === selectedId)
    : -1
  const previousMessage =
    selectedIndex > 0 ? messages[selectedIndex - 1] : undefined
  const nextMessage =
    selectedIndex >= 0 && selectedIndex < messages.length - 1
      ? messages[selectedIndex + 1]
      : undefined
  const readerOpen = Boolean(selectedId && selectedMessage)
  const bulkSelectionActive = selectedBulkIds.size > 0
  useEffect(() => {
    selectedIdRef.current = selectedId
  }, [selectedId])

  useEffect(() => {
    if (!composer) setContactSearch('')
  }, [composer])

  const messageQuery = useMailMessage({
    selectedId: selectedMessage?.id ?? null,
    accountId: selectedMessage?.accountId,
    enabled: statusQuery.data?.authenticated === true,
  })
  const threadQuery = useMailThread({
    threadId:
      selectedMessage && !showingDrafts ? selectedMessage.threadId : null,
    accountId: selectedMessage?.accountId,
    enabled: statusQuery.data?.authenticated === true,
  })
  const contactsQuery = useMailContacts({
    enabled: statusQuery.data?.authenticated === true,
    query: contactSearch,
    accountId: composeAccountId,
  })
  useWarmMailFolders({
    enabled: statusQuery.data?.authenticated === true,
    accountId: mailboxScopeAccountId,
  })
  const saveDraftMutation = useSaveMailDraft()
  const deleteDraftMutation = useDeleteMailDraft()
  const updateLabelsMutation = useUpdateMessageLabels()

  const cancelReaderCloseAnimation = useCallback(() => {
    if (readerCloseTimerRef.current !== null) {
      window.clearTimeout(readerCloseTimerRef.current)
      readerCloseTimerRef.current = null
    }
    setReaderClosing(false)
  }, [])

  const animateReaderClose = useCallback(() => {
    if (!selectedIdRef.current) return

    if (readerCloseTimerRef.current !== null) {
      window.clearTimeout(readerCloseTimerRef.current)
    }

    setReaderClosing(true)
    readerCloseTimerRef.current = window.setTimeout(() => {
      readerCloseTimerRef.current = null
      setReaderClosing(false)
      setSelectedId(null)
    }, READER_CLOSE_ANIMATION_MS)
  }, [])

  const openReaderMessage = useCallback(
    (message: MailMessageSummary) => {
      cancelReaderCloseAnimation()
      const key = mailMessageKey(message)
      readerNavigation.open(message)
      setSelectedId(key)
    },
    [cancelReaderCloseAnimation, readerNavigation],
  )

  const resourceNavigation = useMailResourceNavigation({
    onOpenDraft: (draft) => {
      setMailboxAccountId(draft.composer.accountId ?? null)
      if (draft.attachments?.length) setAttachedDraft({ workspaceId, draft })
      else {
        setAttachedDraft(null)
        setComposer(draft.composer)
      }
    },
    enabled: statusQuery.data?.authenticated === true,
    onOpen: (message) => {
      setLinkedMessage({ workspaceId, message })
      setMailboxAccountId(message.accountId ?? null)
      setFolderId('all')
      setSearchInput('')
      setQuery('')
      openReaderMessage(message)
    },
  })

  const replaceReaderMessage = useCallback(
    (message: MailMessageSummary) => {
      cancelReaderCloseAnimation()
      readerNavigation.open(message)
      setSelectedId(mailMessageKey(message))
    },
    [cancelReaderCloseAnimation, readerNavigation],
  )

  const dismissReader = useCallback(
    (sync: 'pop' | 'none' = 'pop') => {
      cancelReaderCloseAnimation()
      readerNavigation.close(sync === 'pop')
      setSelectedId(null)
    },
    [cancelReaderCloseAnimation, readerNavigation],
  )

  const closeReader = useCallback(
    (sync: 'pop' | 'none' = 'pop') => {
      readerNavigation.close(sync === 'pop')
      animateReaderClose()
    },
    [animateReaderClose, readerNavigation],
  )

  const refreshUiIntent = useCallback(async () => {
    try {
      const response = await fetchWithWorkspace(
        accounts.length > 1
          ? '/api/moldable/ui-intent?scope=all'
          : '/api/moldable/ui-intent',
      )
      if (!response.ok) return
      const intent = (await response.json()) as MailUiIntent | null
      if (!intent?.id || seenUiIntentIds.current.has(intent.id)) return
      setPendingUiIntent(intent)
    } catch {
      // Best-effort; the next host event retries the single-slot intent.
    }
  }, [accounts.length, fetchWithWorkspace])

  useEffect(() => {
    void refreshUiIntent()
  }, [refreshUiIntent])

  useEffect(() => {
    const onMessage = (event: MessageEvent) => {
      const data = event.data as AppApiChangedMessage | null
      if (data?.type !== 'moldable:app-api-changed') return
      if (data.targetAppId !== 'mail') return
      if (data.workspaceId && data.workspaceId !== workspaceId) return

      const touched = new Set([data.method, ...(data.scopes ?? [])])
      if (
        [...touched].some(
          (method) =>
            method?.startsWith('mail.messages.') ||
            method?.startsWith('mail.messages.'),
        )
      ) {
        void queryClient.invalidateQueries({
          queryKey: ['mail-messages', workspaceId],
        })
        void queryClient.invalidateQueries({
          queryKey: ['mail-message', workspaceId],
        })
        void queryClient.invalidateQueries({
          queryKey: ['mail-thread', workspaceId],
        })
      }
      if ([...touched].some((method) => method?.startsWith('mail.drafts.'))) {
        void queryClient.invalidateQueries({
          queryKey: ['mail-drafts', workspaceId],
        })
      }
      void refreshUiIntent()
    }
    window.addEventListener('message', onMessage)
    return () => window.removeEventListener('message', onMessage)
  }, [queryClient, refreshUiIntent, workspaceId])

  useEffect(() => {
    if (!pendingUiIntent) return
    if (pendingUiIntent.view === 'message') {
      const id = pendingUiIntent.entityId
      if (!id) return
      const matchingMessage = messages.find(
        (message) =>
          message.id === id &&
          (!pendingUiIntent.accountId ||
            message.accountId === pendingUiIntent.accountId),
      )
      if (!matchingMessage) {
        if (
          pendingUiIntent.accountId &&
          mailboxScopeAccountId &&
          mailboxScopeAccountId !== pendingUiIntent.accountId
        ) {
          setMailboxAccountId(pendingUiIntent.accountId)
        }
        if (folderId !== 'all' || query) {
          setFolderId('all')
          setQuery('')
        }
        void queryClient.invalidateQueries({
          queryKey: ['mail-messages', workspaceId],
        })
        return
      }
      openReaderMessage(matchingMessage)
    } else {
      setFolderId('INBOX')
      setQuery('')
      dismissReader('none')
    }

    const intentId = pendingUiIntent.id
    seenUiIntentIds.current.add(intentId)
    setPendingUiIntent(null)
    void fetchWithWorkspace(
      mailAccountPath(
        `/api/moldable/ui-intent?id=${encodeURIComponent(intentId)}`,
        pendingUiIntent.accountId,
      ),
      { method: 'DELETE' },
    )
  }, [
    dismissReader,
    fetchWithWorkspace,
    folderId,
    messages,
    mailboxScopeAccountId,
    openReaderMessage,
    pendingUiIntent,
    query,
    queryClient,
    workspaceId,
  ])

  const actionMutation = useMessageAction({
    onRemoveCurrent: dismissReader,
  })
  const unsubscribeArchiveMutation = useUnsubscribeAndArchive({
    onRemoveCurrent: dismissReader,
  })
  const sendMutation = useSendMail()

  const runAction = useCallback(
    (message: MailMessageSummary, action: MessageAction, until?: number) =>
      actionMutation.mutate({
        id: message.id,
        accountId: message.accountId,
        action,
        until,
      }),
    [actionMutation],
  )

  const openComposer = useCallback((nextComposer: ComposerState) => {
    setComposer(nextComposer)
  }, [])

  const closeComposer = useCallback((_sync: 'pop' | 'none' = 'pop') => {
    setComposer(null)
    setDraftClosePromptOpen(false)
  }, [])

  const openReply = useCallback(
    (message: MailMessageDetail) => openComposer(replyComposer(message)),
    [openComposer],
  )

  const handleReplyFromRow = useCallback(
    async (message: MailMessageSummary) => {
      try {
        const detail = await queryClient.fetchQuery<MailMessageDetail>({
          queryKey: [
            'mail-message',
            workspaceId,
            message.accountId ?? 'active',
            message.id,
          ],
          queryFn: async () => {
            const res = await fetchWithWorkspace(
              mailAccountPath(
                `/api/messages/${encodeURIComponent(message.id)}`,
                message.accountId,
              ),
            )
            if (!res.ok) throw new Error('Failed to load message')
            const data = (await res.json()) as { message: MailMessageDetail }
            return data.message
          },
          staleTime: 30_000,
        })
        openReply(detail)
      } catch (error) {
        console.warn('Failed to load message for reply:', error)
      }
    },
    [fetchWithWorkspace, openReply, queryClient, workspaceId],
  )

  const handleSelectMessage = useCallback(
    (message: MailMessageSummary | null) => {
      const key = message ? mailMessageKey(message) : null
      if (bulkSelectionActive && message && key && !showingDrafts) {
        setSelectedBulkIds((current) => {
          const next = new Set(current)
          if (next.has(key)) {
            next.delete(key)
          } else {
            next.add(key)
          }
          return next
        })
        return
      }

      if (showingDrafts && message?.id.startsWith('draft:')) {
        const draft = drafts.find(
          (item) =>
            `draft:${item.id}` === message.id &&
            item.composer.accountId === message.accountId,
        )
        if (draft) openComposer(draft.composer)
        dismissReader()
        return
      }

      if (message) {
        openReaderMessage(message)
      } else {
        closeReader()
      }
    },
    [
      bulkSelectionActive,
      closeReader,
      dismissReader,
      drafts,
      openComposer,
      openReaderMessage,
      showingDrafts,
    ],
  )

  const toggleBulkSelected = useCallback((message: MailMessageSummary) => {
    const key = mailMessageKey(message)
    setSelectedBulkIds((current) => {
      const next = new Set(current)
      if (next.has(key)) {
        next.delete(key)
      } else {
        next.add(key)
      }
      return next
    })
  }, [])

  const clearBulkSelection = useCallback(() => {
    setSelectedBulkIds(new Set())
  }, [])

  const runBulkAction = useCallback(
    (action: MessageAction, until?: number) => {
      const selectedMessages = messages.filter((message) =>
        selectedBulkIds.has(mailMessageKey(message)),
      )
      setSelectedBulkIds(new Set())
      for (const message of selectedMessages) {
        runAction(message, action, until)
      }
    },
    [messages, runAction, selectedBulkIds],
  )

  const runBulkArchiveWithLabel = useCallback(
    (labelId: string) => {
      const selectedMessages = messages.filter((message) =>
        selectedBulkIds.has(mailMessageKey(message)),
      )
      setSelectedBulkIds(new Set())
      for (const message of selectedMessages) {
        updateLabelsMutation.mutate({
          id: message.id,
          accountId: message.accountId,
          addLabelIds: [labelId],
          removeLabelIds: ['INBOX', 'SNOOZED'],
        })
      }
    },
    [messages, selectedBulkIds, updateLabelsMutation],
  )

  useMailKeyboard({
    disabled: !!composer,
    messages,
    selectedMessageKey: selectedId,
    selectedMessage,
    currentMessage: messageQuery.data,
    onSelect: handleSelectMessage,
    onAction: runAction,
    onReply: openReply,
  })

  useEffect(() => {
    resetMoldableNavigation()
  }, [])

  useMoldableNavigationPop(() => {
    if (readerNavigation.isOpen()) {
      closeReader('none')
    }
  })

  useEffect(() => {
    return () => {
      if (readerCloseTimerRef.current !== null) {
        window.clearTimeout(readerCloseTimerRef.current)
      }
    }
  }, [])

  useEffect(() => {
    if (selectedId && !selectedMessage) {
      dismissReader()
    }
  }, [dismissReader, selectedId, selectedMessage])

  useEffect(() => {
    setSelectedBulkIds((current) => {
      if (current.size === 0) return current
      const visibleIds = new Set(messages.map(mailMessageKey))
      const next = new Set([...current].filter((id) => visibleIds.has(id)))
      return next.size === current.size ? current : next
    })
  }, [messages])

  useEffect(() => {
    if (
      mailboxAccountId &&
      !accounts.some((account) => account.id === mailboxAccountId)
    ) {
      setMailboxAccountId(null)
    }
  }, [accounts, mailboxAccountId])

  useEffect(() => {
    if (showingDrafts && drafts.length === 0 && !draftsQuery.isLoading) {
      setFolderId('INBOX')
    }
  }, [drafts.length, draftsQuery.isLoading, showingDrafts])

  useEffect(() => {
    const handleCommandMenuShortcut = (event: KeyboardEvent) => {
      if (
        event.key.toLowerCase() !== 'k' ||
        (!event.metaKey && !event.ctrlKey)
      ) {
        return
      }

      event.preventDefault()
      window.parent.postMessage({ type: 'moldable:toggle-command-menu' }, '*')
    }

    window.addEventListener('keydown', handleCommandMenuShortcut, true)
    return () => {
      window.removeEventListener('keydown', handleCommandMenuShortcut, true)
    }
  }, [])

  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.data?.type === 'oauth-success') {
        setMailboxAccountId(null)
        void queryClient.invalidateQueries({
          queryKey: ['mail-status', workspaceId],
        })
        void queryClient.invalidateQueries({
          queryKey: ['mail-messages', workspaceId],
        })
        void queryClient.invalidateQueries({
          queryKey: ['mail-contacts', workspaceId],
        })
      }

      if (event.data?.type === 'moldable:chat-state') {
        const safePadding = Number(event.data.safePadding)
        if (Number.isFinite(safePadding)) {
          document.documentElement.style.setProperty(
            '--emails-action-dock-safe-padding',
            `${Math.max(0, safePadding)}px`,
          )
        }
      }
    }

    window.addEventListener('message', handleMessage)
    return () => window.removeEventListener('message', handleMessage)
  }, [queryClient, workspaceId])

  useEffect(() => {
    const message = messageQuery.data ?? selectedMessage
    const accountId = message?.accountId
    const resource =
      message?.id && accountId && !showingDrafts
        ? {
            resourceType: 'mail.message',
            resourceId: message.id,
            accountId,
            routeId: 'message',
          }
        : null
    const text =
      message && accountId && !showingDrafts
        ? [
            'The user is viewing this authoritative Mail resource.',
            `Account ID: ${JSON.stringify(accountId)}.`,
            `Message ID: ${JSON.stringify(message.id)}.`,
            `From: ${JSON.stringify(message.from)}.`,
            `Subject: ${JSON.stringify(message.subject)}.`,
            `Snippet: ${JSON.stringify(message.snippet.slice(0, 1_000))}.`,
            'Use mail.read with this exact accountId and messageId before relying on message content or creating behavior “like this.”',
          ].join('\n')
        : ''
    window.parent.postMessage(
      { type: 'moldable:set-chat-instructions', text },
      '*',
    )
    window.parent.postMessage(
      { type: 'moldable:set-chat-resource', resource },
      '*',
    )
    return () => {
      window.parent.postMessage(
        { type: 'moldable:set-chat-instructions', text: '' },
        '*',
      )
      window.parent.postMessage(
        { type: 'moldable:set-chat-resource', resource: null },
        '*',
      )
    }
  }, [messageQuery.data, selectedId, selectedMessage, showingDrafts])

  useEffect(() => {
    if (messageQuery.data && messageQuery.data.unread && messageQuery.data.id) {
      runAction(messageQuery.data, 'markRead')
    }
  }, [messageQuery.data, runAction])

  const unreadCount = useMemo(
    () =>
      inboxUnreadQuery.data?.resultSizeEstimate ??
      inboxUnreadQuery.data?.messages.length ??
      0,
    [inboxUnreadQuery.data],
  )
  const {
    fetchNextPage: fetchNextMessagesPage,
    hasNextPage: hasNextMessagesPage,
    isFetchingNextPage: isFetchingNextMessagesPage,
  } = messagesQuery
  const hasMoreMessages = !showingDrafts && Boolean(hasNextMessagesPage)
  const loadingMoreMessages = !showingDrafts && isFetchingNextMessagesPage
  const loadMoreMessages = useCallback(() => {
    if (showingDrafts || !hasNextMessagesPage || isFetchingNextMessagesPage) {
      return
    }
    void fetchNextMessagesPage()
  }, [
    fetchNextMessagesPage,
    hasNextMessagesPage,
    isFetchingNextMessagesPage,
    showingDrafts,
  ])

  const handleSearch = async (event?: FormEvent) => {
    event?.preventDefault()
    setSelectedBulkIds(new Set())
    dismissReader()

    const naturalLanguageQuery = searchInput.trim()
    const searchRequestId = searchRequestIdRef.current + 1
    searchRequestIdRef.current = searchRequestId

    if (!naturalLanguageQuery) {
      setQuery('')
      setGeneratedSearch(null)
      setSearchError(null)
      return
    }

    setFolderId('all')
    setQuery('')
    setGeneratedSearch(null)
    setSearchError(null)

    try {
      const generated = await generateSearchQuery.mutateAsync({
        query: naturalLanguageQuery,
        currentLabelId: showingDrafts ? 'INBOX' : folderId,
      })
      if (searchRequestIdRef.current !== searchRequestId) return
      const generatedQuery = generated.gmailQuery || naturalLanguageQuery
      queryClient.removeQueries({
        queryKey: [
          'mail-messages',
          workspaceId,
          generated.labelId,
          generatedQuery,
          mailboxScopeAccountId ?? 'all',
        ],
        exact: true,
      })
      setGeneratedSearch(generated)
      setQuery(generatedQuery)
      if (generated.labelId !== DRAFT_FOLDER_ID) {
        setFolderId(generated.labelId)
      }
    } catch {
      if (searchRequestIdRef.current !== searchRequestId) return
      setGeneratedSearch(null)
      queryClient.removeQueries({
        queryKey: [
          'mail-messages',
          workspaceId,
          'all',
          naturalLanguageQuery,
          mailboxScopeAccountId ?? 'all',
        ],
        exact: true,
      })
      setFolderId('all')
      setQuery(naturalLanguageQuery)
      setSearchError(
        'AI search translation is unavailable; searching all mail for your words instead.',
      )
    }
  }

  const clearSearch = () => {
    searchRequestIdRef.current += 1
    setSelectedBulkIds(new Set())
    setSearchInput('')
    setQuery('')
    setGeneratedSearch(null)
    setSearchError(null)
    dismissReader()
  }

  const handleFolderChange = useCallback(
    (nextFolderId: string) => {
      setSelectedBulkIds(new Set())
      setFolderId(nextFolderId)
      dismissReader()
    },
    [dismissReader],
  )

  const handleSend = () => {
    if (!composer) return
    const draftId = composer.draftId
    sendMutation.mutate(composer, {
      onSuccess: () => {
        closeComposer('pop')
        if (draftId) {
          deleteDraftMutation.mutate({
            id: draftId,
            accountId: composer.accountId,
          })
        }
      },
    })
  }

  const handleComposerCloseRequest = () => {
    if (!composer) return
    if (!hasDraftContent(composer)) {
      if (composer.draftId) {
        deleteDraftMutation.mutate({
          id: composer.draftId,
          accountId: composer.accountId,
        })
      }
      closeComposer('pop')
      return
    }
    setDraftClosePromptOpen(true)
  }

  const handleSaveDraftAndClose = () => {
    if (!composer) return
    saveDraftMutation.mutate(composer, {
      onSuccess: () => {
        closeComposer('pop')
      },
    })
  }

  const handleDiscardDraftAndClose = () => {
    const draftId = composer?.draftId
    const accountId = composer?.accountId
    closeComposer('pop')
    if (draftId) deleteDraftMutation.mutate({ id: draftId, accountId })
  }

  const handleDisconnect = (accountId: string) => {
    searchRequestIdRef.current += 1
    disconnectGmail.mutate(accountId, {
      onSuccess: () => {
        setMailboxAccountId(null)
        dismissReader()
        closeComposer('pop')
        setQuery('')
        setSearchInput('')
        setGeneratedSearch(null)
        setSearchError(null)
      },
    })
  }

  const handleAccountSwitch = (accountId: string | null) => {
    dismissReader()
    closeComposer('none')
    setSelectedBulkIds(new Set())
    setQuery('')
    setSearchInput('')
    setMailboxAccountId(accountId)
    if (accountId && accountId !== statusQuery.data?.activeAccountId) {
      switchMailAccount.mutate(accountId)
    }
  }

  const mailCommands = useMemo(
    () =>
      statusQuery.data?.authenticated
        ? [
            ...MAIL_BASE_COMMANDS,
            ...(snoozedCount > 0 ? [MAIL_SNOOZED_COMMAND] : []),
            ...(drafts.length > 0 ? [MAIL_DRAFTS_COMMAND] : []),
            ...(readerOpen ? MAIL_DETAIL_COMMANDS : []),
          ]
        : [],
    [drafts.length, readerOpen, snoozedCount, statusQuery.data?.authenticated],
  )

  useEffect(() => {
    if (window.parent === window) return

    window.parent.postMessage(
      {
        type: 'moldable:set-app-commands',
        appId: 'mail',
        commands: mailCommands,
      },
      '*',
    )
  }, [mailCommands])

  useEffect(() => {
    const handleCommand = (event: MessageEvent) => {
      if (event.data?.type === 'moldable:navigation-gesture') {
        if (
          event.data.direction === 'back' &&
          selectedId &&
          !composer &&
          !draftClosePromptOpen
        ) {
          closeReader()
        }
        return
      }

      if (event.data?.type !== 'moldable:command') return

      switch (event.data.command) {
        case 'mail.compose':
          openComposer(emptyComposer(composeAccountId))
          break
        case 'mail.search':
          dismissReader()
          window.setTimeout(() => {
            document
              .querySelector<HTMLInputElement>('[data-mail-search-input]')
              ?.focus()
          }, 0)
          break
        case 'mail.refresh':
          if (!showingDrafts) void refetchMessages()
          break
        case 'mail.reply':
          if (messageQuery.data) openReply(messageQuery.data)
          break
        case 'mail.archive':
          if (selectedMessage) runAction(selectedMessage, 'archive')
          break
        case 'mail.trash':
          if (selectedMessage) runAction(selectedMessage, 'trash')
          break
        case 'mail.spam':
          if (selectedMessage) runAction(selectedMessage, 'spam')
          break
        case 'mail.toggle-read':
          if (selectedMessage) {
            runAction(
              selectedMessage,
              selectedMessage.unread ? 'markRead' : 'markUnread',
            )
          }
          break
        case 'mail.toggle-star':
          if (selectedMessage) {
            runAction(
              selectedMessage,
              selectedMessage.starred ? 'unstar' : 'star',
            )
          }
          break
        case 'mail.toggle-important':
          if (selectedMessage) {
            runAction(
              selectedMessage,
              selectedMessage.important ? 'unimportant' : 'important',
            )
          }
          break
        case 'mail.add-label':
          if (selectedMessage) {
            window.dispatchEvent(new CustomEvent('mail:open-label-picker'))
          }
          break
        case 'mail.open-inbox':
          handleFolderChange('INBOX')
          break
        case 'mail.open-sent':
          handleFolderChange('SENT')
          break
        case 'mail.open-all':
          handleFolderChange('all')
          break
        case 'mail.open-spam':
          handleFolderChange('SPAM')
          break
        case 'mail.open-trash':
          handleFolderChange('TRASH')
          break
        case 'mail.open-drafts':
          handleFolderChange(DRAFT_FOLDER_ID)
          break
        case 'mail.open-snoozed':
          handleFolderChange('SNOOZED')
          break
      }
    }

    window.addEventListener('message', handleCommand)
    return () => window.removeEventListener('message', handleCommand)
  }, [
    dismissReader,
    closeReader,
    composeAccountId,
    composer,
    draftClosePromptOpen,
    handleFolderChange,
    messageQuery.data,
    refetchMessages,
    openComposer,
    openReply,
    runAction,
    selectedId,
    selectedMessage,
    showingDrafts,
  ])

  if (statusQuery.isLoading) {
    return (
      <div className="bg-background text-foreground flex h-full min-h-0">
        <MoldableLoadingScreen label="Loading Mail" />
      </div>
    )
  }

  if (!statusQuery.data?.authenticated) {
    return (
      <ConnectScreen
        error={statusQuery.error}
        onConnect={() => {
          void connectGmail()
        }}
      />
    )
  }

  const currentUnread = Boolean(
    messageQuery.data?.unread ?? selectedMessage?.unread,
  )
  const currentStarred = Boolean(
    messageQuery.data?.starred ?? selectedMessage?.starred,
  )
  const currentImportant = Boolean(
    messageQuery.data?.important ?? selectedMessage?.important,
  )
  const currentSpam = Boolean(
    (messageQuery.data ?? selectedMessage)?.labelIds.includes('SPAM'),
  )

  if (attachedDraft?.workspaceId === workspaceId)
    return (
      <AttachedDraftPreview
        draft={attachedDraft.draft}
        onClose={() => setAttachedDraft(null)}
      />
    )

  return (
    <div className="bg-background text-foreground flex h-full min-h-0 flex-col overflow-hidden">
      {resourceNavigation.error && (
        <div
          role="alert"
          className="text-destructive flex items-center gap-2 px-4 py-2 text-sm"
        >
          <span className="flex-1">{resourceNavigation.error}</span>
          <Button
            variant="ghost"
            size="icon"
            onClick={resourceNavigation.dismissError}
            aria-label="Dismiss email error"
            className="cursor-pointer"
          >
            <X className="size-4" />
          </Button>
        </div>
      )}
      {readerOpen ? (
        <EmailView
          message={messageQuery.data}
          thread={threadQuery.data}
          fallback={selectedMessage}
          loading={messageQuery.isLoading || threadQuery.isLoading}
          canGoPrevious={Boolean(previousMessage)}
          canGoNext={Boolean(nextMessage)}
          onBack={closeReader}
          closing={readerClosing}
          onPrevious={() =>
            previousMessage && replaceReaderMessage(previousMessage)
          }
          onNext={() => nextMessage && replaceReaderMessage(nextMessage)}
          onTrash={() => selectedMessage && runAction(selectedMessage, 'trash')}
          onToggleStar={() =>
            selectedMessage &&
            runAction(selectedMessage, currentStarred ? 'unstar' : 'star')
          }
          onToggleRead={() =>
            selectedMessage &&
            runAction(
              selectedMessage,
              currentUnread ? 'markRead' : 'markUnread',
            )
          }
          onMarkImportant={() =>
            selectedMessage &&
            runAction(
              selectedMessage,
              currentImportant ? 'unimportant' : 'important',
            )
          }
          onToggleSpam={() =>
            selectedMessage &&
            runAction(selectedMessage, currentSpam ? 'notSpam' : 'spam')
          }
        />
      ) : (
        <>
          <InboxHeader
            account={
              mailboxScopeAccountId
                ? (accounts.find(
                    (account) => account.id === mailboxScopeAccountId,
                  )?.emailAddress ?? 'Gmail')
                : 'All inboxes'
            }
            accounts={accounts}
            activeAccountId={statusQuery.data.activeAccountId}
            selectedAccountId={mailboxScopeAccountId}
            folderId={folderId}
            query={query}
            searchInput={searchInput}
            unreadCount={unreadCount}
            draftCount={drafts.length}
            snoozedCount={snoozedCount}
            refreshing={
              !showingDrafts &&
              messagesQuery.isFetching &&
              !messagesQuery.isFetchingNextPage
            }
            disconnecting={disconnectGmail.isPending}
            switchingAccount={switchMailAccount.isPending}
            searchTranslating={generateSearchQuery.isPending}
            generatedSearch={generatedSearch}
            searchError={searchError}
            onCompose={() => openComposer(emptyComposer(composeAccountId))}
            onDisconnect={handleDisconnect}
            onAddAccount={() => void connectGmail()}
            onAccountSwitch={handleAccountSwitch}
            onFolderChange={handleFolderChange}
            onRefresh={() => {
              if (!showingDrafts) void refetchMessages()
            }}
            onSearchInputChange={setSearchInput}
            onSearch={handleSearch}
            onClearSearch={clearSearch}
          />
          <div className="min-h-0 flex-1">
            <InboxView
              messages={messages}
              selectedMessageKey={selectedId}
              showAccount={!mailboxScopeAccountId && accounts.length > 1}
              loading={
                showingDrafts ? draftsQuery.isLoading : messagesQuery.isLoading
              }
              searchLoading={
                !showingDrafts &&
                (generateSearchQuery.isPending ||
                  Boolean(
                    query &&
                      messagesQuery.isFetching &&
                      !messagesQuery.isFetchingNextPage,
                  ))
              }
              error={showingDrafts ? draftsQuery.error : messagesQuery.error}
              folderId={folderId}
              query={query}
              actionError={
                actionMutation.error ??
                unsubscribeArchiveMutation.error ??
                updateLabelsMutation.error
              }
              accountErrors={
                showingDrafts
                  ? draftsQuery.data?.accountErrors
                  : messagesQuery.data?.accountErrors
              }
              onSelect={handleSelectMessage}
              onReply={handleReplyFromRow}
              onArchive={(message) => runAction(message, 'archive')}
              onUnsubscribeArchive={(message) =>
                unsubscribeArchiveMutation.mutate({
                  id: message.id,
                  accountId: message.accountId,
                })
              }
              onSnooze={(message, until) => runAction(message, 'snooze', until)}
              onUnsnooze={(message) => runAction(message, 'unsnooze')}
              onSpam={(message) => runAction(message, 'spam')}
              selectedMessageIds={selectedBulkIds}
              selectionActive={bulkSelectionActive}
              onToggleMessageSelected={toggleBulkSelected}
              hasMoreMessages={hasMoreMessages}
              loadingMore={loadingMoreMessages}
              onLoadMore={loadMoreMessages}
            />
          </div>
        </>
      )}

      {readerOpen && selectedMessage && !readerClosing ? (
        <EmailActionDock
          onReply={() => messageQuery.data && openReply(messageQuery.data)}
          onArchive={() => {
            dismissReader()
            runAction(selectedMessage, 'archive')
          }}
          onSnooze={(until) => {
            dismissReader()
            runAction(selectedMessage, 'snooze', until)
          }}
          onUnsnooze={() => {
            dismissReader()
            runAction(selectedMessage, 'unsnooze')
          }}
          isSnoozed={selectedMessage.labelIds.includes('SNOOZED')}
          onTrash={() => {
            dismissReader()
            runAction(selectedMessage, 'trash')
          }}
          onSpam={() => {
            dismissReader()
            runAction(selectedMessage, 'spam')
          }}
        />
      ) : null}

      {!readerOpen && bulkSelectionActive ? (
        <BulkEmailActionDock
          selectedCount={selectedBulkIds.size}
          labelAccountId={singleSelectedAccountId(messages, selectedBulkIds)}
          onClear={clearBulkSelection}
          onArchive={() => runBulkAction('archive')}
          onArchiveWithLabel={runBulkArchiveWithLabel}
          onSnooze={(until) => runBulkAction('snooze', until)}
          onSpam={() => runBulkAction('spam')}
          onTrash={() => runBulkAction('trash')}
        />
      ) : null}

      {composer ? (
        <Composer
          composer={composer}
          contacts={contactsQuery.data ?? []}
          error={sendMutation.error}
          sending={sendMutation.isPending}
          onChange={setComposer}
          onContactSearch={setContactSearch}
          onClose={handleComposerCloseRequest}
          onSubmit={handleSend}
        />
      ) : null}

      <AlertDialog
        open={draftClosePromptOpen}
        onOpenChange={setDraftClosePromptOpen}
      >
        <AlertDialogContent className="sm:max-w-sm">
          <AlertDialogHeader>
            <AlertDialogTitle>Save draft?</AlertDialogTitle>
            <AlertDialogDescription>
              Keep this message in Drafts or discard it.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="cursor-pointer">
              Cancel
            </AlertDialogCancel>
            <Button
              type="button"
              variant="outline"
              className="cursor-pointer"
              onClick={handleDiscardDraftAndClose}
            >
              Discard
            </Button>
            <Button
              type="button"
              className="cursor-pointer"
              disabled={saveDraftMutation.isPending}
              onClick={handleSaveDraftAndClose}
            >
              Save
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

interface InboxHeaderProps {
  account: string
  accounts: MailAccount[]
  activeAccountId: string | null
  selectedAccountId: string | null
  folderId: string
  query: string
  searchInput: string
  unreadCount: number
  draftCount: number
  snoozedCount: number
  refreshing: boolean
  disconnecting: boolean
  switchingAccount: boolean
  searchTranslating: boolean
  generatedSearch: GeneratedMailSearchQuery | null
  searchError: string | null
  onCompose: () => void
  onDisconnect: (accountId: string) => void
  onAddAccount: () => void
  onAccountSwitch: (accountId: string | null) => void
  onFolderChange: (folderId: string) => void
  onRefresh: () => void
  onSearchInputChange: (value: string) => void
  onSearch: (event?: FormEvent) => void
  onClearSearch: () => void
}

function InboxHeader({
  account,
  accounts,
  activeAccountId,
  selectedAccountId,
  folderId,
  query,
  searchInput,
  unreadCount,
  draftCount,
  snoozedCount,
  refreshing,
  disconnecting,
  switchingAccount,
  searchTranslating,
  generatedSearch,
  searchError,
  onCompose,
  onDisconnect,
  onAddAccount,
  onAccountSwitch,
  onFolderChange,
  onRefresh,
  onSearchInputChange,
  onSearch,
  onClearSearch,
}: InboxHeaderProps) {
  const disconnectAccountId = selectedAccountId ?? activeAccountId

  return (
    <div className="emails-inbox-header shrink-0">
      <AppHeader
        title="Inbox"
        description={account}
        desktop={false}
        actions={[
          {
            id: 'mail.compose',
            icon: PenLine,
            label: 'Compose',
            onPress: onCompose,
          },
          {
            id: 'mail.refresh',
            icon: RefreshCcw,
            label: 'Refresh',
            placement: 'overflow',
            onPress: onRefresh,
          },
          {
            id: 'mail.add-account',
            icon: UserPlus,
            label: 'Add Gmail account',
            placement: 'overflow',
            onPress: onAddAccount,
          },
          {
            id: 'mail.disconnect',
            icon: LogOut,
            label: 'Disconnect Gmail',
            placement: 'overflow',
            disabled: disconnecting || !disconnectAccountId,
            onPress: () => {
              if (disconnectAccountId) onDisconnect(disconnectAccountId)
            },
          },
        ]}
      />
      <DesktopOnly>
        <Toolbar
          position="top"
          variant="plain"
          material="none"
          className="border-0"
        >
          <AccountMenu
            accounts={accounts}
            activeAccountId={activeAccountId}
            selectedAccountId={selectedAccountId}
            disabled={switchingAccount || disconnecting}
            onAddAccount={onAddAccount}
            onChange={onAccountSwitch}
            onDisconnect={onDisconnect}
          />
          <ToolbarActions>
            <ToolbarControlGroup aria-label="Mail controls">
              <ToolbarIconButton
                className="cursor-pointer"
                label="Refresh inbox"
                disabled={refreshing}
                onClick={onRefresh}
              >
                <RefreshCcw className={cn(refreshing && 'animate-spin')} />
              </ToolbarIconButton>
            </ToolbarControlGroup>
            <ToolbarButton
              material="ultra-thin"
              className="cursor-pointer"
              onClick={onCompose}
            >
              <PenLine className="size-4" />
              Compose
            </ToolbarButton>
          </ToolbarActions>
        </Toolbar>
      </DesktopOnly>

      <div className="px-5 pb-2 pt-1">
        <div className="w-full">
          <div className="mb-3 md:hidden">
            <AccountMenu
              accounts={accounts}
              activeAccountId={activeAccountId}
              selectedAccountId={selectedAccountId}
              disabled={switchingAccount || disconnecting}
              onAddAccount={onAddAccount}
              onChange={onAccountSwitch}
              onDisconnect={onDisconnect}
              className="w-full justify-between"
            />
          </div>
          <form onSubmit={onSearch}>
            <div className="relative">
              <Search className="text-muted-foreground pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2" />
              <Input
                data-mail-search-input
                value={searchInput}
                onChange={(event) => onSearchInputChange(event.target.value)}
                placeholder="Ask in plain English, e.g. unread with attachments"
                aria-label="Search mail with natural language"
                className={cn(
                  'emails-search-input bg-muted/50 h-10 rounded-full border-transparent pl-10 pr-10 text-[13.5px]',
                  'placeholder:text-muted-foreground/70',
                )}
              />
              {searchTranslating ? (
                <div className="text-muted-foreground pointer-events-none absolute right-4 top-1/2 -translate-y-1/2">
                  <Loader2 className="size-4 animate-spin" />
                </div>
              ) : query || searchInput ? (
                <div className="text-muted-foreground/70 pointer-events-none absolute right-3 top-1/2 flex -translate-y-1/2 items-center gap-1 text-[10.5px]">
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button
                        type="button"
                        className="text-muted-foreground hover:bg-muted hover:text-foreground pointer-events-auto flex size-6 cursor-pointer items-center justify-center rounded-full"
                        onClick={onClearSearch}
                        aria-label="Clear search"
                      >
                        <X className="size-3.5" />
                      </button>
                    </TooltipTrigger>
                    <TooltipContent side="bottom">
                      <p>Clear search</p>
                    </TooltipContent>
                  </Tooltip>
                </div>
              ) : null}
            </div>
            {searchError ? (
              <p className="text-destructive mt-1.5 px-3 text-[11px]">
                {searchError}
              </p>
            ) : generatedSearch && query ? (
              <p className="text-muted-foreground mt-1.5 truncate px-3 text-[11px]">
                Gmail search:{' '}
                <code className="bg-muted text-foreground rounded px-1 py-0.5 font-mono">
                  {query}
                </code>
              </p>
            ) : null}
          </form>

          <nav className="mt-4 flex gap-1 overflow-x-auto pb-1">
            {[
              {
                ...folders[0],
                folderId: 'INBOX',
              },
              ...(snoozedCount > 0 || folderId === 'SNOOZED'
                ? [{ ...folders[1], folderId: 'SNOOZED' }]
                : []),
              ...(draftCount > 0
                ? [
                    {
                      id: DRAFT_FOLDER_ID,
                      folderId: DRAFT_FOLDER_ID,
                      label: 'Drafts',
                      icon: FileText,
                    },
                  ]
                : []),
              ...folders
                .slice(2)
                .map((folder) => ({ ...folder, folderId: folder.id })),
            ].map((folder) => {
              if (!folder) return null
              const Icon = folder.icon
              const active = folder.folderId === folderId
              const count =
                folder.id === 'INBOX'
                  ? unreadCount
                  : folder.id === DRAFT_FOLDER_ID
                    ? draftCount
                    : folder.id === 'SNOOZED'
                      ? snoozedCount
                      : 0

              return (
                <button
                  key={folder.id}
                  type="button"
                  className={cn(
                    'flex h-8 shrink-0 cursor-pointer items-center gap-1.5 rounded-full px-3 text-[12.5px] font-medium transition-colors',
                    active
                      ? 'bg-foreground text-background'
                      : 'text-muted-foreground hover:bg-muted hover:text-foreground',
                  )}
                  onClick={() => onFolderChange(folder.folderId)}
                >
                  <Icon className="size-3.5" />
                  <span>{folder.label}</span>
                  {count > 0 ? (
                    <span
                      className={cn(
                        'ml-0.5 rounded-full px-1.5 text-[10px] font-semibold tabular-nums',
                        active
                          ? 'bg-background/20 text-background'
                          : 'bg-muted text-foreground/90',
                      )}
                    >
                      {count}
                    </span>
                  ) : null}
                </button>
              )
            })}
          </nav>
        </div>
      </div>
    </div>
  )
}

function AccountMenu({
  accounts,
  activeAccountId,
  selectedAccountId,
  disabled,
  onAddAccount,
  onChange,
  onDisconnect,
  className,
}: {
  accounts: MailAccount[]
  activeAccountId: string | null
  selectedAccountId: string | null
  disabled: boolean
  onAddAccount: () => void
  onChange: (accountId: string | null) => void
  onDisconnect: (accountId: string) => void
  className?: string
}) {
  const selectedAccount = accounts.find((item) => item.id === selectedAccountId)
  const disconnectAccount =
    selectedAccount ?? accounts.find((item) => item.id === activeAccountId)

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <ToolbarButton
          type="button"
          disabled={disabled}
          material="ultra-thin"
          className={cn('max-w-[18rem] cursor-pointer font-medium', className)}
          aria-label="Choose Gmail account"
        >
          <span className="truncate">
            {selectedAccountId === null && accounts.length > 1
              ? 'All inboxes'
              : (selectedAccount?.emailAddress ?? 'Choose account')}
          </span>
          <ChevronDown className="text-muted-foreground size-3.5 shrink-0" />
        </ToolbarButton>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="text-sm! w-64">
        <DropdownMenuLabel className="text-muted-foreground text-xs! font-normal">
          Gmail accounts
        </DropdownMenuLabel>
        {accounts.length > 1 ? (
          <DropdownMenuItem
            className="text-sm! cursor-pointer"
            onClick={() => onChange(null)}
          >
            <span className="truncate">All inboxes</span>
            {selectedAccountId === null ? (
              <Check className="text-primary ml-auto size-3.5" />
            ) : null}
          </DropdownMenuItem>
        ) : null}
        {accounts.map((item) => (
          <DropdownMenuItem
            key={item.id}
            className="text-sm! cursor-pointer"
            onClick={() => onChange(item.id)}
          >
            <span className="truncate">{item.emailAddress}</span>
            {item.id === selectedAccountId ? (
              <Check className="text-primary ml-auto size-3.5" />
            ) : null}
          </DropdownMenuItem>
        ))}
        <DropdownMenuSeparator />
        <DropdownMenuItem
          className="text-sm! cursor-pointer"
          onClick={onAddAccount}
        >
          <UserPlus className="size-3.5" />
          Add Gmail account
        </DropdownMenuItem>
        <DropdownMenuItem
          className="text-destructive focus:text-destructive text-sm! cursor-pointer"
          disabled={!disconnectAccount}
          onClick={() => {
            if (disconnectAccount) onDisconnect(disconnectAccount.id)
          }}
        >
          <LogOut className="size-3.5" />
          <span className="truncate">
            {disconnectAccount
              ? `Disconnect ${disconnectAccount.emailAddress}`
              : 'Disconnect account'}
          </span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
