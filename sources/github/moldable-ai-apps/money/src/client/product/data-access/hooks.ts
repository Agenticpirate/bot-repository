/**
 * Data hooks for the Money product surface (Dashboards home + detail +
 * onboarding). These sit on top of the same backend the /ui-kit legos use, and
 * reuse the ui-kit card/dashboard queries where possible.
 */
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useWorkspace } from '@moldable-ai/ui'
import type { EvaluatedCard } from '../../ui-kit/lib/types'
import {
  useCardsQuery,
  useDashboardsQuery,
} from '../../ui-kit/data-access/hooks'
import { PERSONA_DASHBOARDS } from '../personas'

/* ---- data health / first-run ---- */

export interface DataHealth {
  generatedAt: string
  dataMode: 'live' | 'demo'
  counts: {
    accounts: number
    transactions: number
    debts: number
    holdings: number
    cards: number
    [k: string]: number
  }
}

export function useDataHealth() {
  const { workspaceId, fetchWithWorkspace } = useWorkspace()
  return useQuery({
    queryKey: ['money', 'data-health', workspaceId],
    queryFn: async (): Promise<DataHealth> => {
      const res = await fetchWithWorkspace('/api/data-health')
      if (!res.ok) throw new Error('Failed to load data health')
      return res.json()
    },
  })
}

/* ---- dashboards resolved to their cards ---- */

export interface ResolvedDashboard {
  id: string
  name: string
  /** Emoji icon (user-chosen or persona-seeded); may be absent on old data. */
  icon?: string
  cardIds: string[]
  cards: EvaluatedCard[]
}

/**
 * Combines `/api/dashboards` with the evaluated `/api/cards` so each dashboard
 * carries its resolved cards in order. Cards referenced by a dashboard but not
 * yet materialized are skipped (defensive — keeps the grid stable).
 */
export function useResolvedDashboards() {
  const dashboardsQuery = useDashboardsQuery()
  const cardsQuery = useCardsQuery()

  const cardsById = new Map<string, EvaluatedCard>()
  for (const card of cardsQuery.data?.cards ?? []) cardsById.set(card.id, card)

  const dashboards: ResolvedDashboard[] = (
    dashboardsQuery.data?.dashboards ?? []
  ).map((d) => ({
    id: d.id,
    name: d.name,
    icon: d.icon,
    cardIds: d.cardIds,
    cards: d.cardIds
      .map((id) => cardsById.get(id))
      .filter((c): c is EvaluatedCard => Boolean(c)),
  }))

  return {
    dashboards,
    isLoading: dashboardsQuery.isLoading || cardsQuery.isLoading,
    isError: dashboardsQuery.isError || cardsQuery.isError,
    error: (dashboardsQuery.error ?? cardsQuery.error) as Error | null,
    refetch: async () => {
      await Promise.all([dashboardsQuery.refetch(), cardsQuery.refetch()])
    },
  }
}

/* ---- provisioning persona dashboards ---- */

export interface ProvisionResult {
  provisioned: string[]
}

/**
 * Idempotently provision the curated persona dashboards via
 * `PATCH /api/dashboards/:id` (upsert by id). Only the requested ids are
 * written; existing dashboards with the same id are overwritten with the
 * curated card set, which is what "reset to best-practices" should do.
 */
export function useProvisionDashboards() {
  const { fetchWithWorkspace } = useWorkspace()
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (ids?: string[]): Promise<ProvisionResult> => {
      const targets = PERSONA_DASHBOARDS.filter(
        (p) => !ids || ids.includes(p.id),
      )
      const provisioned: string[] = []
      for (const persona of targets) {
        const res = await fetchWithWorkspace(
          `/api/dashboards/${encodeURIComponent(persona.id)}`,
          {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              name: persona.name,
              icon: persona.emoji,
              cardIds: persona.cardIds,
            }),
          },
        )
        if (res.ok) provisioned.push(persona.id)
      }
      return { provisioned }
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: ['ui-kit', 'dashboards'],
      })
    },
  })
}

/* ---- update a dashboard (rename / set cardIds) ---- */

export function useUpdateDashboard() {
  const { fetchWithWorkspace } = useWorkspace()
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({
      id,
      name,
      icon,
      cardIds,
    }: {
      id: string
      name?: string
      icon?: string
      cardIds?: string[]
    }) => {
      const res = await fetchWithWorkspace(
        `/api/dashboards/${encodeURIComponent(id)}`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            ...(name ? { name } : {}),
            ...(icon !== undefined ? { icon } : {}),
            ...(cardIds ? { cardIds } : {}),
          }),
        },
      )
      const body = await res.json().catch(() => ({}))
      if (!res.ok)
        throw new Error(body?.error?.message ?? 'Failed to update dashboard')
      return body
    },
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ['ui-kit', 'dashboards'] }),
  })
}

/* ---- reorder dashboards (server-persisted, syncs the default across devices) ---- */

export function useReorderDashboards() {
  const { fetchWithWorkspace } = useWorkspace()
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (ids: string[]) => {
      const res = await fetchWithWorkspace('/api/dashboards/reorder', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids }),
      })
      const body = await res.json().catch(() => ({}))
      if (!res.ok)
        throw new Error(body?.error?.message ?? 'Failed to reorder dashboards')
      return body
    },
    // Don't invalidate immediately: the local optimistic order already matches
    // what we just sent, and a refetch mid-drag would cause a flash.
    onSettled: () =>
      queryClient.invalidateQueries({ queryKey: ['ui-kit', 'dashboards'] }),
  })
}

/* ---- delete a dashboard ---- */

export function useDeleteDashboard() {
  const { fetchWithWorkspace } = useWorkspace()
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await fetchWithWorkspace(
        `/api/dashboards/${encodeURIComponent(id)}`,
        {
          method: 'DELETE',
        },
      )
      const body = await res.json().catch(() => ({}))
      if (!res.ok)
        throw new Error(body?.error?.message ?? 'Failed to delete dashboard')
      return body
    },
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ['ui-kit', 'dashboards'] }),
  })
}

/* ---- data mode ---- */

export {
  useDataModeQuery,
  useSetDataMode,
} from '../../ui-kit/data-access/hooks'
