export const SCRIBO_UI_VIEW_IDS = ['documents', 'document'] as const

export type ScriboUiViewId = (typeof SCRIBO_UI_VIEW_IDS)[number]

export interface ScriboUiIntent {
  id: string
  view: ScriboUiViewId
  entityId?: string
  params?: Record<string, unknown>
  createdAt: string
}
