import { MEMORIAL_EULOGIES, randomMemorialEulogy } from './memorial-eulogies'
import { describe, expect, it } from 'vitest'

describe('memorial eulogies', () => {
  it('has a varied library of playful epitaphs', () => {
    expect(MEMORIAL_EULOGIES.length).toBeGreaterThanOrEqual(30)
  })

  it('selects and personalizes an epitaph', () => {
    expect(randomMemorialEulogy('Sweet basil', () => 0)).toBe(
      'Here lies Sweet basil: briefly thriving, forever iconic.',
    )
  })

  it('uses a friendly fallback when the plant has no name', () => {
    expect(randomMemorialEulogy('', () => 0)).toContain('this leafy friend')
  })
})
