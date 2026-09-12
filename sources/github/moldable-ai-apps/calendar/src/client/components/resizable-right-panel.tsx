import {
  type KeyboardEvent,
  type ReactNode,
  type PointerEvent as ReactPointerEvent,
  useEffect,
  useRef,
  useState,
} from 'react'
import { cn } from '@/lib/utils'

interface ResizableRightPanelProps {
  children: ReactNode
  width: number
  minWidth: number
  maxWidth: number
  onWidthChange: (width: number) => void
  onResizeEnd: (width: number) => void
  className?: string
  resizeLabel?: string
}

function clampWidth(width: number, minWidth: number, maxWidth: number) {
  return Math.min(maxWidth, Math.max(minWidth, width))
}

export function ResizableRightPanel({
  children,
  width,
  minWidth,
  maxWidth,
  onWidthChange,
  onResizeEnd,
  className,
  resizeLabel = 'Resize panel',
}: ResizableRightPanelProps) {
  const [resizing, setResizing] = useState(false)
  const resizeStartRef = useRef<{ x: number; width: number } | null>(null)
  const currentWidthRef = useRef(width)

  useEffect(() => {
    currentWidthRef.current = width
  }, [width])

  useEffect(() => {
    if (!resizing) return

    const previousCursor = document.body.style.cursor
    const previousUserSelect = document.body.style.userSelect
    document.body.style.cursor = 'col-resize'
    document.body.style.userSelect = 'none'

    const handlePointerMove = (event: PointerEvent) => {
      const start = resizeStartRef.current
      if (!start) return
      const nextWidth = clampWidth(
        start.width + start.x - event.clientX,
        minWidth,
        maxWidth,
      )
      currentWidthRef.current = nextWidth
      onWidthChange(nextWidth)
    }

    const stopResizing = () => {
      setResizing(false)
      resizeStartRef.current = null
      onResizeEnd(currentWidthRef.current)
    }

    document.addEventListener('pointermove', handlePointerMove)
    document.addEventListener('pointerup', stopResizing)
    document.addEventListener('pointercancel', stopResizing)

    return () => {
      document.body.style.cursor = previousCursor
      document.body.style.userSelect = previousUserSelect
      document.removeEventListener('pointermove', handlePointerMove)
      document.removeEventListener('pointerup', stopResizing)
      document.removeEventListener('pointercancel', stopResizing)
    }
  }, [maxWidth, minWidth, onResizeEnd, onWidthChange, resizing])

  const handlePointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (event.button !== 0) return
    event.preventDefault()
    resizeStartRef.current = { x: event.clientX, width }
    currentWidthRef.current = width
    setResizing(true)
  }

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return
    event.preventDefault()
    const direction = event.key === 'ArrowLeft' ? 1 : -1
    const nextWidth = clampWidth(width + direction * 16, minWidth, maxWidth)
    currentWidthRef.current = nextWidth
    onWidthChange(nextWidth)
    onResizeEnd(nextWidth)
  }

  return (
    <aside
      className={cn('relative shrink-0', className)}
      style={{ width, minWidth, maxWidth }}
    >
      <div
        role="separator"
        aria-label={resizeLabel}
        aria-orientation="vertical"
        aria-valuemin={minWidth}
        aria-valuemax={maxWidth}
        aria-valuenow={Math.round(width)}
        tabIndex={0}
        onPointerDown={handlePointerDown}
        onKeyDown={handleKeyDown}
        className="group absolute inset-y-0 -left-1 z-30 w-2 cursor-col-resize touch-none outline-none"
      >
        <span
          className={cn(
            'bg-border group-hover:bg-primary/60 group-focus-visible:bg-primary absolute inset-y-0 left-1/2 w-px transition-colors',
            resizing && 'bg-primary',
          )}
        />
      </div>
      {children}
    </aside>
  )
}
