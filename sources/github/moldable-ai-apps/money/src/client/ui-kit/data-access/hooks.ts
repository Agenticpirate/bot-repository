/**
 * React Query hooks over the real Money backend. The /ui-kit surface uses these
 * for its live dashboard, schema-driven playground, and data-mode toggle.
 */
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useWorkspace } from '@moldable-ai/ui'
import type {
  CardDefinition,
  CardDefinitionInput,
  CardTemplate,
  CardTestResponse,
  CardTransactionsPage,
  CollectionMetric,
  DashboardDefinition,
  EvaluatedCard,
  FormulaDiagnostic,
  FormulaSchema,
  PreviewResponse,
  TransactionFilters,
} from '../lib/types'

export interface CardsResponse {
  definitions: CardDefinition[]
  cards: EvaluatedCard[]
  materialized: unknown[]
}

export function useCardsQuery() {
  const { workspaceId, fetchWithWorkspace } = useWorkspace()
  return useQuery({
    queryKey: ['ui-kit', 'cards', workspaceId],
    queryFn: async (): Promise<CardsResponse> => {
      const res = await fetchWithWorkspace('/api/cards')
      if (!res.ok) throw new Error('Failed to load cards')
      return res.json()
    },
  })
}

export function useSchemaQuery() {
  const { workspaceId, fetchWithWorkspace } = useWorkspace()
  return useQuery({
    queryKey: ['ui-kit', 'schema', workspaceId],
    queryFn: async (): Promise<FormulaSchema> => {
      const res = await fetchWithWorkspace('/api/formulas/schema')
      if (!res.ok) throw new Error('Failed to load formula schema')
      return res.json()
    },
  })
}

export function useDashboardsQuery() {
  const { workspaceId, fetchWithWorkspace } = useWorkspace()
  return useQuery({
    queryKey: ['ui-kit', 'dashboards', workspaceId],
    queryFn: async (): Promise<{ dashboards: DashboardDefinition[] }> => {
      const res = await fetchWithWorkspace('/api/dashboards')
      if (!res.ok) throw new Error('Failed to load dashboards')
      return res.json()
    },
  })
}

export interface DataModeResponse {
  dataMode: 'live' | 'demo'
  generatedAt: string
}

export function useDataModeQuery() {
  const { workspaceId, fetchWithWorkspace } = useWorkspace()
  return useQuery({
    queryKey: ['ui-kit', 'data-mode', workspaceId],
    queryFn: async (): Promise<DataModeResponse> => {
      const res = await fetchWithWorkspace('/api/data-mode')
      if (!res.ok) throw new Error('Failed to load data mode')
      return res.json()
    },
  })
}

export function useSetDataMode() {
  const { workspaceId, fetchWithWorkspace } = useWorkspace()
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (
      dataMode: 'live' | 'demo',
    ): Promise<DataModeResponse> => {
      const res = await fetchWithWorkspace('/api/data-mode', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dataMode }),
      })
      if (!res.ok) throw new Error('Failed to update data mode')
      return res.json()
    },
    onSuccess: (result) => {
      queryClient.setQueryData(['ui-kit', 'data-mode', workspaceId], result)
      void queryClient.invalidateQueries({
        predicate: (q) =>
          q.queryKey[0] === 'money' || q.queryKey[0] === 'ui-kit',
      })
    },
  })
}

export interface PreviewState {
  response: PreviewResponse
  collections: CollectionMetric[]
}

export function usePreviewMutation() {
  const { fetchWithWorkspace } = useWorkspace()
  return useMutation({
    mutationFn: async (formula: string): Promise<PreviewResponse> => {
      const res = await fetchWithWorkspace('/api/formulas/preview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ formula }),
      })
      // Both success and validation-failure return JSON; surface either.
      return res.json()
    },
  })
}

/* ---- card authoring ---- */

/**
 * Curated starter cards from `GET /api/cards/templates`. Requested with
 * `includeEvaluation=true` so each template carries a live `test` result the
 * author UI can show (tested ✓ / needs data) without a second round-trip.
 */
export function useCardTemplatesQuery() {
  const { workspaceId, fetchWithWorkspace } = useWorkspace()
  return useQuery({
    queryKey: ['ui-kit', 'card-templates', workspaceId],
    queryFn: async (): Promise<{
      templates: CardTemplate[]
      categories: string[]
    }> => {
      const res = await fetchWithWorkspace(
        '/api/cards/templates?includeEvaluation=true&limit=100',
      )
      if (!res.ok) throw new Error('Failed to load card templates')
      return res.json()
    },
  })
}

/**
 * Validate + evaluate proposed cards without writing (`POST /api/cards/test`).
 * Returns per-card success/failure plus `repairHints` for diagnostics — used to
 * gate the Save button on a green test.
 */
export function useTestCardsMutation() {
  const { fetchWithWorkspace } = useWorkspace()
  return useMutation({
    mutationFn: async (
      cards: CardDefinitionInput[],
    ): Promise<CardTestResponse> => {
      const res = await fetchWithWorkspace('/api/cards/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cards }),
      })
      return res.json()
    },
  })
}

export interface SaveCardResult {
  ok: boolean
  error?: {
    code: string
    message: string
    formulaKey?: string
    diagnostics?: FormulaDiagnostic[]
  }
}

/** Persist a card via `POST /api/cards`, then refresh the live dashboard. */
export function useSaveCardMutation() {
  const { fetchWithWorkspace } = useWorkspace()
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (card: CardDefinitionInput): Promise<SaveCardResult> => {
      const res = await fetchWithWorkspace('/api/cards', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(card),
      })
      const body = await res.json().catch(() => ({}))
      if (!res.ok) {
        return {
          ok: false,
          error: body?.error ?? {
            code: 'save_failed',
            message: 'Failed to save card',
          },
        }
      }
      return { ok: true, ...body }
    },
    onSuccess: async (result) => {
      if (result.ok) {
        await queryClient.invalidateQueries({ queryKey: ['ui-kit', 'cards'] })
        await queryClient.invalidateQueries({
          queryKey: ['ui-kit', 'dashboards'],
        })
      }
    },
  })
}

/* ---- transaction drilldown ---- */

/**
 * Card-scoped transaction facts from `GET /api/cards/:id/transactions`. The
 * backend resolves the card's formula/collection and returns the rows behind the
 * number (exact formula matches when it can, else the backing collection) — so
 * the drilldown reflects what the card actually counts rather than every
 * transaction. `enabled` gates the fetch until a drilldown opens.
 */
export function useCardTransactionsQuery(
  cardId: string | null,
  filters: TransactionFilters,
  enabled: boolean,
) {
  const { workspaceId, fetchWithWorkspace } = useWorkspace()
  return useQuery({
    queryKey: ['ui-kit', 'card-transactions', workspaceId, cardId, filters],
    enabled: enabled && Boolean(cardId),
    placeholderData: (prev) => prev,
    queryFn: async (): Promise<CardTransactionsPage> => {
      const params = new URLSearchParams()
      if (filters.q) params.set('q', filters.q)
      if (filters.category) params.set('category', filters.category)
      if (filters.direction) params.set('direction', filters.direction)
      if (filters.startDate) params.set('startDate', filters.startDate)
      if (filters.endDate) params.set('endDate', filters.endDate)
      params.set('limit', String(filters.limit ?? 25))
      params.set('offset', String(filters.offset ?? 0))
      const res = await fetchWithWorkspace(
        `/api/cards/${encodeURIComponent(cardId ?? '')}/transactions?${params.toString()}`,
      )
      if (!res.ok) throw new Error('Failed to load transactions')
      return res.json()
    },
  })
}
