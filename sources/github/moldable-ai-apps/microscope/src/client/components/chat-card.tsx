import { useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import { callCardApp } from '../lib/chat-card-rpc'
import { useCardSurface } from '../lib/chat-card-surface'
import type { Exploration } from '../../shared/types'
import { SceneViewer } from './scene-viewer'

export function ChatCard() {
  const { contentRef, expanded, openQuickLook } = useCardSurface()
  const [error, setError] = useState<string>()
  const input = new URLSearchParams(location.search).get('cardInput')
  const preview = useQuery({
    queryKey: ['chat-microscope', input],
    queryFn: () =>
      callCardApp<Exploration>('microscope', 'microscope.cards.read'),
    refetchInterval: 30_000,
  })
  const detail = useQuery({
    queryKey: ['chat-microscope', input, 'detail'],
    queryFn: () =>
      callCardApp<Exploration>('microscope', 'microscope.cards.read', {
        detail: true,
      }),
    enabled: expanded,
    refetchInterval: expanded ? 30_000 : false,
  })
  const entry = preview.data
  const full = detail.data
  return (
    <div ref={contentRef} className="bg-background">
      {preview.isPending && (
        <p role="status" className="text-muted-foreground p-4 text-sm">
          Loading exploration…
        </p>
      )}
      {(error || preview.error || (expanded && detail.error)) && (
        <p role="alert" className="text-destructive p-4 text-sm">
          {error || preview.error?.message || detail.error?.message}
        </p>
      )}
      {entry && (
        <>
          <div
            hidden={expanded}
            className="border-border relative overflow-hidden rounded-xl border"
          >
            <div inert className="h-52">
              {entry.source === 'generated' && entry.imageUrl ? (
                <img
                  src={entry.imageUrl}
                  alt=""
                  className="size-full object-contain"
                />
              ) : (
                !expanded && (
                  <SceneViewer
                    exploration={entry}
                    autoRotate={false}
                    viewMode="3d"
                    enableControls={false}
                  />
                )
              )}
            </div>
            <div className="p-3">
              <h2 className="truncate text-sm font-medium">{entry.title}</h2>
              <p className="text-muted-foreground line-clamp-1 text-xs">
                {entry.subtitle}
              </p>
            </div>
            <button
              type="button"
              aria-label={`Explore ${entry.title}`}
              className="focus-visible:outline-ring absolute inset-0 cursor-pointer rounded-xl focus-visible:outline-2"
              onClick={() => {
                setError(undefined)
                void openQuickLook(entry.id).catch((error) =>
                  setError(String(error)),
                )
              }}
            />
          </div>
          {expanded && (
            <article className="space-y-4 p-4">
              <h1 className="text-lg font-semibold">{entry.title}</h1>
              {detail.isPending && (
                <p role="status" className="text-muted-foreground text-sm">
                  Loading model…
                </p>
              )}
              {full && (
                <>
                  <div className="border-border h-[55vh] min-h-72 overflow-hidden rounded-xl border">
                    <SceneViewer
                      exploration={full}
                      autoRotate={false}
                      viewMode={
                        full.source === 'generated' && !full.modelUrl
                          ? '2d'
                          : '3d'
                      }
                    />
                  </div>
                  <p className="text-sm leading-relaxed">{full.description}</p>
                  <ul className="text-muted-foreground space-y-2 text-sm">
                    {full.observations.map((observation, index) => (
                      <li key={index}>{observation}</li>
                    ))}
                  </ul>
                  <dl className="divide-border divide-y">
                    {full.details.map((detail, index) => (
                      <div
                        key={index}
                        className="flex justify-between gap-4 py-2 text-sm"
                      >
                        <dt className="text-muted-foreground">
                          {detail.label}
                        </dt>
                        <dd>{detail.value}</dd>
                      </div>
                    ))}
                  </dl>
                </>
              )}
            </article>
          )}
        </>
      )}
    </div>
  )
}
