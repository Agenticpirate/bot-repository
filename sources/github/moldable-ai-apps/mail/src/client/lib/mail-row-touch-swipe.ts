import {
  MAIL_NAVIGATION_EDGE_WIDTH,
  type MailSwipeAxis,
  mailSwipeAction,
  mailSwipeOffset,
} from './mail-row-swipe'

/** Own horizontal touch movement before WebKit's native scroller cancels the
 * pointer stream. React's delegated touchmove is passive, so bind on the row. */
export function attachMailRowTouchSwipe(
  row: HTMLElement,
  callbacks: {
    enabled: () => boolean
    move: (offset: number, dragging: boolean) => void
    suppressClick: () => void
    archive: () => void
    snooze: () => void
  },
) {
  let active: { id: number; x: number; y: number; axis: MailSwipeAxis } | null =
    null
  const reset = () => {
    active = null
    callbacks.move(0, false)
  }
  const start = (event: TouchEvent) => {
    if (event.touches.length !== 1) {
      reset()
      return
    }
    if (
      !callbacks.enabled() ||
      (event.target instanceof Element &&
        event.target.closest('[data-mail-row-actions]'))
    )
      return
    const touch = event.touches[0]!
    // Leave the leading screen edge to the host's interactive back gesture.
    if (touch.clientX < MAIL_NAVIGATION_EDGE_WIDTH) {
      active = null
      return
    }
    active = {
      id: touch.identifier,
      x: touch.clientX,
      y: touch.clientY,
      axis: 'pending',
    }
  }
  const move = (event: TouchEvent) => {
    if (!active) return
    if (!callbacks.enabled() || event.touches.length !== 1) {
      reset()
      return
    }
    const touch = Array.from(event.touches).find(
      (touch) => touch.identifier === active?.id,
    )
    if (!touch) return
    const dx = touch.clientX - active.x
    const dy = touch.clientY - active.y
    // WebKit can commit to native scrolling after the first uncancelled move.
    // Decide ownership immediately; the action still needs its full distance.
    // Keep a vertical start native, and retain either lock through later drift.
    if (active.axis === 'pending') {
      active.axis = Math.abs(dx) > Math.abs(dy) ? 'horizontal' : 'vertical'
    }
    if (active.axis !== 'horizontal') return
    // Once native scrolling has won, don't turn the remaining motion into an action.
    if (!event.cancelable) {
      reset()
      return
    }
    event.preventDefault()
    callbacks.suppressClick()
    callbacks.move(mailSwipeOffset(dx), true)
  }
  const end = (event: TouchEvent) => {
    if (!active) return
    const touch = Array.from(event.changedTouches).find(
      (touch) => touch.identifier === active?.id,
    )
    if (!touch) return
    const action =
      callbacks.enabled() && event.touches.length === 0
        ? mailSwipeAction(active.axis, touch.clientX - active.x)
        : null
    if (active.axis === 'horizontal') callbacks.suppressClick()
    reset()
    if (action === 'archive') callbacks.archive()
    if (action === 'snooze') callbacks.snooze()
  }
  row.addEventListener('touchstart', start, { passive: true })
  row.addEventListener('touchmove', move, { passive: false })
  row.addEventListener('touchend', end)
  row.addEventListener('touchcancel', reset)
  return () => {
    row.removeEventListener('touchstart', start)
    row.removeEventListener('touchmove', move)
    row.removeEventListener('touchend', end)
    row.removeEventListener('touchcancel', reset)
  }
}
