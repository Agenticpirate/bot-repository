import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useWorkspace } from '@moldable-ai/ui'
import type {
  AppStatus,
  BookmarkPage,
  BookmarkRecord,
} from '../../shared/bookmarks'

export function useBookmarksStatus() {
  const { workspaceId, fetchWithWorkspace } = useWorkspace()
  return useQuery({
    queryKey: ['bookmarks-status', workspaceId],
    queryFn: async () => request<AppStatus>(fetchWithWorkspace, '/api/status'),
    refetchInterval: (query) =>
      query.state.data?.sync.status === 'syncing' ? 1_500 : 30_000,
  })
}

export function useBookmarks(
  query: string,
  folderId?: string,
  syncing = false,
) {
  const { workspaceId, fetchWithWorkspace } = useWorkspace()
  return useQuery({
    queryKey: ['bookmarks', workspaceId, query, folderId],
    queryFn: async () => {
      const params = new URLSearchParams({ limit: '100' })
      if (query.trim()) params.set('q', query.trim())
      if (folderId) params.set('folder', folderId)
      return request<BookmarkPage>(
        fetchWithWorkspace,
        `/api/bookmarks?${params}`,
      )
    },
    refetchInterval: syncing ? 1_500 : false,
  })
}

export function useBookmark(id?: string) {
  const { workspaceId, fetchWithWorkspace } = useWorkspace()
  return useQuery({
    queryKey: ['bookmark', workspaceId, id],
    enabled: Boolean(id),
    queryFn: () =>
      request<BookmarkRecord>(fetchWithWorkspace, `/api/bookmarks/${id}`),
  })
}

export function useConnectBrowser() {
  return useWorkspaceMutation<{ browserId: string; profileId: string }>(
    '/api/connect/browser',
    'POST',
  )
}

export function useStartOAuth() {
  const { fetchWithWorkspace } = useWorkspace()
  return useMutation({
    mutationFn: async (clientId: string) =>
      request<{ authorizeUrl: string; redirectUri: string }>(
        fetchWithWorkspace,
        '/api/auth/x/start',
        {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ clientId }),
        },
      ),
  })
}

export function useSyncBookmarks() {
  return useWorkspaceMutation<Record<string, never>>('/api/sync', 'POST')
}

export function useDisconnectBookmarks() {
  return useWorkspaceMutation<Record<string, never>>(
    '/api/connection',
    'DELETE',
  )
}

export function useUpdateFolderSelection() {
  return useWorkspaceMutation<{ selectedFolderIds: string[] }>(
    '/api/folders/selection',
    'PUT',
  )
}

function useWorkspaceMutation<TVariables>(path: string, method: string) {
  const { workspaceId, fetchWithWorkspace } = useWorkspace()
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (variables: TVariables) =>
      request<{ ok: boolean }>(fetchWithWorkspace, path, {
        method,
        headers: { 'content-type': 'application/json' },
        body: method === 'DELETE' ? undefined : JSON.stringify(variables),
      }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: ['bookmarks-status', workspaceId],
      })
      await queryClient.invalidateQueries({
        queryKey: ['bookmarks', workspaceId],
      })
    },
  })
}

type WorkspaceFetch = (
  input: RequestInfo | URL,
  init?: RequestInit,
) => Promise<Response>

async function request<T>(
  fetcher: WorkspaceFetch,
  path: string,
  init?: RequestInit,
): Promise<T> {
  const response = await fetcher(path, init)
  const data = (await response.json().catch(() => null)) as
    | T
    | { error?: string }
    | null
  if (!response.ok) {
    throw new Error(
      data && typeof data === 'object' && 'error' in data && data.error
        ? data.error
        : `Request failed with status ${response.status}`,
    )
  }
  return data as T
}
