import type { MouseEvent, PointerEvent } from 'react'
import { useMailRowSwipe } from './use-mail-row-swipe'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const react = vi.hoisted(() => ({ setState: vi.fn() }))
vi.mock('react', () => ({
  useEffect: vi.fn(),
  useEffectEvent: (callback: unknown) => callback,
  useRef: (current: unknown) => ({ current }),
  useState: (value: unknown) => [value, react.setState],
}))

// Handler-level tests run without a DOM. Browser/native touch behavior still
// needs device validation; these protect dispatch and capture lifecycle rules.
describe('Mail swipe pen pointer handlers', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.stubGlobal('Element', class {})
  })

  function setup(enabled = true) {
    const onArchive = vi.fn()
    const onSnooze = vi.fn()
    // Hook storage is mocked above to exercise handlers without a DOM renderer.
    // eslint-disable-next-line react-hooks/rules-of-hooks
    const { handlers } = useMailRowSwipe({ enabled, onArchive, onSnooze })
    const row = { hasPointerCapture: () => false, setPointerCapture: vi.fn() }
    const child = {}
    const pointer = (x: number, y = 0, overrides = {}) =>
      ({
        isPrimary: true,
        pointerType: 'pen',
        pointerId: 1,
        button: 0,
        clientX: x,
        clientY: y,
        currentTarget: row,
        target: child,
        ...overrides,
      }) as unknown as PointerEvent<HTMLDivElement>
    return { handlers, onArchive, onSnooze, pointer, row }
  }

  it('archives once on release, not during movement or duplicate release', () => {
    const { handlers, pointer, onArchive, onSnooze } = setup()
    handlers.onPointerDown(pointer(200))
    handlers.onPointerMove(pointer(100))
    expect(onArchive).not.toHaveBeenCalled()
    handlers.onPointerUp(pointer(100))
    handlers.onPointerUp(pointer(100))
    expect(onArchive).toHaveBeenCalledTimes(1)
    expect(onSnooze).not.toHaveBeenCalled()
  })

  it('opens the snooze picker for a right swipe', () => {
    const { handlers, pointer, onSnooze, onArchive } = setup()
    handlers.onPointerDown(pointer(100))
    handlers.onPointerMove(pointer(200))
    handlers.onPointerUp(pointer(200))
    expect(onSnooze).toHaveBeenCalledTimes(1)
    expect(onArchive).not.toHaveBeenCalled()
  })

  it('does not cancel when implicit touch capture transfers from child to row', () => {
    const { handlers, pointer, onArchive, row } = setup()
    handlers.onPointerDown(pointer(200))
    handlers.onPointerMove(pointer(175))
    expect(row.setPointerCapture).toHaveBeenCalledWith(1)
    handlers.onLostPointerCapture(pointer(175)) // bubbled from child button
    handlers.onPointerMove(pointer(100))
    handlers.onPointerUp(pointer(100))
    expect(onArchive).toHaveBeenCalledTimes(1)
  })

  it.each(['cancel', 'lost capture', 'second touch'])(
    'cancels without mutation on %s',
    (reason) => {
      const { handlers, pointer, onArchive, row } = setup()
      handlers.onPointerDown(pointer(200))
      handlers.onPointerMove(pointer(100))
      if (reason === 'cancel') handlers.onPointerCancel(pointer(100))
      if (reason === 'lost capture')
        handlers.onLostPointerCapture(pointer(100, 0, { target: row }))
      if (reason === 'second touch')
        handlers.onPointerDown(
          pointer(100, 0, { isPrimary: false, pointerId: 2 }),
        )
      handlers.onPointerUp(pointer(100))
      expect(onArchive).not.toHaveBeenCalled()
    },
  )

  it('ignores another pointer while tracking the primary touch', () => {
    const { handlers, pointer, onArchive } = setup()
    handlers.onPointerDown(pointer(200))
    handlers.onPointerMove(pointer(100, 0, { pointerId: 2 }))
    handlers.onPointerUp(pointer(100, 0, { pointerId: 2 }))
    expect(onArchive).not.toHaveBeenCalled()
  })

  it('leaves vertical scrolling alone without capturing the pointer', () => {
    const { handlers, pointer, onArchive, row } = setup()
    handlers.onPointerDown(pointer(200))
    handlers.onPointerMove(pointer(195, 30))
    handlers.onPointerMove(pointer(100, 70))
    handlers.onPointerUp(pointer(100, 70))
    expect(row.setPointerCapture).not.toHaveBeenCalled()
    expect(onArchive).not.toHaveBeenCalled()
  })

  it.each(['disabled', 'mouse'])('does not swipe when %s', (reason) => {
    const { handlers, pointer, onArchive } = setup(reason !== 'disabled')
    handlers.onPointerDown(
      pointer(200, 0, { pointerType: reason === 'mouse' ? 'mouse' : 'pen' }),
    )
    handlers.onPointerMove(pointer(100))
    handlers.onPointerUp(pointer(100))
    expect(onArchive).not.toHaveBeenCalled()
  })

  it('leaves touch pointers to the native touch listener', () => {
    const { handlers, pointer, onArchive, row } = setup()
    handlers.onPointerDown(pointer(200, 0, { pointerType: 'touch' }))
    handlers.onPointerMove(pointer(100, 0, { pointerType: 'touch' }))
    handlers.onPointerCancel(pointer(100, 0, { pointerType: 'touch' }))
    handlers.onLostPointerCapture(
      pointer(100, 0, { pointerType: 'touch', target: row }),
    )
    handlers.onPointerUp(pointer(100, 0, { pointerType: 'touch' }))
    expect(row.setPointerCapture).not.toHaveBeenCalled()
    expect(onArchive).not.toHaveBeenCalled()
    expect(react.setState).not.toHaveBeenCalled()
  })

  it('suppresses post-swipe clicks but keeps keyboard activation and the next tap', () => {
    const { handlers, pointer } = setup()
    handlers.onPointerDown(pointer(200))
    handlers.onPointerMove(pointer(165))
    handlers.onPointerUp(pointer(165))
    const preventDefault = vi.fn()
    const stopPropagation = vi.fn()
    const click = (detail: number) =>
      ({
        detail,
        preventDefault,
        stopPropagation,
      }) as unknown as MouseEvent<HTMLDivElement>
    handlers.onClickCapture(click(1))
    expect(preventDefault).toHaveBeenCalledTimes(1)
    expect(stopPropagation).toHaveBeenCalledTimes(1)
    handlers.onClickCapture(click(0))
    expect(preventDefault).toHaveBeenCalledTimes(1)
    handlers.onPointerDown(pointer(150))
    handlers.onPointerUp(pointer(150))
    handlers.onClickCapture(click(1))
    expect(preventDefault).toHaveBeenCalledTimes(1)
  })
})
