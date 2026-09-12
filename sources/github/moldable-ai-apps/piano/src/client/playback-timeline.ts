export type PlaybackTimelineListener = (cursor: number) => void

export interface PlaybackTimeline {
  getCursor: () => number
  setCursor: (cursor: number) => void
  subscribe: (listener: PlaybackTimelineListener) => () => void
}

function normalizeCursor(cursor: number) {
  return Number.isFinite(cursor) ? Math.max(0, cursor) : 0
}

/**
 * A tiny external clock for playback-only updates.
 *
 * React state is intentionally not involved here: the audio scheduler can
 * publish every animation frame while only the small visual subscribers that
 * need that precision update themselves.
 */
export function createPlaybackTimeline(initialCursor = 0): PlaybackTimeline {
  let cursor = normalizeCursor(initialCursor)
  const listeners = new Set<PlaybackTimelineListener>()

  return {
    getCursor: () => cursor,
    setCursor: (nextCursor) => {
      const normalized = normalizeCursor(nextCursor)
      if (normalized === cursor) return
      cursor = normalized
      for (const listener of listeners) listener(cursor)
    },
    subscribe: (listener) => {
      listeners.add(listener)
      listener(cursor)
      return () => {
        listeners.delete(listener)
      }
    },
  }
}
