import { ensureDir, getAppDataDir, safePath } from '@moldable-ai/storage'

export interface BookmarkPaths {
  dataDir: string
  archive: string
  folders: string
  folderPreferences: string
  connection: string
  syncState: string
  oauthDir: string
}

export function bookmarkPaths(workspaceId: string): BookmarkPaths {
  const dataDir = getAppDataDir(workspaceId)
  return {
    dataDir,
    archive: safePath(dataDir, 'bookmarks.jsonl'),
    folders: safePath(dataDir, 'folders.json'),
    folderPreferences: safePath(dataDir, 'folder-preferences.json'),
    connection: safePath(dataDir, 'connection.json'),
    syncState: safePath(dataDir, 'sync-state.json'),
    oauthDir: safePath(dataDir, 'oauth'),
  }
}

export async function ensureBookmarkDataDir(
  workspaceId: string,
): Promise<void> {
  const paths = bookmarkPaths(workspaceId)
  await Promise.all([ensureDir(paths.dataDir), ensureDir(paths.oauthDir)])
}
