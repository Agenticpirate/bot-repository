import { recommendedRequestDelay } from './x-rate-limit'
import { describe, expect, it } from 'vitest'

describe('recommendedRequestDelay', () => {
  const now = Date.parse('2026-08-28T00:00:00.000Z')

  it('uses a conservative minimum when headers are unavailable', () => {
    expect(recommendedRequestDelay(new Headers(), now)).toBe(1_500)
  })

  it('spreads requests across the remaining rate-limit window', () => {
    const headers = new Headers({
      'x-rate-limit-remaining': '9',
      'x-rate-limit-reset': String((now + 100_000) / 1_000),
    })
    expect(recommendedRequestDelay(headers, now)).toBe(10_000)
  })

  it('waits for reset when the request budget is exhausted', () => {
    const headers = new Headers({
      'x-rate-limit-remaining': '0',
      'x-rate-limit-reset': String((now + 240_000) / 1_000),
    })
    expect(recommendedRequestDelay(headers, now)).toBe(240_000)
  })
})
