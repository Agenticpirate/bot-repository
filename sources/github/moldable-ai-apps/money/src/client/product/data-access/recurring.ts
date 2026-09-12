/**
 * Recurring series (subscriptions + obligations) for the management surface.
 * `GET /api/recurring/series` groups transaction-level recurring labels into
 * series and hands back executable `reviewActions` (keep / skip / cancel) that
 * are `money.transactions.labelApply` payloads.
 */
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useWorkspace } from '@moldable-ai/ui'

export interface ReviewActionPayload {
  selector?: Record<string, unknown>
  namespace?: string
  source?: 'user' | 'agent' | 'rule' | 'provider'
  confidence?: number
  values?: Record<string, string | number | boolean | null>
  teachRule?: boolean
  rule?: {
    id?: string
    name?: string
    scope?: string
    match?: Record<string, unknown>
  }
  applyRequest?: ReviewActionPayload
}

export interface RecurringSeries {
  namespace: string
  key: string
  name: string
  status: string
  cadence: string
  monthlyAmount: number
  nextDueDate?: string
  confidence?: number
  labelSelector?: Record<string, unknown>
  reviewActions?: {
    activate?: ReviewActionPayload
    skip?: ReviewActionPayload
    dismiss?: ReviewActionPayload
  }
}

export interface RecurringSeriesResponse {
  series: RecurringSeries[]
  total: number
  counts?: { monthlyAmount?: number; [k: string]: number | undefined }
}

export function useRecurringSeries(namespace: string, enabled = true) {
  const { workspaceId, fetchWithWorkspace } = useWorkspace()
  return useQuery({
    queryKey: ['money', 'recurring', workspaceId, namespace],
    enabled,
    queryFn: async (): Promise<RecurringSeriesResponse> => {
      const res = await fetchWithWorkspace(
        `/api/recurring/series?namespace=${encodeURIComponent(namespace)}`,
      )
      if (!res.ok) throw new Error('Failed to load recurring series')
      return res.json()
    },
  })
}

/** Execute a series review action (keep / skip / cancel) via labelApply. */
export function useRecurringAction() {
  const { fetchWithWorkspace } = useWorkspace()
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (action: ReviewActionPayload) => {
      const request = action.applyRequest ?? action
      const res = await fetchWithWorkspace('/api/labels/transactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          selector: request.selector,
          namespace: request.namespace,
          values: request.values,
          source: 'user',
          ...(typeof request.confidence === 'number'
            ? { confidence: request.confidence }
            : {}),
          ...(request.teachRule ? { teachRule: true } : {}),
          ...(request.rule ? { rule: request.rule } : {}),
        }),
      })
      const body = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(body?.error?.message ?? 'Action failed')
      return body
    },
    onSuccess: () =>
      queryClient.invalidateQueries({
        predicate: (q) =>
          q.queryKey[0] === 'money' || q.queryKey[0] === 'ui-kit',
      }),
  })
}
