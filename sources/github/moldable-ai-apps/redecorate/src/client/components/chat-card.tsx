import { useQuery } from '@tanstack/react-query'
import { ImageIcon } from 'lucide-react'
import { useState } from 'react'
import { callCardApp } from '../lib/chat-card-rpc'
import { useCardSurface } from '../lib/chat-card-surface'

interface ImageItem {
  id: string
  title: string
  status: string
  imageUrl: string | null
  variants: {
    id: string
    imageUrl: string
    prompt: string
    createdAt: string
  }[]
  truncated: boolean
}
interface CardData {
  items: ImageItem[]
  missingCount: number
}
export function ChatCard() {
  const { contentRef, expanded, openQuickLook } = useCardSurface()
  const [selectedId, setSelectedId] = useState<string>()
  const [error, setError] = useState<string>()
  const input = new URLSearchParams(location.search).get('cardInput') ?? ''
  const preview = useQuery({
    queryKey: ['chat-images', input],
    queryFn: () => callCardApp<CardData>('redecorate', 'redecorate.cards.read'),
    refetchInterval: 30_000,
  })
  const detail = useQuery({
    queryKey: ['chat-image-detail', input, selectedId],
    queryFn: () =>
      callCardApp<CardData>('redecorate', 'redecorate.cards.read', {
        detailId: selectedId,
      }),
    enabled: expanded && Boolean(selectedId),
    refetchInterval: 30_000,
  })
  const selected = detail.data?.items.find((item) => item.id === selectedId)
  const open = (id: string) => {
    setError(undefined)
    setSelectedId(id)
    void openQuickLook(id).catch((error) => setError(String(error)))
  }
  return (
    <div ref={contentRef} className="bg-background">
      {(error || preview.error || detail.error) && (
        <p role="alert" className="text-destructive p-4 text-sm">
          {error || preview.error?.message || detail.error?.message}
        </p>
      )}
      {preview.isPending && (
        <p role="status" className="text-muted-foreground p-4 text-sm">
          Loading images…
        </p>
      )}
      <div hidden={expanded}>
        <div className="flex snap-x snap-proximity gap-3 overflow-x-auto p-2">
          {preview.data?.items.map((item) => (
            <button
              type="button"
              key={item.id}
              className="border-border focus-visible:outline-ring w-52 shrink-0 cursor-pointer snap-start overflow-hidden rounded-xl border text-left focus-visible:outline-2"
              onClick={() => open(item.id)}
            >
              {item.imageUrl ? (
                <img
                  src={item.imageUrl}
                  alt={item.title}
                  loading="lazy"
                  className="bg-muted aspect-square w-full object-cover"
                />
              ) : (
                <div className="bg-muted text-muted-foreground flex aspect-square items-center justify-center">
                  <ImageIcon className="size-8" />
                </div>
              )}
              <p className="truncate p-3 text-xs font-medium">
                {item.title}
                {item.status !== 'ready' ? ` · ${item.status}` : ''}
              </p>
            </button>
          ))}
        </div>
        {preview.data?.items.length === 0 && (
          <p className="text-muted-foreground p-4 text-sm">
            These images are no longer available.
          </p>
        )}
      </div>
      {expanded &&
        (detail.isPending ? (
          <p role="status" className="text-muted-foreground p-5 text-sm">
            Loading image…
          </p>
        ) : selected ? (
          <article className="space-y-4 p-4">
            <h1 className="text-xl font-semibold">{selected.title}</h1>
            {selected.imageUrl && (
              <img
                src={selected.imageUrl}
                alt={selected.title}
                className="max-h-[65vh] w-full rounded-xl object-contain"
              />
            )}
            {selected.variants.length > 1 && (
              <section className="space-y-3">
                <h2 className="text-sm font-semibold">Variants</h2>
                <div className="flex snap-x snap-mandatory gap-4 overflow-x-auto pb-2">
                  {selected.variants.map((variant) => (
                    <figure
                      key={variant.id}
                      className="w-full shrink-0 snap-center"
                    >
                      <img
                        src={variant.imageUrl}
                        alt={variant.prompt || selected.title}
                        loading="lazy"
                        className="max-h-[55vh] w-full rounded-lg object-contain"
                      />
                      <figcaption className="text-muted-foreground mt-2 text-xs">
                        {variant.prompt}
                      </figcaption>
                    </figure>
                  ))}
                </div>
              </section>
            )}
            {selected.truncated && (
              <p className="text-muted-foreground text-xs">
                Showing the latest 12 variants.
              </p>
            )}
            {!selected.imageUrl && (
              <p className="text-muted-foreground text-sm">
                {selected.status === 'generating'
                  ? 'The image is still generating.'
                  : 'No image is available.'}
              </p>
            )}
          </article>
        ) : (
          !detail.error && (
            <p className="text-muted-foreground p-5 text-sm">
              This image is no longer available.
            </p>
          )
        ))}
    </div>
  )
}
