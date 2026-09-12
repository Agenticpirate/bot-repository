import { useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import { callCardApp } from '../lib/chat-card-rpc'
import { useCardSurface } from '../lib/chat-card-surface'
import { useWorkspace } from '../lib/moldable-ui'
import { PageFrame } from './page-frame'
import { SlideFrame } from './slide-frame'

interface PresentationCard {
  id: string
  title: string
  subtitle?: string
  kind: 'deck' | 'page'
  updatedAt: string
  totalSlides: number
  slides: { id: string; index: number; name: string; notes?: string }[]
}
export function ChatCard() {
  const { contentRef, expanded, openQuickLook } = useCardSurface()
  const { workspaceId } = useWorkspace()
  const [selected, setSelected] = useState<string>()
  const [error, setError] = useState<string>()
  const input = new URLSearchParams(location.search).get('cardInput')
  const query = useQuery({
    queryKey: ['chat-presentation', input],
    queryFn: () =>
      callCardApp<PresentationCard>('artifacts', 'artifacts.cards.read', {
        detail: false,
      }),
    refetchInterval: 30_000,
  })
  const detail = useQuery({
    queryKey: ['chat-presentation', input, 'detail'],
    queryFn: () =>
      callCardApp<PresentationCard>('artifacts', 'artifacts.cards.read', {
        detail: true,
      }),
    enabled: expanded,
    refetchInterval: expanded ? 30_000 : false,
  })
  const item = expanded ? (detail.data ?? query.data) : query.data
  const index = Math.max(
    0,
    item?.slides.findIndex((slide) => slide.id === selected) ?? 0,
  )
  const slide = item?.slides[index]
  const open = async (id?: string) => {
    if (!item) return
    setError(undefined)
    try {
      await openQuickLook(id ?? item.id)
      if (id) setSelected(id)
    } catch (error) {
      setError(String(error))
    }
  }
  return (
    <div ref={contentRef} className="bg-background">
      {query.isPending && (
        <p role="status" className="text-muted-foreground p-4 text-sm">
          Loading preview…
        </p>
      )}
      {(error || query.error || (expanded && detail.error)) && (
        <p role="alert" className="text-destructive p-4 text-sm">
          {error || query.error?.message || detail.error?.message}
        </p>
      )}
      {item && (
        <>
          <div
            hidden={expanded}
            className="border-border relative overflow-hidden rounded-xl border"
          >
            <div inert className="aspect-video">
              {item.kind === 'page' ? (
                <PageFrame
                  workspaceId={workspaceId ?? undefined}
                  artifactId={item.id}
                  version={item.updatedAt}
                  thumb
                  className="size-full"
                  title={item.title}
                />
              ) : (
                <SlideFrame
                  workspaceId={workspaceId ?? undefined}
                  deckId={item.id}
                  version={item.updatedAt}
                  active={item.slides[0]?.index ?? 0}
                  thumb
                  className="size-full"
                  title={item.title}
                />
              )}
            </div>
            <div className="p-3">
              <h2 className="truncate text-sm font-medium">{item.title}</h2>
              <p className="text-muted-foreground text-xs">
                {item.kind === 'deck'
                  ? `${item.totalSlides} slides`
                  : item.subtitle || 'Interactive page'}
              </p>
            </div>
            <button
              type="button"
              aria-label={`Open ${item.title}`}
              className="focus-visible:outline-ring absolute inset-0 cursor-pointer rounded-xl focus-visible:outline-2"
              onClick={() => void open(item.slides[0]?.id)}
            />
          </div>
          {detail.data && (
            <article hidden={!expanded} className="space-y-4 p-4">
              <h1 className="text-lg font-semibold">{item.title}</h1>
              {item.kind === 'page' ? (
                <PageFrame
                  workspaceId={workspaceId ?? undefined}
                  artifactId={item.id}
                  version={item.updatedAt}
                  className="border-border h-[70vh] w-full rounded-lg border"
                  title={item.title}
                />
              ) : (
                <div className="border-border aspect-video overflow-hidden rounded-lg border">
                  <SlideFrame
                    workspaceId={workspaceId ?? undefined}
                    deckId={item.id}
                    version={item.updatedAt}
                    active={slide?.index ?? 0}
                    thumb
                    className="size-full"
                    title={slide?.name ?? item.title}
                  />
                </div>
              )}
              {item.kind === 'deck' && (
                <>
                  <div className="flex items-center justify-between gap-3">
                    <button
                      type="button"
                      className="border-border cursor-pointer rounded-lg border px-3 py-2 text-sm disabled:cursor-default disabled:opacity-40"
                      disabled={index === 0}
                      onClick={() => void open(item.slides[index - 1]?.id)}
                    >
                      Previous
                    </button>
                    <p className="text-sm tabular-nums">
                      {index + 1} / {item.slides.length}
                    </p>
                    <button
                      type="button"
                      className="border-border cursor-pointer rounded-lg border px-3 py-2 text-sm disabled:cursor-default disabled:opacity-40"
                      disabled={index >= item.slides.length - 1}
                      onClick={() => void open(item.slides[index + 1]?.id)}
                    >
                      Next
                    </button>
                  </div>
                  <h2 className="font-medium">{slide?.name}</h2>
                  {slide?.notes && (
                    <p className="text-muted-foreground whitespace-pre-wrap text-sm">
                      {slide.notes}
                    </p>
                  )}
                  {item.totalSlides > item.slides.length && (
                    <p className="text-muted-foreground text-xs">
                      This preview includes {item.slides.length} slides. The
                      full presentation continues in Artifacts.
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
