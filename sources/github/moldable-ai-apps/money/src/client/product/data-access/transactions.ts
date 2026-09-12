/**
 * Global transactions list for the Transactions tab. Reads the paged
 * `GET /api/transactions` surface (search, category, direction, date, offset).
 */
import { useInfiniteQuery, useQuery } from '@tanstack/react-query'
import { useWorkspace } from '@moldable-ai/ui'
import type {
  TransactionCategoryRollupsResponse,
  TransactionFilters,
  TransactionsPage,
} from '../../ui-kit/lib/types'

export function useTransactions(filters: TransactionFilters, enabled = true) {
  const { workspaceId, fetchWithWorkspace } = useWorkspace()
  return useInfiniteQuery<TransactionsPage, Error>({
    queryKey: ['money', 'transactions', workspaceId, filters],
    enabled,
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage: TransactionsPage) => lastPage.nextCursor,
    queryFn: async ({ pageParam }): Promise<TransactionsPage> => {
      const cursor = typeof pageParam === 'string' ? pageParam : undefined
      const params = new URLSearchParams()
      if (filters.q) params.set('q', filters.q)
      if (filters.category) params.set('category', filters.category)
      if (filters.direction) params.set('direction', filters.direction)
      if (filters.startDate) params.set('startDate', filters.startDate)
      if (filters.endDate) params.set('endDate', filters.endDate)
      params.set('limit', String(filters.limit ?? 50))
      if (cursor) params.set('cursor', cursor)
      else params.set('offset', String(filters.offset ?? 0))
      const res = await fetchWithWorkspace(
        `/api/transactions?${params.toString()}`,
      )
      if (!res.ok) throw new Error('Failed to load transactions')
      return res.json()
    },
  })
}

export function useTransactionCategoryRollups(
  filters: TransactionFilters,
  enabled = true,
) {
  const { workspaceId, fetchWithWorkspace } = useWorkspace()
  return useQuery<TransactionCategoryRollupsResponse, Error>({
    queryKey: ['money', 'transaction-category-rollups', workspaceId, filters],
    enabled,
    queryFn: async (): Promise<TransactionCategoryRollupsResponse> => {
      const params = new URLSearchParams()
      if (filters.q) params.set('q', filters.q)
      if (filters.direction) params.set('direction', filters.direction)
      if (filters.startDate) params.set('startDate', filters.startDate)
      if (filters.endDate) params.set('endDate', filters.endDate)
      const res = await fetchWithWorkspace(
        `/api/transactions/categories?${params.toString()}`,
      )
      if (!res.ok) throw new Error('Failed to load category rollups')
      return res.json()
    },
  })
}
