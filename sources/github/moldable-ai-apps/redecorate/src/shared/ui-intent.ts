export const REDECORATE_UI_VIEW_IDS = [
  'home',
  'all',
  'favorites',
  'folder',
  'design',
] as const

export type RedecorateUiViewId = (typeof REDECORATE_UI_VIEW_IDS)[number]

export interface RedecorateUiIntent {
  id: string
  view: RedecorateUiViewId
  entityId?: string
  params?: Record<string, unknown>
  createdAt: string
}
