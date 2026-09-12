import { useCallback } from 'react'
import { useWorkspace } from '@moldable-ai/ui'
import { callCardApp } from './chat-card-rpc'

export const isCard =
  new URLSearchParams(location.search).get('card') === 'episode'

export async function unwrapResponse<T>(response: Response): Promise<T> {
  const data = (await response.json()) as {
    ok?: boolean
    result?: T
    error?: { message?: string }
  }
  if (!response.ok || data.ok === false)
    throw new Error(
      data.error?.message ?? 'Podcasts could not complete this request.',
    )
  return (data.ok === true ? data.result : data) as T
}

export function usePodcastApi() {
  const { fetchWithWorkspace, workspaceId } = useWorkspace()
  const call = useCallback(
    async <T>(
      method: string,
      params: Record<string, unknown> = {},
    ): Promise<T> => {
      if (isCard) return callCardApp<T>('podcasts', method, params)
      return unwrapResponse<T>(
        await fetchWithWorkspace('/api/moldable/rpc', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ method, params }),
        }),
      )
    },
    [fetchWithWorkspace],
  )
  const get = useCallback(
    async <T>(url: string): Promise<T> =>
      unwrapResponse<T>(await fetchWithWorkspace(url)),
    [fetchWithWorkspace],
  )
  return { call, get, workspaceId }
}
