import { useQuery } from '@tanstack/react-query'
import { Circle, CircleCheck, CircleDot } from 'lucide-react'
import { useState } from 'react'
import { Markdown } from '@moldable-ai/ui'
import { callCardApp } from '../lib/chat-card-rpc'
import { useCardSurface } from '../lib/chat-card-surface'
import type { Task } from '../../shared/types'

type CardData = Task & { truncated: boolean }
const statusLabel = (status: Task['status']) => status.replaceAll('_', ' ')

export function ChatCard() {
  const { contentRef, expanded, openQuickLook } = useCardSurface()
  const [error, setError] = useState<string>()
  const selection = new URLSearchParams(location.search).get('cardInput') ?? ''
  const query = useQuery({
    queryKey: ['chat-card', selection],
    queryFn: () => callCardApp<CardData>('tasks', 'tasks.cards.read'),
    refetchInterval: 30_000,
  })
  const data = query.data
  const open = () => {
    setError(undefined)
    void openQuickLook().catch((error) => setError(String(error)))
  }
  return (
    <div ref={contentRef} className="bg-background">
      {query.isPending && (
        <p role="status" className="text-muted-foreground p-4 text-sm">
          Loading…
        </p>
      )}
      {(error || query.error) && (
        <p role="alert" className="text-destructive p-4 text-sm">
          {error || query.error?.message}
        </p>
      )}
      {data && (
        <>
          <div hidden={expanded}>
            <button
              type="button"
              className="border-border hover:bg-muted/40 focus-visible:outline-ring w-full cursor-pointer rounded-xl border p-4 text-left focus-visible:outline-2"
              onClick={open}
            >
              <div className="flex items-start gap-3">
                {data.status === 'completed' || data.status === 'closed' ? (
                  <CircleCheck className="text-primary size-5 shrink-0" />
                ) : data.status === 'in_progress' ? (
                  <CircleDot className="text-primary size-5 shrink-0" />
                ) : (
                  <Circle className="text-muted-foreground size-5 shrink-0" />
                )}
                <div>
                  <h2 className="line-clamp-2 text-sm font-medium">
                    {data.title}
                  </h2>
                  <p className="text-muted-foreground mt-1 text-xs capitalize">
                    {statusLabel(data.status)}
                  </p>
                </div>
              </div>
            </button>
          </div>
          {expanded && (
            <article className="space-y-5 p-5">
              <div>
                <p className="text-muted-foreground mb-1 text-xs capitalize">
                  {statusLabel(data.status)}
                  {data.priority !== 'none'
                    ? ` · ${data.priority} priority`
                    : ''}
                </p>
                <h1 className="text-xl font-semibold">{data.title}</h1>
              </div>
              {data.description && <Markdown markdown={data.description} />}
              {data.acceptanceCriteria && (
                <section className="space-y-2">
                  <h2 className="text-sm font-semibold">Acceptance criteria</h2>
                  <Markdown markdown={data.acceptanceCriteria} />
                </section>
              )}
              {data.labels.length > 0 && (
                <p className="text-muted-foreground text-xs">
                  {data.labels.map((label) => label.name).join(' · ')}
                </p>
              )}
              {data.comments.length > 0 && (
                <section className="space-y-3">
                  <h2 className="text-sm font-semibold">Recent comments</h2>
                  {data.comments.map((comment) => (
                    <div
                      key={comment.id}
                      className="border-border rounded-lg border p-3"
                    >
                      <p className="text-muted-foreground mb-2 text-xs">
                        {comment.authorName} ·{' '}
                        {new Date(comment.createdAt).toLocaleDateString()}
                      </p>
                      <Markdown markdown={comment.content} proseSize="xs" />
                    </div>
                  ))}
                </section>
              )}
              {data.attachments.length > 0 && (
                <section>
                  <h2 className="mb-2 text-sm font-semibold">Attachments</h2>
                  <ul className="text-muted-foreground space-y-1 text-sm">
                    {data.attachments.map((attachment) => (
                      <li key={attachment.id}>{attachment.name}</li>
                    ))}
                  </ul>
                </section>
              )}
              {data.truncated && (
                <p className="text-muted-foreground text-xs">
                  This long task continues in Tasks.
                </p>
              )}
            </article>
          )}
        </>
      )}
    </div>
  )
}
