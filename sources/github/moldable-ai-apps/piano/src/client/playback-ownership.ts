import type { PianoPlaybackIntent } from '../shared/ui-intent'

export interface ActivePlaybackOwnership {
  intentId: string
  attemptId: string
  consumerId: string
}

export interface PlaybackOwnershipSnapshot {
  active: ActivePlaybackOwnership | null
  recoverable: ActivePlaybackOwnership | null
  started: ActivePlaybackOwnership | null
  abandonedAttemptIds: ReadonlySet<string>
}

function clearMatchingOwnership(
  ownership: ActivePlaybackOwnership | null,
  lostAttemptId: string,
) {
  return ownership?.attemptId === lostAttemptId ? null : ownership
}

export function playbackOwnershipAfterLoss(
  snapshot: PlaybackOwnershipSnapshot,
  lost: ActivePlaybackOwnership,
): PlaybackOwnershipSnapshot {
  return {
    active: clearMatchingOwnership(snapshot.active, lost.attemptId),
    recoverable: clearMatchingOwnership(snapshot.recoverable, lost.attemptId),
    started: clearMatchingOwnership(snapshot.started, lost.attemptId),
    abandonedAttemptIds: new Set([
      ...snapshot.abandonedAttemptIds,
      lost.attemptId,
    ]),
  }
}

export function isCurrentPlaybackOwnership(
  ownership: ActivePlaybackOwnership,
  active: ActivePlaybackOwnership | null,
  abandonedAttemptIds: ReadonlySet<string>,
) {
  return (
    active?.intentId === ownership.intentId &&
    active.attemptId === ownership.attemptId &&
    active.consumerId === ownership.consumerId &&
    !abandonedAttemptIds.has(ownership.attemptId)
  )
}

export function shouldCompletePlaybackOnRendererExit(
  ownership: ActivePlaybackOwnership,
  started: ActivePlaybackOwnership | null,
) {
  return (
    started?.intentId === ownership.intentId &&
    started.attemptId === ownership.attemptId &&
    started.consumerId === ownership.consumerId
  )
}

export function canAdoptPersistedPlaybackLease(
  playback: PianoPlaybackIntent,
  consumerId: string,
  abandonedAttemptIds: ReadonlySet<string>,
  now = Date.now(),
) {
  if (
    !playback.attemptId ||
    playback.consumerId !== consumerId ||
    abandonedAttemptIds.has(playback.attemptId)
  ) {
    return false
  }
  const leaseExpiresAt = Date.parse(playback.leaseExpiresAt ?? '')
  return Number.isFinite(leaseExpiresAt) && leaseExpiresAt > now
}
