const MIN_REQUEST_INTERVAL_MS = 1_500
const MAX_REQUEST_INTERVAL_MS = 15 * 60 * 1_000

export function recommendedRequestDelay(
  headers: Headers,
  now = Date.now(),
): number {
  const remaining = Number(headers.get('x-rate-limit-remaining'))
  const resetAt = Number(headers.get('x-rate-limit-reset')) * 1_000

  if (
    !Number.isFinite(remaining) ||
    !Number.isFinite(resetAt) ||
    resetAt <= now
  ) {
    return MIN_REQUEST_INTERVAL_MS
  }
  if (remaining <= 0) {
    return clamp(resetAt - now)
  }

  // Keep one request in reserve and spread the rest across the current window.
  return clamp(Math.ceil((resetAt - now) / (remaining + 1)))
}

function clamp(milliseconds: number): number {
  return Math.min(
    MAX_REQUEST_INTERVAL_MS,
    Math.max(MIN_REQUEST_INTERVAL_MS, milliseconds),
  )
}
