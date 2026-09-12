export const CALENDAR_UI_VIEWS = ['day', 'month'] as const

export type CalendarUiView = (typeof CALENDAR_UI_VIEWS)[number]

export interface CalendarUiIntent {
  id: string
  view: CalendarUiView
  entityId: string
  params?: Record<string, unknown>
  createdAt: string
}
