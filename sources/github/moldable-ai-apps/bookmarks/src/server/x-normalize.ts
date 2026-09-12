import type {
  BookmarkMedia,
  BookmarkRecord,
  QuotedPost,
} from '../shared/bookmarks'

export type JsonObject = Record<string, unknown>

export function isObject(value: unknown): value is JsonObject {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

export function asObject(value: unknown): JsonObject | undefined {
  return isObject(value) ? value : undefined
}

export function asObjects(value: unknown): JsonObject[] {
  return Array.isArray(value) ? value.filter(isObject) : []
}

export function stringValue(value: unknown): string | undefined {
  return typeof value === 'string' && value.length > 0 ? value : undefined
}

export function numberValue(value: unknown): number | undefined {
  return typeof value === 'number' && Number.isFinite(value) ? value : undefined
}

export function objectAt(
  root: unknown,
  ...path: string[]
): JsonObject | undefined {
  let value: unknown = root
  for (const segment of path) value = asObject(value)?.[segment]
  return asObject(value)
}

export function arrayAt(root: unknown, ...path: string[]): unknown[] {
  let value: unknown = root
  for (const segment of path) value = asObject(value)?.[segment]
  return Array.isArray(value) ? value : []
}

export function graphqlTweetToBookmark(
  value: unknown,
  syncedAt: string,
): BookmarkRecord | null {
  const root = asObject(value)
  const tweet = asObject(root?.tweet) ?? root
  const legacy = asObject(tweet?.legacy)
  if (!tweet || !legacy) return null
  const id = stringValue(legacy.id_str) ?? stringValue(tweet.rest_id)
  if (!id) return null

  const user = objectAt(tweet, 'core', 'user_results', 'result')
  const userCore = asObject(user?.core)
  const userLegacy = asObject(user?.legacy)
  const handle =
    stringValue(userCore?.screen_name) ?? stringValue(userLegacy?.screen_name)
  const name = stringValue(userCore?.name) ?? stringValue(userLegacy?.name)
  const entities = asObject(legacy.entities)
  const mediaEntities = asObjects(
    asObject(legacy.extended_entities)?.media ?? entities?.media,
  )
  const links = asObjects(entities?.urls)
    .map((entry) => safeHttpUrl(entry.expanded_url))
    .filter(
      (link): link is string =>
        typeof link === 'string' && !link.includes('t.co'),
    )
  const noteText = stringValue(
    objectAt(tweet, 'note_tweet', 'note_tweet_results', 'result')?.text,
  )
  let text =
    noteText ?? stringValue(legacy.full_text) ?? stringValue(legacy.text) ?? ''
  for (const entity of asObjects(entities?.urls)) {
    const short = stringValue(entity.url)
    const display = stringValue(entity.display_url)
    if (short && display) text = text.split(short).join(display)
  }

  const quoted = graphqlQuotedPost(tweet.quoted_status_result)
  const avatar = asObject(user?.avatar)
  return {
    id,
    url: `https://x.com/${handle ?? 'i'}/status/${id}`,
    text,
    authorId: stringValue(user?.rest_id),
    authorHandle: handle,
    authorName: name,
    authorProfileImageUrl:
      stringValue(avatar?.image_url) ??
      stringValue(userLegacy?.profile_image_url_https),
    postedAt: stringValue(legacy.created_at) ?? null,
    bookmarkedAt: null,
    sortIndex: null,
    syncedAt,
    language: stringValue(legacy.lang),
    conversationId: stringValue(legacy.conversation_id_str),
    links,
    media: mediaEntities.map(graphqlMedia),
    quotedPost: quoted,
    folderIds: [],
    folderNames: [],
    engagement: {
      likes: numberValue(legacy.favorite_count),
      reposts: numberValue(legacy.retweet_count),
      replies: numberValue(legacy.reply_count),
      quotes: numberValue(legacy.quote_count),
      bookmarks: numberValue(legacy.bookmark_count),
      views: Number(stringValue(asObject(tweet.views)?.count)) || undefined,
    },
    source: 'x-browser-session',
  }
}

export function apiTweetToBookmark(
  tweet: JsonObject,
  users: Map<string, JsonObject>,
  mediaByKey: Map<string, JsonObject>,
  syncedAt: string,
): BookmarkRecord | null {
  const id = stringValue(tweet.id)
  if (!id) return null
  const authorId = stringValue(tweet.author_id)
  const author = authorId ? users.get(authorId) : undefined
  const username = stringValue(author?.username)
  const entities = asObject(tweet.entities)
  const attachments = asObject(tweet.attachments)
  const mediaKeys = Array.isArray(attachments?.media_keys)
    ? attachments.media_keys.filter(
        (key): key is string => typeof key === 'string',
      )
    : []
  return {
    id,
    url: `https://x.com/${username ?? 'i'}/status/${id}`,
    text: stringValue(tweet.text) ?? '',
    authorId,
    authorHandle: username,
    authorName: stringValue(author?.name),
    authorProfileImageUrl: stringValue(author?.profile_image_url),
    postedAt: stringValue(tweet.created_at) ?? null,
    bookmarkedAt: null,
    sortIndex: null,
    syncedAt,
    language: stringValue(tweet.lang),
    conversationId: stringValue(tweet.conversation_id),
    links: asObjects(entities?.urls)
      .map((entry) => safeHttpUrl(entry.expanded_url))
      .filter((link): link is string => Boolean(link)),
    media: mediaKeys.map((key) => apiMedia(key, mediaByKey.get(key))),
    folderIds: [],
    folderNames: [],
    engagement: publicMetrics(tweet.public_metrics),
    source: 'x-api',
  }
}

function graphqlQuotedPost(value: unknown): QuotedPost | undefined {
  const result = asObject(asObject(value)?.result)
  const tweet = asObject(result?.tweet) ?? result
  const legacy = asObject(tweet?.legacy)
  const id = stringValue(legacy?.id_str) ?? stringValue(tweet?.rest_id)
  if (!tweet || !legacy || !id) return undefined
  const user = objectAt(tweet, 'core', 'user_results', 'result')
  const userCore = asObject(user?.core)
  const userLegacy = asObject(user?.legacy)
  const handle =
    stringValue(userCore?.screen_name) ?? stringValue(userLegacy?.screen_name)
  return {
    id,
    text:
      stringValue(
        objectAt(tweet, 'note_tweet', 'note_tweet_results', 'result')?.text,
      ) ??
      stringValue(legacy.full_text) ??
      stringValue(legacy.text) ??
      '',
    authorHandle: handle,
    authorName: stringValue(userCore?.name) ?? stringValue(userLegacy?.name),
    url: `https://x.com/${handle ?? 'i'}/status/${id}`,
  }
}

function graphqlMedia(value: JsonObject): BookmarkMedia {
  const original = asObject(value.original_info)
  return {
    type: mediaType(value.type),
    url: stringValue(value.media_url_https) ?? stringValue(value.media_url),
    previewUrl:
      stringValue(value.media_url_https) ?? stringValue(value.media_url),
    altText: stringValue(value.ext_alt_text),
    width: numberValue(original?.width),
    height: numberValue(original?.height),
  }
}

function apiMedia(key: string, value?: JsonObject): BookmarkMedia {
  return {
    key,
    type: mediaType(value?.type),
    url: stringValue(value?.url),
    previewUrl:
      stringValue(value?.preview_image_url) ?? stringValue(value?.url),
    altText: stringValue(value?.alt_text),
    width: numberValue(value?.width),
    height: numberValue(value?.height),
  }
}

function mediaType(value: unknown): BookmarkMedia['type'] {
  return value === 'photo' || value === 'video' || value === 'animated_gif'
    ? value
    : 'unknown'
}

function publicMetrics(value: unknown): BookmarkRecord['engagement'] {
  const metrics = asObject(value)
  return {
    likes: numberValue(metrics?.like_count),
    reposts: numberValue(metrics?.retweet_count),
    replies: numberValue(metrics?.reply_count),
    quotes: numberValue(metrics?.quote_count),
    bookmarks: numberValue(metrics?.bookmark_count),
  }
}

function safeHttpUrl(value: unknown): string | undefined {
  const raw = stringValue(value)
  if (!raw) return undefined
  try {
    const parsed = new URL(raw)
    return parsed.protocol === 'https:' || parsed.protocol === 'http:'
      ? parsed.toString()
      : undefined
  } catch {
    return undefined
  }
}
