export const GUITAR_UI_VIEWS = [
  'library',
  'courses',
  'folder',
  'course',
  'lesson',
  'practice',
] as const

export type GuitarUiView = (typeof GUITAR_UI_VIEWS)[number]

export interface GuitarUiIntent {
  id: string
  view: GuitarUiView
  entityId?: string
  params?: Record<string, unknown>
  createdAt: string
}
