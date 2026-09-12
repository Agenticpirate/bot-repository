import { useQuery } from '@tanstack/react-query'
import { Timer } from 'lucide-react'
import { useState } from 'react'
import { useEffect } from 'react'
import type { TimerState } from '../../lib/types'
import { formatDuration, formatDurationHuman } from '../../lib/types'
import { callCardApp } from '../lib/chat-card-rpc'
import { useCardSurface } from '../lib/chat-card-surface'

type CardData =
  | {
      view: 'timer'
      timer: TimerState
      projectName: string
      elapsedSeconds: number
    }
  | {
      view: 'summary'
      totalSeconds: number
      entries: number
      byProject: { projectId: string; projectName: string; seconds: number }[]
      startDate?: string
      endDate?: string
      truncated: boolean
    }
function ElapsedTime({
  data,
  receivedAt,
}: {
  data: Extract<CardData, { view: 'timer' }>
  receivedAt: number
}) {
  const [now, setNow] = useState(Date.now)
  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(timer)
  }, [])
  return (
    <span>
      {formatDuration(
        data.elapsedSeconds +
          (data.timer.isRunning
            ? Math.max(0, Math.floor((now - receivedAt) / 1000))
            : 0),
      )}
    </span>
  )
}

export function ChatCard() {
  const { contentRef, expanded, openQuickLook } = useCardSurface()
  const [error, setError] = useState<string>()
  const selection = new URLSearchParams(location.search).get('cardInput') ?? ''
  const query = useQuery({
    queryKey: ['chat-card', selection],
    queryFn: () =>
      callCardApp<CardData>('time-tracker', 'time-tracker.cards.read'),
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
                <Timer className="text-primary size-6 shrink-0" />
                <div>
                  <p className="text-muted-foreground text-xs">
                    {data.view === 'timer'
                      ? data.timer.isRunning
                        ? data.projectName
                        : 'Timer stopped'
                      : 'Time tracked'}
                  </p>
                  <p className="my-2 text-3xl font-light tabular-nums">
                    {data.view === 'timer' ? (
                      <ElapsedTime
                        data={data}
                        receivedAt={query.dataUpdatedAt}
                      />
                    ) : (
                      formatDurationHuman(data.totalSeconds)
                    )}
                  </p>
                  <p className="text-muted-foreground line-clamp-1 text-xs">
                    {data.view === 'timer'
                      ? data.timer.description
                      : [data.startDate, data.endDate]
                          .filter(Boolean)
                          .join(' – ') ||
                        `${data.truncated ? 'Up to ' : ''}${data.entries} sessions`}
                  </p>
                </div>
              </div>
            </button>
          </div>
          {expanded && (
            <article className="space-y-5 p-5">
              {data.view === 'timer' ? (
                <>
                  <h1 className="text-xl font-semibold">{data.projectName}</h1>
                  <p className="text-5xl font-light tabular-nums">
                    <ElapsedTime data={data} receivedAt={query.dataUpdatedAt} />
                  </p>
                  <p>{data.timer.description}</p>
                  <p className="text-muted-foreground text-sm">
                    {data.timer.isRunning && data.timer.startTime
                      ? `Started ${new Date(data.timer.startTime).toLocaleString()}`
                      : 'The timer is stopped.'}
                  </p>
                </>
              ) : (
                <>
                  <div>
                    <h1 className="text-xl font-semibold">Time tracked</h1>
                    <p className="mt-2 text-4xl font-light">
                      {formatDurationHuman(data.totalSeconds)}
                    </p>
                    <p className="text-muted-foreground mt-1 text-xs">
                      {data.entries} sessions
                      {data.startDate && ` · From ${data.startDate}`}
                      {data.endDate && ` through ${data.endDate}`}
                    </p>
                  </div>
                  <ul className="space-y-4">
                    {data.byProject.map((project) => (
                      <li key={project.projectId}>
                        <div className="mb-2 flex justify-between gap-3 text-sm">
                          <span>{project.projectName}</span>
                          <span>{formatDurationHuman(project.seconds)}</span>
                        </div>
                        <progress
                          aria-label={`Time on ${project.projectName}`}
                          value={project.seconds}
                          max={Math.max(1, data.totalSeconds)}
                          className="accent-primary h-2 w-full"
                        />
                      </li>
                    ))}
                  </ul>
                  {data.truncated && (
                    <p className="text-muted-foreground text-xs">
                      Showing up to 500 recent sessions and 40 projects. Choose
                      a narrower date range for a complete breakdown.
                    </p>
                  )}
                </>
              )}
            </article>
          )}
        </>
      )}
    </div>
  )
}
