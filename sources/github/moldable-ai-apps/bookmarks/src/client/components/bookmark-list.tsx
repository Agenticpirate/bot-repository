import {
  Bookmark,
  ExternalLink,
  ImageIcon,
  RefreshCcw,
  SearchX,
} from 'lucide-react'
import { useState } from 'react'
import { Button, Skeleton, sendToMoldable } from '@moldable-ai/ui'
import type { BookmarkRecord } from '../../shared/bookmarks'
import { MediaLightbox } from './media-lightbox'

interface BookmarkListProps {
  items: BookmarkRecord[]
  loading: boolean
  query: string
  refreshing: boolean
  coolingDown: boolean
  syncProgress?: string
  onRefresh: () => void
}

export function BookmarkList({
  items,
  loading,
  query,
  refreshing,
  coolingDown,
  syncProgress,
  onRefresh,
}: BookmarkListProps) {
  if (loading) {
    return (
      <div
        className="mx-auto grid w-full max-w-2xl gap-1"
        aria-label="Loading bookmarks"
      >
        {Array.from({ length: 6 }, (_, index) => (
          <div key={index} className="bg-muted/20 rounded-xl px-3 py-3 pr-4">
            <div className="flex items-start gap-3">
              <Skeleton className="size-10 rounded-full" />
              <div className="min-w-0 flex-1">
                <Skeleton className="h-3.5 w-36" />
                <Skeleton className="mt-2.5 h-3.5 w-full" />
                <Skeleton className="mt-2 h-3.5 w-3/4" />
              </div>
            </div>
          </div>
        ))}
      </div>
    )
  }

  if (items.length === 0) {
    return (
      <div className="flex min-h-[55vh] flex-col items-center justify-center px-6 text-center">
        {query ? (
          <SearchX className="text-muted-foreground mb-4 size-6" />
        ) : (
          <Bookmark className="text-muted-foreground mb-4 size-6" />
        )}
        <p className="text-[13px] font-medium">
          {query
            ? 'No matching bookmarks'
            : refreshing
              ? 'Syncing bookmarks'
              : 'No bookmarks yet'}
        </p>
        <p className="text-muted-foreground mt-1 max-w-sm text-xs leading-5">
          {query
            ? 'Try a different search.'
            : refreshing
              ? (syncProgress ?? 'Starting…')
              : 'Refresh to pull in your saved posts from X.'}
        </p>
        {!query && !refreshing && !coolingDown ? (
          <Button
            type="button"
            variant="outline"
            className="mt-5 cursor-pointer shadow-none"
            disabled={refreshing}
            onClick={onRefresh}
          >
            <RefreshCcw
              className={refreshing ? 'size-4 animate-spin' : 'size-4'}
            />
            Refresh
          </Button>
        ) : null}
      </div>
    )
  }

  return (
    <ol className="mx-auto grid w-full max-w-2xl gap-1">
      {items.map((bookmark) => (
        <li key={bookmark.id}>
          <article className="bg-muted/20 hover:bg-muted/45 rounded-xl px-3 py-3 pr-4 transition-colors">
            <div className="flex items-start gap-3">
              <AuthorAvatar bookmark={bookmark} />
              <div className="min-w-0 flex-1">
                <div className="flex min-w-0 items-center gap-1.5 text-[13px]">
                  <span className="truncate font-semibold">
                    {bookmark.authorName ??
                      bookmark.authorHandle ??
                      'Unknown author'}
                  </span>
                  {bookmark.authorHandle ? (
                    <span className="text-muted-foreground min-w-0 truncate text-[12px]">
                      @{bookmark.authorHandle}
                    </span>
                  ) : null}
                  <span className="text-muted-foreground ml-auto shrink-0 text-[11px]">
                    {relativeDate(bookmark.postedAt)}
                  </span>
                  <button
                    type="button"
                    className="text-muted-foreground hover:bg-muted hover:text-foreground -mr-1 flex size-6 shrink-0 cursor-pointer items-center justify-center rounded-md transition-colors"
                    aria-label="Open bookmark on X"
                    title="Open on X"
                    onClick={() =>
                      sendToMoldable({
                        type: 'moldable:open-url',
                        url: bookmark.url,
                      })
                    }
                  >
                    <ExternalLink className="size-3" />
                  </button>
                </div>

                <p className="line-clamp-8 mt-1 whitespace-pre-line text-[14px] leading-[1.35rem]">
                  {compactText(bookmark.text)}
                </p>

                {bookmark.quotedPost ? (
                  <blockquote className="border-border/70 bg-background/35 mt-3 rounded-lg border p-3">
                    {bookmark.quotedPost.authorHandle ? (
                      <p className="text-foreground text-[12px] font-medium">
                        @{bookmark.quotedPost.authorHandle}
                      </p>
                    ) : null}
                    <p className="text-muted-foreground mt-0.5 whitespace-pre-line text-[13px] leading-5">
                      {compactText(bookmark.quotedPost.text)}
                    </p>
                  </blockquote>
                ) : null}

                <MediaPreview bookmark={bookmark} />

                {bookmark.folderNames.length ? (
                  <div className="mt-2 flex flex-wrap gap-1">
                    {bookmark.folderNames.map((folder) => (
                      <span
                        key={folder}
                        className="bg-muted/60 text-muted-foreground rounded-full px-2 py-0.5 text-[11px]"
                      >
                        {folder}
                      </span>
                    ))}
                  </div>
                ) : null}
              </div>
            </div>
          </article>
        </li>
      ))}
    </ol>
  )
}

function AuthorAvatar({ bookmark }: { bookmark: BookmarkRecord }) {
  if (bookmark.authorProfileImageUrl) {
    return (
      <img
        src={bookmark.authorProfileImageUrl}
        alt=""
        referrerPolicy="no-referrer"
        className="bg-muted size-10 shrink-0 rounded-full object-cover"
      />
    )
  }

  return (
    <div className="bg-muted text-muted-foreground flex size-10 shrink-0 items-center justify-center rounded-full text-xs font-semibold">
      {(bookmark.authorName ?? bookmark.authorHandle ?? 'X').slice(0, 1)}
    </div>
  )
}

function MediaPreview({ bookmark }: { bookmark: BookmarkRecord }) {
  const [lightboxOpen, setLightboxOpen] = useState(false)
  const media = bookmark.media.find((item) => item.previewUrl ?? item.url)
  const src = media?.previewUrl ?? media?.url
  if (!src) return null

  return (
    <>
      <button
        type="button"
        className="bg-muted relative mt-3 block aspect-[16/9] max-h-72 w-full max-w-[34rem] cursor-zoom-in overflow-hidden rounded-lg"
        aria-label="View bookmark media"
        onClick={() => setLightboxOpen(true)}
      >
        <img
          src={src}
          alt={media?.altText ?? ''}
          referrerPolicy="no-referrer"
          className="size-full object-cover transition-transform duration-200 hover:scale-[1.02]"
        />
        {bookmark.media.length > 1 ? (
          <span className="bg-background/80 text-foreground absolute bottom-2 right-2 flex items-center gap-1 rounded-full px-2 py-1 text-[11px] shadow-sm backdrop-blur-sm">
            <ImageIcon className="size-3" /> {bookmark.media.length}
          </span>
        ) : null}
      </button>
      <MediaLightbox
        media={bookmark.media}
        open={lightboxOpen}
        onOpenChange={setLightboxOpen}
      />
    </>
  )
}

function relativeDate(value?: string | null): string {
  if (!value) return ''
  const time = Date.parse(value)
  if (!Number.isFinite(time)) return ''
  const days = Math.floor((Date.now() - time) / 86_400_000)
  if (days < 1) return 'Today'
  if (days < 7) return `${days}d`
  return new Intl.DateTimeFormat(undefined, {
    month: 'short',
    day: 'numeric',
  }).format(time)
}

function compactText(value: string): string {
  return value.replace(/\n\s*\n+/g, '\n').trim()
}
