import { useEffect } from 'react'
import { mailMessageKey } from '../lib/mail-identity'
import type {
  MailMessageDetail,
  MailMessageSummary,
  MessageAction,
} from '../types'

function hasOpenTransientSurface() {
  return Boolean(
    document.querySelector(
      [
        '[data-slot="alert-dialog-content"][data-state="open"]',
        '[data-slot="dialog-content"][data-state="open"]',
        '[data-slot="dropdown-menu-content"][data-state="open"]',
        '[data-slot="popover-content"][data-state="open"]',
        '[data-slot="select-content"][data-state="open"]',
      ].join(','),
    ),
  )
}

export function useMailKeyboard({
  disabled,
  messages,
  selectedMessageKey,
  selectedMessage,
  currentMessage,
  onSelect,
  onAction,
  onReply,
}: {
  disabled: boolean
  messages: MailMessageSummary[]
  selectedMessageKey: string | null
  selectedMessage?: MailMessageSummary
  currentMessage?: MailMessageDetail
  onSelect: (message: MailMessageSummary | null) => void
  onAction: (message: MailMessageSummary, action: MessageAction) => void
  onReply: (message: MailMessageDetail) => void
}) {
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (disabled) return

      const target = event.target as HTMLElement | null
      if (
        target?.tagName === 'INPUT' ||
        target?.tagName === 'TEXTAREA' ||
        target?.isContentEditable
      ) {
        return
      }

      if (event.metaKey || event.ctrlKey || event.altKey) return

      if (
        event.key === 'Escape' &&
        selectedMessageKey &&
        !hasOpenTransientSurface()
      ) {
        event.preventDefault()
        onSelect(null)
        return
      }

      const currentIndex = messages.findIndex(
        (message) => mailMessageKey(message) === selectedMessageKey,
      )
      const previousMessage =
        currentIndex > 0 ? messages[currentIndex - 1] : undefined
      const nextMessage =
        currentIndex >= 0 && currentIndex < messages.length - 1
          ? messages[currentIndex + 1]
          : undefined

      if (event.key === 'ArrowLeft' && selectedMessageKey) {
        event.preventDefault()
        if (previousMessage) onSelect(previousMessage)
      }

      if (event.key === 'ArrowRight' && selectedMessageKey) {
        event.preventDefault()
        if (nextMessage) onSelect(nextMessage)
      }

      if (event.key === 'e' && selectedMessage) {
        event.preventDefault()
        onAction(selectedMessage, 'archive')
      }

      if (event.key === 's' && selectedMessage) {
        event.preventDefault()
        onAction(selectedMessage, selectedMessage.starred ? 'unstar' : 'star')
      }

      if (event.key === 'u' && selectedMessage) {
        event.preventDefault()
        onAction(
          selectedMessage,
          selectedMessage.unread ? 'markRead' : 'markUnread',
        )
      }

      if (event.key === 'r' && currentMessage) {
        event.preventDefault()
        onReply(currentMessage)
      }
    }

    window.addEventListener('keydown', handleKeyDown, true)
    return () => window.removeEventListener('keydown', handleKeyDown, true)
  }, [
    currentMessage,
    disabled,
    messages,
    onAction,
    onReply,
    onSelect,
    selectedMessageKey,
    selectedMessage,
  ])
}
