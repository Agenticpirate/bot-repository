import { createPlaybackTimeline } from './playback-timeline'
import { describe, expect, it, vi } from 'vitest'

describe('playback timeline', () => {
  it('notifies visual subscribers without React state', () => {
    const timeline = createPlaybackTimeline(1)
    const listener = vi.fn()
    const unsubscribe = timeline.subscribe(listener)

    timeline.setCursor(1.5)
    unsubscribe()
    timeline.setCursor(2)

    expect(listener).toHaveBeenCalledTimes(2)
    expect(listener).toHaveBeenNthCalledWith(1, 1)
    expect(listener).toHaveBeenNthCalledWith(2, 1.5)
    expect(timeline.getCursor()).toBe(2)
  })
})
