import {
  type MouseEvent,
  type PointerEvent,
  useEffect,
  useEffectEvent,
  useRef,
  useState,
} from 'react'
import {
  type MailSwipeAxis,
  mailSwipeAction,
  mailSwipeAxis,
  mailSwipeOffset,
} from '../lib/mail-row-swipe'
import { attachMailRowTouchSwipe } from '../lib/mail-row-touch-swipe'

interface Gesture {
  pointerId: number
  x: number
  y: number
  axis: MailSwipeAxis
}

// App-specific row gesture; the actions and snooze menu remain owned by Mail.
export function useMailRowSwipe({
  enabled,
  onArchive,
  onSnooze,
}: {
  enabled: boolean
  onArchive: () => void
  onSnooze: () => void
}) {
  const rowRef = useRef<HTMLDivElement>(null)
  const [dragging, setDragging] = useState(false)
  const [direction, setDirection] = useState<'archive' | 'snooze'>('archive')
  const gesture = useRef<Gesture | null>(null)
  const suppressClickUntil = useRef(0)
  const [offset, setOffset] = useState(0)

  const touchEnabled = useEffectEvent(() => enabled)
  const archive = useEffectEvent(onArchive)
  const snooze = useEffectEvent(onSnooze)
  useEffect(() => {
    const row = rowRef.current
    if (!row) return
    return attachMailRowTouchSwipe(row, {
      enabled: touchEnabled,
      move: (offset, dragging) => {
        setOffset(offset)
        setDragging(dragging)
        if (offset !== 0) setDirection(offset < 0 ? 'archive' : 'snooze')
      },
      suppressClick: () => {
        suppressClickUntil.current = Date.now() + 500
      },
      archive,
      snooze,
    })
    // Effect Events read current props without reinstalling listeners mid-gesture.
    // This app's older hooks lint rule does not recognize useEffectEvent yet.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const reset = () => {
    gesture.current = null
    setOffset(0)
    setDragging(false)
  }

  return {
    rowRef,
    direction,
    dragging: enabled && dragging,
    offset: enabled ? offset : 0,
    handlers: {
      onPointerDown(event: PointerEvent<HTMLDivElement>) {
        if (event.pointerType === 'touch') {
          if (event.isPrimary) suppressClickUntil.current = 0
          return // Native non-passive touch listeners own touch, not pointer capture.
        }
        if (!event.isPrimary) {
          reset()
          return
        }
        suppressClickUntil.current = 0
        if (
          !enabled ||
          event.pointerType === 'mouse' ||
          event.button !== 0 ||
          (event.target instanceof Element &&
            event.target.closest('[data-mail-row-actions]'))
        )
          return
        gesture.current = {
          pointerId: event.pointerId,
          x: event.clientX,
          y: event.clientY,
          axis: 'pending',
        }
      },
      onPointerMove(event: PointerEvent<HTMLDivElement>) {
        const active = gesture.current
        if (!active || active.pointerId !== event.pointerId) return
        if (!enabled) {
          reset()
          return
        }
        const dx = event.clientX - active.x
        active.axis = mailSwipeAxis(active.axis, dx, event.clientY - active.y)
        if (active.axis !== 'horizontal') return
        // Capture only after horizontal intent, leaving taps and native scroll alone.
        if (!event.currentTarget.hasPointerCapture(event.pointerId)) {
          event.currentTarget.setPointerCapture(event.pointerId)
        }
        suppressClickUntil.current = Date.now() + 500
        setDragging(true)
        if (dx !== 0) setDirection(dx < 0 ? 'archive' : 'snooze')
        setOffset(mailSwipeOffset(dx))
      },
      onPointerUp(event: PointerEvent<HTMLDivElement>) {
        const active = gesture.current
        if (!active || active.pointerId !== event.pointerId) return
        const action = enabled
          ? mailSwipeAction(active.axis, event.clientX - active.x)
          : null
        if (active.axis === 'horizontal')
          suppressClickUntil.current = Date.now() + 500
        reset()
        if (action === 'archive') onArchive()
        if (action === 'snooze') onSnooze()
      },
      onPointerCancel(event: PointerEvent<HTMLDivElement>) {
        if (event.pointerType !== 'touch') reset()
      },
      onLostPointerCapture(event: PointerEvent<HTMLDivElement>) {
        // Touch implicitly captures the child button first. Its bubbled loss
        // when we transfer capture to the row must not cancel our own swipe.
        if (
          event.pointerType !== 'touch' &&
          event.target === event.currentTarget
        )
          reset()
      },
      onClickCapture(event: MouseEvent<HTMLDivElement>) {
        // Suppress only the compatibility click from a swipe, not keyboard use.
        if (event.detail !== 0 && Date.now() < suppressClickUntil.current) {
          event.preventDefault()
          event.stopPropagation()
        }
      },
    },
  }
}
