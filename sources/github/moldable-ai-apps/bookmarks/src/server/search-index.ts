import type { BookmarkPage, BookmarkRecord } from '../shared/bookmarks'
import { readBookmarks } from './bookmark-files'

type CachedIndex = {
  records: BookmarkRecord[]
  searchable: Map<string, string>
}

const indexes = new Map<string, CachedIndex>()

export function replaceSearchIndex(
  workspaceId: string,
  records: BookmarkRecord[],
): void {
  indexes.set(workspaceId, buildIndex(records))
}

export function clearSearchIndex(workspaceId: string): void {
  indexes.delete(workspaceId)
}

export async function searchBookmarks(options: {
  workspaceId: string
  query?: string
  folderId?: string
  offset?: number
  limit?: number
  excludedFolderIds?: ReadonlySet<string>
}): Promise<BookmarkPage> {
  const index = await getIndex(options.workspaceId)
  const tokens = tokenize(options.query ?? '')
  const folderId = options.folderId?.trim()
  const offset = Math.max(0, options.offset ?? 0)
  const limit = Math.max(1, Math.min(100, options.limit ?? 50))
  const excludedFolderIds = options.excludedFolderIds ?? new Set<string>()

  const scored = index.records
    .filter((record) => isVisibleInFolder(record, folderId, excludedFolderIds))
    .map((record) => ({
      record,
      score: scoreRecord(record, index.searchable.get(record.id) ?? '', tokens),
    }))
    .filter(({ score }) => tokens.length === 0 || score > 0)
    .sort((a, b) => b.score - a.score || compareRecency(a.record, b.record))

  const items = scored.slice(offset, offset + limit).map(({ record }) => record)
  return {
    items,
    total: scored.length,
    offset,
    limit,
    hasMore: offset + items.length < scored.length,
  }
}

function isVisibleInFolder(
  record: BookmarkRecord,
  folderId: string | undefined,
  excludedFolderIds: ReadonlySet<string>,
): boolean {
  if (folderId) {
    return (
      !excludedFolderIds.has(folderId) && record.folderIds.includes(folderId)
    )
  }
  return (
    record.folderIds.length === 0 ||
    record.folderIds.some((id) => !excludedFolderIds.has(id))
  )
}

export async function getBookmark(
  workspaceId: string,
  id: string,
): Promise<BookmarkRecord | null> {
  const index = await getIndex(workspaceId)
  return index.records.find((record) => record.id === id) ?? null
}

async function getIndex(workspaceId: string): Promise<CachedIndex> {
  const cached = indexes.get(workspaceId)
  if (cached) return cached
  const built = buildIndex(await readBookmarks(workspaceId))
  indexes.set(workspaceId, built)
  return built
}

function buildIndex(records: BookmarkRecord[]): CachedIndex {
  const searchable = new Map<string, string>()
  for (const record of records) {
    searchable.set(
      record.id,
      [
        record.text,
        record.authorHandle,
        record.authorName,
        record.folderNames.join(' '),
        record.links.join(' '),
        record.quotedPost?.text,
        record.quotedPost?.authorHandle,
      ]
        .filter(Boolean)
        .join('\n')
        .toLocaleLowerCase(),
    )
  }
  return { records, searchable }
}

function tokenize(query: string): string[] {
  return [
    ...new Set(query.toLocaleLowerCase().match(/[\p{L}\p{N}_@.-]+/gu) ?? []),
  ]
}

function scoreRecord(
  record: BookmarkRecord,
  searchable: string,
  tokens: string[],
): number {
  if (tokens.length === 0) return 0
  let score = 0
  const handle = record.authorHandle?.toLocaleLowerCase() ?? ''
  const name = record.authorName?.toLocaleLowerCase() ?? ''
  const text = record.text.toLocaleLowerCase()

  for (const token of tokens) {
    if (!searchable.includes(token)) return 0
    if (handle === token.replace(/^@/, '')) score += 12
    else if (handle.includes(token.replace(/^@/, ''))) score += 6
    if (name.includes(token)) score += 5
    if (
      record.folderNames.some((folder) =>
        folder.toLocaleLowerCase().includes(token),
      )
    ) {
      score += 5
    }
    score += Math.min(4, occurrences(text, token)) * 2
    if (record.links.some((link) => link.toLocaleLowerCase().includes(token)))
      score += 2
  }
  return score
}

function occurrences(value: string, token: string): number {
  let count = 0
  let cursor = 0
  while ((cursor = value.indexOf(token, cursor)) !== -1) {
    count += 1
    cursor += token.length
  }
  return count
}

function compareRecency(a: BookmarkRecord, b: BookmarkRecord): number {
  if (
    a.sortIndex &&
    b.sortIndex &&
    /^\d+$/.test(a.sortIndex) &&
    /^\d+$/.test(b.sortIndex)
  ) {
    const aIndex = BigInt(a.sortIndex)
    const bIndex = BigInt(b.sortIndex)
    if (aIndex !== bIndex) return aIndex > bIndex ? -1 : 1
  }
  return String(b.bookmarkedAt ?? b.postedAt ?? b.syncedAt).localeCompare(
    String(a.bookmarkedAt ?? a.postedAt ?? a.syncedAt),
  )
}
