import type { PianoPlaybackIntent } from '../shared/ui-intent'
import {
  type ActivePlaybackOwnership,
  canAdoptPersistedPlaybackLease,
  isCurrentPlaybackOwnership,
  playbackOwnershipAfterLoss,
  shouldCompletePlaybackOnRendererExit,
} from './playback-ownership'
import { describe, expect, it } from 'vitest'

const ownership: ActivePlaybackOwnership = {
  intentId: 'play-fur-elise',
  attemptId: 'attempt-a',
  consumerId: 'embedded-renderer',
}

describe('renderer playback ownership recovery', () => {
  it('clears started state before stopping and never zombie-adopts the lost attempt', () => {
    const afterLoss = playbackOwnershipAfterLoss(
      {
        active: ownership,
        recoverable: ownership,
        started: ownership,
        abandonedAttemptIds: new Set(),
      },
      ownership,
    )
    expect(afterLoss).toMatchObject({
      active: null,
      recoverable: null,
      started: null,
    })
    expect(afterLoss.abandonedAttemptIds.has(ownership.attemptId)).toBe(true)
    expect(
      isCurrentPlaybackOwnership(
        ownership,
        afterLoss.active,
        afterLoss.abandonedAttemptIds,
      ),
    ).toBe(false)

    const stillPersistedAsPlaying: PianoPlaybackIntent = {
      type: 'play',
      status: 'playing',
      requestedAt: '2026-07-28T12:00:00.000Z',
      updatedAt: '2026-07-28T12:00:01.000Z',
      attemptId: ownership.attemptId,
      consumerId: ownership.consumerId,
      leaseExpiresAt: '2026-07-28T12:00:15.000Z',
    }
    expect(
      canAdoptPersistedPlaybackLease(
        stillPersistedAsPlaying,
        ownership.consumerId,
        afterLoss.abandonedAttemptIds,
        Date.parse('2026-07-28T12:00:02.000Z'),
      ),
    ).toBe(false)
  })

  it('allows a fresh replacement attempt but not an expired lease', () => {
    const freshLease: PianoPlaybackIntent = {
      type: 'play',
      status: 'preparing',
      requestedAt: '2026-07-28T12:00:00.000Z',
      updatedAt: '2026-07-28T12:00:16.000Z',
      attemptId: 'attempt-b',
      consumerId: 'dedicated-renderer',
      leaseExpiresAt: '2026-07-28T12:00:31.000Z',
    }
    expect(
      canAdoptPersistedPlaybackLease(
        freshLease,
        'dedicated-renderer',
        new Set(['attempt-a']),
        Date.parse('2026-07-28T12:00:17.000Z'),
      ),
    ).toBe(true)
    expect(
      canAdoptPersistedPlaybackLease(
        freshLease,
        'dedicated-renderer',
        new Set(['attempt-a']),
        Date.parse('2026-07-28T12:00:31.000Z'),
      ),
    ).toBe(false)
  })

  it('settles a started Voice attempt when its renderer exits', () => {
    expect(shouldCompletePlaybackOnRendererExit(ownership, ownership)).toBe(
      true,
    )
    expect(
      shouldCompletePlaybackOnRendererExit(ownership, {
        ...ownership,
        attemptId: 'attempt-b',
      }),
    ).toBe(false)
    expect(shouldCompletePlaybackOnRendererExit(ownership, null)).toBe(false)
  })
})
