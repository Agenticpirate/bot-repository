import type { BookmarkFolder, BookmarkRecord } from '../shared/bookmarks'
import { readBrowserSession } from './browser-session'
import type { BookmarkPageHandler } from './sync-source'
import {
  arrayAt,
  asObject,
  asObjects,
  graphqlTweetToBookmark,
  objectAt,
  stringValue,
} from './x-normalize'
import { recommendedRequestDelay } from './x-rate-limit'

const PUBLIC_BEARER =
  'AAAAAAAAAAAAAAAAAAAAANRILgAAAAAAnNwIzUejRCOuH5E6I8xnZz4puTs%3D1Zv7ttfk8LF81IUq16cHjhLTvJu4FA33AGWWjCpTnA'
const BOOKMARKS_QUERY = ['Z9GWmP0kP2dajyckAaDUBw', 'Bookmarks'] as const
const FOLDERS_QUERY = [
  'i78YDd0Tza-dV4SYs58kRg',
  'BookmarkFoldersSlice',
] as const
const FOLDER_TIMELINE_QUERY = [
  'LML09uXDwh87F1zd7pbf2w',
  'BookmarkFolderTimeline',
] as const
const DEFAULT_RATE_LIMIT_MS = 15 * 60 * 1_000
let nextGraphqlRequestAt = 0

const FEATURES = {
  graphql_timeline_v2_bookmark_timeline: true,
  rweb_tipjar_consumption_enabled: true,
  responsive_web_graphql_exclude_directive_enabled: true,
  verified_phone_label_enabled: false,
  creator_subscriptions_tweet_preview_api_enabled: true,
  responsive_web_graphql_timeline_navigation_enabled: true,
  responsive_web_graphql_skip_user_profile_image_extensions_enabled: false,
  communities_web_enable_tweet_community_results_fetch: true,
  c9s_tweet_anatomy_moderator_badge_enabled: true,
  articles_preview_enabled: true,
  responsive_web_edit_tweet_api_enabled: true,
  tweetypie_unmention_optimization_enabled: true,
  responsive_web_uc_gql_enabled: true,
  vibe_api_enabled: true,
  responsive_web_text_conversations_enabled: false,
  freedom_of_speech_not_reach_fetch_enabled: true,
  longform_notetweets_consumption_enabled: true,
  longform_notetweets_rich_text_read_enabled: true,
  longform_notetweets_inline_media_enabled: true,
  responsive_web_enhance_cards_enabled: false,
  tweet_with_visibility_results_prefer_gql_limited_actions_policy_enabled: true,
  responsive_web_media_download_video_enabled: false,
}

interface BrowserSource {
  browserId: string
  profileId: string
}

interface Page {
  records: BookmarkRecord[]
  nextCursor?: string
}

export async function fetchBrowserBookmarks(options: {
  source: BrowserSource
  knownIds: Set<string>
  onPage?: BookmarkPageHandler
}): Promise<{ records: BookmarkRecord[]; pages: number }> {
  const session = await readBrowserSession(
    options.source.browserId,
    options.source.profileId,
  )
  const records = new Map<string, BookmarkRecord>()
  let cursor: string | undefined
  let pages = 0
  let reachedKnown = false

  do {
    const variables: Record<string, unknown> = { count: 100 }
    if (cursor) variables.cursor = cursor
    const json = await graphqlRequest(BOOKMARKS_QUERY, variables, session)
    const page = parseTimeline(json, 'bookmarks')
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
    cursor = page.nextCursor
    if (!cursor || reachedKnown || pages >= 2_000) break
  } while (cursor)

  return { records: [...records.values()], pages }
}

export async function fetchBrowserFolders(options: {
  source: BrowserSource
  baseRecords: Map<string, BookmarkRecord>
  excludedFolderIds: ReadonlySet<string>
  onFolder?: (name: string) => void | Promise<void>
}): Promise<BookmarkFolder[]> {
  const session = await readBrowserSession(
    options.source.browserId,
    options.source.profileId,
  )
  const listJson = await graphqlRequest(FOLDERS_QUERY, {}, session)
  const folders = parseFolders(listJson)

  for (const folder of folders) {
    if (options.excludedFolderIds.has(folder.id)) continue
    await options.onFolder?.(folder.name)
    let cursor: string | undefined
    let pages = 0
    do {
      const variables: Record<string, unknown> = {
        bookmark_collection_id: folder.id,
        count: 100,
      }
      if (cursor) variables.cursor = cursor
      const json = await graphqlRequest(
        FOLDER_TIMELINE_QUERY,
        variables,
        session,
      )
      const page = parseTimeline(json, 'folder')
      for (const incoming of page.records) {
        const record = options.baseRecords.get(incoming.id) ?? incoming
        if (!record.folderIds.includes(folder.id))
          record.folderIds.push(folder.id)
        if (!record.folderNames.includes(folder.name))
          record.folderNames.push(folder.name)
        options.baseRecords.set(record.id, record)
      }
      cursor = page.nextCursor
      pages += 1
      if (!cursor || pages >= 2_000) break
    } while (cursor)
  }
  return folders.map((folder) => ({
    ...folder,
    count: [...options.baseRecords.values()].filter((record) =>
      record.folderIds.includes(folder.id),
    ).length,
  }))
}

async function graphqlRequest(
  operation: readonly [string, string],
  variables: Record<string, unknown>,
  session: { csrfToken: string; cookieHeader: string },
): Promise<unknown> {
  await waitForRequestSlot()
  const query = new URLSearchParams({
    variables: JSON.stringify(variables),
    features: JSON.stringify(FEATURES),
  })
  const response = await fetch(
    `https://x.com/i/api/graphql/${operation[0]}/${operation[1]}?${query}`,
    {
      headers: {
        authorization: `Bearer ${PUBLIC_BEARER}`,
        'x-csrf-token': session.csrfToken,
        'x-twitter-active-user': 'yes',
        'x-twitter-auth-type': 'OAuth2Session',
        'user-agent':
          'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/146 Safari/537.36',
        cookie: session.cookieHeader,
      },
    },
  )
  nextGraphqlRequestAt = Math.max(
    nextGraphqlRequestAt,
    Date.now() + recommendedRequestDelay(response.headers),
  )
  if (!response.ok) {
    if (response.status === 429) {
      throw new XRateLimitError(rateLimitResetAt(response.headers))
    }
    const hint =
      response.status === 401 || response.status === 403
        ? ' Open X in that browser, confirm you are signed in, and reconnect.'
        : ''
    throw new Error(`X bookmark sync returned HTTP ${response.status}.${hint}`)
  }
  return response.json() as Promise<unknown>
}

async function waitForRequestSlot(): Promise<void> {
  const wait = nextGraphqlRequestAt - Date.now()
  if (wait > 0) await delay(wait)
}

export class XRateLimitError extends Error {
  readonly retryAt: string

  constructor(retryAt: string) {
    super('X is temporarily limiting bookmark sync.')
    this.name = 'XRateLimitError'
    this.retryAt = retryAt
  }
}

function rateLimitResetAt(headers: Headers): string {
  const retryAfterSeconds = Number(headers.get('retry-after'))
  if (Number.isFinite(retryAfterSeconds) && retryAfterSeconds > 0) {
    return new Date(Date.now() + retryAfterSeconds * 1_000).toISOString()
  }

  const resetSeconds = Number(headers.get('x-rate-limit-reset'))
  if (Number.isFinite(resetSeconds) && resetSeconds * 1_000 > Date.now()) {
    return new Date(resetSeconds * 1_000).toISOString()
  }

  return new Date(Date.now() + DEFAULT_RATE_LIMIT_MS).toISOString()
}

function parseTimeline(json: unknown, kind: 'bookmarks' | 'folder'): Page {
  const instructions =
    kind === 'bookmarks'
      ? arrayAt(
          json,
          'data',
          'bookmark_timeline_v2',
          'timeline',
          'instructions',
        )
      : [
          ...arrayAt(
            json,
            'data',
            'bookmark_collection_timeline',
            'timeline',
            'instructions',
          ),
          ...arrayAt(
            json,
            'data',
            'bookmark_folder_timeline',
            'timeline',
            'instructions',
          ),
        ]
  const entries = instructions.flatMap((instruction) =>
    asObjects(asObject(instruction)?.entries),
  )
  const syncedAt = new Date().toISOString()
  const records: BookmarkRecord[] = []
  let nextCursor: string | undefined

  for (const entry of entries) {
    const entryId = stringValue(entry.entryId)
    if (entryId?.startsWith('cursor-bottom')) {
      nextCursor = stringValue(asObject(entry.content)?.value)
      continue
    }
    const result = objectAt(
      entry,
      'content',
      'itemContent',
      'tweet_results',
      'result',
    )
    const record = graphqlTweetToBookmark(result, syncedAt)
    if (record) {
      record.sortIndex = stringValue(entry.sortIndex) ?? null
      records.push(record)
    }
  }
  return { records, nextCursor }
}

function parseFolders(json: unknown): BookmarkFolder[] {
  const candidatePaths = [
    [
      'data',
      'viewer',
      'user_results',
      'result',
      'bookmark_collections_slice',
      'items',
    ],
    ['data', 'viewer', 'bookmark_collections_slice', 'items'],
    ['data', 'bookmark_collections_slice', 'items'],
  ]
  for (const path of candidatePaths) {
    const items = arrayAt(json, ...path)
    if (!items.length) continue
    return asObjects(items)
      .map((item) => ({
        id: stringValue(item.id) ?? stringValue(item.rest_id) ?? '',
        name: stringValue(item.name) ?? '',
      }))
      .filter((folder) => folder.id && folder.name)
  }
  return []
}

function delay(milliseconds: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, milliseconds))
}
