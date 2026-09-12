import { useQuery } from '@tanstack/react-query'
import { BookOpen } from 'lucide-react'
import { useState } from 'react'
import { callCardApp } from '../lib/chat-card-rpc'
import { useCardSurface } from '../lib/chat-card-surface'

interface CardData {
  id: string
  title: string
  author: string | null
  chapterTitle: string
  coverUrl: string | null
  text: string
  chapterIndex: number
  chapterCount: number
  percent: number
  truncated: boolean
}
export function ChatCard() {
  const { contentRef, expanded, openQuickLook } = useCardSurface()
  const [error, setError] = useState<string>()
  const selection = new URLSearchParams(location.search).get('cardInput') ?? ''
  const query = useQuery({
    queryKey: ['chat-card', selection],
    queryFn: () => callCardApp<CardData>('reader', 'reader.cards.read'),
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
              <div className="flex items-start gap-4">
                {data.coverUrl ? (
                  <img
                    src={data.coverUrl}
                    alt=""
                    className="h-28 w-20 shrink-0 rounded object-cover shadow-sm"
                  />
                ) : (
                  <div className="bg-muted flex h-28 w-20 shrink-0 items-center justify-center rounded">
                    <BookOpen className="text-muted-foreground size-7" />
                  </div>
                )}
                <div className="min-w-0">
                  <h2 className="line-clamp-2 text-sm font-semibold">
                    {data.title}
                  </h2>
                  <p className="text-muted-foreground mt-1 text-xs">
                    {data.author}
                  </p>
                  <p className="text-muted-foreground mt-3 text-xs">
                    {Math.round(data.percent * 100)}% read · Chapter{' '}
                    {data.chapterIndex + 1}
                  </p>
                  <p className="text-muted-foreground mt-2 line-clamp-2 font-serif text-sm">
                    {data.text.slice(0, 200)}
                  </p>
                </div>
              </div>
            </button>
          </div>
          {expanded && (
            <article className="mx-auto max-w-prose space-y-5 p-6">
              <p className="text-muted-foreground text-xs">
                {data.title} · Chapter {data.chapterIndex + 1} of{' '}
                {data.chapterCount}
              </p>
              <h1 className="font-serif text-2xl">{data.chapterTitle}</h1>
              <div className="space-y-4 font-serif text-lg leading-relaxed">
                {data.text.split(/\n\s*\n/).map((paragraph, index) => (
                  <p key={index} className="whitespace-pre-line">
                    {paragraph}
                  </p>
                ))}
              </div>
              {data.truncated && (
                <p className="text-muted-foreground text-xs">
                  This chapter continues in Reader.
                </p>
              )}
            </article>
          )}
        </>
      )}
    </div>
  )
}
