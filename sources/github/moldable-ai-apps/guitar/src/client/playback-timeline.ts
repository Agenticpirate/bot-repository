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
 * Playback's high-frequency clock. Keeping it outside React means scheduling
 * audio never causes the entire practice surface to render on every frame.
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
      return () => listeners.delete(listener)
    },
  }
}
