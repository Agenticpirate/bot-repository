import { readJson, writeJson } from '@moldable-ai/storage'
import type { BookmarkFolder, BookmarkFolderStatus } from '../shared/bookmarks'
import { readFolders } from './bookmark-files'
import { bookmarkPaths } from './paths'

interface FolderPreferences {
  excludedFolderIds: string[]
}

const EMPTY_PREFERENCES: FolderPreferences = { excludedFolderIds: [] }

export async function readExcludedFolderIds(
  workspaceId: string,
): Promise<Set<string>> {
  const preferences = await readJson(
    bookmarkPaths(workspaceId).folderPreferences,
    EMPTY_PREFERENCES,
  )
  return new Set(preferences.excludedFolderIds)
}

export function folderStatuses(
  folders: BookmarkFolder[],
  excludedFolderIds: ReadonlySet<string>,
): BookmarkFolderStatus[] {
  return folders.map((folder) => ({
    ...folder,
    selected: !excludedFolderIds.has(folder.id),
  }))
}

export async function updateFolderSelection(
  workspaceId: string,
  selectedFolderIds: string[],
): Promise<{ folders: BookmarkFolderStatus[]; reenabled: boolean }> {
  const [folders, previousExcluded] = await Promise.all([
    readFolders(workspaceId),
    readExcludedFolderIds(workspaceId),
  ])
  const selected = new Set(selectedFolderIds)
  const excluded = new Set(
    folders
      .filter((folder) => !selected.has(folder.id))
      .map((folder) => folder.id),
  )
  const reenabled = [...previousExcluded].some(
    (folderId) => !excluded.has(folderId),
  )

  await writeJson(bookmarkPaths(workspaceId).folderPreferences, {
    excludedFolderIds: [...excluded],
  } satisfies FolderPreferences)

  return { folders: folderStatuses(folders, excluded), reenabled }
}
