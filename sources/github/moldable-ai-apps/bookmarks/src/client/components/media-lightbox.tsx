import { ChevronLeft, ChevronRight } from 'lucide-react'
import { useEffect, useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogTitle,
  ToolbarIconButton,
  cn,
} from '@moldable-ai/ui'
import type { BookmarkMedia } from '../../shared/bookmarks'
import { ZoomableLightboxImage } from './zoomable-lightbox-image'

interface MediaLightboxProps {
  media: BookmarkMedia[]
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function MediaLightbox({
  media,
  open,
  onOpenChange,
}: MediaLightboxProps) {
  const [activeIndex, setActiveIndex] = useState(0)
  const visibleMedia = media.filter((item) => item.url ?? item.previewUrl)
  const activeMedia = visibleMedia[activeIndex]
  const src = activeMedia?.url ?? activeMedia?.previewUrl

  useEffect(() => {
    if (!open) setActiveIndex(0)
  }, [open])

  useEffect(() => {
    if (!open || visibleMedia.length < 2) return

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'ArrowLeft') {
        setActiveIndex((index) =>
          index === 0 ? visibleMedia.length - 1 : index - 1,
        )
      }
      if (event.key === 'ArrowRight') {
        setActiveIndex((index) => (index + 1) % visibleMedia.length)
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [open, visibleMedia.length])

  if (!src) return null

  const showNavigation = visibleMedia.length > 1

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="!bg-background/98 !fixed !inset-0 !left-0 !top-0 !h-dvh !w-dvw !max-w-none !translate-x-0 !translate-y-0 !rounded-none !border-0 !p-0 backdrop-blur-xl">
        <DialogTitle className="sr-only">Bookmark image</DialogTitle>

        <ZoomableLightboxImage
          key={`${activeIndex}:${src}`}
          src={src}
          alt={activeMedia.altText ?? ''}
        />

        {showNavigation ? (
          <>
            <ToolbarIconButton
              label="Previous image"
              className="bg-background/75 absolute left-4 top-1/2 -translate-y-1/2 cursor-pointer rounded-full shadow-sm backdrop-blur-md"
              onClick={() =>
                setActiveIndex((index) =>
                  index === 0 ? visibleMedia.length - 1 : index - 1,
                )
              }
            >
              <ChevronLeft />
            </ToolbarIconButton>
            <ToolbarIconButton
              label="Next image"
              className="bg-background/75 absolute right-4 top-1/2 -translate-y-1/2 cursor-pointer rounded-full shadow-sm backdrop-blur-md"
              onClick={() =>
                setActiveIndex((index) => (index + 1) % visibleMedia.length)
              }
            >
              <ChevronRight />
            </ToolbarIconButton>
            <span
              className={cn(
                'absolute bottom-4 left-1/2 -translate-x-1/2 rounded-full',
                'bg-background/75 px-2.5 py-1 text-[11px] tabular-nums shadow-sm backdrop-blur-md',
              )}
            >
              {activeIndex + 1} / {visibleMedia.length}
            </span>
          </>
        ) : null}
      </DialogContent>
    </Dialog>
  )
}
