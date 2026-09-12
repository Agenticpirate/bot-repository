// Deliberate distance, not velocity: a quick scroll must never archive mail.
export const MAIL_SWIPE_THRESHOLD = 44
export const MAIL_NAVIGATION_EDGE_WIDTH = 24
export const MAIL_SWIPE_RESISTANCE_START = 112
export const MAIL_SWIPE_MAX_OFFSET = 176

export type MailSwipeAxis = 'pending' | 'horizontal' | 'vertical'
export type MailSwipeAction = 'archive' | 'snooze'

export function mailSwipeAxis(
  current: MailSwipeAxis,
  dx: number,
  dy: number,
): MailSwipeAxis {
  if (current !== 'pending') return current
  if (Math.max(Math.abs(dx), Math.abs(dy)) < 10) return 'pending'
  return Math.abs(dx) > Math.abs(dy) * 1.3 ? 'horizontal' : 'vertical'
}

export function mailSwipeOffset(dx: number): number {
  const distance = Math.abs(dx)
  if (distance <= MAIL_SWIPE_RESISTANCE_START) return dx
  const extra = distance - MAIL_SWIPE_RESISTANCE_START
  const range = MAIL_SWIPE_MAX_OFFSET - MAIL_SWIPE_RESISTANCE_START
  return (
    Math.sign(dx) *
    (MAIL_SWIPE_RESISTANCE_START + (range * extra) / (range + extra))
  )
}

export function mailSwipeAction(
  axis: MailSwipeAxis,
  dx: number,
): MailSwipeAction | null {
  if (axis !== 'horizontal' || Math.abs(dx) < MAIL_SWIPE_THRESHOLD) return null
  return dx < 0 ? 'archive' : 'snooze'
}
