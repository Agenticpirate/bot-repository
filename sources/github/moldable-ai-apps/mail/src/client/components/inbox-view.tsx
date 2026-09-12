import {
  Archive,
  Ban,
  Check,
  Clock,
  CornerUpLeft,
  EyeOff,
  Loader2,
} from 'lucide-react'
import type { CSSProperties, KeyboardEvent, MouseEvent } from 'react'
import { useEffect, useMemo, useRef, useState } from 'react'
import {
  ScrollArea,
  Skeleton,
  Tooltip,
  TooltipContent,
  TooltipTrigger,
  cn,
} from '@moldable-ai/ui'
import {
  cleanSnippet,
  formatMessageTime,
  formatSnoozedUntilTime,
  groupMessagesByDay,
  groupMessagesBySnoozeUntil,
  initials,
  senderName,
} from '../lib/mail-format'
import { mailMessageKey } from '../lib/mail-identity'
import { MAIL_SWIPE_THRESHOLD } from '../lib/mail-row-swipe'
import { useMailRowSwipe } from '../hooks/use-mail-row-swipe'
import type { MailAccountError, MailMessageSummary } from '../types'
import { SnoozeMenu } from './snooze-menu'

interface InboxViewProps {
  messages: MailMessageSummary[]
  selectedMessageKey: string | null
  showAccount?: boolean
  loading: boolean
  searchLoading?: boolean
  error: unknown
  folderId: string
  query: string
  actionError: unknown
  accountErrors?: MailAccountError[]
  onSelect: (message: MailMessageSummary) => void
  onReply: (message: MailMessageSummary) => void
  onArchive: (message: MailMessageSummary) => void
  onUnsubscribeArchive: (message: MailMessageSummary) => void
  onSnooze: (message: MailMessageSummary, until: number) => void
  onUnsnooze: (message: MailMessageSummary) => void
  onSpam: (message: MailMessageSummary) => void
  selectedMessageIds: Set<string>
  selectionActive: boolean
  onToggleMessageSelected: (message: MailMessageSummary) => void
  hasMoreMessages?: boolean
  loadingMore?: boolean
  onLoadMore?: () => void
}

export function InboxView({
  messages,
  selectedMessageKey,
  showAccount = false,
  loading,
  searchLoading = false,
  error,
  folderId,
  query,
  actionError,
  accountErrors = [],
  onSelect,
  onReply,
  onArchive,
  onUnsubscribeArchive,
  onSnooze,
  onUnsnooze,
  onSpam,
  selectedMessageIds,
  selectionActive,
  onToggleMessageSelected,
  hasMoreMessages = false,
  loadingMore = false,
  onLoadMore,
}: InboxViewProps) {
  const loadMoreRef = useRef<HTMLDivElement | null>(null)
  const groups = useMemo(
    () =>
      folderId === 'SNOOZED'
        ? groupMessagesBySnoozeUntil(messages)
        : groupMessagesByDay(messages),
    [folderId, messages],
  )

  useEffect(() => {
    if (!hasMoreMessages || loadingMore || !onLoadMore) return

    const node = loadMoreRef.current
    if (!node) return

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) onLoadMore()
      },
      { root: null, rootMargin: '360px 0px 520px', threshold: 0 },
    )
    observer.observe(node)

    return () => observer.disconnect()
  }, [hasMoreMessages, loadingMore, onLoadMore, messages.length])

  if (searchLoading) {
    return <SearchLoadingState />
  }

  if (loading && messages.length === 0) {
    return (
      <ScrollArea className="h-full px-5 pt-4">
        <div className="w-full space-y-8 pb-[calc(var(--chat-safe-padding,0px)+6rem)]">
          <InboxSkeleton showBriefing={folderId === 'INBOX' && !query} />
        </div>
      </ScrollArea>
    )
  }

  if (error) {
    return (
      <div className="flex h-full items-center justify-center px-6 text-center">
        <div className="max-w-sm space-y-2">
          <p className="text-sm font-medium">Couldn&apos;t load messages</p>
          <p className="text-muted-foreground text-xs">
            {error instanceof Error
              ? error.message
              : 'Try refreshing this view.'}
          </p>
        </div>
      </div>
    )
  }

  if (messages.length === 0) {
    return (
      <div className="flex h-full flex-col items-center justify-center px-6 pb-[var(--chat-safe-padding)] text-center">
        <div className="max-w-sm space-y-2">
          <p className="text-lg font-semibold tracking-tight">
            {emptyStateTitle(folderId, Boolean(query))}
          </p>
          <p className="text-muted-foreground text-sm">
            {emptyStateDescription(folderId, query)}
          </p>
        </div>
      </div>
    )
  }

  return (
    <ScrollArea className="h-full px-5 pt-3">
      <div className="w-full space-y-8 pb-[calc(var(--chat-safe-padding,0px)+6rem)]">
        {actionError ? (
          <div className="border-destructive/30 bg-destructive/10 text-destructive rounded-xl border px-4 py-2 text-xs font-medium">
            {actionError instanceof Error
              ? actionError.message
              : 'Message action failed'}
          </div>
        ) : null}

        {accountErrors.length > 0 ? (
          <div className="border-warning/30 bg-warning/10 text-foreground rounded-xl border px-4 py-2 text-xs">
            <span className="font-medium">
              {accountErrors.length === 1
                ? accountErrors[0]?.emailAddress
                : `${accountErrors.length} Gmail accounts`}{' '}
              need attention.
            </span>{' '}
            Mail from the other connected accounts is still shown.
          </div>
        ) : null}

        {groups.map((group) => (
          <section key={group.key}>
            <h2 className="text-muted-foreground/80 mb-2 pl-4 text-xs font-medium uppercase tracking-wider">
              {group.label}
            </h2>
            <div className="border-border/70 bg-muted/30 dark:bg-muted/20 overflow-hidden rounded-2xl border">
              {group.messages.map((message, index) => (
                <MessageRow
                  key={mailMessageKey(message)}
                  message={message}
                  selected={mailMessageKey(message) === selectedMessageKey}
                  bulkSelected={selectedMessageIds.has(mailMessageKey(message))}
                  selectionActive={selectionActive}
                  selectionEnabled={folderId !== 'DRAFTS'}
                  showAccount={showAccount}
                  showSeparator={index < group.messages.length - 1}
                  onSelect={() => onSelect(message)}
                  onToggleSelected={() => onToggleMessageSelected(message)}
                  onReply={() => onReply(message)}
                  onArchive={() => onArchive(message)}
                  onUnsubscribeArchive={() => onUnsubscribeArchive(message)}
                  onSnooze={(until) => onSnooze(message, until)}
                  onUnsnooze={() => onUnsnooze(message)}
                  onSpam={() => onSpam(message)}
                  showActions={folderId !== 'DRAFTS'}
                  showSnoozedUntil={folderId === 'SNOOZED'}
                />
              ))}
            </div>
          </section>
        ))}

        {hasMoreMessages || loadingMore ? (
          <div
            ref={loadMoreRef}
            className="text-muted-foreground flex min-h-16 items-center justify-center gap-2 pb-2 text-xs font-medium"
          >
            <Loader2
              className={cn(
                'size-3.5',
                loadingMore ? 'animate-spin' : 'opacity-60',
              )}
            />
            {loadingMore ? 'Loading more mail…' : 'More mail below'}
          </div>
        ) : null}
      </div>
    </ScrollArea>
  )
}

function emptyStateTitle(folderId: string, searching: boolean) {
  if (searching) {
    switch (folderId) {
      case 'SPAM':
        return 'No spam matches'
      case 'TRASH':
        return 'Nothing in trash'
      case 'SENT':
        return 'No sent matches'
      case 'all':
        return 'No mail matches'
      case 'DRAFTS':
        return 'No draft matches'
      case 'SNOOZED':
        return 'No snoozed matches'
      default:
        return 'No mail matches'
    }
  }

  switch (folderId) {
    case 'DRAFTS':
      return 'No drafts'
    case 'SNOOZED':
      return 'No snoozed messages'
    case 'SPAM':
      return 'Spam clear'
    case 'TRASH':
      return 'Trash empty'
    case 'SENT':
      return 'No sent mail'
    case 'all':
      return 'No mail here'
    default:
      return 'Inbox clear'
  }
}

function emptyStateDescription(folderId: string, query: string) {
  if (query) return `No mail matches "${query}".`

  switch (folderId) {
    case 'INBOX':
      return 'Nothing new right now. Take a breath.'
    case 'DRAFTS':
      return 'No saved drafts.'
    case 'SNOOZED':
      return 'No messages are snoozed.'
    case 'SPAM':
      return 'No spam in this view.'
    case 'TRASH':
      return 'No messages in trash.'
    case 'SENT':
      return 'No sent messages in this view.'
    default:
      return 'No messages in this folder.'
  }
}

const SEARCH_LOADING_MESSAGES = [
  'Asking Gmail to rummage through the drawers…',
  'Checking under the inbox cushions…',
  'Following a trail of subject lines and paperclips…',
  'Sending a tiny search ferret into All Mail…',
  'Peeking behind labels and dusty threads…',
  'Shaking the email snow globe…',
  'Sorting confetti from clues…',
  'Listening for the message that says “psst, over here”…',
  'Tiptoeing past old newsletters to find the good stuff…',
  'Dusting off ancient threads with a tiny feather duster…',
]

function SearchLoadingState() {
  const [messageIndex, setMessageIndex] = useState(0)
  const [visible, setVisible] = useState(true)

  useEffect(() => {
    const interval = window.setInterval(() => {
      setVisible(false)
      window.setTimeout(() => {
        setMessageIndex(
          (previous) => (previous + 1) % SEARCH_LOADING_MESSAGES.length,
        )
        setVisible(true)
      }, 180)
    }, 1_900)

    return () => window.clearInterval(interval)
  }, [])

  return (
    <ScrollArea className="h-full px-5 pt-8">
      <div className="flex min-h-[22rem] w-full items-center justify-center pb-[calc(var(--chat-safe-padding,0px)+6rem)]">
        <div className="flex max-w-sm flex-col items-center text-center">
          <p className="text-muted-foreground mb-2 flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wide">
            <Loader2 className="size-3.5 animate-spin" />
            Searching Gmail
          </p>

          <div
            className="relative flex min-h-12 w-full items-start justify-center px-2"
            aria-live="polite"
          >
            <p
              className={cn(
                'text-foreground max-w-full text-wrap text-sm font-medium leading-6 transition-all duration-200 ease-out',
                visible
                  ? 'translate-y-0 opacity-100 blur-0'
                  : 'translate-y-1 opacity-0 blur-sm',
              )}
            >
              {SEARCH_LOADING_MESSAGES[messageIndex]}
            </p>
          </div>
        </div>
      </div>
    </ScrollArea>
  )
}

function MessageRow({
  message,
  selected,
  bulkSelected,
  selectionActive,
  selectionEnabled,
  showAccount,
  showSeparator,
  onSelect,
  onToggleSelected,
  onReply,
  onArchive,
  onUnsubscribeArchive,
  onSnooze,
  onUnsnooze,
  onSpam,
  showActions,
  showSnoozedUntil,
}: {
  message: MailMessageSummary
  selected: boolean
  bulkSelected: boolean
  selectionActive: boolean
  selectionEnabled: boolean
  showAccount: boolean
  showSeparator: boolean
  onSelect: () => void
  onToggleSelected: () => void
  onReply: () => void
  onArchive: () => void
  onUnsubscribeArchive: () => void
  onSnooze: (until: number) => void
  onUnsnooze: () => void
  onSpam: () => void
  showActions: boolean
  showSnoozedUntil: boolean
}) {
  const snippet = cleanSnippet(message.snippet)
  const senderLabel =
    message.threadParticipants && message.threadParticipants.length > 0
      ? formatThreadParticipants(message.threadParticipants)
      : senderName(message.from)
  const [avatarHovered, setAvatarHovered] = useState(false)
  const [snoozeOpen, setSnoozeOpen] = useState(false)
  const swipe = useMailRowSwipe({
    enabled: showActions && !selectionActive && !snoozeOpen,
    onArchive,
    onSnooze: () => setSnoozeOpen(true),
  })

  const handleKeyDown = (event: KeyboardEvent<HTMLButtonElement>) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault()
      onSelect()
    }
  }

  return (
    <div
      ref={swipe.rowRef}
      className={cn(
        'relative overflow-hidden',
        showSeparator && 'emails-dashed-separator',
      )}
      style={
        {
          ['--emails-dash-inset' as string]: '3.5rem',
          touchAction:
            showActions && !selectionActive ? 'pan-y pinch-zoom' : 'auto',
        } as CSSProperties
      }
      {...swipe.handlers}
    >
      <div
        aria-hidden="true"
        className={cn(
          'pointer-events-none absolute inset-0 flex items-center',
          swipe.direction === 'archive'
            ? 'bg-primary text-primary-foreground justify-end'
            : 'bg-warning/20 text-foreground justify-start',
        )}
      >
        <div
          className="flex shrink-0 flex-col items-center gap-1 text-[10px] font-semibold leading-tight"
          style={{
            width: Math.max(
              MAIL_SWIPE_THRESHOLD,
              Math.min(88, Math.abs(swipe.offset)),
            ),
          }}
        >
          {swipe.direction === 'archive' ? (
            <Archive className="size-5" />
          ) : (
            <Clock className="size-5" />
          )}
          {swipe.direction === 'archive' ? 'Archive' : 'Snooze'}
        </div>
      </div>
      <div
        data-swiping={swipe.offset !== 0 || undefined}
        data-dragging={swipe.dragging || undefined}
        className={cn(
          'emails-swipe-surface bg-background group relative',
          swipe.dragging && 'select-none',
          '[--emails-row-hover:color-mix(in_oklch,var(--background)_90%,var(--muted))]',
          bulkSelected
            ? 'bg-[color-mix(in_oklch,var(--primary)_10%,var(--background))]'
            : selected
              ? 'bg-background shadow-[inset_2px_0_0_0_var(--primary)]'
              : 'hover:bg-[var(--emails-row-hover)]',
        )}
        style={
          {
            transform: `translate3d(${swipe.offset}px, 0, 0)`,
          } as CSSProperties
        }
      >
        {selectionEnabled ? (
          <button
            type="button"
            aria-label={`${bulkSelected ? 'Deselect' : 'Select'} ${message.subject || senderName(message.from)}`}
            aria-pressed={bulkSelected}
            onMouseEnter={() => setAvatarHovered(true)}
            onMouseLeave={() => setAvatarHovered(false)}
            onFocus={() => setAvatarHovered(true)}
            onBlur={() => setAvatarHovered(false)}
            onClick={(event) => {
              event.stopPropagation()
              onToggleSelected()
            }}
            className={cn(
              'absolute left-4 top-3 z-20 flex size-9 cursor-pointer items-center justify-center rounded-full transition-all',
              'focus-visible:ring-ring/60 focus-visible:outline-none focus-visible:ring-2',
              bulkSelected
                ? 'text-primary-foreground opacity-100'
                : 'text-muted-foreground opacity-0',
              (avatarHovered || selectionActive) &&
                !bulkSelected &&
                'opacity-100',
            )}
          >
            <span
              className={cn(
                'bg-background/95 flex size-5 items-center justify-center rounded-md border shadow-sm backdrop-blur',
                bulkSelected ? 'border-primary bg-primary' : 'border-border',
              )}
            >
              <Check className={cn('size-3.5', !bulkSelected && 'opacity-0')} />
            </span>
          </button>
        ) : null}
        <button
          type="button"
          onClick={onSelect}
          onKeyDown={handleKeyDown}
          className="focus-visible:ring-ring/60 grid w-full cursor-pointer grid-cols-[auto_1fr_auto] items-start gap-3 px-4 py-3 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset"
        >
          <div
            className={cn(
              'transition-opacity',
              selectionEnabled &&
                (bulkSelected || selectionActive) &&
                'opacity-0',
              selectionEnabled && avatarHovered && 'opacity-0',
            )}
          >
            <Avatar from={message.from} size="md" />
          </div>
          <div className="min-w-0 pt-0.5">
            <div className="flex items-center gap-2">
              {message.unread ? (
                <span className="emails-row-unread-dot size-1.5 shrink-0 rounded-full" />
              ) : null}
              <p
                className={cn(
                  'truncate text-[13.5px] leading-5',
                  message.unread
                    ? 'text-foreground font-semibold'
                    : 'text-foreground/95 font-medium',
                )}
              >
                {senderLabel}
              </p>
              {message.threadMessageCount && message.threadMessageCount > 1 ? (
                <span className="bg-muted text-muted-foreground rounded-full px-1.5 py-0.5 text-[10px] font-semibold leading-none">
                  {message.threadMessageCount}
                </span>
              ) : null}
            </div>
            <p
              className={cn(
                'mt-0.5 truncate text-[13.5px] leading-5',
                message.unread
                  ? 'text-foreground font-medium'
                  : 'text-foreground/80',
              )}
            >
              {message.subject || '(No subject)'}
            </p>
            {snippet ? (
              <p className="text-muted-foreground mt-1 line-clamp-1 text-xs leading-5">
                {snippet}
              </p>
            ) : null}
          </div>
          <div className="flex shrink-0 flex-col items-end gap-1 pt-1 transition-opacity group-hover:opacity-0">
            <span className="text-muted-foreground text-[11px] font-medium">
              {showSnoozedUntil
                ? formatSnoozedUntilTime(message)
                : formatMessageTime(message)}
            </span>
            {message.starred ? <span className="text-warning">★</span> : null}
            {showAccount && message.accountEmailAddress ? (
              <span className="text-muted-foreground/70 max-w-32 truncate text-[9.5px] font-medium">
                {message.accountEmailAddress}
              </span>
            ) : null}
          </div>
        </button>
        {showActions && !selectionActive ? (
          <MessageRowActions
            snoozeOpen={snoozeOpen}
            onSnoozeOpenChange={setSnoozeOpen}
            onReply={onReply}
            onArchive={onArchive}
            onUnsubscribeArchive={onUnsubscribeArchive}
            canUnsubscribe={Boolean(
              message.unsubscribe?.mailto ?? message.unsubscribe?.url,
            )}
            onSnooze={onSnooze}
            onUnsnooze={onUnsnooze}
            isSnoozed={message.labelIds.includes('SNOOZED')}
            onSpam={onSpam}
          />
        ) : null}
      </div>
    </div>
  )
}

function formatThreadParticipants(participants: string[]) {
  const visible = participants.slice(0, 3).join(', ')
  const hidden = participants.length - 3
  return hidden > 0 ? `${visible} +${hidden}` : visible
}

function MessageRowActions({
  snoozeOpen,
  onSnoozeOpenChange,
  onReply,
  onArchive,
  onUnsubscribeArchive,
  canUnsubscribe,
  onSnooze,
  onUnsnooze,
  isSnoozed,
  onSpam,
}: {
  onReply: () => void
  onArchive: () => void
  onUnsubscribeArchive: () => void
  canUnsubscribe: boolean
  snoozeOpen: boolean
  onSnoozeOpenChange: (open: boolean) => void
  onSnooze: (until: number) => void
  onUnsnooze: () => void
  isSnoozed: boolean
  onSpam: () => void
}) {
  return (
    <div
      data-mail-row-actions
      className={cn(
        'group-data-[swiping=true]:invisible',
        snoozeOpen && '!pointer-events-auto !opacity-100',
        'pointer-events-none absolute inset-y-0 right-0 z-10 flex items-center gap-0.5 pl-48 pr-3',
        'opacity-0 transition-opacity duration-150 group-hover:pointer-events-auto group-hover:opacity-100',
        'group-focus-within:pointer-events-auto group-focus-within:opacity-100',
        '[--emails-row-hover:color-mix(in_oklch,var(--background)_90%,var(--muted))]',
        'bg-[linear-gradient(to_left,var(--emails-row-hover)_0%,var(--emails-row-hover)_55%,color-mix(in_oklch,var(--emails-row-hover)_96%,transparent)_65%,color-mix(in_oklch,var(--emails-row-hover)_78%,transparent)_76%,color-mix(in_oklch,var(--emails-row-hover)_45%,transparent)_88%,color-mix(in_oklch,var(--emails-row-hover)_15%,transparent)_96%,transparent_100%)]',
      )}
      onClick={(event) => event.stopPropagation()}
    >
      <RowActionButton label="Reply" onClick={onReply} icon={CornerUpLeft} />
      <RowActionButton label="Archive" onClick={onArchive} icon={Archive} />
      <RowSnoozeButton
        open={snoozeOpen}
        onOpenChange={onSnoozeOpenChange}
        onSnooze={onSnooze}
        onUnsnooze={onUnsnooze}
        isSnoozed={isSnoozed}
      />
      {canUnsubscribe ? (
        <RowActionButton
          label="Unsubscribe and archive"
          onClick={onUnsubscribeArchive}
          icon={EyeOff}
        />
      ) : null}
      <RowActionButton label="Report spam" onClick={onSpam} icon={Ban} />
    </div>
  )
}

function RowSnoozeButton({
  open,
  onOpenChange,
  onSnooze,
  onUnsnooze,
  isSnoozed,
}: {
  onSnooze: (until: number) => void
  onUnsnooze: () => void
  isSnoozed: boolean
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const handleTriggerClick = (event: MouseEvent<HTMLButtonElement>) => {
    event.stopPropagation()
  }

  return (
    <SnoozeMenu
      open={open}
      onOpenChange={onOpenChange}
      onSnooze={onSnooze}
      onUnsnooze={onUnsnooze}
      isSnoozed={isSnoozed}
      trigger={
        <button
          type="button"
          aria-label="Snooze"
          onClick={handleTriggerClick}
          className={cn(
            'text-muted-foreground inline-flex size-8 cursor-pointer items-center justify-center rounded-full',
            'hover:bg-foreground/10 hover:text-foreground transition-colors',
            'focus-visible:ring-ring/60 focus-visible:outline-none focus-visible:ring-2',
          )}
        >
          <Clock className="size-[15px]" />
        </button>
      }
    />
  )
}

function RowActionButton({
  label,
  onClick,
  icon: Icon,
}: {
  label: string
  onClick: () => void
  icon: React.ComponentType<{ className?: string }>
}) {
  const handleClick = (event: MouseEvent<HTMLButtonElement>) => {
    event.stopPropagation()
    event.preventDefault()
    onClick()
  }

  const handleKeyDown = (event: KeyboardEvent<HTMLButtonElement>) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.stopPropagation()
    }
  }

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type="button"
          aria-label={label}
          onClick={handleClick}
          onKeyDown={handleKeyDown}
          className={cn(
            'text-muted-foreground inline-flex size-8 cursor-pointer items-center justify-center rounded-full',
            'hover:bg-foreground/10 hover:text-foreground transition-colors',
            'focus-visible:ring-ring/60 focus-visible:outline-none focus-visible:ring-2',
          )}
        >
          <Icon className="size-[15px]" />
        </button>
      </TooltipTrigger>
      <TooltipContent side="top">
        <p>{label}</p>
      </TooltipContent>
    </Tooltip>
  )
}

function InboxSkeleton({ showBriefing }: { showBriefing: boolean }) {
  return (
    <>
      {showBriefing ? (
        <div className="border-border/70 bg-muted/25 dark:bg-muted/15 rounded-2xl border px-5 pb-4 pt-4">
          <div className="flex items-center gap-2">
            <Skeleton className="bg-foreground/10 size-5 rounded-full" />
            <Skeleton className="bg-foreground/10 h-3 w-24" />
          </div>
          <div className="mt-3 space-y-2">
            <Skeleton className="bg-foreground/10 h-3 w-5/6" />
            <Skeleton className="bg-foreground/10 h-3 w-3/5" />
            <div className="mt-3 space-y-1.5">
              {[0, 1, 2].map((i) => (
                <Skeleton key={i} className="bg-foreground/5 h-3 w-full" />
              ))}
            </div>
          </div>
        </div>
      ) : null}
      <div className="space-y-2">
        <Skeleton className="bg-foreground/10 ml-4 h-3 w-20" />
        <div className="border-border/70 bg-muted/30 overflow-hidden rounded-2xl border">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="flex items-center gap-3 px-4 py-3">
              <Skeleton className="bg-foreground/10 size-9 rounded-full" />
              <div className="flex-1 space-y-1.5">
                <Skeleton className="bg-foreground/10 h-3 w-32" />
                <Skeleton className="bg-foreground/5 h-3 w-full" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </>
  )
}

export function Avatar({
  from,
  size,
}: {
  from: string
  size: 'sm' | 'md' | 'lg'
}) {
  const classes =
    size === 'sm'
      ? 'size-7 text-[10px]'
      : size === 'lg'
        ? 'size-11 text-sm'
        : 'size-9 text-[11px]'

  return (
    <span
      className={cn(
        'text-background relative inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full font-semibold',
        classes,
      )}
      style={{ backgroundColor: avatarBg(from) }}
    >
      <span className="relative z-10 select-none">{initials(from)}</span>
    </span>
  )
}

function avatarBg(from: string) {
  const source = from.toLowerCase()
  let hash = 0
  for (let i = 0; i < source.length; i += 1) {
    hash = (hash * 31 + source.charCodeAt(i)) >>> 0
  }
  const palette = [
    'oklch(0.7 0.12 30)',
    'oklch(0.72 0.12 85)',
    'oklch(0.68 0.11 150)',
    'oklch(0.68 0.1 200)',
    'oklch(0.7 0.13 250)',
    'oklch(0.72 0.13 310)',
    'oklch(0.73 0.13 345)',
  ]
  return palette[hash % palette.length]!
}
