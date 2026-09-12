import { attachMailRowTouchSwipe } from './mail-row-touch-swipe'
import { afterEach, describe, expect, it, vi } from 'vitest'

function setup() {
  class Row extends EventTarget {
    closest() {
      return null
    }
  }
  vi.stubGlobal('Element', Row)
  const row = new Row()
  const callbacks = {
    enabled: vi.fn(() => true),
    move: vi.fn(),
    suppressClick: vi.fn(),
    archive: vi.fn(),
    snooze: vi.fn(),
  }
  const listen = vi.spyOn(row, 'addEventListener')
  const cleanup = attachMailRowTouchSwipe(
    row as unknown as HTMLElement,
    callbacks,
  )
  const touch = (x: number, y = 0, identifier = 1) => ({
    clientX: x,
    clientY: y,
    identifier,
  })
  const send = (
    type: string,
    x: number,
    y = 0,
    options: { cancelable?: boolean; count?: number; id?: number } = {},
  ) => {
    const point = touch(x, y, options.id)
    const touches = type === 'touchend' || type === 'touchcancel' ? [] : [point]
    if (options.count === 2) touches.push(touch(x + 30, y, 2))
    const event = Object.assign(
      new Event(type, { cancelable: options.cancelable ?? true }),
      {
        touches,
        changedTouches: [point],
      },
    )
    row.dispatchEvent(event)
    return event
  }
  return { row, callbacks, listen, cleanup, send }
}

afterEach(() => vi.unstubAllGlobals())

describe('Mail native touch swipe', () => {
  it('registers non-passive touchmove and follows every move until release', () => {
    const { send, callbacks, listen } = setup()
    expect(listen).toHaveBeenCalledWith('touchmove', expect.any(Function), {
      passive: false,
    })
    send('touchstart', 200)
    for (const x of [180, 160, 140, 100]) {
      expect(send('touchmove', x).defaultPrevented).toBe(true)
      expect(callbacks.move).toHaveBeenLastCalledWith(x - 200, true)
      expect(callbacks.archive).not.toHaveBeenCalled()
    }
    send('touchend', 100)
    send('touchend', 100)
    expect(callbacks.move).toHaveBeenLastCalledWith(0, false)
    expect(callbacks.archive).toHaveBeenCalledTimes(1)
    expect(callbacks.snooze).not.toHaveBeenCalled()
  })

  it.each([-1, 1])(
    'claims the first small sideways move (%s) before native scrolling',
    (direction) => {
      const { send, callbacks } = setup()
      send('touchstart', 200, 100)
      // Model the browser handing later movement to scrolling unless the first
      // move was cancelled, including movement below the pen's 10px dead zone.
      const first = send('touchmove', 200 + direction * 3, 102)
      expect(first.defaultPrevented).toBe(true)
      const next = send('touchmove', 200 + direction * 80, 145, {
        cancelable: first.defaultPrevented,
      })
      expect(next.defaultPrevented).toBe(true)
      send('touchend', 200 + direction * 80, 145)
      expect(
        direction < 0 ? callbacks.archive : callbacks.snooze,
      ).toHaveBeenCalledTimes(1)
    },
  )

  it('keeps a small vertical start native even if it later moves sideways', () => {
    const { send, callbacks } = setup()
    send('touchstart', 200, 100)
    expect(send('touchmove', 201, 103).defaultPrevented).toBe(false)
    expect(send('touchmove', 100, 130).defaultPrevented).toBe(false)
    send('touchend', 100, 130)
    expect(callbacks.archive).not.toHaveBeenCalled()
    expect(callbacks.snooze).not.toHaveBeenCalled()
  })

  it('does not commit an action for a small horizontal movement', () => {
    const { send, callbacks } = setup()
    send('touchstart', 200)
    expect(send('touchmove', 197, 1).defaultPrevented).toBe(true)
    send('touchend', 197, 1)
    expect(callbacks.archive).not.toHaveBeenCalled()
    expect(callbacks.snooze).not.toHaveBeenCalled()
  })

  it('keeps following sideways motion with vertical drift', () => {
    const { send, callbacks } = setup()
    send('touchstart', 200)
    send('touchmove', 180, 2)
    expect(send('touchmove', 140, 35).defaultPrevented).toBe(true)
    expect(callbacks.move).toHaveBeenLastCalledWith(-60, true)
    send('touchmove', 100, 50)
    send('touchend', 100, 50)
    expect(callbacks.archive).toHaveBeenCalledTimes(1)
  })

  it('leaves a swipe from the leading screen edge to native back navigation', () => {
    const { send, callbacks } = setup()
    send('touchstart', 8, 100)
    expect(send('touchmove', 60, 105).defaultPrevented).toBe(false)
    send('touchend', 110, 110)
    expect(callbacks.move).not.toHaveBeenCalled()
    expect(callbacks.snooze).not.toHaveBeenCalled()
    expect(callbacks.archive).not.toHaveBeenCalled()
  })

  it.each([-1, 1])('commits a shorter 44px swipe (%s)', (direction) => {
    const { send, callbacks } = setup()
    send('touchstart', 150)
    send('touchmove', 150 + direction * 44, 4)
    send('touchend', 150 + direction * 44, 4)
    expect(
      direction < 0 ? callbacks.archive : callbacks.snooze,
    ).toHaveBeenCalledTimes(1)
  })

  it('opens snooze only on release', () => {
    const { send, callbacks } = setup()
    send('touchstart', 100)
    send('touchmove', 200)
    expect(callbacks.snooze).not.toHaveBeenCalled()
    send('touchend', 200)
    expect(callbacks.snooze).toHaveBeenCalledTimes(1)
  })

  it('follows reversal and cancels when released below threshold', () => {
    const { send, callbacks } = setup()
    send('touchstart', 200)
    send('touchmove', 100)
    send('touchmove', 180)
    expect(callbacks.move).toHaveBeenLastCalledWith(-20, true)
    send('touchend', 180)
    expect(callbacks.archive).not.toHaveBeenCalled()
    expect(callbacks.move).toHaveBeenLastCalledWith(0, false)
  })

  it('does not block taps or vertical native scrolling', () => {
    const { send, callbacks } = setup()
    expect(send('touchstart', 200).defaultPrevented).toBe(false)
    expect(send('touchmove', 198, -20).defaultPrevented).toBe(false)
    expect(send('touchmove', 100, -100).defaultPrevented).toBe(false)
    send('touchend', 100, -100)
    expect(callbacks.archive).not.toHaveBeenCalled()
    expect(callbacks.suppressClick).not.toHaveBeenCalled()
  })

  it.each(['touchcancel', 'multitouch', 'disabled', 'native scroll'])(
    'resets without an action on %s',
    (reason) => {
      const { send, callbacks } = setup()
      send('touchstart', 200)
      send('touchmove', 180)
      if (reason === 'touchcancel') send('touchcancel', 180)
      if (reason === 'multitouch') send('touchmove', 100, 0, { count: 2 })
      if (reason === 'disabled') {
        callbacks.enabled.mockReturnValue(false)
        send('touchmove', 100)
      }
      if (reason === 'native scroll')
        send('touchmove', 100, 0, { cancelable: false })
      send('touchend', 100)
      expect(callbacks.archive).not.toHaveBeenCalled()
      expect(callbacks.move).toHaveBeenLastCalledWith(0, false)
    },
  )

  it('ignores an unrelated touch ending', () => {
    const { send, callbacks } = setup()
    send('touchstart', 200)
    send('touchmove', 100)
    send('touchend', 100, 0, { id: 2 })
    expect(callbacks.archive).not.toHaveBeenCalled()
    send('touchend', 100)
    expect(callbacks.archive).toHaveBeenCalledTimes(1)
  })

  it('removes listeners on unmount', () => {
    const { send, callbacks, cleanup } = setup()
    cleanup()
    send('touchstart', 200)
    send('touchmove', 100)
    send('touchend', 100)
    expect(callbacks.move).not.toHaveBeenCalled()
    expect(callbacks.archive).not.toHaveBeenCalled()
  })
})
