/**
 * Categorization / labeling data layer.
 *
 * Transactions are auto-categorized on sync (batched LLM, auto-accepted by
 * default — see Settings `autoAcceptCategorization`). The UI's job is no longer
 * "label everything"; it's to **supervise the few uncertain, high-impact calls**.
 * So Review reads the backend's curated `reason=low_confidence` merchant feed —
 * already ranked by $ impact and pre-filled with the agent's `suggested` value
 * and `confidence` — instead of the old "every unlabeled merchant" firehose.
 *
 * Confirming a group applies its label with `teachRule: true`, so the choice
 * sticks for every future charge and the merchant stops being flagged.
 */
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useWorkspace } from '@moldable-ai/ui'
import type { TransactionFilters } from '../../ui-kit/lib/types'

export interface ReviewGroupTxn {
  id: string
  date: string
  name: string
  amount: number
  direction: 'income' | 'expense' | 'transfer'
  category?: string[]
  userCategory?: string
  merchantName?: string
  providerCategoryPrimary?: string
  providerCategoryDetailed?: string
}

/** The agent's pre-filled pick for a group (server-side; no client join). */
export interface ReviewGroupSuggestion {
  namespace?: string
  values?: Record<string, unknown>
  confidence?: number
  source?: 'proposal' | 'label' | 'rule'
}

/** Why this group is worth a look — used to rank + frame the queue. */
export interface ReviewGroupImpact {
  amount: number
  transactionCount: number
  monthsObserved: number
  averageMonthlyAmount: number
  annualizedAmount: number
}

export interface ReviewGroup {
  id: string
  groupBy: string
  merchantId?: string
  name: string
  /** e.g. 'expense' | 'transfer' — backend excludes pure transfers from budget. */
  kind?: string
  count: number
  totalAmount: number
  startDate?: string
  endDate?: string
  reasons?: string[]
  /** Group-level confidence in the suggested label (0–1); lower = more worth a look. */
  confidence?: number
  pendingProposalCount?: number
  transactionIds: string[]
  labelSelector: Record<string, unknown>
  transactions?: ReviewGroupTxn[]
  /** Agent/server pre-filled label metadata when the review source has one. */
  suggested?: ReviewGroupSuggestion
  /** $ leverage of getting this merchant right. */
  impact?: ReviewGroupImpact
  /** Ready labelApply payload to mark the group as not-spending (moneyFlow ignored). */
  notSpendingAction?: {
    applyRequest?: {
      selector?: Record<string, unknown>
      namespace?: string
      values?: Record<string, string | number | boolean | null>
      teachRule?: boolean
      rule?: { name?: string; scope?: string; match?: Record<string, unknown> }
    }
    selector?: Record<string, unknown>
    namespace?: string
    values?: Record<string, string | number | boolean | null>
    teachRule?: boolean
    rule?: { name?: string; scope?: string; match?: Record<string, unknown> }
  }
}

export interface ReviewGroupsResponse {
  groups: ReviewGroup[]
  total: number
  counts?: { groups?: number; transactions?: number }
  hasMore?: boolean
}

/**
 * The curated "worth a look" queue: high-$, low-confidence merchant groups,
 * impact-ranked, each pre-filled with the agent's suggestion. Not the firehose.
 */
export function useReviewGroups(enabled = true) {
  const { workspaceId, fetchWithWorkspace } = useWorkspace()
  return useQuery({
    queryKey: ['money', 'review-groups', workspaceId],
    enabled,
    queryFn: async (): Promise<ReviewGroupsResponse> => {
      const params = new URLSearchParams({
        reason: 'low_confidence',
        namespace: 'budget',
        direction: 'expense',
        confidenceCeiling: '0.85',
        sort: 'impact',
        minCount: '1',
        limit: '12',
        transactionSampleLimit: '6',
      })
      const res = await fetchWithWorkspace(
        `/api/transactions/review/groups?${params}`,
      )
      if (!res.ok) throw new Error('Failed to load review groups')
      return res.json()
    },
  })
}

/** Count of high-leverage merchants worth confirming (tab badge + home nudge). */
export function useReviewCount(enabled: boolean): number {
  const groups = useReviewGroups(enabled)
  if (!enabled) return 0
  return groups.data?.counts?.groups ?? groups.data?.groups.length ?? 0
}

export interface ApplyLabelInput {
  selector: Record<string, unknown>
  namespace: string
  values: Record<string, string | number | boolean | null>
  /** Persist a forward rule so future matching transactions auto-apply. */
  teachRule?: boolean
  rule?: { name?: string; scope?: string; match?: Record<string, unknown> }
  dryRun?: boolean
}

export interface ApplyCategoryInput {
  transactionIds?: string[]
  filters?: TransactionFilters
  excludeTransactionIds?: string[]
  userCategory: string
}

/** Apply a user-visible category override to reviewed transactions. */
export function useApplyCategory() {
  const { fetchWithWorkspace } = useWorkspace()
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (input: ApplyCategoryInput) => {
      const ids = [...new Set(input.transactionIds)].filter(Boolean)
      const excludeTransactionIds = [
        ...new Set(input.excludeTransactionIds),
      ].filter(Boolean)
      const userCategory = input.userCategory.trim()
      if (!ids.length && !input.filters) {
        throw new Error('No transactions selected')
      }
      if (!userCategory) throw new Error('Category is required')

      const res = await fetchWithWorkspace('/api/transactions/category', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...(ids.length ? { transactionIds: ids } : {}),
          ...(input.filters ? { filters: input.filters } : {}),
          ...(excludeTransactionIds.length ? { excludeTransactionIds } : {}),
          userCategory,
        }),
      })
      const body = await res.json().catch(() => ({}))
      if (!res.ok) {
        throw new Error(body?.error?.message ?? 'Failed to update category')
      }
      return body
    },
    onSuccess: () =>
      queryClient.invalidateQueries({
        predicate: (q) =>
          q.queryKey[0] === 'money' || q.queryKey[0] === 'ui-kit',
      }),
  })
}

/** Clear a transaction's user category override (revert to the bank category). */
export function useClearCategory() {
  const { fetchWithWorkspace } = useWorkspace()
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (transactionId: string) => {
      const res = await fetchWithWorkspace(
        `/api/transactions/${encodeURIComponent(transactionId)}`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userCategory: '' }),
        },
      )
      const body = await res.json().catch(() => ({}))
      if (!res.ok)
        throw new Error(body?.error?.message ?? 'Failed to reset category')
      return body
    },
    onSuccess: () =>
      queryClient.invalidateQueries({
        predicate: (q) =>
          q.queryKey[0] === 'money' || q.queryKey[0] === 'ui-kit',
      }),
  })
}

/** Apply a label to a selector's transactions (source = user) and refresh. */
export function useApplyLabel() {
  const { fetchWithWorkspace } = useWorkspace()
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (input: ApplyLabelInput) => {
      const res = await fetchWithWorkspace('/api/labels/transactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          selector: input.selector,
          namespace: input.namespace,
          values: input.values,
          source: 'user',
          ...(input.teachRule ? { teachRule: true } : {}),
          ...(input.rule ? { rule: input.rule } : {}),
          dryRun: input.dryRun ?? false,
        }),
      })
      const body = await res.json().catch(() => ({}))
      if (!res.ok)
        throw new Error(body?.error?.message ?? 'Failed to apply label')
      return body
    },
    onSuccess: () =>
      queryClient.invalidateQueries({
        predicate: (q) =>
          q.queryKey[0] === 'money' || q.queryKey[0] === 'ui-kit',
      }),
  })
}

export interface LabelRule {
  id: string
  name?: string
  namespace: string
  values?: Record<string, unknown>
  scope?: string
  status?: 'active' | 'disabled'
  match?: Record<string, unknown>
  createdBy?: 'user' | 'agent'
}

/** Rules the user (or agent) has taught — surfaced so they can see/remove them. */
export function useLabelRules(enabled = true) {
  const { workspaceId, fetchWithWorkspace } = useWorkspace()
  return useQuery({
    queryKey: ['money', 'label-rules', workspaceId],
    enabled,
    queryFn: async (): Promise<{ rules: LabelRule[] }> => {
      const res = await fetchWithWorkspace('/api/labels/rules')
      if (!res.ok) throw new Error('Failed to load rules')
      const body = await res.json()
      return { rules: body.rules ?? body ?? [] }
    },
  })
}

/** Remove a taught rule (future charges stop auto-labeling from it). */
export function useDeleteLabelRule() {
  const { fetchWithWorkspace } = useWorkspace()
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await fetchWithWorkspace(
        `/api/labels/rules/${encodeURIComponent(id)}`,
        { method: 'DELETE' },
      )
      const body = await res.json().catch(() => ({}))
      if (!res.ok)
        throw new Error(body?.error?.message ?? 'Failed to remove rule')
      return body
    },
    onSuccess: () =>
      queryClient.invalidateQueries({
        predicate: (q) =>
          q.queryKey[0] === 'money' || q.queryKey[0] === 'ui-kit',
      }),
  })
}
