import { useQuery } from '@tanstack/react-query'
import { Paperclip } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { callCardApp } from '../lib/chat-card-rpc'
import { useCardSurface } from '../lib/chat-card-surface'
import { cleanSnippet, senderName } from '../lib/mail-format'
import { HtmlEmailFrame } from './html-email-frame'

type CardMessage = {
  id: string
  threadId: string
  from: string
  to: string
  subject: string
  date: string
  snippet: string
  unread: boolean
  cc?: string
  bodyHtml?: string
  bodyText?: string
  truncated?: boolean
  attachments?: Array<{ filename: string; mimeType: string; size: number }>
}
type MessageResult = {
  messages: CardMessage[]
  totalMessages?: number
  threadTruncated?: boolean
}
export function ChatMessages() {
  const [selectedId, setSelectedId] = useState<string>()
  const [error, setError] = useState<string>()
  const opening = useRef(false)
  const selection = new URLSearchParams(location.search).get('cardInput') ?? ''
  const messages = useQuery({
    queryKey: ['chat-message-card', selection],
    queryFn: () =>
      callCardApp<MessageResult>('mail', 'mail.cards.messages.read'),
    refetchInterval: 30_000,
  })
  const singleMessage = messages.data?.messages.length === 1
  const { contentRef, expanded, openQuickLook } = useCardSurface(
    singleMessage ? 288 : 480,
  )
  const detail = useQuery({
    queryKey: ['chat-message-detail', selection, selectedId],
    queryFn: () =>
      callCardApp<MessageResult>('mail', 'mail.cards.messages.read', {
        detailId: selectedId,
      }),
    enabled: expanded && !!selectedId,
  })
  useEffect(() => {
    if (!expanded) opening.current = false
  }, [expanded])
  const selected =
    detail.data?.messages.find((message) => message.id === selectedId) ??
    messages.data?.messages.find((message) => message.id === selectedId)
  const open = async (id: string) => {
    if (opening.current) return
    opening.current = true
    setError(undefined)
    setSelectedId(id)
    try {
      await openQuickLook(id)
    } catch (error) {
      setError(String(error))
    } finally {
      opening.current = false
    }
  }
  return (
    <div ref={contentRef} className="bg-transparent">
      <div hidden={expanded}>
        {messages.isPending ? (
          <p className="text-muted-foreground p-4 text-sm" role="status">
            Loading emails…
          </p>
        ) : (
          <div
            role="region"
            aria-label="Emails. Scroll for more."
            tabIndex={0}
            className={`flex snap-x snap-proximity gap-3 overflow-x-auto overscroll-x-contain ${singleMessage ? '' : 'pb-2'}`}
          >
            {messages.data?.messages.map((message) => (
              <button
                key={message.id}
                type="button"
                onClick={() => {
                  void open(message.id)
                }}
                className="bg-card border-border hover:bg-muted/40 focus-visible:outline-ring w-72 max-w-full shrink-0 cursor-pointer snap-start rounded-xl border p-4 text-left focus-visible:outline-2"
              >
                <div className="flex items-center justify-between gap-3">
                  <p className="truncate text-xs font-medium">
                    {senderName(message.from)}
                  </p>
                  <time className="text-muted-foreground shrink-0 text-xs">
                    {Number.isFinite(Date.parse(message.date))
                      ? new Date(message.date).toLocaleDateString(undefined, {
                          month: 'short',
                          day: 'numeric',
                        })
                      : ''}
                  </time>
                </div>
                <p className="mt-2 line-clamp-2 text-sm font-medium">
                  {message.subject || '(No subject)'}
                </p>
                <p className="text-muted-foreground mt-1 line-clamp-2 text-sm">
                  {cleanSnippet(message.snippet)}
                </p>
              </button>
            ))}
          </div>
        )}
      </div>
      {(error || messages.error) && (
        <p role="alert" className="text-destructive p-3 text-sm">
          {error || messages.error?.message}
        </p>
      )}
      {expanded && (
        <article className="space-y-5 p-5">
          {selected && (
            <>
              <header>
                <h1 className="text-xl font-semibold">
                  {selected.subject || '(No subject)'}
                </h1>
                <p className="mt-3 text-sm">{selected.from}</p>
                <p className="text-muted-foreground mt-1 break-words text-xs">
                  To {selected.to}
                </p>
              </header>
              {(detail.data?.messages ?? [selected]).map((message) => (
                <section
                  key={message.id}
                  className="border-border space-y-3 border-t pt-4"
                >
                  <div>
                    <p className="text-sm font-medium">{message.from}</p>
                    <p className="text-muted-foreground text-xs">
                      {message.date}
                    </p>
                  </div>
                  {message.bodyHtml ? (
                    <HtmlEmailFrame html={message.bodyHtml} />
                  ) : (
                    <p className="whitespace-pre-wrap break-words text-sm leading-relaxed">
                      {message.bodyText ?? message.snippet}
                    </p>
                  )}
                  {!!message.attachments?.length && (
                    <div className="space-y-2">
                      {message.attachments.map((file, index) => (
                        <p
                          key={index}
                          className="text-muted-foreground flex items-center gap-2 text-xs"
                        >
                          <Paperclip className="size-3.5" />
                          {file.filename}
                        </p>
                      ))}
                    </div>
                  )}
                  {message.truncated && (
                    <p className="text-muted-foreground text-xs">
                      This is a preview of a large email. The complete message
                      is available in Mail.
                    </p>
                  )}
                </section>
              ))}
              {detail.data?.threadTruncated && (
                <p className="text-muted-foreground text-xs">
                  Showing the latest 30 of {detail.data.totalMessages} messages.
                  Open Mail for the full thread.
                </p>
              )}
            </>
          )}
          {detail.isFetching && (
            <p role="status" className="text-muted-foreground text-xs">
              Loading email…
            </p>
          )}
          {detail.error && (
            <p role="alert" className="text-destructive text-sm">
              {detail.error.message}
            </p>
          )}
        </article>
      )}
    </div>
  )
}
