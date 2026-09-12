import { sendToMoldable } from '@moldable-ai/ui'

/** Use Moldable's existing app RPC wire protocol from this app-owned view. */
export function callCardApp<T = unknown>(
  appId: string,
  method: string,
  params: Record<string, unknown> = {},
): Promise<T> {
  return new Promise((resolve, reject) => {
    const requestId = `app-call-${crypto.randomUUID()}`
    const timeout = window.setTimeout(() => {
      window.removeEventListener('message', receive)
      reject(
        new Error(
          'The card request timed out. Refresh to check its current state.',
        ),
      )
    }, 60_000)
    const receive = (event: MessageEvent) => {
      if (
        event.data?.type !== 'moldable:app-call-result' ||
        event.data.requestId !== requestId
      )
        return
      if (event.source !== window.parent && event.source !== window) return
      window.clearTimeout(timeout)
      window.removeEventListener('message', receive)
      if (event.data.ok) resolve(event.data.result as T)
      else
        reject(
          new Error(
            event.data.error?.message ||
              'The app could not complete this action.',
          ),
        )
    }
    window.addEventListener('message', receive)
    sendToMoldable({
      type: 'moldable:app-call',
      requestId,
      targetAppId: appId,
      method,
      params,
      timeoutMs: 60_000,
    })
  })
}
