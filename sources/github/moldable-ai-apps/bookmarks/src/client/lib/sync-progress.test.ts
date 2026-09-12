import { syncProgressLabel } from './sync-progress'
import { describe, expect, it } from 'vitest'

describe('syncProgressLabel', () => {
  it('turns page progress into a concise synced count', () => {
    expect(syncProgressLabel('Reading bookmarks · page 4 · 327 new')).toBe(
      '327 synced · page 4',
    )
  })

  it('describes folder reconciliation without exposing implementation language', () => {
    expect(syncProgressLabel('Mirroring folder · Research')).toBe(
      'Syncing Research…',
    )
  })

  it('provides useful startup progress', () => {
    expect(syncProgressLabel('Reading local archive')).toBe('Preparing…')
    expect(syncProgressLabel()).toBe('Starting…')
  })
})
