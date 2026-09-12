import { useQuery } from '@tanstack/react-query'
import { FileText } from 'lucide-react'
import { useState } from 'react'
import { Markdown } from '@moldable-ai/ui'
import { callCardApp } from '../lib/chat-card-rpc'
import { useCardSurface } from '../lib/chat-card-surface'
import type { WikiFile } from '../../shared/types'

type CardData = WikiFile & { truncated: boolean }
export function ChatCard() {
  const { contentRef, expanded, openQuickLook } = useCardSurface()
  const [error, setError] = useState<string>()
  const selection = new URLSearchParams(location.search).get('cardInput') ?? ''
  const query = useQuery({
    queryKey: ['chat-card', selection],
    queryFn: () => callCardApp<CardData>('wiki', 'wiki.cards.read'),
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
              <div className="flex items-center gap-2">
                <FileText className="text-muted-foreground size-4 shrink-0" />
                <h2 className="truncate text-sm font-medium">{data.title}</h2>
              </div>
              <p className="text-muted-foreground mt-2 line-clamp-3 text-sm">
                {data.content.slice(0, 500).replace(/[#*_`>]/g, '')}
              </p>
            </button>
          </div>
          {expanded && (
            <article className="space-y-4 p-5">
              <h1 className="text-xl font-semibold">{data.title}</h1>
              {data.properties.length > 0 && (
                <dl className="text-muted-foreground space-y-1 text-xs">
                  {data.properties.map((property) => (
                    <div key={property.key} className="flex gap-2">
                      <dt>{property.key}</dt>
                      <dd>{property.value}</dd>
                    </div>
                  ))}
                </dl>
              )}
              <Markdown markdown={data.content} />
              {data.truncated && (
                <p className="text-muted-foreground text-xs">
                  This long document continues in Wiki.
                </p>
              )}
            </article>
          )}
        </>
      )}
    </div>
  )
}
