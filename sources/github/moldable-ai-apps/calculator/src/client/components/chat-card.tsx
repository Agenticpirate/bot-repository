import { useQuery } from '@tanstack/react-query'
import { Equal } from 'lucide-react'
import { useState } from 'react'
import { callCardApp } from '../lib/chat-card-rpc'
import { useCardSurface } from '../lib/chat-card-surface'

interface CardData {
  expression: string
  value: number
  formatted: string
  angleMode: 'deg' | 'rad'
}
export function ChatCard() {
  const { contentRef, expanded, openQuickLook } = useCardSurface(360)
  const [error, setError] = useState<string>()
  const selection = new URLSearchParams(location.search).get('cardInput') ?? ''
  const query = useQuery({
    queryKey: ['chat-card', selection],
    queryFn: () => callCardApp<CardData>('calculator', 'calculator.cards.read'),
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
              <p className="text-muted-foreground truncate font-mono text-sm">
                {data.expression}
              </p>
              <div className="mt-3 flex items-center gap-3">
                <Equal className="text-muted-foreground size-5 shrink-0" />
                <p className="overflow-x-auto font-mono text-3xl font-light">
                  {data.formatted}
                </p>
              </div>
            </button>
          </div>
          {expanded && (
            <article className="space-y-5 p-5">
              <h1 className="text-xl font-semibold">Calculation</h1>
              <dl className="space-y-5">
                <div>
                  <dt className="text-muted-foreground mb-2 text-xs">
                    Expression
                  </dt>
                  <dd className="break-words font-mono">{data.expression}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground mb-2 text-xs">Result</dt>
                  <dd className="break-words font-mono text-4xl">
                    {data.formatted}
                  </dd>
                </div>
                <div>
                  <dt className="text-muted-foreground mb-2 text-xs">Angles</dt>
                  <dd>{data.angleMode === 'deg' ? 'Degrees' : 'Radians'}</dd>
                </div>
              </dl>
            </article>
          )}
        </>
      )}
    </div>
  )
}
