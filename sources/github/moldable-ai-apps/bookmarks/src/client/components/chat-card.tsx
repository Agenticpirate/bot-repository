import { useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import { callCardApp } from '../lib/chat-card-rpc'
import { useCardSurface } from '../lib/chat-card-surface'
import type { BookmarkRecord } from '../../shared/bookmarks'

type CardData = Pick<
  BookmarkRecord,
  | 'id'
  | 'text'
  | 'authorName'
  | 'authorHandle'
  | 'authorProfileImageUrl'
  | 'postedAt'
  | 'media'
  | 'quotedPost'
> & { truncated: boolean }
export function ChatCard() {
  const { contentRef, expanded, openQuickLook } = useCardSurface()
  const [error, setError] = useState<string>()
  const selection = new URLSearchParams(location.search).get('cardInput') ?? ''
  const query = useQuery({
    queryKey: ['chat-card', selection],
    queryFn: () => callCardApp<CardData>('bookmarks', 'bookmarks.cards.read'),
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
                {data.authorProfileImageUrl && (
                  <img
                    src={data.authorProfileImageUrl}
                    alt=""
                    className="size-7 rounded-full"
                  />
                )}
                <p className="truncate text-sm font-medium">
                  {data.authorName || data.authorHandle || 'Saved post'}
                </p>
              </div>
              <p className="text-muted-foreground mt-3 line-clamp-3 whitespace-pre-line text-sm">
                {data.text}
              </p>
              {data.media[0] &&
                (data.media[0].previewUrl ||
                  (data.media[0].type === 'photo'
                    ? data.media[0].url
                    : undefined)) && (
                  <img
                    src={
                      data.media[0].previewUrl ||
                      (data.media[0].type === 'photo'
                        ? data.media[0].url
                        : undefined)
                    }
                    alt={data.media[0].altText || ''}
                    loading="lazy"
                    className="mt-3 max-h-40 w-full rounded-lg object-cover"
                  />
                )}
            </button>
          </div>
          {expanded && (
            <article className="space-y-5 p-5">
              <div className="flex items-center gap-3">
                {data.authorProfileImageUrl && (
                  <img
                    src={data.authorProfileImageUrl}
                    alt=""
                    className="size-10 rounded-full"
                  />
                )}
                <div>
                  <h1 className="text-lg font-semibold">
                    {data.authorName || data.authorHandle || 'Saved post'}
                  </h1>
                  <p className="text-muted-foreground text-xs">
                    {data.authorHandle && `@${data.authorHandle}`}
                    {data.postedAt &&
                      ` · ${new Date(data.postedAt).toLocaleDateString()}`}
                  </p>
                </div>
              </div>
              <p className="whitespace-pre-wrap text-sm leading-relaxed">
                {data.text}
              </p>
              {data.quotedPost && (
                <blockquote className="border-border border-l-2 pl-4">
                  <p className="text-muted-foreground mb-2 text-xs">
                    {data.quotedPost.authorName || data.quotedPost.authorHandle}
                  </p>
                  <p className="whitespace-pre-wrap text-sm">
                    {data.quotedPost.text}
                  </p>
                </blockquote>
              )}
              <div className="space-y-4">
                {data.media.map((media, index) => (
                  <figure key={media.key || index}>
                    {(media.type === 'video' ||
                      media.type === 'animated_gif') &&
                    media.url ? (
                      <video
                        controls
                        preload="none"
                        src={media.url}
                        poster={media.previewUrl}
                        className="max-h-[60vh] w-full rounded-xl"
                      />
                    ) : (
                      (media.url || media.previewUrl) && (
                        <img
                          src={media.url || media.previewUrl}
                          alt={media.altText || 'Saved media'}
                          loading="lazy"
                          className="max-h-[60vh] w-full rounded-xl object-contain"
                        />
                      )
                    )}
                    {media.altText && (
                      <figcaption className="text-muted-foreground mt-2 text-xs">
                        {media.altText}
                      </figcaption>
                    )}
                  </figure>
                ))}
              </div>
              {data.truncated && (
                <p className="text-muted-foreground text-xs">
                  This long post continues in Bookmarks.
                </p>
              )}
            </article>
          )}
        </>
      )}
    </div>
  )
}
