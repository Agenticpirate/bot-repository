import type { BookmarkRecord } from '../shared/bookmarks'
import { readBookmarks, writeBookmarks } from './bookmark-files'
import { bookmarkPaths } from './paths'
import { clearSearchIndex, searchBookmarks } from './search-index'
import { mkdtemp, readFile, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'

const originalHome = process.env.MOLDABLE_HOME
const originalAppId = process.env.MOLDABLE_APP_ID
const temporaryHomes: string[] = []

afterEach(async () => {
  process.env.MOLDABLE_HOME = originalHome
  process.env.MOLDABLE_APP_ID = originalAppId
  clearSearchIndex('personal')
  await Promise.all(
    temporaryHomes
      .splice(0)
      .map((directory) => rm(directory, { recursive: true, force: true })),
  )
})

describe('filesystem bookmark archive', () => {
  it('writes canonical workspace-scoped JSONL and reads it back', async () => {
    await useTemporaryMoldableHome()
    const records = [record('1', 'A careful note about local-first software')]

    await writeBookmarks('personal', records)

    await expect(readBookmarks('personal')).resolves.toEqual(records)
    const raw = await readFile(bookmarkPaths('personal').archive, 'utf8')
    expect(raw.trim().split('\n')).toHaveLength(1)
    expect(JSON.parse(raw)).toMatchObject({ id: '1', text: records[0].text })
  })

  it('searches text, author, links, and folder names without a database', async () => {
    await useTemporaryMoldableHome()
    await writeBookmarks('personal', [
      {
        ...record('1', 'Local-first software is calm software'),
        authorHandle: 'maggie',
        folderIds: ['ideas'],
        folderNames: ['Product ideas'],
      },
      {
        ...record('2', 'A recipe for sourdough'),
        authorHandle: 'baker',
      },
    ])

    const result = await searchBookmarks({
      workspaceId: 'personal',
      query: 'local software',
      limit: 10,
    })
    expect(result.items.map((item) => item.id)).toEqual(['1'])

    clearSearchIndex('personal')
    const folderResult = await searchBookmarks({
      workspaceId: 'personal',
      folderId: 'ideas',
      limit: 10,
    })
    expect(folderResult.items.map((item) => item.id)).toEqual(['1'])
  })
})

async function useTemporaryMoldableHome(): Promise<void> {
  const directory = await mkdtemp(join(tmpdir(), 'bookmarks-storage-test-'))
  temporaryHomes.push(directory)
  process.env.MOLDABLE_HOME = directory
  process.env.MOLDABLE_APP_ID = 'bookmarks'
}

function record(id: string, text: string): BookmarkRecord {
  return {
    id,
    url: `https://x.com/example/status/${id}`,
    text,
    syncedAt: '2026-08-27T12:00:00.000Z',
    links: [],
    media: [],
    folderIds: [],
    folderNames: [],
    source: 'x-browser-session',
  }
}
