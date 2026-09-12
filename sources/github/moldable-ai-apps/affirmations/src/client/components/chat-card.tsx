import { useQuery } from '@tanstack/react-query'
import { Leaf } from 'lucide-react'
import { useState } from 'react'
import { callCardApp } from '../lib/chat-card-rpc'
import { useCardSurface } from '../lib/chat-card-surface'

interface CardData {
  text: string
  categoryName: string
  accent: string
}
export function ChatCard() {
  const { contentRef, expanded, openQuickLook } = useCardSurface(360)
  const [error, setError] = useState<string>()
  const selection = new URLSearchParams(location.search).get('cardInput') ?? ''
  const query = useQuery({
    queryKey: ['chat-card', selection],
    queryFn: () =>
      callCardApp<CardData>('affirmations', 'affirmations.cards.read'),
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
              style={{
                background: `color-mix(in srgb, ${data.accent} 8%, transparent)`,
              }}
            >
              <Leaf
                className="mx-auto mb-4 size-5"
                style={{ color: data.accent }}
              />
              <blockquote className="line-clamp-4 text-center font-serif text-xl leading-relaxed">
                {data.text}
              </blockquote>
            </button>
          </div>
          {expanded && (
            <article
              className="flex min-h-72 flex-col items-center justify-center gap-6 p-8 text-center"
              style={{
                background: `color-mix(in srgb, ${data.accent} 8%, transparent)`,
              }}
            >
              <p className="text-muted-foreground text-xs">
                {data.categoryName}
              </p>
              <blockquote className="font-serif text-3xl leading-relaxed">
                {data.text}
              </blockquote>
            </article>
          )}
        </>
      )}
    </div>
  )
}
