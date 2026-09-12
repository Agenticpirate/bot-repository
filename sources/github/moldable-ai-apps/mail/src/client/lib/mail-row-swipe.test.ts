import {
  mailSwipeAction,
  mailSwipeAxis,
  mailSwipeOffset,
} from './mail-row-swipe'
import { describe, expect, it } from 'vitest'

describe('Mail row swipe', () => {
  it('leaves taps and small movements alone', () => {
    expect(mailSwipeAxis('pending', 9, 8)).toBe('pending')
    expect(mailSwipeAction('pending', 0)).toBeNull()
  })

  it('locks horizontal intent only after a deliberate sideways movement', () => {
    expect(mailSwipeAxis('pending', -20, 2)).toBe('horizontal')
    expect(mailSwipeAxis('pending', 20, 2)).toBe('horizontal')
    expect(mailSwipeAxis('pending', 15, 14)).toBe('vertical')
  })

  it('never turns a vertical scroll into an archive', () => {
    const axis = mailSwipeAxis('pending', -2, 15)
    expect(mailSwipeAxis(axis, -100, 20)).toBe('vertical')
    expect(mailSwipeAction(axis, -100)).toBeNull()
  })

  it('preserves a horizontal lock when a finger drifts', () => {
    expect(mailSwipeAxis('horizontal', 80, 45)).toBe('horizontal')
  })

  it.each([-43, -20, 0, 20, 43])('cancels short swipes (%s px)', (dx) => {
    expect(mailSwipeAction('horizontal', dx)).toBeNull()
  })

  it('maps right-to-left to archive and left-to-right to snooze', () => {
    expect(mailSwipeAction('horizontal', -44)).toBe('archive')
    expect(mailSwipeAction('horizontal', 44)).toBe('snooze')
  })

  it('uses the release position so dragging back cancels', () => {
    const axis = mailSwipeAxis('pending', -100, 0)
    expect(mailSwipeAction(axis, -20)).toBeNull()
  })

  it('bounds visual travel without changing action direction', () => {
    expect(mailSwipeOffset(-500)).toBe(-mailSwipeOffset(500))
    expect(mailSwipeOffset(500)).toBeGreaterThan(112)
    expect(mailSwipeOffset(500)).toBeLessThan(176)
    expect(mailSwipeOffset(113)).toBeGreaterThan(112)
    expect(mailSwipeOffset(112)).toBe(112)
    expect(mailSwipeOffset(35)).toBe(35)
  })
})
