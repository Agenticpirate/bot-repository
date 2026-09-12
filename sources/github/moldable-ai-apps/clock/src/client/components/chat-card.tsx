import { useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import { useEffect } from 'react'
import { formatDuration } from '../../lib/format'
import type { TimerView } from '../../lib/types'
import { callCardApp } from '../lib/chat-card-rpc'
import { useCardSurface } from '../lib/chat-card-surface'

type CardData = TimerView
function TimerFace({
  timer,
  receivedAt,
  large = false,
}: {
  timer: TimerView
  receivedAt: number
  large?: boolean
}) {
  const [now, setNow] = useState(Date.now)
  useEffect(() => {
    const tick = window.setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(tick)
  }, [])
  const remaining = Math.max(
    0,
    timer.currentRemainingMs -
      (timer.state === 'running' ? Math.max(0, now - receivedAt) : 0),
  )
  const ratio = Math.min(1, remaining / Math.max(1, timer.durationMs))
  return (
    <div
      className={`relative mx-auto flex items-center justify-center ${large ? 'size-64' : 'size-32'}`}
    >
      <svg
        viewBox="0 0 100 100"
        className="absolute inset-0 size-full -rotate-90"
        aria-hidden="true"
      >
        <circle
          cx="50"
          cy="50"
          r="46"
          fill="none"
          stroke="currentColor"
          strokeWidth="4"
          className="text-muted"
        />
        <circle
          cx="50"
          cy="50"
          r="46"
          fill="none"
          stroke="currentColor"
          strokeWidth="4"
          strokeLinecap="round"
          pathLength="1"
          strokeDasharray={`${ratio} 1`}
          className="text-primary"
        />
      </svg>
      <div className="text-center">
        <p
          className={`font-light tabular-nums ${large ? 'text-5xl' : 'text-2xl'}`}
        >
          {formatDuration(remaining)}
        </p>
        <p className="text-muted-foreground mt-1 text-xs capitalize">
          {remaining === 0 ? 'Finished' : timer.state}
        </p>
      </div>
    </div>
  )
}

export function ChatCard() {
  const { contentRef, expanded, openQuickLook } = useCardSurface(320)
  const [error, setError] = useState<string>()
  const selection = new URLSearchParams(location.search).get('cardInput') ?? ''
  const query = useQuery({
    queryKey: ['chat-card', selection],
    queryFn: () => callCardApp<CardData>('clock', 'clock.cards.read'),
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
              <TimerFace timer={data} receivedAt={query.dataUpdatedAt} />
              <p className="mt-3 truncate text-center text-sm font-medium">
                {data.label || 'Timer'}
              </p>
            </button>
          </div>
          {expanded && (
            <article className="space-y-6 p-6 text-center">
              <h1 className="text-xl font-semibold">{data.label || 'Timer'}</h1>
              <TimerFace timer={data} receivedAt={query.dataUpdatedAt} large />
              <p className="text-muted-foreground text-sm">
                {formatDuration(data.durationMs)} countdown
              </p>
            </article>
          )}
        </>
      )}
    </div>
  )
}
