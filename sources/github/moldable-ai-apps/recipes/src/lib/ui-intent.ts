export const RECIPES_UI_VIEW_IDS = [
  'library',
  'favorites',
  'folder',
  'recipe',
] as const

export type RecipesUiViewId = (typeof RECIPES_UI_VIEW_IDS)[number]

export interface RecipesUiIntent {
  id: string
  view: RecipesUiViewId
  entityId?: string
  params?: Record<string, unknown>
  createdAt: string
}
