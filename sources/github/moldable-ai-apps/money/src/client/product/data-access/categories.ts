import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useEffect, useRef } from 'react'
import { useWorkspace } from '@moldable-ai/ui'
import { DEFAULT_RECENTS } from '../lib/categories'

export type UserCategorySource = 'custom' | 'observed'

export interface UserCategory {
  id: string
  label: string
  emoji?: string
  source: UserCategorySource
  createdAt?: string
  updatedAt?: string
}

export interface CategoryPreference {
  key: string
  label?: string
  emoji?: string
  hidden?: boolean
  mappedTo?: string
  updatedAt?: string
}

export interface CategoryRule {
  id: string
  pattern: string
  matchType: 'contains' | 'regex'
  category: string
  enabled: boolean
  createdAt?: string
  updatedAt?: string
}

export interface CategoryRecent {
  label: string
  categoryKey?: string
  emoji?: string
  usedAt: string
}

export interface CategoryUsageStat {
  key: string
  label: string
  transactionCount: number
  lastUsedAt?: string
}

export interface CategoriesResponse {
  categories: UserCategory[]
  preferences: CategoryPreference[]
  rules: CategoryRule[]
  recents: CategoryRecent[]
  stats: CategoryUsageStat[]
  updatedAt?: string
}

export interface CreateCategoryInput {
  label: string
  emoji?: string
}

export interface UpdateCategoryInput {
  id: string
  label?: string
  emoji?: string
  hidden?: boolean
  mappedTo?: string
}

export interface DeleteCategoryInput {
  id: string
  reassignTo?: string
}

export interface MergeCategoryInput {
  from: string
  to: string
}

export interface RecordCategoryRecentInput {
  label: string
  categoryKey?: string
  emoji?: string
}

export interface CreateCategoryRuleInput {
  pattern: string
  matchType?: 'contains' | 'regex'
  category: string
  enabled?: boolean
}

export function useUserCategories(enabled = true) {
  const { workspaceId, fetchWithWorkspace } = useWorkspace()
  return useQuery({
    queryKey: ['money', 'categories', workspaceId],
    enabled,
    queryFn: async (): Promise<CategoriesResponse> => {
      const res = await fetchWithWorkspace('/api/categories')
      if (!res.ok) throw new Error('Failed to load categories')
      return res.json()
    },
  })
}

export function useCreateCategory() {
  const { fetchWithWorkspace } = useWorkspace()
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (
      input: string | CreateCategoryInput,
    ): Promise<UserCategory> => {
      const body = typeof input === 'string' ? { label: input } : input
      const res = await fetchWithWorkspace('/api/categories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok)
        throw new Error(json?.error?.message ?? 'Failed to create category')
      return json.category
    },
    onSuccess: () => invalidateCategoryState(queryClient),
  })
}

export function useUpdateCategory() {
  const { fetchWithWorkspace } = useWorkspace()
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, ...patch }: UpdateCategoryInput) => {
      const res = await fetchWithWorkspace(
        `/api/categories/${encodeURIComponent(id)}`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(patch),
        },
      )
      const json = await res.json().catch(() => ({}))
      if (!res.ok)
        throw new Error(json?.error?.message ?? 'Failed to update category')
      return json
    },
    onSuccess: () => invalidateCategoryState(queryClient),
  })
}

export function useDeleteCategory() {
  const { fetchWithWorkspace } = useWorkspace()
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, reassignTo }: DeleteCategoryInput) => {
      const res = await fetchWithWorkspace(
        `/api/categories/${encodeURIComponent(id)}`,
        {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ reassignTo }),
        },
      )
      const json = await res.json().catch(() => ({}))
      if (!res.ok)
        throw new Error(json?.error?.message ?? 'Failed to delete category')
      return json
    },
    onSuccess: () => invalidateCategoryState(queryClient),
  })
}

export function useMergeCategory() {
  const { fetchWithWorkspace } = useWorkspace()
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (input: MergeCategoryInput) => {
      const res = await fetchWithWorkspace('/api/categories/merge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok)
        throw new Error(json?.error?.message ?? 'Failed to merge categories')
      return json
    },
    onSuccess: () => invalidateCategoryState(queryClient),
  })
}

export function useRecordCategoryRecent() {
  const { fetchWithWorkspace } = useWorkspace()
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (input: RecordCategoryRecentInput) => {
      const res = await fetchWithWorkspace('/api/categories/recents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok)
        throw new Error(json?.error?.message ?? 'Failed to update recents')
      return json.recents as CategoryRecent[]
    },
    onSuccess: () =>
      queryClient.invalidateQueries({
        queryKey: ['money', 'categories'],
      }),
  })
}

export function useCreateCategoryRule() {
  const { fetchWithWorkspace } = useWorkspace()
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (
      input: CreateCategoryRuleInput,
    ): Promise<CategoryRule> => {
      const res = await fetchWithWorkspace('/api/categories/rules', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok)
        throw new Error(json?.error?.message ?? 'Failed to create rule')
      return json.rule
    },
    onSuccess: () => invalidateCategoryState(queryClient),
  })
}

export function useDeleteCategoryRule() {
  const { fetchWithWorkspace } = useWorkspace()
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await fetchWithWorkspace(
        `/api/categories/rules/${encodeURIComponent(id)}`,
        { method: 'DELETE' },
      )
      const json = await res.json().catch(() => ({}))
      if (!res.ok)
        throw new Error(json?.error?.message ?? 'Failed to delete rule')
      return json
    },
    onSuccess: () => invalidateCategoryState(queryClient),
  })
}

function invalidateCategoryState(
  queryClient: ReturnType<typeof useQueryClient>,
) {
  queryClient.invalidateQueries({ queryKey: ['money', 'categories'] })
  queryClient.invalidateQueries({ queryKey: ['money', 'transactions'] })
  queryClient.invalidateQueries({ queryKey: ['ui-kit'] })
}

const RECENTS_SEEDED_PREFIX = 'money:recents-seeded:'

function recentsSeeded(workspaceId: string): boolean {
  if (typeof window === 'undefined') return false
  try {
    return (
      window.localStorage.getItem(RECENTS_SEEDED_PREFIX + workspaceId) === '1'
    )
  } catch {
    return false
  }
}

function markRecentsSeeded(workspaceId: string) {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(RECENTS_SEEDED_PREFIX + workspaceId, '1')
  } catch {
    // Best-effort guard; in-memory ref still prevents a re-run this session.
  }
}

/**
 * Zero-config Recents. The first time a live workspace has no recents, seed the
 * common personal-finance categories ({@link DEFAULT_RECENTS}) so the category
 * dropdown is useful with no setup. Real usage replaces them over time. Runs
 * once per workspace (localStorage-guarded) and never clobbers existing recents.
 */
export function useSeedDefaultRecents(
  enabled: boolean,
  recents: CategoryRecent[] | undefined,
) {
  const { workspaceId, fetchWithWorkspace } = useWorkspace()
  const queryClient = useQueryClient()
  const ran = useRef(false)

  useEffect(() => {
    if (!enabled || ran.current) return
    // Wait until the categories query has actually resolved.
    if (recents === undefined) return
    if (recents.length > 0 || recentsSeeded(workspaceId)) {
      ran.current = true
      return
    }
    ran.current = true
    markRecentsSeeded(workspaceId)
    void (async () => {
      // POST in reverse so DEFAULT_RECENTS[0] lands as the most-recent (first).
      for (const recent of [...DEFAULT_RECENTS].reverse()) {
        try {
          await fetchWithWorkspace('/api/categories/recents', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(recent),
          })
        } catch {
          // Best-effort seeding; a failure just leaves recents to fill organically.
        }
      }
      queryClient.invalidateQueries({ queryKey: ['money', 'categories'] })
    })()
  }, [enabled, recents, workspaceId, fetchWithWorkspace, queryClient])
}
