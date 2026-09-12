import { useQuery } from '@tanstack/react-query'
import { CalendarDays, MapPin, Users } from 'lucide-react'
import { useState } from 'react'
import { callCardApp } from '../lib/chat-card-rpc'
import { useCardSurface } from '../lib/chat-card-surface'

interface CardData {
  id: string
  title: string
  startLabel: string
  endLabel: string
  locationLabel: string
  organizerName: string
  descriptionSections: { text: string }[]
  descriptionTruncationNotice: string
  attendeeSummary: string
  attendees: { email: string; displayName: string; responseLabel: string }[]
}
export function ChatCard() {
  const { contentRef, expanded, openQuickLook } = useCardSurface()
  const [error, setError] = useState<string>()
  const selection = new URLSearchParams(location.search).get('cardInput') ?? ''
  const query = useQuery({
    queryKey: ['chat-card', selection],
    queryFn: () => callCardApp<CardData>('calendar', 'calendar.events.get'),
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
                <CalendarDays className="text-primary mt-0.5 size-6 shrink-0" />
                <div className="min-w-0">
                  <h2 className="line-clamp-2 text-sm font-medium">
                    {data.title || 'Untitled event'}
                  </h2>
                  <p className="text-muted-foreground mt-1 text-xs">
                    {data.startLabel}
                  </p>
                </div>
              </div>
            </button>
          </div>
          {expanded && (
            <article className="space-y-5 p-5">
              <h1 className="text-xl font-semibold">
                {data.title || 'Untitled event'}
              </h1>
              <p>
                {data.startLabel}
                {data.endLabel && data.endLabel !== 'All day'
                  ? ` – ${data.endLabel}`
                  : ''}
              </p>
              {data.locationLabel && (
                <p className="flex items-start gap-2 text-sm">
                  <MapPin className="size-4 shrink-0" />
                  {data.locationLabel}
                </p>
              )}
              {data.descriptionSections.map((section, index) => (
                <p key={index} className="whitespace-pre-wrap text-sm">
                  {section.text}
                </p>
              ))}
              {data.descriptionTruncationNotice && (
                <p className="text-muted-foreground text-xs">
                  {data.descriptionTruncationNotice}
                </p>
              )}
              <section className="space-y-2">
                <h2 className="flex items-center gap-2 text-sm font-medium">
                  <Users className="size-4" /> Guests
                </h2>
                <p className="text-muted-foreground text-xs">
                  Organized by {data.organizerName}
                </p>
                <ul className="space-y-2">
                  {data.attendees.map((attendee, i) => (
                    <li
                      key={`${attendee.email}-${i}`}
                      className="flex justify-between gap-4 text-sm"
                    >
                      <span>{attendee.displayName}</span>
                      <span className="text-muted-foreground text-xs">
                        {attendee.responseLabel}
                      </span>
                    </li>
                  ))}
                </ul>
                {data.attendeeSummary && (
                  <p className="text-muted-foreground text-xs">
                    {data.attendeeSummary}
                  </p>
                )}
              </section>
            </article>
          )}
        </>
      )}
    </div>
  )
}
