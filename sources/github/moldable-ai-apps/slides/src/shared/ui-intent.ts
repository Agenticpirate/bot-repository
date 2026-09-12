export const SLIDES_UI_VIEW_IDS = ['decks', 'editor', 'presentation'] as const

export type SlidesUiViewId = (typeof SLIDES_UI_VIEW_IDS)[number]

export interface SlidesUiIntent {
  id: string
  view: SlidesUiViewId
  entityId?: string
  params?: {
    slideIndex?: number
  }
  createdAt: string
}
