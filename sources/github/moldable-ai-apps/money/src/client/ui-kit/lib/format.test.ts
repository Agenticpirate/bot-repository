import { formatDate, formatMonthYear, timeAgo } from './format'
import { describe, expect, it } from 'vitest'

describe('formatDate', () => {
  it('keeps date-only transaction dates on their calendar day', () => {
    expect(formatDate('2026-06-19')).toBe('Jun 19, 2026')
    expect(formatDate('2026-06-19', { weekday: 'short' })).toBe(
      'Fri, Jun 19, 2026',
    )
    expect(formatDate('2026-06-19', { year: undefined })).toBe('Jun 19')
    expect(formatMonthYear('2026-06-19')).toBe('Jun 2026')
  })

  it('formats compact relative sync labels with date-fns parsing', () => {
    const now = new Date('2026-06-19T12:06:00.000Z').getTime()
    expect(timeAgo('2026-06-19T12:00:00.000Z', now)).toBe('6m ago')
    expect(timeAgo('2026-05-01T12:00:00.000Z', now)).toBe('May 1')
  })
})
