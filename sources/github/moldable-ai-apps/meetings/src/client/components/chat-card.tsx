import { useQuery } from '@tanstack/react-query'
import { Mic } from 'lucide-react'
import { useState } from 'react'
import { Markdown } from '@moldable-ai/ui'
import { callCardApp } from '../lib/chat-card-rpc'
import { useCardSurface } from '../lib/chat-card-surface'
import { SessionAudioPlayer } from '../../components/session-audio-player'

interface CardData {
  id: string
  title: string
  createdAt: string
  durationLabel: string
  summary: string
  notes?: string
  transcript: string
  truncated: boolean
  sessions: { id: string; startedAt: string }[]
}
export function ChatCard() {
  const { contentRef, expanded, openQuickLook } = useCardSurface()
  const [error, setError] = useState<string>()
  const selection = new URLSearchParams(location.search).get('cardInput') ?? ''
  const query = useQuery({
    queryKey: ['chat-card', selection, expanded],
    queryFn: () =>
      callCardApp<CardData>('meetings', 'meetings.cards.read', {
        detail: expanded,
      }),
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
                <Mic className="text-primary size-5 shrink-0" />
                <div>
                  <h2 className="line-clamp-2 text-sm font-medium">
                    {data.title || 'Untitled meeting'}
                  </h2>
                  <p className="text-muted-foreground mt-1 text-xs">
                    {new Date(data.createdAt).toLocaleDateString()} ·{' '}
                    {data.durationLabel}
                  </p>
                  <p className="text-muted-foreground mt-2 line-clamp-3 text-sm">
                    {data.summary.replace(/[#*_`>]/g, '') || 'No summary yet'}
                  </p>
                </div>
              </div>
            </button>
          </div>
          {expanded && (
            <article className="space-y-5 p-5">
              <h1 className="text-xl font-semibold">
                {data.title || 'Untitled meeting'}
              </h1>
              <p className="text-muted-foreground text-xs">
                {new Date(data.createdAt).toLocaleString()} ·{' '}
                {data.durationLabel}
              </p>
              {data.summary && (
                <section className="space-y-3">
                  <h2 className="text-sm font-semibold">Summary</h2>
                  <Markdown markdown={data.summary} />
                </section>
              )}
              {data.notes && data.notes !== data.summary && (
                <section className="space-y-3">
                  <h2 className="text-sm font-semibold">Notes</h2>
                  <Markdown markdown={data.notes} />
                </section>
              )}
              {data.sessions.length > 0 && (
                <section className="space-y-3">
                  <h2 className="text-sm font-semibold">Recordings</h2>
                  {data.sessions.map((session, index) => (
                    <div
                      key={session.id}
                      className="flex items-center gap-3 text-sm"
                    >
                      <SessionAudioPlayer
                        meetingId={data.id}
                        sessionId={session.id}
                      />{' '}
                      <span>Recording {index + 1}</span>
                    </div>
                  ))}
                </section>
              )}
              <section className="space-y-3">
                <h2 className="text-sm font-semibold">Transcript</h2>
                <p className="whitespace-pre-wrap text-sm">
                  {data.transcript ||
                    'No transcript was captured for this meeting.'}
                </p>
              </section>
              {data.truncated && (
                <p className="text-muted-foreground text-xs">
                  This long meeting continues in Meetings.
                </p>
              )}
            </article>
          )}
        </>
      )}
    </div>
  )
}
