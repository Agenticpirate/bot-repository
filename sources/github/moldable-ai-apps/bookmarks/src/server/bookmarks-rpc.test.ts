import type { BookmarkRecord } from '../shared/bookmarks'
import { app } from './app'
import { writeBookmarks, writeFolders } from './bookmark-files'
import { updateFolderSelection } from './folder-selection'
import { clearSearchIndex } from './search-index'
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'

const WORKSPACE_ID = 'rpc-test'

describe('Bookmarks app RPC', () => {
  const originalDataDir = process.env.MOLDABLE_APP_DATA_DIR
  let dataDir = ''

  beforeEach(async () => {
    dataDir = await mkdtemp(path.join(tmpdir(), 'bookmarks-rpc-'))
    process.env.MOLDABLE_APP_DATA_DIR = dataDir
    clearSearchIndex(WORKSPACE_ID)

    await writeBookmarks(WORKSPACE_ID, [
      bookmark({
        id: 'visible',
        text: 'A practical guide to local-first search',
        folderIds: ['research'],
        folderNames: ['Research'],
      }),
      bookmark({
        id: 'hidden',
        text: 'A marketing launch checklist',
        folderIds: ['marketing'],
        folderNames: ['Marketing'],
      }),
    ])
    await writeFolders(WORKSPACE_ID, [
      { id: 'research', name: 'Research', count: 1 },
      { id: 'marketing', name: 'Marketing', count: 1 },
    ])
    await updateFolderSelection(WORKSPACE_ID, ['research'])
  })

  afterEach(async () => {
    clearSearchIndex(WORKSPACE_ID)
    if (originalDataDir === undefined) {
      delete process.env.MOLDABLE_APP_DATA_DIR
    } else {
      process.env.MOLDABLE_APP_DATA_DIR = originalDataDir
    }
    await rm(dataDir, { recursive: true, force: true })
  })

  it('lists and searches only locally enabled bookmark categories', async () => {
    const listed = await rpc('bookmarks.list', { limit: 10 })
    expect(listed.status).toBe(200)
    await expect(listed.json()).resolves.toMatchObject({
      ok: true,
      result: {
        total: 1,
        items: [{ id: 'visible' }],
      },
    })

    const searched = await rpc('bookmarks.search', { query: 'local-first' })
    expect(searched.status).toBe(200)
    await expect(searched.json()).resolves.toMatchObject({
      ok: true,
      result: { items: [{ id: 'visible' }] },
    })
  })

  it('returns folder, status, and full bookmark detail projections', async () => {
    const folders = await rpc('bookmarks.folders.list')
    await expect(folders.json()).resolves.toMatchObject({
      ok: true,
      result: {
        folders: [
          { id: 'research', selected: true },
          { id: 'marketing', selected: false },
        ],
      },
    })

    const status = await rpc('bookmarks.status')
    await expect(status.json()).resolves.toMatchObject({
      ok: true,
      result: {
        connected: false,
        sync: { totalBookmarks: 0 },
      },
    })

    const detail = await rpc('bookmarks.get', { id: 'visible' })
    await expect(detail.json()).resolves.toMatchObject({
      ok: true,
      result: {
        id: 'visible',
        text: 'A practical guide to local-first search',
        links: ['https://example.com/visible'],
      },
    })
  })

  it('returns bounded errors for unknown methods and missing bookmarks', async () => {
    const unknown = await rpc('bookmarks.unknown')
    expect(unknown.status).toBe(404)

    const missing = await rpc('bookmarks.get', { id: 'missing' })
    expect(missing.status).toBe(404)
    await expect(missing.json()).resolves.toEqual({
      error: 'Bookmark not found',
    })
  })
})

function rpc(method: string, params: Record<string, unknown> = {}) {
  return app.request('/api/moldable/rpc', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-moldable-workspace': WORKSPACE_ID,
    },
    body: JSON.stringify({ method, params }),
  })
}

function bookmark(
  overrides: Pick<BookmarkRecord, 'id' | 'text' | 'folderIds' | 'folderNames'>,
): BookmarkRecord {
  return {
    ...overrides,
    url: `https://x.com/example/status/${overrides.id}`,
    authorHandle: 'example',
    authorName: 'Example',
    postedAt: '2026-08-27T12:00:00.000Z',
    bookmarkedAt: '2026-08-27T13:00:00.000Z',
    syncedAt: '2026-08-27T13:00:00.000Z',
    links: [`https://example.com/${overrides.id}`],
    media: [],
    source: 'x-browser-session',
  }
}
