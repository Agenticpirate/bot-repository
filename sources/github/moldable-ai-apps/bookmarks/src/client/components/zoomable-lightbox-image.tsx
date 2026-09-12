import { useRef, useState } from 'react'
import type { PointerEvent, WheelEvent } from 'react'
import { cn } from '@moldable-ai/ui'

interface ZoomableLightboxImageProps {
  src: string
  alt: string
  className?: string
}

interface ViewTransform {
  scale: number
  x: number
  y: number
}

const MIN_SCALE = 1
const MAX_SCALE = 6

export function ZoomableLightboxImage({
  src,
  alt,
  className,
}: ZoomableLightboxImageProps) {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const dragRef = useRef<{ pointerId: number; x: number; y: number } | null>(
    null,
  )
  const [view, setView] = useState<ViewTransform>({ scale: 1, x: 0, y: 0 })
  const [dragging, setDragging] = useState(false)

  const zoomAt = (nextScale: number, clientX: number, clientY: number) => {
    const bounds = containerRef.current?.getBoundingClientRect()
    if (!bounds) return

    setView((current) => {
      const scale = clamp(nextScale, MIN_SCALE, MAX_SCALE)
      if (scale === MIN_SCALE) return { scale, x: 0, y: 0 }

      const ratio = scale / current.scale
      const pointX = clientX - (bounds.left + bounds.width / 2)
      const pointY = clientY - (bounds.top + bounds.height / 2)

      return {
        scale,
        x: pointX - (pointX - current.x) * ratio,
        y: pointY - (pointY - current.y) * ratio,
      }
    })
  }

  const handleWheel = (event: WheelEvent<HTMLDivElement>) => {
    event.preventDefault()

    const isPinch = event.ctrlKey || event.metaKey
    if (!isPinch && view.scale > MIN_SCALE) {
      setView((current) => ({
        ...current,
        x: current.x - event.deltaX,
        y: current.y - event.deltaY,
      }))
      return
    }

    const sensitivity = isPinch ? 0.012 : 0.0035
    const nextScale = view.scale * Math.exp(-event.deltaY * sensitivity)
    zoomAt(nextScale, event.clientX, event.clientY)
  }

  const handlePointerDown = (event: PointerEvent<HTMLDivElement>) => {
    if (view.scale <= MIN_SCALE) return
    event.currentTarget.setPointerCapture(event.pointerId)
    dragRef.current = {
      pointerId: event.pointerId,
      x: event.clientX,
      y: event.clientY,
    }
    setDragging(true)
  }

  const handlePointerMove = (event: PointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current
    if (!drag || drag.pointerId !== event.pointerId) return

    const deltaX = event.clientX - drag.x
    const deltaY = event.clientY - drag.y
    dragRef.current = { ...drag, x: event.clientX, y: event.clientY }
    setView((current) => ({
      ...current,
      x: current.x + deltaX,
      y: current.y + deltaY,
    }))
  }

  const finishDrag = (event: PointerEvent<HTMLDivElement>) => {
    if (dragRef.current?.pointerId !== event.pointerId) return
    dragRef.current = null
    setDragging(false)
  }

  return (
    <div
      ref={containerRef}
      className={cn(
        'flex size-full touch-none items-center justify-center overflow-hidden',
        view.scale > MIN_SCALE
          ? dragging
            ? 'cursor-grabbing'
            : 'cursor-grab'
          : 'cursor-zoom-in',
        className,
      )}
      onWheel={handleWheel}
      onDoubleClick={(event) =>
        zoomAt(
          view.scale > MIN_SCALE ? MIN_SCALE : 2.5,
          event.clientX,
          event.clientY,
        )
      }
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={finishDrag}
      onPointerCancel={finishDrag}
    >
      <img
        src={src}
        alt={alt}
        referrerPolicy="no-referrer"
        draggable="false"
        className="max-h-full max-w-full select-none object-contain will-change-transform"
        style={{
          transform: `translate3d(${view.x}px, ${view.y}px, 0) scale(${view.scale})`,
          transition: dragging ? 'none' : 'transform 120ms ease-out',
        }}
      />
    </div>
  )
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value))
}
