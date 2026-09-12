export const ARTIFACTS_UI_VIEWS = [
  'library',
  'artifact',
  'presentation',
] as const

export type ArtifactsUiView = (typeof ARTIFACTS_UI_VIEWS)[number]

export interface ArtifactsUiIntent {
  id: string
  view: ArtifactsUiView
  entityId?: string
  params?: Record<string, unknown>
  createdAt: string
}
