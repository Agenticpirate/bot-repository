/**
 * Moldable drive contract (OB-008): pending UI navigation intent.
 *
 * The server writes a single per-workspace intent file (last-wins) when a
 * chat/agent caller invokes a Piano UI method. The client polls it on mount
 * and whenever a `moldable:app-api-changed` message arrives. Plain
 * navigation intents are applied and acknowledged. Playback intents remain
 * durable so callers can inspect their final status, and use a server-side
 * renewable consumer lease before touching Web Audio so duplicate clients
 * cannot play twice while renderer replacement can safely transfer playback.
 */

export const PIANO_UI_VIEW_IDS = [
  'library',
  'courses',
  'folder',
  'course',
  'lesson',
  'practice',
] as const

export type PianoUiViewId = (typeof PIANO_UI_VIEW_IDS)[number]

export const PIANO_PLAYBACK_STATUSES = [
  'queued',
  'preparing',
  'playing',
  'completed',
  'interaction-required',
  'failed',
] as const

export type PianoPlaybackStatus = (typeof PIANO_PLAYBACK_STATUSES)[number]

export const PIANO_PLAYBACK_LEASE_MS = 15_000
export const PIANO_PLAYBACK_HEARTBEAT_MS = 4_000
export const PIANO_PLAYBACK_INTENT_TTL_MS = 2 * 60_000
export const PIANO_PLAYBACK_EXPIRED_MESSAGE =
  'Playback request expired before Piano could complete it.'

export interface PianoPlaybackIntent {
  type: 'play'
  status: PianoPlaybackStatus
  requestedAt: string
  updatedAt: string
  attemptId?: string
  consumerId?: string
  leaseExpiresAt?: string
  message?: string
}

export interface PianoUiIntent {
  id: string
  view: PianoUiViewId
  entityId?: string
  params?: Record<string, unknown>
  playback?: PianoPlaybackIntent
  createdAt: string
}

export function isTerminalPianoPlayback(
  playback: PianoPlaybackIntent,
): boolean {
  return playback.status === 'completed' || playback.status === 'failed'
}

export function isExpiredPianoPlayback(
  playback: PianoPlaybackIntent,
  now = Date.now(),
): boolean {
  if (isTerminalPianoPlayback(playback)) return false
  const requestedAt = Date.parse(playback.requestedAt)
  return (
    !Number.isFinite(requestedAt) ||
    requestedAt + PIANO_PLAYBACK_INTENT_TTL_MS <= now
  )
}

/**
 * An expired request is retained as a terminal state for callers that poll
 * playback status. It is not actionable inside a newly opened player view.
 */
export function isExpiredPianoPlaybackFailure(
  playback: PianoPlaybackIntent,
): boolean {
  return (
    playback.status === 'failed' &&
    playback.message === PIANO_PLAYBACK_EXPIRED_MESSAGE
  )
}
