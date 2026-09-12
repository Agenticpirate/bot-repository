import type { BookmarkRecord } from '../shared/bookmarks'

export interface BookmarkPageProgress {
  page: number
  synced: number
  records: BookmarkRecord[]
}

export type BookmarkPageHandler = (
  progress: BookmarkPageProgress,
) => void | Promise<void>
