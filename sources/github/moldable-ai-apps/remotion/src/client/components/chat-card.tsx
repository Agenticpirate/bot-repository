import { useQuery } from '@tanstack/react-query'
import { Film } from 'lucide-react'
import { Suspense, lazy, useState } from 'react'
import type { Project } from '../../lib/types'
import { callCardApp } from '../lib/chat-card-rpc'
import { useCardSurface } from '../lib/chat-card-surface'

const RemotionPlayer = lazy(() =>
  import('../../components/remotion-player').then((module) => ({
    default: module.RemotionPlayer,
  })),
)
export function ChatCard() {
  const { contentRef, expanded, openQuickLook } = useCardSurface()
  const [error, setError] = useState<string>()
  const input = new URLSearchParams(location.search).get('cardInput')
  const preview = useQuery({
    queryKey: ['chat-video', input],
    queryFn: () => callCardApp<Project>('remotion', 'remotion.cards.read'),
    refetchInterval: 30_000,
  })
  const detail = useQuery({
    queryKey: ['chat-video', input, 'detail'],
    queryFn: () =>
      callCardApp<Project>('remotion', 'remotion.cards.read', { detail: true }),
    enabled: expanded,
  })
  const project = preview.data
  return (
    <div ref={contentRef} className="bg-background">
      {preview.isPending && (
        <p role="status" className="text-muted-foreground p-4 text-sm">
          Loading video…
        </p>
      )}
      {(error || preview.error || (expanded && detail.error)) && (
        <p role="alert" className="text-destructive p-4 text-sm">
          {error || preview.error?.message || detail.error?.message}
        </p>
      )}
      {project && (
        <>
          <div hidden={expanded}>
            <button
              type="button"
              className="border-border focus-visible:outline-ring w-full cursor-pointer overflow-hidden rounded-xl border text-left focus-visible:outline-2"
              onClick={() => {
                setError(undefined)
                void openQuickLook(project.id).catch((error) =>
                  setError(String(error)),
                )
              }}
            >
              <div className="bg-muted flex aspect-video items-center justify-center">
                {project.thumbnail ? (
                  <img
                    src={project.thumbnail}
                    alt=""
                    className="size-full object-contain"
                  />
                ) : (
                  <Film className="text-muted-foreground size-12" />
                )}
              </div>
              <div className="p-3">
                <h2 className="truncate text-sm font-medium">{project.name}</h2>
                <p className="text-muted-foreground text-xs">
                  {Math.round(project.durationInFrames / project.fps)} seconds
                </p>
              </div>
            </button>
          </div>
          {expanded && (
            <article className="space-y-4 p-4">
              <h1 className="text-lg font-semibold">{project.name}</h1>
              {detail.isPending && (
                <p role="status" className="text-muted-foreground text-sm">
                  Loading composition…
                </p>
              )}
              {detail.data && (
                <Suspense fallback={<p role="status">Loading player…</p>}>
                  <RemotionPlayer
                    code={detail.data.compositionCode}
                    width={detail.data.width}
                    height={detail.data.height}
                    fps={detail.data.fps}
                    durationInFrames={detail.data.durationInFrames}
                  />
                </Suspense>
              )}
              <p className="text-muted-foreground text-sm">
                {detail.data?.description ?? project.description}
              </p>
            </article>
          )}
        </>
      )}
    </div>
  )
}
