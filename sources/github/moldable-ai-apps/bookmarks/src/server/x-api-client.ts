import type { BookmarkFolder, BookmarkRecord } from '../shared/bookmarks'
import { invokeXJson } from './aivault'
import type { BookmarkPageHandler } from './sync-source'
import {
  apiTweetToBookmark,
  asObject,
  asObjects,
  stringValue,
} from './x-normalize'

const POST_FIELDS = [
  'attachments',
  'author_id',
  'conversation_id',
  'created_at',
  'entities',
  'lang',
  'public_metrics',
].join(',')
const USER_FIELDS = ['name', 'profile_image_url', 'username', 'verified'].join(
  ',',
)
const MEDIA_FIELDS = [
  'alt_text',
  'height',
  'media_key',
  'preview_image_url',
  'type',
  'url',
  'width',
].join(',')

interface ApiPage {
  records: BookmarkRecord[]
  nextToken?: string
}

export async function getXOAuthProfile(
  workspaceId: string,
): Promise<{ id: string; username?: string }> {
  const response = await invokeXJson<unknown>(
    workspaceId,
    '/2/users/me?user.fields=username',
  )
  const data = asObject(asObject(response)?.data)
  const id = stringValue(data?.id)
  if (!id) throw new Error('X did not return the authenticated user')
  return { id, username: stringValue(data?.username) }
}

export async function fetchApiBookmarks(options: {
  workspaceId: string
  userId: string
  knownIds: Set<string>
  onPage?: BookmarkPageHandler
}): Promise<{ records: BookmarkRecord[]; pages: number }> {
  const records = new Map<string, BookmarkRecord>()
  let nextToken: string | undefined
  let pages = 0
  let reachedKnown = false
  do {
    const page = await fetchPostPage(
      options.workspaceId,
      bookmarksPath(options.userId, nextToken),
    )
    pages += 1
    const newRecords: BookmarkRecord[] = []
    for (const record of page.records) {
      if (options.knownIds.has(record.id)) reachedKnown = true
      else {
        records.set(record.id, record)
        newRecords.push(record)
      }
    }
    await options.onPage?.({
      page: pages,
      synced: records.size,
      records: newRecords,
    })
    nextToken = page.nextToken
    if (!nextToken || reachedKnown || pages >= 2_000) break
  } while (nextToken)
  return { records: [...records.values()], pages }
}

export async function fetchApiFolders(options: {
  workspaceId: string
  userId: string
  baseRecords: Map<string, BookmarkRecord>
  excludedFolderIds: ReadonlySet<string>
  onFolder?: (name: string) => void | Promise<void>
}): Promise<BookmarkFolder[]> {
  const response = await invokeXJson<unknown>(
    options.workspaceId,
    `/2/users/${encodeURIComponent(options.userId)}/bookmarks/folders`,
  )
  const folders = asObjects(asObject(response)?.data)
    .map((folder) => ({
      id: stringValue(folder.id) ?? '',
      name: stringValue(folder.name) ?? '',
    }))
    .filter((folder) => folder.id && folder.name)

  for (const folder of folders) {
    if (options.excludedFolderIds.has(folder.id)) continue
    await options.onFolder?.(folder.name)
    let nextToken: string | undefined
    let pages = 0
    do {
      const page = await fetchPostPage(
        options.workspaceId,
        folderPath(options.userId, folder.id, nextToken),
      )
      for (const incoming of page.records) {
        const record = options.baseRecords.get(incoming.id) ?? incoming
        if (!record.folderIds.includes(folder.id))
          record.folderIds.push(folder.id)
        if (!record.folderNames.includes(folder.name))
          record.folderNames.push(folder.name)
        options.baseRecords.set(record.id, record)
      }
      nextToken = page.nextToken
      pages += 1
      if (!nextToken || pages >= 2_000) break
    } while (nextToken)
  }

  return folders.map((folder) => ({
    ...folder,
    count: [...options.baseRecords.values()].filter((record) =>
      record.folderIds.includes(folder.id),
    ).length,
  }))
}

async function fetchPostPage(
  workspaceId: string,
  path: string,
): Promise<ApiPage> {
  const response = await invokeXJson<unknown>(workspaceId, path)
  const root = asObject(response)
  const includes = asObject(root?.includes)
  const users = new Map(
    asObjects(includes?.users)
      .map((user) => [stringValue(user.id), user] as const)
      .filter((entry): entry is readonly [string, Record<string, unknown>] =>
        Boolean(entry[0]),
      ),
  )
  const media = new Map(
    asObjects(includes?.media)
      .map((item) => [stringValue(item.media_key), item] as const)
      .filter((entry): entry is readonly [string, Record<string, unknown>] =>
        Boolean(entry[0]),
      ),
  )
  const syncedAt = new Date().toISOString()
  return {
    records: asObjects(root?.data)
      .map((tweet) => apiTweetToBookmark(tweet, users, media, syncedAt))
      .filter((record): record is BookmarkRecord => record !== null),
    nextToken: stringValue(asObject(root?.meta)?.next_token),
  }
}

function bookmarksPath(userId: string, token?: string): string {
  return postListPath(`/2/users/${encodeURIComponent(userId)}/bookmarks`, token)
}

function folderPath(userId: string, folderId: string, token?: string): string {
  return postListPath(
    `/2/users/${encodeURIComponent(userId)}/bookmarks/folders/${encodeURIComponent(folderId)}`,
    token,
  )
}

function postListPath(base: string, token?: string): string {
  const query = new URLSearchParams({
    max_results: '100',
    expansions: 'author_id,attachments.media_keys',
    'tweet.fields': POST_FIELDS,
    'user.fields': USER_FIELDS,
    'media.fields': MEDIA_FIELDS,
  })
  if (token) query.set('pagination_token', token)
  return `${base}?${query}`
}
