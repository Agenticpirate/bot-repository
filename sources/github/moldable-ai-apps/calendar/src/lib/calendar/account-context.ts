import { AsyncLocalStorage } from 'node:async_hooks'

export interface CalendarAccountContext {
  workspaceId: string
  accountId: string
  vaultGroupId?: string
}

const calendarAccountStorage = new AsyncLocalStorage<CalendarAccountContext>()

export function runWithCalendarAccountContext<T>(
  context: CalendarAccountContext,
  task: () => T,
): T {
  return calendarAccountStorage.run(context, task)
}

export function getCalendarAccountContext(workspaceId?: string) {
  const context = calendarAccountStorage.getStore()
  if (!context) return null
  if (workspaceId && context.workspaceId !== workspaceId) return null
  return context
}
