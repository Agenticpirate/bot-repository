import {
  PIANO_PLAYBACK_EXPIRED_MESSAGE,
  PIANO_PLAYBACK_INTENT_TTL_MS,
  type PianoPlaybackIntent,
  isExpiredPianoPlayback,
  isExpiredPianoPlaybackFailure,
  isTerminalPianoPlayback,
} from './ui-intent'
import { describe, expect, it } from 'vitest'

const requestedAt = '2026-07-29T12:00:00.000Z'

function playback(status: PianoPlaybackIntent['status']): PianoPlaybackIntent {
  return {
    type: 'play',
    status,
    requestedAt,
    updatedAt: requestedAt,
  }
}

describe('Piano playback intent lifetime', () => {
  it('expires abandoned non-terminal requests', () => {
    const requestedAtMs = Date.parse(requestedAt)
    expect(
      isExpiredPianoPlayback(
        playback('queued'),
        requestedAtMs + PIANO_PLAYBACK_INTENT_TTL_MS - 1,
      ),
    ).toBe(false)
    expect(
      isExpiredPianoPlayback(
        playback('queued'),
        requestedAtMs + PIANO_PLAYBACK_INTENT_TTL_MS,
      ),
    ).toBe(true)
  })

  it('never expires durable terminal status records', () => {
    expect(isTerminalPianoPlayback(playback('completed'))).toBe(true)
    expect(isTerminalPianoPlayback(playback('failed'))).toBe(true)
    expect(
      isExpiredPianoPlayback(
        playback('completed'),
        Date.parse(requestedAt) + PIANO_PLAYBACK_INTENT_TTL_MS * 10,
      ),
    ).toBe(false)
  })

  it('identifies the retained terminal record for an expired request', () => {
    expect(
      isExpiredPianoPlaybackFailure({
        ...playback('failed'),
        message: PIANO_PLAYBACK_EXPIRED_MESSAGE,
      }),
    ).toBe(true)
    expect(isExpiredPianoPlaybackFailure(playback('failed'))).toBe(false)
  })
})
