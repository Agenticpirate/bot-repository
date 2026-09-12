export const READER_UI_VIEW_IDS = ['library', 'reader'] as const

export type ReaderUiViewId = (typeof READER_UI_VIEW_IDS)[number]

export interface ReaderUiIntent {
  id: string
  view: ReaderUiViewId
  entityId?: string
  params?: Record<string, unknown>
  createdAt: string
  acknowledgedAt?: string
}
