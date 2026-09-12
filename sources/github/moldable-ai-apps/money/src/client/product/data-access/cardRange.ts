import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useCallback } from 'react'
import { useWorkspace } from '@moldable-ai/ui'
import type { EvaluatedCard, FormulaResultValue } from '../../ui-kit/lib/types'
import type { CardPeriod } from '../../ui-kit/cards/cardScope'

interface RangeEval {
  value: FormulaResultValue
  displayValue: string
  outputType?: string
  scope?: EvaluatedCard['scope']
}

type RangeMap = Record<string, CardPeriod>

const rangesKey = (workspaceId: string) => ['money', 'card-ranges', workspaceId]

/**
 * The user's saved per-card windows for this workspace. Persisted server-side in
 * `settings.json` (workspace-scoped, Git-backed, RPC-visible) via
 * `GET/PATCH /api/card-ranges` — NOT browser storage, per the Moldable storage
 * pattern. All cards share this one query (react-query dedups), so it's a single
 * request per dashboard.
 */
function useCardRangePrefs() {
  const { workspaceId, fetchWithWorkspace } = useWorkspace()
  return useQuery({
    queryKey: rangesKey(workspaceId),
    staleTime: 5 * 60_000,
    queryFn: async (): Promise<RangeMap> => {
      const res = await fetchWithWorkspace('/api/card-ranges')
      if (!res.ok) return {}
      const body = (await res.json().catch(() => ({}))) as { ranges?: RangeMap }
      return body.ranges ?? {}
    },
  })
}

function useSaveCardRange() {
  const { workspaceId, fetchWithWorkspace } = useWorkspace()
  const qc = useQueryClient()
  const key = rangesKey(workspaceId)
  return useMutation({
    mutationFn: async ({
      cardId,
      period,
    }: {
      cardId: string
      period: CardPeriod | null
    }) => {
      const res = await fetchWithWorkspace('/api/card-ranges', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ranges: { [cardId]: period } }),
      })
      if (!res.ok) throw new Error('Could not save card range')
      return (await res.json()) as { ranges: RangeMap }
    },
    // Optimistic: update the shared prefs cache immediately so the card re-windows
    // without waiting for the round-trip; roll back on error.
    onMutate: async ({ cardId, period }) => {
      await qc.cancelQueries({ queryKey: key })
      const prev = qc.getQueryData<RangeMap>(key)
      qc.setQueryData<RangeMap>(key, (old = {}) => {
        const next = { ...old }
        if (period) next[cardId] = period
        else delete next[cardId]
        return next
      })
      return { prev }
    },
    onError: (_e, _v, ctx) => {
      if (ctx?.prev) qc.setQueryData(key, ctx.prev)
    },
    onSuccess: (data) => {
      qc.setQueryData(key, data.ranges ?? {})
    },
  })
}

/**
 * Re-window a single card to the user's chosen period via
 * `GET /api/cards/:id/evaluate?period=`. The backend re-windows the formula at
 * the AST level (FX-normalized like the cached value) and returns the recomputed
 * value + scope. The chosen period is persisted per workspace (see
 * `useCardRangePrefs`) so the card reloads with the same window. The hook is a
 * no-op (returns the original card) until the effective period differs from the
 * card's default, so untouched cards never refetch.
 */
export function useCardRange(card: EvaluatedCard) {
  const { workspaceId, fetchWithWorkspace } = useWorkspace()
  const prefs = useCardRangePrefs()
  const save = useSaveCardRange()
  const defaultPeriod = card.scope?.period
  const period = prefs.data?.[card.id] ?? defaultPeriod

  const setPeriod = useCallback(
    (next: CardPeriod) => {
      // Clear the saved entry when back to the card's own default, so a later
      // default re-tune isn't pinned.
      save.mutate({
        cardId: card.id,
        period: next === defaultPeriod ? null : next,
      })
    },
    [card.id, defaultPeriod, save],
  )

  const overriding = Boolean(period && period !== defaultPeriod)

  const query = useQuery({
    queryKey: ['money', 'card-range', workspaceId, card.id, period],
    enabled: overriding,
    staleTime: 60_000,
    queryFn: async (): Promise<RangeEval> => {
      const res = await fetchWithWorkspace(
        `/api/cards/${encodeURIComponent(card.id)}/evaluate?period=${period}`,
      )
      if (!res.ok) throw new Error('Could not re-window this card')
      return res.json()
    },
  })

  // While a re-window is in flight, keep showing the previous value (no flicker).
  const shownCard: EvaluatedCard =
    overriding && query.data
      ? {
          ...card,
          value: query.data.value,
          displayValue: query.data.displayValue,
          scope: query.data.scope ?? card.scope,
        }
      : card

  return {
    period: period ?? defaultPeriod,
    setPeriod,
    shownCard,
    isFetching: overriding && query.isFetching,
    isError: overriding && query.isError,
  }
}
