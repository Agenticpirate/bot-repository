import { readConnection, readFolders, readSyncState } from './bookmark-files'
import { folderStatuses, readExcludedFolderIds } from './folder-selection'
import { getBookmark, searchBookmarks } from './search-index'
import { isSyncRunning, startSync } from './sync-service'
import { z } from 'zod'

export const bookmarksRpcRequestSchema = z.object({
  method: z.string().trim().min(1),
  params: z.record(z.string(), z.unknown()).optional().default({}),
})

const emptyParamsSchema = z.object({}).strict()
const pageParamsSchema = z
  .object({
    folderId: z.string().trim().min(1).max(200).optional(),
    offset: z.number().int().min(0).max(1_000_000).optional(),
    limit: z.number().int().min(1).max(100).optional(),
  })
  .strict()
const searchParamsSchema = pageParamsSchema.extend({
  query: z.string().trim().max(500).optional(),
})
const getParamsSchema = z.object({ id: z.string().trim().min(1) }).strict()

export class BookmarksRpcError extends Error {
  constructor(
    message: string,
    readonly status: 404 | 409,
  ) {
    super(message)
    this.name = 'BookmarksRpcError'
  }
}

export async function dispatchBookmarksRpc(
  workspaceId: string,
  method: string,
  params: Record<string, unknown>,
): Promise<unknown> {
  if (method === 'bookmarks.status') {
    emptyParamsSchema.parse(params)
    const [connection, sync, folders, excludedFolderIds] = await Promise.all([
      readConnection(workspaceId),
      readSyncState(workspaceId),
      readFolders(workspaceId),
      readExcludedFolderIds(workspaceId),
    ])
    return {
      connected: Boolean(connection),
      connection: connection
        ? {
            method: connection.method,
            account:
              connection.method === 'oauth'
                ? connection.username
                : `${connection.browserName} · ${connection.profileName}`,
          }
        : null,
      sync: isSyncRunning(workspaceId) ? { ...sync, status: 'syncing' } : sync,
      folders: folderStatuses(folders, excludedFolderIds),
    }
  }

  if (method === 'bookmarks.folders.list') {
    emptyParamsSchema.parse(params)
    const [folders, excludedFolderIds] = await Promise.all([
      readFolders(workspaceId),
      readExcludedFolderIds(workspaceId),
    ])
    return { folders: folderStatuses(folders, excludedFolderIds) }
  }

  if (method === 'bookmarks.list' || method === 'bookmarks.search') {
    const parsed =
      method === 'bookmarks.list'
        ? pageParamsSchema.parse(params)
        : searchParamsSchema.parse(params)
    return searchBookmarks({
      workspaceId,
      ...parsed,
      excludedFolderIds: await readExcludedFolderIds(workspaceId),
    })
  }

  if (
    method === 'bookmarks.cards.present' ||
    method === 'bookmarks.cards.read'
  ) {
    const { id } = getParamsSchema.parse(params)
    const record = await getBookmark(workspaceId, id)
    if (!record) throw new BookmarksRpcError('Bookmark not found', 404)
    if (method === 'bookmarks.cards.read')
      return {
        id: record.id,
        text: record.text.slice(0, 20_000),
        authorName: record.authorName,
        authorHandle: record.authorHandle,
        authorProfileImageUrl: record.authorProfileImageUrl,
        postedAt: record.postedAt,
        media: record.media.slice(0, 8),
        quotedPost: record.quotedPost
          ? {
              ...record.quotedPost,
              text: record.quotedPost.text.slice(0, 4000),
            }
          : undefined,
        truncated: record.text.length > 20_000 || record.media.length > 8,
      }
    return {
      appCard: {
        version: 1,
        title: (record.authorName || record.authorHandle || 'Bookmark').slice(
          0,
          240,
        ),
        resourcePath: '/index.html?card=bookmark',
        input: { id },
        readMethod: 'bookmarks.cards.read',
        actions: [],
        height: 400,
      },
    }
  }

  if (method === 'bookmarks.get') {
    const { id } = getParamsSchema.parse(params)
    const record = await getBookmark(workspaceId, id)
    if (!record) throw new BookmarksRpcError('Bookmark not found', 404)
    return record
  }

  if (method === 'bookmarks.sync') {
    emptyParamsSchema.parse(params)
    if (!(await readConnection(workspaceId))) {
      throw new BookmarksRpcError('Connect an X account before syncing', 409)
    }
    const alreadyRunning = isSyncRunning(workspaceId)
    void startSync(workspaceId).catch(() => undefined)
    return { started: !alreadyRunning, alreadyRunning }
  }

  throw new BookmarksRpcError(`Unknown Bookmarks method: ${method}`, 404)
}
