import { useQuery } from '@tanstack/react-query'
import { Circle, CircleCheck } from 'lucide-react'
import { useState } from 'react'
import { callCardApp } from '../lib/chat-card-rpc'
import { useCardSurface } from '../lib/chat-card-surface'

interface TodoItem {
  id: string
  title: string
  completed: boolean
  priority: string
  dueDate: string | null
}
interface CardData {
  items: TodoItem[]
  missingCount: number
}
function DueDate({ value }: { value: string | null }) {
  if (!value) return null
  const date = new Date(value.length === 10 ? `${value}T12:00:00` : value)
  return Number.isNaN(date.getTime()) ? null : (
    <span>
      Due{' '}
      {date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
    </span>
  )
}

export function ChatCard() {
  const { contentRef, expanded, openQuickLook } = useCardSurface()
  const [error, setError] = useState<string>()
  const selection = new URLSearchParams(location.search).get('cardInput') ?? ''
  const query = useQuery({
    queryKey: ['chat-card', selection],
    queryFn: () => callCardApp<CardData>('todo', 'todo.cards.read'),
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
              {data.items.length > 1 && (
                <p className="text-muted-foreground mb-3 text-xs">
                  {data.items.filter((item) => item.completed).length} of{' '}
                  {data.items.length} complete
                </p>
              )}
              <ul className="space-y-3">
                {data.items.slice(0, 3).map((item) => (
                  <li key={item.id} className="flex items-start gap-2">
                    {item.completed ? (
                      <CircleCheck
                        aria-label="Complete"
                        className="text-primary size-4 shrink-0"
                      />
                    ) : (
                      <Circle
                        aria-label="Incomplete"
                        className="text-muted-foreground size-4 shrink-0"
                      />
                    )}
                    <div>
                      <p
                        className={`line-clamp-1 text-sm ${item.completed ? 'text-muted-foreground line-through' : ''}`}
                      >
                        {item.title}
                      </p>
                      {item.dueDate && (
                        <p className="text-muted-foreground mt-1 text-xs">
                          <DueDate value={item.dueDate} />
                        </p>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
              {data.items.length > 3 && (
                <p className="text-muted-foreground mt-3 text-xs">
                  +{data.items.length - 3} more
                </p>
              )}
              {data.items.length === 0 && (
                <p className="text-muted-foreground text-sm">
                  These todos are no longer available.
                </p>
              )}
            </button>
          </div>
          {expanded && (
            <article className="space-y-4 p-5">
              <h1 className="text-xl font-semibold">
                {data.items.length === 1 ? 'Todo' : 'Checklist'}
              </h1>
              <ul className="divide-border divide-y">
                {data.items.map((item) => (
                  <li key={item.id} className="flex items-start gap-3 py-4">
                    {item.completed ? (
                      <CircleCheck
                        aria-label="Complete"
                        className="text-primary size-5 shrink-0"
                      />
                    ) : (
                      <Circle
                        aria-label="Incomplete"
                        className="text-muted-foreground size-5 shrink-0"
                      />
                    )}
                    <div>
                      <p
                        className={
                          item.completed
                            ? 'text-muted-foreground line-through'
                            : ''
                        }
                      >
                        {item.title}
                      </p>
                      <p className="text-muted-foreground mt-1 text-xs capitalize">
                        {item.priority} priority{' '}
                        {item.dueDate && (
                          <>
                            {' '}
                            · <DueDate value={item.dueDate} />
                          </>
                        )}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
              {data.missingCount > 0 && (
                <p className="text-muted-foreground text-xs">
                  {data.missingCount} removed{' '}
                  {data.missingCount === 1 ? 'item' : 'items'}
                </p>
              )}
            </article>
          )}
        </>
      )}
    </div>
  )
}
