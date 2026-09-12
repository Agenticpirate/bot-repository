import { startSyncIfStale } from './sync-service'

const scheduledWorkspaces = new Set<string>()
const CHECK_INTERVAL_MS = 60 * 60 * 1_000

export function ensureDailySyncSchedule(workspaceId: string): void {
  if (scheduledWorkspaces.has(workspaceId)) return
  scheduledWorkspaces.add(workspaceId)
  void startSyncIfStale(workspaceId)
  const timer = setInterval(() => {
    void startSyncIfStale(workspaceId)
  }, CHECK_INTERVAL_MS)
  timer.unref()
}
