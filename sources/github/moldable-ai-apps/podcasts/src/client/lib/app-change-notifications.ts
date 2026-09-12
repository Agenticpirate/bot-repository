import { sendToMoldable } from '@moldable-ai/ui'

/** Observe completed writes to this app's existing HTTP API without changing
 * requests, bodies, credentials, response objects, or transport. Card RPC reads
 * are deliberately outside this observer; their host already emits changes. */
export function installAppChangeNotifications() {
  if (new URLSearchParams(location.search).has('card')) return
  const current = window.fetch as typeof window.fetch & {
    moldableChangeObserver?: boolean
  }
  if (current.moldableChangeObserver) return
  const original = current.bind(window)
  window.fetch = Object.assign(
    async (input: RequestInfo | URL, init?: RequestInit) => {
      const response = await original(input, init)
      try {
        const request = input instanceof Request ? input : undefined
        const method = (init?.method ?? request?.method ?? 'GET').toUpperCase()
        const address = new URL(request?.url ?? String(input), location.href)
        if (
          response.ok &&
          !['GET', 'HEAD', 'OPTIONS'].includes(method) &&
          address.protocol === location.protocol &&
          address.host === location.host &&
          address.pathname.startsWith('/api/')
        ) {
          sendToMoldable({ type: 'moldable:app-data-changed' })
        }
      } catch {
        /* Observing a write must never change its result. */
      }
      return response
    },
    { moldableChangeObserver: true },
  )
}
