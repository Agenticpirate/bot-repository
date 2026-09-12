import type { BookmarkRecord } from '../shared/bookmarks'
import { readBookmarks, writeBookmarks, writeFolders } from './bookmark-files'
import {
  readExcludedFolderIds,
  updateFolderSelection,
} from './folder-selection'
import { clearSearchIndex, searchBookmarks } from './search-index'
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'

const originalHome = process.env.MOLDABLE_HOME
const originalAppId = process.env.MOLDABLE_APP_ID
const temporaryHomes: string[] = []

afterEach(async () => {
  restoreEnvironment('MOLDABLE_HOME', originalHome)
  restoreEnvironment('MOLDABLE_APP_ID', originalAppId)
  clearSearchIndex('personal')
  await Promise.all(
    temporaryHomes
      .splice(0)
      .map((directory) => rm(directory, { recursive: true, force: true })),
  )
})

describe('bookmark folder selection', () => {
  it('persists excluded folders and removes their local associations', async () => {
    await useTemporaryMoldableHome()
    await writeFolders('personal', [
      { id: 'ideas', name: 'Ideas', count: 1 },
      { id: 'later', name: 'Read later', count: 1 },
    ])
    await writeBookmarks('personal', [
      record('1', ['ideas', 'later'], ['Ideas', 'Read later']),
      record('2', ['later'], ['Read later']),
    ])

    const result = await updateFolderSelection('personal', ['ideas'])

    expect(result.folders).toEqual([
      { id: 'ideas', name: 'Ideas', count: 1, selected: true },
      { id: 'later', name: 'Read later', count: 1, selected: false },
    ])
    const excludedFolderIds = await readExcludedFolderIds('personal')
    expect([...excludedFolderIds]).toEqual(['later'])
    await expect(readBookmarks('personal')).resolves.toMatchObject([
      { folderIds: ['ideas', 'later'], folderNames: ['Ideas', 'Read later'] },
      { folderIds: ['later'], folderNames: ['Read later'] },
    ])
    await expect(
      searchBookmarks({ workspaceId: 'personal', excludedFolderIds }),
    ).resolves.toMatchObject({ items: [{ id: '1' }], total: 1 })
    await expect(
      searchBookmarks({
        workspaceId: 'personal',
        folderId: 'later',
        excludedFolderIds,
      }),
    ).resolves.toMatchObject({ items: [], total: 0 })
  })
})

async function useTemporaryMoldableHome(): Promise<void> {
  const directory = await mkdtemp(join(tmpdir(), 'bookmarks-folders-test-'))
  temporaryHomes.push(directory)
  process.env.MOLDABLE_HOME = directory
  process.env.MOLDABLE_APP_ID = 'bookmarks'
}

function restoreEnvironment(name: string, value: string | undefined): void {
  if (value === undefined) delete process.env[name]
  else process.env[name] = value
}

function record(
  id: string,
  folderIds: string[],
  folderNames: string[],
): BookmarkRecord {
  return {
    id,
    url: `https://x.com/example/status/${id}`,
    text: 'One bookmark in two folders',
    syncedAt: '2026-08-27T12:00:00.000Z',
    links: [],
    media: [],
    folderIds,
    folderNames,
    source: 'x-browser-session',
  }
}
