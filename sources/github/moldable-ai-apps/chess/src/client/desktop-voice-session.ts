export type DesktopVoiceSessionStatus =
  | 'unknown'
  | 'off'
  | 'starting'
  | 'active'
  | 'error'

const REQUEST_TYPE = 'moldable:voice-session-request'
const STATUS_TYPE = 'moldable:voice-session-status'
const REQUEST_TIMEOUT_MS = 5_000
const ACTIVATION_TIMEOUT_MS = 30_000

interface StatusMessage {
  type: typeof STATUS_TYPE
  version: 1
  status: Exclude<DesktopVoiceSessionStatus, 'unknown'>
  requestId?: string
  error?: string
}

function parseStatusMessage(value: unknown): StatusMessage | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null
  const candidate = value as Record<string, unknown>
  const status = candidate.status
  if (
    candidate.type !== STATUS_TYPE ||
    candidate.version !== 1 ||
    (status !== 'off' &&
      status !== 'starting' &&
      status !== 'active' &&
      status !== 'error') ||
    (candidate.requestId !== undefined &&
      (typeof candidate.requestId !== 'string' ||
        candidate.requestId.length === 0 ||
        candidate.requestId.length > 128)) ||
    (candidate.error !== undefined && typeof candidate.error !== 'string')
  ) {
    return null
  }
  return {
    type: STATUS_TYPE,
    version: 1,
    status,
    ...(typeof candidate.requestId === 'string'
      ? { requestId: candidate.requestId }
      : {}),
    ...(typeof candidate.error === 'string' ? { error: candidate.error } : {}),
  }
}

function requestVoiceSession(
  action: 'get-status' | 'activate',
): Promise<Exclude<DesktopVoiceSessionStatus, 'unknown'>> {
  if (window.parent === window) return Promise.resolve('off')
  const requestId = crypto.randomUUID()
  const waitsForActive = action === 'activate'

  return new Promise((resolve, reject) => {
    const handleMessage = (event: MessageEvent) => {
      if (event.source !== window.parent) return
      const message = parseStatusMessage(event.data)
      if (!message) return
      const isResponse = message.requestId === requestId
      const isActivationUpdate =
        waitsForActive &&
        message.requestId === undefined &&
        (message.status === 'active' || message.status === 'error')
      if (!isResponse && !isActivationUpdate) return
      if (message.error) {
        cleanup()
        reject(new Error(message.error))
        return
      }
      if (waitsForActive && message.status === 'starting') return
      if (waitsForActive && message.status === 'error') {
        cleanup()
        reject(new Error('Voice could not be started.'))
        return
      }
      cleanup()
      resolve(message.status)
    }
    const cleanup = () => {
      window.clearTimeout(timeout)
      window.removeEventListener('message', handleMessage)
    }
    const timeout = window.setTimeout(
      () => {
        cleanup()
        reject(new Error('Moldable did not respond to the Voice request.'))
      },
      waitsForActive ? ACTIVATION_TIMEOUT_MS : REQUEST_TIMEOUT_MS,
    )
    window.addEventListener('message', handleMessage)
    window.parent.postMessage(
      {
        type: REQUEST_TYPE,
        version: 1,
        requestId,
        action,
      },
      '*',
    )
  })
}

export function getDesktopVoiceSessionStatus() {
  return requestVoiceSession('get-status')
}

export function activateDesktopVoiceSession() {
  return requestVoiceSession('activate')
}

export function subscribeDesktopVoiceSessionStatus(
  subscriber: (status: Exclude<DesktopVoiceSessionStatus, 'unknown'>) => void,
): () => void {
  if (window.parent === window) return () => {}
  const handleMessage = (event: MessageEvent) => {
    if (event.source !== window.parent) return
    const message = parseStatusMessage(event.data)
    if (!message || message.requestId !== undefined) return
    subscriber(message.status)
  }
  window.addEventListener('message', handleMessage)
  return () => window.removeEventListener('message', handleMessage)
}
