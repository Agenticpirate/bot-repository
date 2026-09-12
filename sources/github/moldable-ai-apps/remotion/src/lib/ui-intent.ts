export const REMOTION_UI_VIEW_IDS = ['projects', 'project'] as const

export type RemotionUiViewId = (typeof REMOTION_UI_VIEW_IDS)[number]

export interface RemotionUiIntent {
  id: string
  view: RemotionUiViewId
  entityId?: string
  params?: Record<string, unknown>
  createdAt: string
}
